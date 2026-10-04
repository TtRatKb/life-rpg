const PROTOCOL_VERSION = 5;
const CAPABILITIES = {
  playerAchievements: true,
  achievementSchema: true,
  globalAchievementPercentages: true,
  ownedGames: true,
  recentlyPlayed: true,
  storePricing: true
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "no-store"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
  });
}

function cleanDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function validSteamId(value) {
  return /^\d{17}$/.test(String(value || ""));
}

function validAppId(value) {
  return /^\d+$/.test(String(value || "")) && Number(value) > 0;
}

function steamUrl(path, params = {}) {
  const url = new URL(`https://api.steampowered.com/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url;
}

async function fetchSteamJson(url) {
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Steam API HTTP ${response.status}`);
  return data;
}

async function settledSteam(url) {
  try {
    return { ok: true, data: await fetchSteamJson(url) };
  } catch (error) {
    return { ok: false, error: String(error?.message || error), data: {} };
  }
}

function normalizeOwnedGame(game = {}) {
  return {
    appid: Number(game.appid || 0),
    name: String(game.name || ""),
    playtime_forever: Math.max(0, Number(game.playtime_forever || 0)),
    playtime_2weeks: Math.max(0, Number(game.playtime_2weeks || 0)),
    rtime_last_played: Math.max(0, Number(game.rtime_last_played || 0)),
    img_icon_url: String(game.img_icon_url || ""),
    content_descriptorids: Array.isArray(game.content_descriptorids) ? game.content_descriptorids : []
  };
}

async function handleAchievements(url, env) {
  const appid = cleanDigits(url.searchParams.get("appid"));
  const steamid = cleanDigits(url.searchParams.get("steamid"));
  const lang = String(url.searchParams.get("lang") || "english").slice(0, 32);
  if (!validAppId(appid)) return json({ ok: false, error: "Valid appid required" }, 400);
  if (!validSteamId(steamid)) return json({ ok: false, error: "Valid 17-digit SteamID64 required" }, 400);

  const schemaUrl = steamUrl("ISteamUserStats/GetSchemaForGame/v2/", {
    key: env.STEAM_API_KEY, appid, l: lang
  });
  const playerUrl = steamUrl("ISteamUserStats/GetPlayerAchievements/v1/", {
    key: env.STEAM_API_KEY, steamid, appid, l: lang
  });
  const globalUrl = steamUrl("ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/", {
    gameid: appid
  });

  const [schemaRes, playerRes, globalRes] = await Promise.all([
    settledSteam(schemaUrl), settledSteam(playerUrl), settledSteam(globalUrl)
  ]);

  if (!schemaRes.ok) {
    return json({ ok: false, error: `Steam achievement schema failed: ${schemaRes.error}` }, 502);
  }

  const schemaAchievements = schemaRes.data?.game?.availableGameStats?.achievements || [];
  const playerAchievements = playerRes.data?.playerstats?.achievements || [];
  const globalAchievements = globalRes.data?.achievementpercentages?.achievements || [];
  const playerSuccess = playerRes.ok && playerRes.data?.playerstats?.success !== false && Array.isArray(playerAchievements);

  const playerMap = new Map(playerAchievements.map(item => [String(item.apiname || item.name || ""), item]));
  const globalMap = new Map(globalAchievements.map(item => [String(item.name || item.apiname || ""), item]));

  const achievements = schemaAchievements.map(item => {
    const apiName = String(item.name || item.apiname || "");
    const player = playerMap.get(apiName) || {};
    const global = globalMap.get(apiName) || {};
    return {
      apiName,
      name: String(item.displayName || apiName),
      description: String(item.description || ""),
      hidden: Number(item.hidden || 0) === 1,
      achieved: playerSuccess ? Number(player.achieved || 0) === 1 : false,
      unlockTime: playerSuccess ? Math.max(0, Number(player.unlocktime || 0)) : 0,
      globalPercent: Number.isFinite(Number(global.percent)) ? Number(global.percent) : null
    };
  }).filter(item => item.apiName);

  return json({
    ok: true,
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    playerAvailable: playerSuccess,
    playerError: playerSuccess ? "" : (playerRes.error || String(playerRes.data?.playerstats?.error || "Steam did not return personal achievement state")),
    achievements,
    playerAchievements,
    globalAchievements,
    schema: schemaRes.data,
    diagnostics: {
      playerError: playerSuccess ? "" : (playerRes.error || String(playerRes.data?.playerstats?.error || "")),
      globalError: globalRes.ok ? "" : globalRes.error
    }
  });
}

