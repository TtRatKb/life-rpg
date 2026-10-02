(() => {
  const SCHEMA = 4;
  const DAY_MS = 86400000;
  const DEFAULT_TAG_LIMITS = { nudeln: 1, kartoffeln: 1, reis: 1, tortilla: 1 };
  const ui = { tab: 'plan', periodStart: '', periodDays: 7, mode: 'main', editingDishId: null, swapBlockId: null, swapMemory: {} };

  function app() { return window.LifeRPGApp; }
  function rootState() { return app()?.getState?.() || null; }
  function esc(value) { return app()?.escapeHtml?.(String(value ?? '')) || String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function attr(value) { return esc(value).replace(/`/g, '&#096;'); }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, Number(n) || 0)); }
  const TAG_ALIASES = {
    pasta: 'nudeln', noodle: 'nudeln', noodles: 'nudeln', nudel: 'nudeln', nudeln: 'nudeln',
    potato: 'kartoffeln', potatoes: 'kartoffeln', kartoffel: 'kartoffeln', kartoffeln: 'kartoffeln',
    rice: 'reis', reis: 'reis',
    tortilla: 'tortilla', tortillas: 'tortilla'
  };

  function normalTag(value) {
    const clean = String(value || '').trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
    return TAG_ALIASES[clean] || clean;
  }
  function displayTag(value) { return String(value || '').replace(/-/g, ' '); }

  function defaultPlanner() {
    return {
      schemaVersion: SCHEMA,
      dishes: [],
      plans: {},
      restockItems: [],
      usageHistory: [],
      settings: {
        defaultCooldownWeeks: 1,
        tagLimits: { ...DEFAULT_TAG_LIMITS },
        preferWeekendSpecials: true
      }
    };
  }

  function normalizeDish(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(','))
      .map(normalTag).filter(Boolean))];
    const cooldown = raw.cooldownWeeks === '' || raw.cooldownWeeks == null ? null : clamp(raw.cooldownWeeks, 0, 12);
    return {
      id: String(raw.id || uid('dish')),
      name: String(raw.name || 'Untitled dish').trim().slice(0, 140) || 'Untitled dish',
      days: clamp(raw.days || 1, 1, 4),
      tags,
      weekendSpecial: Boolean(raw.weekendSpecial),
      cooldownWeeks: cooldown,
      sourceUrl: String(raw.sourceUrl || '').trim().slice(0, 1400),
      ingredients: Array.isArray(raw.ingredients)
        ? raw.ingredients.map(v => String(v || '').trim()).filter(Boolean).slice(0, 160)
        : ingredientLines(raw.ingredients || ''),
      notes: String(raw.notes || '').trim().slice(0, 1600),
      active: raw.active !== false,
      createdAt: String(raw.createdAt || new Date().toISOString()),
      updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString())
    };
  }

  function ensureState() {
    const root = rootState();
    if (!root) return defaultPlanner();
    const current = root.mealPlanner && typeof root.mealPlanner === 'object' && !Array.isArray(root.mealPlanner)
      ? root.mealPlanner : {};
    const defaults = defaultPlanner();
    const planner = {
      ...defaults,
      ...current,
      schemaVersion: SCHEMA,
      dishes: (Array.isArray(current.dishes) ? current.dishes : []).map(normalizeDish).filter(Boolean),
      plans: current.plans && typeof current.plans === 'object' && !Array.isArray(current.plans) ? current.plans : {},
      restockItems: (Array.isArray(current.restockItems) ? current.restockItems : []).map(item => ({
        id: String(item?.id || uid('restock')),
        name: String(item?.name || '').trim().slice(0, 120),
        category: String(item?.category || 'Household').trim().slice(0, 60) || 'Household',
        need: Boolean(item?.need),
        active: item?.active !== false
      })).filter(item => item.name),
      usageHistory: (Array.isArray(current.usageHistory) ? current.usageHistory : []).map(entry => ({
        id: String(entry?.id || uid('meal-log')),
        dishId: String(entry?.dishId || ''),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(entry?.date || '')) ? String(entry.date) : localDateKey(new Date()),
        days: clamp(entry?.days || 1, 1, 4),
        createdAt: String(entry?.createdAt || new Date().toISOString())
      })).filter(entry => entry.dishId),
      settings: {
        ...defaults.settings,
        ...(current.settings || {}),
        defaultCooldownWeeks: clamp(current.settings?.defaultCooldownWeeks ?? 1, 0, 12),
        tagLimits: normalizeTagLimits(current.settings?.tagLimits),
        preferWeekendSpecials: current.settings?.preferWeekendSpecials !== false
      }
    };
    root.mealPlanner = planner;
    return planner;
  }

  function normalizeTagLimits(value) {
    const out = { ...DEFAULT_TAG_LIMITS };
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, limit]) => {
        const tag = normalTag(key);
        if (!tag) return;
        const n = Number(limit);
        if (Number.isFinite(n) && n >= 0) out[tag] = Math.floor(n);
      });
    }
    return out;
  }

  function ingredientLines(value) {
    return String(value || '').split(/\r?\n/).map(line => line.trim().replace(/^[•·*-]\s*/, '')).filter(Boolean).slice(0, 160);
  }

  function save(source = 'meal-planner') {
    app()?.saveState?.({ source });
    renderHomeSummary();
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseLocalDate(key) {
    const [y,m,d] = String(key || '').split('-').map(Number);
    return new Date(y || 2000, Math.max(0, (m || 1) - 1), d || 1, 12, 0, 0, 0);
  }

  function mondayOf(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    const weekday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - weekday);
    return d;
  }

  function nextMondayKey() {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() + 7);
    return localDateKey(d);
  }

  function ensureUiPeriod() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ui.periodStart)) ui.periodStart = nextMondayKey();
    ui.periodDays = clamp(ui.periodDays || 7, 1, 31);
  }

  function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d; }
  function dayDiff(a, b) { return Math.round((parseLocalDate(localDateKey(a)) - parseLocalDate(localDateKey(b))) / DAY_MS); }
  function calendarWeekKey(date) { return localDateKey(mondayOf(date)); }
  function periodKey(start = ui.periodStart, days = ui.periodDays) { return `${start}::${clamp(days,1,31)}`; }
  function planStartKey(plan) { return String(plan?.periodStart || plan?.weekStart || ''); }
  function planLength(plan) { return clamp(plan?.days || 7, 1, 31); }
  function periodDates(start = ui.periodStart, days = ui.periodDays) {
    const first = parseLocalDate(start);
    return Array.from({length: clamp(days,1,31)}, (_, index) => addDays(first, index));
  }

  function planFor(start = ui.periodStart, days = ui.periodDays) {
    ensureUiPeriod();
    const s = ensureState();
    const exact = s.plans[periodKey(start, days)];
    if (exact) return exact;
    const legacy = s.plans[start];
    if (legacy && clamp(days,1,31) === planLength(legacy)) return legacy;
    return null;
  }

  function storePlan(plan) {
    ensureState().plans[periodKey(planStartKey(plan), planLength(plan))] = plan;
  }

  function resizeCurrentPlan(newDays) {
    ensureUiPeriod();
    const oldDays = ui.periodDays;
    const nextDays = clamp(newDays, 1, 31);
    if (nextDays === oldDays) return false;

    const s = ensureState();
    const oldKey = periodKey(ui.periodStart, oldDays);
    const plan = planFor(ui.periodStart, oldDays);
    ui.periodDays = nextDays;
    ui.swapMemory = {};

    if (!plan) {
      render();
      return false;
    }

    // A range-length edit changes the same plan instead of switching to a
    // different storage key. Remove the old alias first so committed plans
    // cannot be counted twice by cooldown/history logic.
    if (s.plans[oldKey] === plan) delete s.plans[oldKey];
    if (s.plans[ui.periodStart] === plan) delete s.plans[ui.periodStart];

    plan.periodStart = ui.periodStart;
    plan.weekStart = ui.periodStart;
    plan.days = nextDays;
    plan.updatedAt = new Date().toISOString();

    // Keep every existing meal that begins inside the resized range. If a
    // multi-day dish continues beyond the visible end, its duration remains
    // intact: the leftovers still exist even if the shopping horizon ends.
    plan.blocks = (plan.blocks || []).filter(block => Number(block?.start || 0) < nextDays);

    // When extending, preserve the existing meals and add explicit open slots
    // only for newly visible, uncovered days. Those slots can be filled with
    // the existing one-click swap without rebuilding the rest of the plan.
    if (nextDays > oldDays) {
      const occupied = new Set();
      plan.blocks.forEach(block => {
        const start = Number(block?.start || 0);
        const duration = Math.max(1, Number(block?.duration || 1));
        for (let i = 0; i < duration; i += 1) {
          const index = start + i;
          if (index >= 0 && index < nextDays) occupied.add(index);
        }
      });
      for (let index = oldDays; index < nextDays; index += 1) {
        if (occupied.has(index)) continue;
        plan.blocks.push({ id: uid('flex'), dishId: null, start: index, duration: 1, label: 'Open / leftovers' });
      }
      plan.blocks.sort((a,b) => Number(a?.start || 0) - Number(b?.start || 0));
    }

    storePlan(plan);
    save('meal-plan-resize');
    render();
    app()?.showToast?.(nextDays > oldDays
      ? `Zeitraum auf ${nextDays} Tage erweitert · bestehende Gerichte bleiben erhalten.`
      : `Zeitraum auf ${nextDays} Tage verkürzt · bestehende Gerichte bleiben erhalten.`);
    return true;
  }

  function allPlans() {
    const seen = new Set();
    return Object.values(ensureState().plans || {}).filter(plan => {
      if (!plan || typeof plan !== 'object') return false;
      const sig = `${planStartKey(plan)}|${planLength(plan)}|${plan.generatedAt || ''}|${plan.committedAt || ''}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  function dishById(id) { return ensureState().dishes.find(item => item.id === id) || null; }
  function cooldownFor(dish) {
    return dish?.cooldownWeeks == null ? ensureState().settings.defaultCooldownWeeks : clamp(dish.cooldownWeeks, 0, 12);
  }

  function blockDates(plan, block) {
    const start = addDays(parseLocalDate(planStartKey(plan)), Number(block?.start || 0));
    const duration = Math.max(1, Number(block?.duration || 1));
    return { start, end: addDays(start, duration - 1), duration };
  }

  function latestCommittedUseForDish(dishId, targetDate, excludeKey = null) {
    const target = targetDate instanceof Date ? targetDate : parseLocalDate(targetDate);
    let latest = null;
    allPlans().forEach(plan => {
      if (plan.status !== 'committed' || !Array.isArray(plan.blocks) || !planStartKey(plan)) return;
      if (excludeKey && periodKey(planStartKey(plan), planLength(plan)) === excludeKey) return;
      plan.blocks.forEach(block => {
        if (block?.dishId !== dishId) return;
        const dates = blockDates(plan, block);
        if (dates.start >= target) return;
        if (!latest || dates.end > latest.end) latest = { ...dates, plan, source: 'plan' };
      });
    });
    (ensureState().usageHistory || []).forEach(entry => {
      if (entry?.dishId !== dishId || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry?.date || ''))) return;
      const start = parseLocalDate(entry.date);
      const end = addDays(start, Math.max(1, Number(entry.days || 1)) - 1);
      if (start >= target) return;
      if (!latest || end > latest.end) latest = { start, end, duration: Math.max(1, Number(entry.days || 1)), historyEntry: entry, source: 'history' };
    });
    return latest;
  }

  function cooldownInfo(dish, targetDate, excludeKey = null) {
    const target = targetDate instanceof Date ? targetDate : parseLocalDate(targetDate);
    const last = latestCommittedUseForDish(dish.id, target, excludeKey);
    if (!last) return { blocked: false, daysAgo: null, last: null };
    const diff = dayDiff(target, last.end);
    const cooldownDays = cooldownFor(dish) * 7;
    return { blocked: cooldownDays > 0 && diff < cooldownDays, daysAgo: diff, last };
  }

  function touchedWeekKeys(planStart, startIndex, duration) {
    const start = parseLocalDate(planStart);
    const set = new Set();
    for (let i = 0; i < Number(duration || 1); i += 1) set.add(calendarWeekKey(addDays(start, Number(startIndex || 0) + i)));
    return [...set];
  }

  function tagWeekCounts(blocks, planStart, excludeBlockId = null) {
    const counts = {};
    (blocks || []).forEach(block => {
      if (!block?.dishId || block.id === excludeBlockId) return;
      const dish = dishById(block.dishId);
      if (!dish) return;
      const weeks = touchedWeekKeys(planStart, block.start, block.duration);
      weeks.forEach(week => {
        counts[week] ||= {};
        (dish.tags || []).forEach(tag => { counts[week][tag] = (counts[week][tag] || 0) + 1; });
      });
    });
    return counts;
  }

  function intervalGapDays(aStart, aEnd, bStart, bEnd) {
    if (aEnd < bStart) return dayDiff(bStart, aEnd);
    if (bEnd < aStart) return dayDiff(aStart, bEnd);
    return -1;
  }

  function withinPlanCooldownAllowed(dish, ctx) {
    const planStart = parseLocalDate(ctx.planStart);
    const candStart = addDays(planStart, ctx.startIndex);
    const candEnd = addDays(candStart, Number(dish.days || 1) - 1);
    const cooldownDays = cooldownFor(dish) * 7;
    for (const block of ctx.blocks || []) {
      if (block?.dishId !== dish.id) continue;
      const otherStart = addDays(planStart, Number(block.start || 0));
      const otherEnd = addDays(otherStart, Number(block.duration || 1) - 1);
      const gap = intervalGapDays(candStart, candEnd, otherStart, otherEnd);
      if (gap < 0) return false;
      if (cooldownDays > 0 && gap < cooldownDays) return false;
    }
    return true;
  }

  function candidateAllowed(dish, ctx) {
    if (!dish || dish.active === false) return false;
    if (ctx.duration != null && Number(dish.days) !== Number(ctx.duration)) return false;
    if (Number(dish.days) > Number(ctx.remaining)) return false;
    const candidateDate = addDays(parseLocalDate(ctx.planStart), Number(ctx.startIndex || 0));
    if (cooldownInfo(dish, candidateDate, ctx.excludePeriodKey || null).blocked) return false;
    if (!withinPlanCooldownAllowed(dish, ctx)) return false;

    const limits = ensureState().settings.tagLimits || {};
    const counts = tagWeekCounts(ctx.blocks || [], ctx.planStart, ctx.excludeBlockId || null);
    const weeks = touchedWeekKeys(ctx.planStart, ctx.startIndex, dish.days);
    for (const week of weeks) {
      for (const tag of dish.tags || []) {
        const limit = Number(limits[tag]);
        if (Number.isFinite(limit) && limit > 0 && (Number(counts[week]?.[tag] || 0) + 1) > limit) return false;
      }
    }
    return true;
  }

  function touchesWeekend(planStart, startIndex, duration) {
    const first = parseLocalDate(planStart);
    for (let i = 0; i < Number(duration || 1); i += 1) {
      const dow = addDays(first, Number(startIndex || 0) + i).getDay();
      if (dow === 0 || dow === 6) return true;
    }
    return false;
  }

  function candidateScore(dish, startIndex, planStart, excludeKey = null) {
    let score = 10;
    const candidateDate = addDays(parseLocalDate(planStart), Number(startIndex || 0));
    const last = latestCommittedUseForDish(dish.id, candidateDate, excludeKey);
    if (!last) score += 2.5;
    else score += Math.min(4, Math.max(0, dayDiff(candidateDate, last.end) / 7) * 0.45);
    const weekend = touchesWeekend(planStart, startIndex, dish.days);
    if (ensureState().settings.preferWeekendSpecials) {
      if (dish.weekendSpecial && weekend) score += 5;
      else if (dish.weekendSpecial && !weekend) score -= 1.5;
      else if (!dish.weekendSpecial && weekend) score -= 0.35;
    }
    score += Math.random() * 1.8;
    return score;
  }

  function generatePlan(startKey = ui.periodStart, days = ui.periodDays) {
    const s = ensureState();
    const totalDays = clamp(days, 1, 31);
    const dishes = s.dishes.filter(dish => dish.active !== false);
    if (!dishes.length) return {
      periodStart: startKey, weekStart: startKey, days: totalDays, status: 'draft', blocks: [],
      generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), committedAt: null
    };

    let best = null;
    const attempts = Math.max(90, Math.min(320, totalDays * 14));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const blocks = [];
      let index = 0;
      let score = 0;
      let flexDays = 0;
      while (index < totalDays) {
        const remaining = totalDays - index;
        const candidates = dishes
          .filter(dish => candidateAllowed(dish, { blocks, planStart: startKey, startIndex: index, remaining, excludePeriodKey: periodKey(startKey, totalDays) }))
          .map(dish => ({ dish, score: candidateScore(dish, index, startKey, periodKey(startKey, totalDays)) }))
          .sort((a,b) => b.score - a.score);

        if (!candidates.length) {
          blocks.push({ id: uid('flex'), dishId: null, start: index, duration: 1, label: 'Open / leftovers' });
          index += 1;
          flexDays += 1;
          score -= 7;
          continue;
        }

        const poolSize = Math.min(candidates.length, attempt < 10 ? 1 : 4);
        const pick = candidates[Math.floor(Math.random() * poolSize)];
        const dish = pick.dish;
        blocks.push({ id: uid('meal'), dishId: dish.id, start: index, duration: Number(dish.days || 1) });
        index += Number(dish.days || 1);
        score += pick.score;
      }
      const mealDays = totalDays - flexDays;
      if (!best || mealDays > best.mealDays || (mealDays === best.mealDays && score > best.score)) {
        best = { blocks, mealDays, flexDays, score };
      }
      if (best.flexDays === 0 && attempt > 25) break;
    }

    return {
      periodStart: startKey,
      weekStart: startKey,
      days: totalDays,
      status: 'draft',
      blocks: best?.blocks || [],
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      committedAt: null
    };
  }

  function generateCurrentPeriod() {
    ensureUiPeriod();
    ui.swapMemory = {};
    const generated = generatePlan(ui.periodStart, ui.periodDays);
    storePlan(generated);
    save('meal-plan-generate');
    render();
    if (!generated.blocks.length) app()?.showToast?.('Add a few dishes first, then Life RPG can build the plan.');
    else if (coveredDays(generated) < ui.periodDays) app()?.showToast?.(`Meal plan built for ${coveredDays(generated)}/${ui.periodDays} days.`);
    else app()?.showToast?.('🍲 Meal plan built. Swap anything that does not feel right.');
  }

  function coveredDays(plan) {
    const limit = planLength(plan);
    const covered = new Set();
    (plan?.blocks || []).forEach(block => {
      const start = Number(block?.start || 0);
      const duration = Math.max(1, Number(block?.duration || 1));
      for (let i = 0; i < duration; i += 1) {
        const index = start + i;
        if (index >= 0 && index < limit) covered.add(index);
      }
    });
    return covered.size;
  }

  function commitCurrentPlan() {
    const plan = planFor();
    if (!plan?.blocks?.some(block => block.dishId)) {
      app()?.showToast?.('Generate a meal plan first.');
      return;
    }
    plan.status = 'committed';
    plan.committedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    storePlan(plan);
    save('meal-plan-commit');
    render();
    app()?.showToast?.('✓ Meal plan saved · cooldowns now use these dates.');
  }

  function compatibleSwaps(blockId) {
    const plan = planFor();
    const target = plan?.blocks?.find(block => block.id === blockId);
    if (!plan || !target) return [];
    const otherBlocks = plan.blocks.filter(block => block.id !== blockId);
    return ensureState().dishes
      .filter(dish => dish.id !== target.dishId)
      .filter(dish => candidateAllowed(dish, {
        blocks: otherBlocks,
        planStart: planStartKey(plan),
        startIndex: Number(target.start || 0),
        remaining: target.duration,
        duration: target.duration,
        excludePeriodKey: periodKey(planStartKey(plan), planLength(plan))
      }))
      .map(dish => ({ dish, score: candidateScore(dish, Number(target.start || 0), planStartKey(plan), periodKey(planStartKey(plan), planLength(plan))) }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 18)
      .map(item => item.dish);
  }

  function autoSwap(blockId) {
    const plan = planFor();
    const block = plan?.blocks?.find(item => item.id === blockId);
    if (!plan || !block) return;
    const previousId = block.dishId || null;
    const remembered = new Set(ui.swapMemory[blockId] || []);
    if (previousId) remembered.add(previousId);
    const swaps = compatibleSwaps(blockId).filter(dish => !remembered.has(dish.id));
    const dish = swaps[0];
    if (!dish) {
      const anyCompatible = compatibleSwaps(blockId).length > 0;
      app()?.showToast?.(anyCompatible
        ? '↻ Für diesen Slot hast du gerade alle passenden Alternativen gesehen.'
        : '↻ Gerade gibt es keine kompatible Alternative für diesen Slot.');
      return;
    }
    ui.swapMemory[blockId] ||= [];
    if (previousId && !ui.swapMemory[blockId].includes(previousId)) ui.swapMemory[blockId].push(previousId);
    block.dishId = dish.id;
    block.duration = dish.days;
    delete block.label;
    plan.updatedAt = new Date().toISOString();
    if (plan.status === 'committed') plan.committedAt = new Date().toISOString();
    storePlan(plan);
    save('meal-plan-auto-swap');
    render();
    app()?.showToast?.(`↻ Vorschlag: ${dish.name} · nochmal Tauschen für die nächste passende Option.`);
  }

  function applySwap(dishId) {
    const plan = planFor();
    const block = plan?.blocks?.find(item => item.id === ui.swapBlockId);
    if (!plan || !block) return;
    const dish = dishById(dishId);
    if (!dish) return;
    block.dishId = dish.id;
    block.duration = dish.days;
    delete block.label;
    plan.updatedAt = new Date().toISOString();
    if (plan.status === 'committed') plan.committedAt = new Date().toISOString();
    storePlan(plan);
    ui.mode = 'main';
    ui.swapBlockId = null;
    save('meal-plan-swap');
    render();
    app()?.showToast?.(`↻ Swapped to ${dish.name}.`);
  }

  function periodLabel(start = ui.periodStart, days = ui.periodDays) {
    const dates = periodDates(start, days);
    const a = dates[0].toLocaleDateString('de-DE', { day:'2-digit', month:'short' });
    const b = dates[dates.length - 1].toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' });
    return dates.length === 1 ? b : `${a} – ${b}`;
  }

  function lastUsedLabel(dish, targetDate = ui.periodStart) {
    const last = latestCommittedUseForDish(dish.id, parseLocalDate(targetDate));
    if (!last) return 'Noch nicht eingeplant';
    const diff = dayDiff(parseLocalDate(targetDate), last.end);
    if (diff === 1) return 'Zuletzt gestern';
    if (diff < 7) return `Zuletzt vor ${diff} Tagen`;
    const weeks = Math.floor(diff / 7);
    return `Zuletzt vor ${weeks} Woche${weeks === 1 ? '' : 'n'}`;
  }

  function openPlanner(tab = 'plan') {
    ui.tab = tab;
    ui.mode = 'main';
    ui.editingDishId = null;
    ui.swapBlockId = null;
    ensureUiPeriod();
    render();
    const nav = document.querySelector('.nav-button[data-view="meals"], [data-life-route="meals"]');
    if (nav && !document.getElementById('view-meals')?.classList.contains('active')) nav.click();
    else app()?.showView?.('meals');
  }

  function closePlanner() { app()?.showView?.('hub-everyday'); }

  function render() {
    ensureUiPeriod();
    const page = document.getElementById('mealPlannerPageV314dz7');
    if (!page) return;
    if (ui.mode === 'dish') renderDishEditor(page);
    else if (ui.mode === 'swap') renderSwap(page);
    else renderMain(page);
    bindRenderedInputs(page);
  }

  function renderMain(page) {
    page.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7">
      <div class="meal-planner-head-v314dz6 meal-planner-page-head-v314dz7">
        <div><p class="eyebrow">ALLTAG · ESSENSPLAN</p><h1>Essensplan 🍲</h1><p>Plane genau den Zeitraum, für den ihr einkauft — mit Cooldowns, Essensfamilien, Wochenendgerichten und einer Einkaufsliste daraus.</p></div>
        <div class="meal-planner-page-summary-v314dz7"><span>MEAL PLANNER</span><strong>${esc(ensureState().dishes.length)} Gerichte</strong></div>
      </div>
      <nav class="meal-planner-tabs-v314dz6" aria-label="Meal planner sections">
        ${tabButton('plan','Plan')} ${tabButton('dishes','Gerichte')} ${tabButton('history','Vergangen')} ${tabButton('shopping','Einkauf')} ${tabButton('rules','Regeln')}
      </nav>
      <div class="meal-planner-body-v314dz6">${ui.tab === 'plan' ? renderPlanTab() : ui.tab === 'dishes' ? renderDishesTab() : ui.tab === 'history' ? renderHistoryTab() : ui.tab === 'shopping' ? renderShoppingTab() : renderRulesTab()}</div>
    </div>`;
  }

  function tabButton(id, label) { return `<button type="button" class="${ui.tab === id ? 'is-active' : ''}" data-meal-tab="${id}">${label}</button>`; }

  function renderPlanTab() {
    const plan = planFor();
    const dates = periodDates();
    const s = ensureState();
    const planned = plan?.blocks?.filter(block => block.dishId).length || 0;
    return `<section class="meal-week-v314dz6">
      <div class="meal-period-controls-v314dz8">
        <button class="secondary-button" type="button" data-meal-action="prev-period" aria-label="Vorheriger Zeitraum">←</button>
        <label><span>Startdatum</span><input type="date" data-meal-period-start value="${attr(ui.periodStart)}"></label>
        <label><span>Tage</span><input type="number" min="1" max="31" step="1" data-meal-period-days value="${ui.periodDays}"></label>
        <div class="meal-period-label-v314dz8"><small>ZEITRAUM</small><h3>${esc(periodLabel())}</h3></div>
        <button class="secondary-button" type="button" data-meal-action="next-period" aria-label="Nächster Zeitraum">→</button>
      </div>
      <div class="meal-plan-actions-v314dz6">
        <button class="primary-button" type="button" data-meal-action="generate" ${s.dishes.some(d => d.active !== false) ? '' : 'disabled'}>✦ ${plan ? 'Neu planen' : 'Plan erstellen'}</button>
        ${plan ? `<button class="secondary-button" type="button" data-meal-action="commit">${plan.status === 'committed' ? '✓ Plan aktiv' : 'Diesen Plan verwenden'}</button>` : ''}
        <button class="secondary-button" type="button" data-meal-tab="history">Vergangenes nachtragen</button>
        <span>${planned} Gericht${planned === 1 ? '' : 'e'} · ${plan ? `${coveredDays(plan)}/${ui.periodDays} Tage` : 'noch nicht geplant'}</span>
      </div>
      ${!s.dishes.length ? `<div class="meal-empty-v314dz6"><span>🍲</span><strong>Starte mit den Gerichten, die ihr wirklich esst.</strong><p>Etwa 15–20 reichen schon für sinnvolle Pläne.</p><button class="primary-button" type="button" data-meal-tab="dishes">Gerichte hinzufügen</button></div>` : renderPeriodGrid(plan, dates)}
      <div class="meal-plan-note-v314dz6"><strong>Wie der Planer denkt</strong><span>Cooldowns werden taggenau geprüft. Tag-Limits gelten pro Kalenderwoche, auch wenn dein gewählter Zeitraum mitten in der Woche beginnt oder über mehrere Wochen läuft. „Weekend special“ bevorzugt Samstag/Sonntag, ist aber kein harter Zwang.</span></div>
    </section>`;
  }

  function renderPeriodGrid(plan, dates) {
    const blockByDay = new Map();
    (plan?.blocks || []).forEach(block => {
      for (let i = 0; i < Number(block.duration || 1); i += 1) blockByDay.set(Number(block.start || 0) + i, { block, part: i });
    });
    const columns = Math.max(1, Math.min(7, dates.length));
    return `<div class="meal-week-grid-v314dz6" style="--meal-plan-columns:${columns}">${dates.map((date,index) => {
      const hit = blockByDay.get(index);
      if (!hit) return dayCard(date, null, null, 0);
      return dayCard(date, hit.block, hit.block.dishId ? dishById(hit.block.dishId) : null, hit.part);
    }).join('')}</div>`;
  }

  function dayCard(date, block, dish, part) {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (!block) return `<article class="meal-day-card-v314dz6 is-open ${weekend ? 'is-weekend' : ''}"><small>${esc(date.toLocaleDateString('de-DE',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('de-DE',{day:'2-digit',month:'short'}))}</b><div><strong>Offen</strong><span>Kein Gericht zugeordnet</span></div></article>`;
    if (!dish) return `<article class="meal-day-card-v314dz6 is-open ${weekend ? 'is-weekend' : ''}"><small>${esc(date.toLocaleDateString('de-DE',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('de-DE',{day:'2-digit',month:'short'}))}</b><div><strong>${esc(block.label || 'Offen / Reste')}</strong><span>Flexibler Tag</span>${part === 0 ? `<button type="button" class="text-button" data-meal-swap="${attr(block.id)}">1-Tages-Gericht finden ↻</button>` : ''}</div></article>`;
    return `<article class="meal-day-card-v314dz6 ${weekend ? 'is-weekend' : ''} ${dish.weekendSpecial ? 'is-special' : ''}">
      <small>${esc(date.toLocaleDateString('de-DE',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('de-DE',{day:'2-digit',month:'short'}))}</b>
      <div><strong>${part ? `Reste · ${esc(dish.name)}` : esc(dish.name)}</strong><span>${part ? `Tag ${part + 1}/${dish.days}` : dish.days > 1 ? `${dish.days} Tage` : '1 Tag'}${dish.weekendSpecial ? ' · ✦ Wochenende' : ''}</span>
      ${part === 0 ? `<div class="meal-day-actions-v314dz6"><button type="button" class="text-button" data-meal-swap="${attr(block.id)}">Tauschen ↻</button>${dish.sourceUrl ? `<button type="button" class="text-button" data-meal-open-url="${attr(dish.id)}">Rezept ↗</button>` : ''}</div>` : ''}</div>
    </article>`;
  }

  function renderDishesTab() {
    const s = ensureState();
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>GERICHTE-BIBLIOTHEK</small><h3>${s.dishes.length} Gerichte</h3><p>Name, Tage und Tags reichen für die Planung. Zutaten brauchst du nur, wenn sie später in die Einkaufsliste sollen.</p></div><button class="primary-button" type="button" data-meal-action="new-dish">＋ Gericht hinzufügen</button></div>
      ${s.dishes.length ? `<div class="meal-dish-grid-v314dz6">${s.dishes.map(dish => {
        const cd = cooldownInfo(dish, parseLocalDate(ui.periodStart));
        return `<article class="meal-dish-card-v314dz6 ${dish.active === false ? 'is-inactive' : ''}"><div class="meal-dish-title-v314dz6"><div><strong>${esc(dish.name)}</strong><span>${dish.days} Tag${dish.days === 1 ? '' : 'e'}${dish.weekendSpecial ? ' · ✦ Weekend special' : ''}</span></div><button class="secondary-button" type="button" data-meal-edit="${attr(dish.id)}">Bearbeiten</button></div><div class="meal-tags-v314dz6">${dish.tags.length ? dish.tags.map(tag => `<span>#${esc(displayTag(tag))}</span>`).join('') : '<span class="is-muted">keine Tags</span>'}</div><small>${esc(lastUsedLabel(dish))}${cd.blocked ? ` · für dieses Startdatum im Cooldown` : ''}</small></article>`;
      }).join('')}</div>` : `<div class="meal-empty-v314dz6"><span>🥘</span><strong>Noch keine Gerichte.</strong><p>Trag zuerst die Gerichte ein, die ohnehin zu eurer normalen Rotation gehören.</p></div>`}
    </section>`;
  }

  function renderHistoryTab() {
    const s = ensureState();
    const today = localDateKey(new Date());
    const defaultDate = localDateKey(addDays(new Date(), -1));
    const activeDishes = s.dishes.filter(dish => dish.active !== false).sort((a,b) => a.name.localeCompare(b.name, 'de'));
    const rows = [...(s.usageHistory || [])]
      .sort((a,b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 80);
    return `<section class="meal-history-v314dz9">
      <div class="meal-section-heading-v314dz6"><div><small>VERGANGENHEIT</small><h3>Vergangene Mahlzeiten nachtragen</h3><p>Trag einfach ein, was ihr tatsächlich gegessen habt. Diese Einträge zählen sofort für den Cooldown — du musst dafür keinen alten Wochenplan nachbauen.</p></div></div>
      <div class="meal-history-layout-v314dz9">
        <form class="meal-history-form-v314dz9" data-meal-history-form>
          <label><span>Datum</span><input type="date" name="date" max="${attr(today)}" value="${attr(defaultDate)}" required></label>
          <label><span>Gericht</span><select name="dishId" data-meal-history-dish required><option value="">Gericht wählen…</option>${activeDishes.map(dish => `<option value="${attr(dish.id)}" data-days="${dish.days}">${esc(dish.name)}</option>`).join('')}</select></label>
          <label><span>Für wie viele Tage?</span><input type="number" name="days" min="1" max="4" step="1" value="1" data-meal-history-days required></label>
          <button class="primary-button" type="submit" ${activeDishes.length ? '' : 'disabled'}>＋ Nachtragen</button>
          <small>Bei einem 2-Tage-Gericht reicht ein Eintrag am ersten Tag mit „2 Tage“.</small>
        </form>
        <div class="meal-history-list-v314dz9">
          ${rows.length ? rows.map(entry => {
            const dish = dishById(entry.dishId);
            const date = parseLocalDate(entry.date);
            return `<article><div><small>${esc(date.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}))}</small><strong>${esc(dish?.name || 'Gelöschtes Gericht')}</strong><span>${entry.days} Tag${Number(entry.days) === 1 ? '' : 'e'} · zählt für Cooldown</span></div><button type="button" class="text-button danger" data-meal-history-delete="${attr(entry.id)}">Löschen</button></article>`;
          }).join('') : `<div class="meal-empty-v314dz6"><span>🗓️</span><strong>Noch nichts nachgetragen.</strong><p>Wenn du z. B. die letzte Woche einträgst, greift der 1-Woche-Cooldown sofort bei der nächsten Planung.</p></div>`}
        </div>
      </div>
    </section>`;
  }

  function renderShoppingTab() {
    const plan = planFor();
    const s = ensureState();
    const mealBlocks = (plan?.blocks || []).filter(block => block.dishId).map(block => ({ block, dish: dishById(block.dishId) })).filter(x => x.dish);
    const hasIngredients = mealBlocks.some(x => x.dish.ingredients?.length);
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>EINKAUF</small><h3>${esc(periodLabel())}</h3><p>Zutaten aus dem Plan und der wiederkehrende Vorratscheck bleiben getrennt und werden beim Kopieren zusammengeführt.</p></div><button class="primary-button" type="button" data-meal-action="copy-shopping" ${plan ? '' : 'disabled'}>Einkaufsliste kopieren</button></div>
      <div class="meal-shopping-columns-v314dz6">
        <section class="meal-shopping-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>GERICHTE</small><h4>Zutaten aus dem Plan</h4></div></div>
          ${plan ? (hasIngredients ? mealBlocks.map(({dish}) => `<div class="meal-ingredient-group-v314dz6"><strong>${esc(dish.name)}</strong>${dish.ingredients.length ? `<ul>${dish.ingredients.map(line => `<li>□ ${esc(line)}</li>`).join('')}</ul>` : '<p>Keine Zutaten gespeichert.</p>'}</div>`).join('') : '<p class="muted">Der Zeitraum ist geplant, aber für diese Gerichte sind noch keine Zutaten gespeichert.</p>') : '<p class="muted">Erstelle zuerst einen Plan für den aktuellen Zeitraum.</p>'}
        </section>
        <section class="meal-shopping-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>VORRATSCHECK</small><h4>Haben wir das noch?</h4></div></div>
          <form class="meal-restock-add-v314dz6" data-meal-restock-form><input name="name" maxlength="120" placeholder="Kaffeebohnen, Toilettenpapier…" required><select name="category"><option>Lebensmittel</option><option>Haushalt</option><option>Bad</option><option>Sonstiges</option></select><button class="secondary-button" type="submit">Hinzufügen</button></form>
          ${s.restockItems.length ? `<div class="meal-restock-list-v314dz6">${s.restockItems.map(item => `<label><input type="checkbox" data-meal-restock-need="${attr(item.id)}" ${item.need ? 'checked' : ''}><span><strong>${esc(item.name)}</strong><small>${esc(item.category)}</small></span><button type="button" class="text-button danger" data-meal-restock-delete="${attr(item.id)}">×</button></label>`).join('')}</div>` : '<p class="muted">Hier kannst du Dinge hinterlegen, die ihr vor jedem Einkauf kurz prüfen wollt.</p>'}
        </section>
      </div>
    </section>`;
  }

  function renderRulesTab() {
    const s = ensureState();
    const limits = Object.entries(s.settings.tagLimits || {}).sort(([a],[b]) => a.localeCompare(b));
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>PLANUNGSREGELN</small><h3>Abwechslung ohne jedes Mal neu nachzudenken.</h3><p>Tags sind Konfliktgruppen. Wenn Burritos und Enchilada-Lasagne beide #tortilla haben und #tortilla auf 1 steht, landen sie nicht in derselben Kalenderwoche.</p></div></div>
      <div class="meal-rules-grid-v314dz6">
        <section class="meal-rule-card-v314dz6"><label><span>Standard-Cooldown pro Gericht</span><select data-meal-setting="defaultCooldownWeeks">${[0,1,2,3,4].map(n => `<option value="${n}" ${s.settings.defaultCooldownWeeks === n ? 'selected' : ''}>${n === 0 ? 'Kein Cooldown' : `${n} Woche${n === 1 ? '' : 'n'}`}</option>`).join('')}</select><small>1 Woche bedeutet: Zwischen letzter Nutzung und nächster Einplanung müssen mindestens 7 Tage liegen.</small></label><label class="meal-check-row-v314dz6"><input type="checkbox" data-meal-setting="preferWeekendSpecials" ${s.settings.preferWeekendSpecials ? 'checked' : ''}><span>Als „Weekend special“ markierte Gerichte an Samstag/Sonntag bevorzugen.</span></label></section>
        <section class="meal-rule-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>TAG-LIMITS</small><h4>Maximale verschiedene Gerichte pro Kalenderwoche</h4></div></div><form class="meal-tag-rule-add-v314dz6" data-meal-tag-rule-form><input name="tag" maxlength="60" placeholder="z. B. mexican" required><input name="limit" type="number" min="1" max="7" value="1" required><button class="secondary-button" type="submit">Regel hinzufügen</button></form><small>Kartoffel/Kartoffeln/Potato, Nudel/Nudeln/Pasta, Reis/Rice und Tortilla/Tortillas zählen jeweils automatisch als dieselbe Konfliktgruppe.</small><div class="meal-tag-rules-v314dz6">${limits.map(([tag,limit]) => `<div><span>#${esc(displayTag(tag))}</span><label>max <input type="number" min="1" max="7" value="${Number(limit) || 1}" data-meal-tag-limit="${attr(tag)}"></label><button class="text-button danger" type="button" data-meal-tag-delete="${attr(tag)}">×</button></div>`).join('')}</div></section>
      </div>
    </section>`;
  }

  function renderDishEditor(dialog) {
    const s = ensureState();
    const dish = ui.editingDishId ? s.dishes.find(item => item.id === ui.editingDishId) : null;
    dialog.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7 is-editor"><div class="meal-planner-head-v314dz6"><div><p class="eyebrow">${dish ? 'GERICHT BEARBEITEN' : 'NEUES GERICHT'}</p><h2>${dish ? esc(dish.name) : 'Gericht hinzufügen'}</h2><p>Ein Rezept ist optional. Für die Planung braucht Life RPG vor allem Dauer, Tags und Cooldown.</p></div><button class="close-button" type="button" data-meal-action="editor-cancel" aria-label="Zurück">×</button></div>
      <form class="meal-dish-form-v314dz6" data-meal-dish-form>
        <label class="is-wide"><span>Name</span><input name="name" maxlength="140" value="${attr(dish?.name || '')}" placeholder="Burritos" required></label>
        <label><span>Reicht für</span><select name="days">${[1,2,3,4].map(n => `<option value="${n}" ${Number(dish?.days || 2) === n ? 'selected' : ''}>${n} Tag${n === 1 ? '' : 'e'}</option>`).join('')}</select></label>
        <label><span>Cooldown</span><select name="cooldownWeeks"><option value="" ${dish?.cooldownWeeks == null ? 'selected' : ''}>Standard verwenden</option>${[0,1,2,3,4].map(n => `<option value="${n}" ${dish?.cooldownWeeks === n ? 'selected' : ''}>${n === 0 ? 'Keiner' : `${n} Woche${n === 1 ? '' : 'n'}`}</option>`).join('')}</select></label>
        <label class="is-wide"><span>Tags / Konfliktgruppen</span><input name="tags" maxlength="500" value="${attr((dish?.tags || []).join(', '))}" placeholder="kartoffeln, nudeln, tortilla"><small>Kommagetrennt. Häufige Grundgruppen werden automatisch zusammengeführt (z. B. Kartoffeln/Potato, Nudeln/Pasta, Reis/Rice, Tortilla/Tortillas). Ein anderer Tag wird erst begrenzt, wenn du dafür unter Regeln ein Limit hinterlegst.</small></label>
        <label class="meal-check-row-v314dz6 is-wide"><input name="weekendSpecial" type="checkbox" ${dish?.weekendSpecial ? 'checked' : ''}><span>Wochenend-/besonderes Essen — Samstag oder Sonntag bevorzugen.</span></label>
        <label class="is-wide"><span>Rezept / Crouton / Quellen-URL <small>optional</small></span><input name="sourceUrl" type="text" inputmode="url" maxlength="1400" value="${attr(dish?.sourceUrl || '')}" placeholder="https://…"></label>
        <label class="is-wide"><span>Zutaten <small>optional · eine pro Zeile</small></span><textarea name="ingredients" rows="9" placeholder="Zutatenliste hier hineinkopieren…">${esc((dish?.ingredients || []).join('\n'))}</textarea><small>Gespeichert wird nur Text — keine Bilder oder Webseiteninhalte.</small></label>
        <label class="is-wide"><span>Notizen <small>optional</small></span><textarea name="notes" rows="3" maxlength="1600" placeholder="Alles, was bei der Entscheidung hilfreich ist…">${esc(dish?.notes || '')}</textarea></label>
        <div class="meal-editor-actions-v314dz6 is-wide"><button class="secondary-button" type="button" data-meal-action="editor-cancel">Abbrechen</button>${dish ? `<button class="text-button danger" type="button" data-meal-delete="${attr(dish.id)}">Gericht löschen</button>` : ''}<button class="primary-button" type="submit">Gericht speichern</button></div>
      </form></div>`;
  }

  function renderSwap(dialog) {
    const plan = planFor();
    const block = plan?.blocks?.find(item => item.id === ui.swapBlockId);
    const current = block?.dishId ? dishById(block.dishId) : null;
    const swaps = compatibleSwaps(ui.swapBlockId);
    dialog.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7 is-editor"><div class="meal-planner-head-v314dz6"><div><p class="eyebrow">TAUSCHEN · ${esc(periodLabel())}</p><h2>${current ? esc(current.name) : 'Flexibler Tag'}</h2><p>Es werden nur Alternativen gezeigt, die weiterhin zu Dauer, Cooldown und Kalenderwochen-Regeln passen.</p></div><button class="close-button" type="button" data-meal-action="swap-cancel" aria-label="Zurück">×</button></div>
      <div class="meal-swap-list-v314dz6">${swaps.length ? swaps.map(dish => `<button type="button" data-meal-apply-swap="${attr(dish.id)}"><span><strong>${esc(dish.name)}</strong><small>${dish.days} Tag${dish.days === 1 ? '' : 'e'} · ${esc((dish.tags || []).map(tag => `#${displayTag(tag)}`).join(' · ') || 'keine Konflikt-Tags')}</small></span><b>Wählen</b></button>`).join('') : `<div class="meal-empty-v314dz6"><span>↻</span><strong>Gerade keine kompatible Alternative.</strong><p>Alle Gerichte gleicher Länge sind entweder im Cooldown oder würden eine Regel verletzen.</p></div>`}</div><div class="meal-editor-actions-v314dz6"><button class="secondary-button" type="button" data-meal-action="swap-cancel">Zurück zum Plan</button></div></div>`;
  }

  function bindRenderedInputs(dialog) {
    dialog.querySelectorAll('[data-meal-setting]').forEach(input => input.addEventListener('change', () => {
      const s = ensureState();
      const key = input.dataset.mealSetting;
      s.settings[key] = input.type === 'checkbox' ? input.checked : clamp(input.value, 0, 12);
      save('meal-planner-settings');
      render();
    }));
    dialog.querySelectorAll('[data-meal-tag-limit]').forEach(input => input.addEventListener('change', () => {
      ensureState().settings.tagLimits[input.dataset.mealTagLimit] = clamp(input.value, 1, 7);
      save('meal-planner-tag-limit');
    }));
    dialog.querySelectorAll('[data-meal-restock-need]').forEach(input => input.addEventListener('change', () => {
      const item = ensureState().restockItems.find(x => x.id === input.dataset.mealRestockNeed);
      if (item) item.need = input.checked;
      save('meal-planner-restock-check');
    }));
    dialog.querySelectorAll('[data-meal-period-start]').forEach(input => input.addEventListener('change', () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input.value)) ui.periodStart = input.value;
      ui.swapMemory = {};
      render();
    }));
    dialog.querySelectorAll('[data-meal-period-days]').forEach(input => input.addEventListener('change', () => {
      resizeCurrentPlan(input.value);
    }));
    dialog.querySelectorAll('[data-meal-history-dish]').forEach(select => select.addEventListener('change', () => {
      const option = select.selectedOptions?.[0];
      const daysInput = select.closest('form')?.querySelector('[data-meal-history-days]');
      if (daysInput && option?.dataset?.days) daysInput.value = clamp(option.dataset.days, 1, 4);
    }));
  }

  function handleClick(event) {
    const target = event.target.closest('button,[data-meal-tab],[data-meal-setting]');
    if (!target) return;
    if (target.dataset.mealTab) { ui.tab = target.dataset.mealTab; ui.mode = 'main'; render(); return; }
    if (target.dataset.mealEdit) { ui.mode = 'dish'; ui.editingDishId = target.dataset.mealEdit; render(); return; }
    if (target.dataset.mealSwap) { autoSwap(target.dataset.mealSwap); return; }
    if (target.dataset.mealApplySwap) { applySwap(target.dataset.mealApplySwap); return; }
    if (target.dataset.mealOpenUrl) {
      const dish = dishById(target.dataset.mealOpenUrl);
      if (dish?.sourceUrl) window.open(dish.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (target.dataset.mealDelete) { deleteDish(target.dataset.mealDelete); return; }
    if (target.dataset.mealRestockDelete) { deleteRestock(target.dataset.mealRestockDelete); return; }
    if (target.dataset.mealTagDelete) { deleteTagRule(target.dataset.mealTagDelete); return; }
    if (target.dataset.mealHistoryDelete) { deleteHistory(target.dataset.mealHistoryDelete); return; }
    switch (target.dataset.mealAction) {
      case 'close': closePlanner(); break;
      case 'prev-period': ui.periodStart = localDateKey(addDays(parseLocalDate(ui.periodStart), -ui.periodDays)); ui.swapMemory = {}; render(); break;
      case 'next-period': ui.periodStart = localDateKey(addDays(parseLocalDate(ui.periodStart), ui.periodDays)); ui.swapMemory = {}; render(); break;
      case 'generate': generateCurrentPeriod(); break;
      case 'commit': commitCurrentPlan(); break;
      case 'new-dish': ui.mode = 'dish'; ui.editingDishId = null; render(); break;
      case 'editor-cancel': ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null; render(); break;
      case 'swap-cancel': ui.mode = 'main'; ui.swapBlockId = null; ui.tab = 'plan'; render(); break;
      case 'copy-shopping': copyShoppingList(); break;
      default: break;
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    if (form.matches('[data-meal-dish-form]')) { event.preventDefault(); saveDishForm(form); }
    else if (form.matches('[data-meal-history-form]')) { event.preventDefault(); addHistoryForm(form); }
    else if (form.matches('[data-meal-restock-form]')) { event.preventDefault(); addRestockForm(form); }
    else if (form.matches('[data-meal-tag-rule-form]')) { event.preventDefault(); addTagRuleForm(form); }
  }

  function saveDishForm(form) {
    const data = new FormData(form);
    const s = ensureState();
    const existing = ui.editingDishId ? s.dishes.find(item => item.id === ui.editingDishId) : null;
    const now = new Date().toISOString();
    const dish = normalizeDish({
      ...(existing || {}),
      id: existing?.id || uid('dish'),
      name: data.get('name'),
      days: data.get('days'),
      tags: String(data.get('tags') || '').split(','),
      weekendSpecial: data.get('weekendSpecial') === 'on',
      cooldownWeeks: data.get('cooldownWeeks') === '' ? null : data.get('cooldownWeeks'),
      sourceUrl: data.get('sourceUrl'),
      ingredients: ingredientLines(data.get('ingredients')),
      notes: data.get('notes'),
      active: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    if (existing) Object.assign(existing, dish);
    else s.dishes.push(dish);
    save('meal-planner-dish');
    ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null;
    render();
    app()?.showToast?.(`🍲 ${dish.name} gespeichert.`);
  }

  function deleteDish(id) {
    const s = ensureState();
    const dish = s.dishes.find(item => item.id === id);
    if (!dish) return;
    if (!window.confirm(`„${dish.name}“ aus der Gerichte-Bibliothek löschen? Alte Pläne behalten ihren Slot, das Gericht wird aber nicht mehr vorgeschlagen.`)) return;
    s.dishes = s.dishes.filter(item => item.id !== id);
    save('meal-planner-dish-delete');
    ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null;
    render();
  }

  function addHistoryForm(form) {
    const data = new FormData(form);
    const dishId = String(data.get('dishId') || '');
    const date = String(data.get('date') || '');
    const dish = dishById(dishId);
    if (!dish || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const today = parseLocalDate(localDateKey(new Date()));
    if (parseLocalDate(date) > today) { app()?.showToast?.('Vergangene Mahlzeiten können nicht in der Zukunft liegen.'); return; }
    const days = clamp(data.get('days') || dish.days || 1, 1, 4);
    ensureState().usageHistory.push({ id: uid('meal-log'), dishId, date, days, createdAt: new Date().toISOString() });
    save('meal-planner-history-add');
    render();
    app()?.showToast?.(`🗓️ ${dish.name} nachgetragen · Cooldown aktualisiert.`);
  }

  function deleteHistory(id) {
    const s = ensureState();
    s.usageHistory = (s.usageHistory || []).filter(entry => entry.id !== id);
    save('meal-planner-history-delete');
    render();
  }

  function addRestockForm(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    ensureState().restockItems.push({ id: uid('restock'), name: name.slice(0,120), category: String(data.get('category') || 'Sonstiges').slice(0,60), need: false, active: true });
    save('meal-planner-restock-add');
    render();
  }

  function deleteRestock(id) {
    const s = ensureState();
    s.restockItems = s.restockItems.filter(item => item.id !== id);
    save('meal-planner-restock-delete');
    render();
  }

  function addTagRuleForm(form) {
    const data = new FormData(form);
    const tag = normalTag(data.get('tag'));
    if (!tag) return;
    ensureState().settings.tagLimits[tag] = clamp(data.get('limit'), 1, 7);
    save('meal-planner-tag-add');
    render();
  }

  function deleteTagRule(tag) {
    delete ensureState().settings.tagLimits[tag];
    save('meal-planner-tag-delete');
    render();
  }

  function shoppingText() {
    const plan = planFor();
    if (!plan) return '';
    const lines = [`Einkaufsliste · ${periodLabel()}`, ''];
    const blocks = plan.blocks.filter(block => block.dishId);
    blocks.forEach(block => {
      const dish = dishById(block.dishId);
      if (!dish?.ingredients?.length) return;
      lines.push(dish.name.toUpperCase());
      dish.ingredients.forEach(item => lines.push(`☐ ${item}`));
      lines.push('');
    });
    const needed = ensureState().restockItems.filter(item => item.active !== false && item.need);
    if (needed.length) {
      lines.push('VORRAT / HAUSHALT');
      needed.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).forEach(item => lines.push(`☐ ${item.name}${item.category ? ` · ${item.category}` : ''}`));
      lines.push('');
    }
    if (lines.length <= 2) lines.push('Noch keine Zutaten gespeichert oder Vorratsartikel markiert.');
    return lines.join('\n').trim();
  }

  async function copyShoppingList() {
    const text = shoppingText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      app()?.showToast?.('🛒 Einkaufsliste kopiert.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
      document.execCommand('copy'); area.remove();
      app()?.showToast?.('🛒 Einkaufsliste kopiert.');
    }
  }

  function renderHomeSummary() {
    const host = document.getElementById('mealPlannerHomeSummaryV314dz6');
    if (!host) return;
    host.textContent = `${ensureState().dishes.length} Gerichte im Essensplan`;
  }

  function bindPage() {
    const page = document.getElementById('mealPlannerPageV314dz7');
    if (!page || page.dataset.mealBound === '1') return;
    page.dataset.mealBound = '1';
    page.addEventListener('click', handleClick);
    page.addEventListener('submit', handleSubmit);
  }

  function init() {
    if (!app()) return;
    const root = rootState();
    const existed = Boolean(root?.mealPlanner);
    ensureState();
    ensureUiPeriod();
    bindPage();
    render();
    if (!existed) save('meal-planner-init');
    window.addEventListener('life-rpg:view-changed', event => {
      if (event?.detail?.view === 'meals') render();
    });
  }

  window.LifeRPGMealPlanner = {
    open: openPlanner,
    getState: ensureState,
    generatePlan,
    compatibleSwaps,
    shoppingText,
    periodKey,
    periodDates,
    autoSwap,
    resizeCurrentPlan
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