async function handleLibrary(url, env) {
  const steamid = cleanDigits(url.searchParams.get("steamid"));
  const appid = cleanDigits(url.searchParams.get("appid"));
  if (!validSteamId(steamid)) return json({ ok: false, error: "Valid 17-digit SteamID64 required" }, 400);
  if (appid && !validAppId(appid)) return json({ ok: false, error: "Invalid appid" }, 400);

  const params = {
    key: env.STEAM_API_KEY,
    steamid,
    include_appinfo: 1,
    include_played_free_games: 1,
    format: "json"
  };
  const requestUrl = steamUrl("IPlayerService/GetOwnedGames/v1/", params);
  if (appid) requestUrl.searchParams.set("appids_filter[0]", appid);
  const data = await fetchSteamJson(requestUrl);
  let games = Array.isArray(data?.response?.games) ? data.response.games.map(normalizeOwnedGame) : [];
  if (appid) games = games.filter(game => String(game.appid) === appid);

  return json({
    ok: true,
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    source: "owned-games",
    games,
    response: { ...data.response, games }
  });
}

async function handleRecently(url, env) {
  const steamid = cleanDigits(url.searchParams.get("steamid"));
  const appid = cleanDigits(url.searchParams.get("appid"));
  const requestedCount = Math.max(0, Math.min(1000, Number(url.searchParams.get("count") || 0)));
  if (!validSteamId(steamid)) return json({ ok: false, error: "Valid 17-digit SteamID64 required" }, 400);
  if (appid && !validAppId(appid)) return json({ ok: false, error: "Invalid appid" }, 400);

  const requestUrl = steamUrl("IPlayerService/GetRecentlyPlayedGames/v1/", {
    key: env.STEAM_API_KEY,
    steamid,
    count: requestedCount,
    format: "json"
  });
  const data = await fetchSteamJson(requestUrl);
  let games = Array.isArray(data?.response?.games) ? data.response.games.map(normalizeOwnedGame) : [];
  if (appid) games = games.filter(game => String(game.appid) === appid);

  return json({
    ok: true,
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    source: "recently-played",
    games,
    response: { ...data.response, games }
  });
}


async function handleStore(url) {
  const appid = cleanDigits(url.searchParams.get("appid"));
  const cc = String(url.searchParams.get("cc") || "DE").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "DE";
  const lang = String(url.searchParams.get("lang") || "german").replace(/[^A-Za-z_-]/g, "").slice(0, 24) || "german";
  if (!validAppId(appid)) return json({ ok: false, error: "Valid appid required" }, 400);

  const storeUrl = new URL("https://store.steampowered.com/api/appdetails");
  storeUrl.searchParams.set("appids", appid);
  storeUrl.searchParams.set("cc", cc);
  storeUrl.searchParams.set("l", lang);

  const payload = await fetchSteamJson(storeUrl);
  const record = payload?.[appid];
  if (!record?.success || !record?.data) return json({ ok: false, error: "Steam Store did not return app details" }, 404);

  const data = record.data || {};
  const price = data.price_overview || {};
  const isFree = Boolean(data.is_free);
  return json({
    ok: true,
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    appid: Number(appid),
    name: String(data.name || ""),
    isFree,
    currency: String(price.currency || (cc === "DE" ? "EUR" : "")),
    initialPriceCents: isFree ? 0 : (Number.isFinite(Number(price.initial)) ? Math.max(0, Math.round(Number(price.initial))) : null),
    finalPriceCents: isFree ? 0 : (Number.isFinite(Number(price.final)) ? Math.max(0, Math.round(Number(price.final))) : null),
    discountPercent: Number.isFinite(Number(price.discount_percent)) ? Math.max(0, Math.round(Number(price.discount_percent))) : 0,
    initialFormatted: String(price.initial_formatted || ""),
    finalFormatted: String(price.final_formatted || ""),
    headerImage: String(data.header_image || ""),
    storeUrl: `https://store.steampowered.com/app/${appid}/`,
    country: cc
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({
        ok: true,
        protocolVersion: PROTOCOL_VERSION,
        capabilities: CAPABILITIES,
        steamKeyConfigured: Boolean(env.STEAM_API_KEY)
      });
    }

    try {
      if (url.pathname === "/api/steam/store") return await handleStore(url);
      if (!env.STEAM_API_KEY) return json({ ok: false, error: "STEAM_API_KEY is not configured" }, 500);
      if (url.pathname === "/api/steam/achievements") return await handleAchievements(url, env);
      if (url.pathname === "/api/steam/library") return await handleLibrary(url, env);
      if (url.pathname === "/api/steam/recently") return await handleRecently(url, env);
      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, 502);
    }
  }
};
