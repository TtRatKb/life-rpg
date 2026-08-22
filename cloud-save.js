import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFW-vUovZVkqTrxz-6UgZbSkH3eHjK-Ns",
  authDomain: "life-rpg-3afb7.firebaseapp.com",
  projectId: "life-rpg-3afb7",
  storageBucket: "life-rpg-3afb7.firebasestorage.app",
  messagingSenderId: "88670369654",
  appId: "1:88670369654:web:864bc94bbb5f25d073ec57"
};

const CLOUD_META_KEY = "lifeRpgCloudMetaV01";
const LOCAL_ROLLBACK_KEY = "lifeRpgLocalRollbackV01";
const SAVE_SCHEMA_VERSION = 5;
const SAVE_DEBOUNCE_MS = 900;

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const app = window.LifeRPGApp;

let currentUser = null;
let cloudReady = false;
let knownRemoteRevision = null;
let saveTimer = null;
let applyingRemote = false;
let pendingConflict = null;
let conflictOpen = false;
let lastCloudSavedAtClient = null;

const els = {
  statusButton: byId("cloudStatusButton"),
  statusShort: byId("cloudStatusShort"),
  statusBadge: byId("cloudStatusBadge"),
  accountAvatar: byId("cloudAccountAvatar"),
  accountName: byId("cloudAccountName"),
  accountDetail: byId("cloudAccountDetail"),
  cloudSaveStatus: byId("cloudSaveStatus"),
  cloudSaveDetail: byId("cloudSaveDetail"),
  cloudLastSync: byId("cloudLastSync"),
  helpText: byId("cloudHelpText"),
  signInButton: byId("cloudSignInButton"),
  signOutButton: byId("cloudSignOutButton"),
  syncButton: byId("cloudSyncButton"),
  exportButton: byId("exportSaveButton"),
  importButton: byId("importSaveButton"),
  importFile: byId("importSaveFile"),
  conflictDialog: byId("cloudConflictDialog"),
  conflictLocalSummary: byId("conflictLocalSummary"),
  conflictCloudSummary: byId("conflictCloudSummary"),
  conflictUseLocal: byId("conflictUseLocalButton"),
  conflictUseCloud: byId("conflictUseCloudButton")
};

if (!app) {
  console.error("Life RPG cloud save could not initialize because the app API is unavailable.");
} else {
  initCloudSave().catch(error => {
    console.error("Cloud save initialization failed", error);
    setStatus("error", "Cloud unavailable", friendlyError(error));
  });
}

async function initCloudSave() {
  bindUI();
  setStatus("local", "Local only", "Sign in with Google to sync this save across devices.");

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.warn("Firebase auth persistence could not be set", error);
  }

  onAuthStateChanged(auth, async user => {
    currentUser = user || null;
    cloudReady = false;
    knownRemoteRevision = null;
    pendingConflict = null;

    if (!user) {
      renderSignedOut();
      return;
    }

    renderSignedIn(user);
    setStatus("saving", "Checking cloud…", "Comparing this device with your cloud save before anything is overwritten.");

    try {
      await reconcileWithCloud();
    } catch (error) {
      console.error("Cloud reconciliation failed", error);
      setStatus("error", "Local safe · cloud pending", friendlyError(error));
    }
  });

  window.addEventListener("life-rpg:state-saved", () => {
    if (applyingRemote || !currentUser || !cloudReady || conflictOpen) return;
    queueCloudSave();
  });
}

function bindUI() {
  els.signInButton?.addEventListener("click", signIn);
  els.signOutButton?.addEventListener("click", () => signOut(auth));
  els.syncButton?.addEventListener("click", manualSync);
  els.exportButton?.addEventListener("click", exportSave);
  els.importButton?.addEventListener("click", () => els.importFile?.click());
  els.importFile?.addEventListener("change", importSaveFromFile);

  els.statusButton?.addEventListener("click", () => {
    app.showView("growth");
    window.setTimeout(() => byId("savePanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  });

  els.conflictUseCloud?.addEventListener("click", async () => {
    if (!pendingConflict) return;
    await useCloudConflictChoice();
  });

  els.conflictUseLocal?.addEventListener("click", async () => {
    if (!pendingConflict) return;
    await useLocalConflictChoice();
  });

  window.addEventListener("online", () => {
    if (currentUser && cloudReady && !conflictOpen) queueCloudSave(150);
  });

  window.addEventListener("offline", () => {
    if (currentUser) setStatus("saving", "Local safe · offline", "Changes are still saved locally. Cloud sync will resume when this device is online.");
  });
}

async function signIn() {
  els.signInButton.disabled = true;
  setStatus("saving", "Signing in…", "Opening Google sign-in.");

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code !== "auth/popup-closed-by-user") {
      app.showToast(`Google sign-in failed: ${friendlyError(error)}`);
      setStatus("error", "Sign-in failed", friendlyError(error));
    }
  } finally {
    els.signInButton.disabled = false;
  }
}

function renderSignedOut() {
  clearTimeout(saveTimer);
  cloudReady = false;
  conflictOpen = false;
  lastCloudSavedAtClient = null;

  els.signInButton?.classList.remove("hidden");
  els.signOutButton?.classList.add("hidden");
  els.syncButton?.classList.add("hidden");

  if (els.accountAvatar) {
    els.accountAvatar.innerHTML = "☁️";
  }
  if (els.accountName) els.accountName.textContent = "Not signed in";
  if (els.accountDetail) els.accountDetail.textContent = "Your current save is safe in this browser. Sign in to sync it across devices.";
  if (els.cloudLastSync) els.cloudLastSync.textContent = "—";

  setStatus("local", "Local only", "Google sign-in enables cloud sync. Local autosave remains active either way.");
}

function renderSignedIn(user) {
  els.signInButton?.classList.add("hidden");
  els.signOutButton?.classList.remove("hidden");
  els.syncButton?.classList.remove("hidden");

  if (els.accountName) els.accountName.textContent = user.displayName || "Google account";
  if (els.accountDetail) els.accountDetail.textContent = user.email || "Signed in with Google";

  if (els.accountAvatar) {
    els.accountAvatar.innerHTML = user.photoURL
      ? `<img src="${escapeAttribute(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`
      : "☁️";
  }
}

async function reconcileWithCloud() {
  if (!currentUser) return;

  const ref = currentSaveRef();
  const snap = await getDoc(ref);
  const localState = cleanState(app.getState());
  const localFingerprint = fingerprint(localState);
  const meta = getCloudMeta();

  if (!snap.exists()) {
    knownRemoteRevision = 0;
    cloudReady = true;
    await saveToCloud({ force: true, reason: "first-cloud-save" });
    return;
  }

  const remote = normalizeRemote(snap.data());
  const remoteFingerprint = fingerprint(remote.state);
  lastCloudSavedAtClient = remote.savedAtClient || null;

  if (localFingerprint === remoteFingerprint) {
    acceptSyncedRevision(remote, localFingerprint);
    cloudReady = true;
    setStatus("synced", "Synced", "This device and the cloud contain the same save.");
    return;
  }

  if (isMeaningfullyEmpty(localState) && !isMeaningfullyEmpty(remote.state)) {
    applyRemoteSave(remote, "cloud-restored-empty-local");
    return;
  }

  if (!isMeaningfullyEmpty(localState) && isMeaningfullyEmpty(remote.state)) {
    knownRemoteRevision = remote.revision;
    cloudReady = true;
    await saveToCloud({ force: true, backupRemote: true, reason: "replace-empty-cloud" });
    return;
  }

  if (meta.lastSyncedRevision === remote.revision) {
    if (meta.lastSyncedFingerprint === localFingerprint) {
      applyRemoteSave(remote, "cloud-newer-same-base");
    } else {
      knownRemoteRevision = remote.revision;
      cloudReady = true;
      await saveToCloud({ reason: "offline-local-changes" });
    }
    return;
  }

  if (meta.lastSyncedRevision && meta.lastSyncedRevision !== remote.revision) {
    if (meta.lastSyncedFingerprint === localFingerprint) {
      applyRemoteSave(remote, "remote-changed-local-clean");
    } else {
      showConflict(remote);
    }
    return;
  }

  // First cloud comparison in this browser and both saves already contain progress.
  showConflict(remote);
}

function queueCloudSave(delay = SAVE_DEBOUNCE_MS) {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveToCloud().catch(error => {
      console.error("Cloud autosave failed", error);
      setStatus("error", "Local safe · cloud pending", friendlyError(error));
    });
  }, delay);
}

async function saveToCloud({ force = false, backupRemote = false, reason = "autosave" } = {}) {
  if (!currentUser || (!cloudReady && !force) || conflictOpen) return;
  if (!navigator.onLine) {
    setStatus("saving", "Local safe · offline", "Changes are saved locally and will sync when this device is online again.");
    return;
  }

  clearTimeout(saveTimer);
  const candidate = cleanState(app.getState());
  const candidateFingerprint = fingerprint(candidate);
  const ref = currentSaveRef();
  const deviceId = getDeviceId();
  const savedAtClient = new Date().toISOString();

  setStatus("saving", "Saving…", "Writing the latest local progress to your private cloud save.");

  try {
    const result = await runTransaction(db, async transaction => {
      const snap = await transaction.get(ref);
      const remote = snap.exists() ? normalizeRemote(snap.data()) : null;
      const remoteRevision = remote?.revision || 0;

      if (!force && knownRemoteRevision !== null && remoteRevision !== knownRemoteRevision) {
        const error = new Error("REMOTE_REVISION_CHANGED");
        error.code = "life-rpg/remote-revision-changed";
        throw error;
      }

      if (remote && !force && isMeaningfullyEmpty(candidate) && !isMeaningfullyEmpty(remote.state)) {
        const error = new Error("EMPTY_SAVE_BLOCKED");
        error.code = "life-rpg/empty-overwrite-blocked";
        throw error;
      }

      const shouldBackup = remote && (
        backupRemote ||
        (remoteRevision > 0 && (remoteRevision + 1) % 20 === 0)
      );

      if (shouldBackup) {
        const backupRef = doc(collection(db, "users", currentUser.uid, "backups"));
        transaction.set(backupRef, {
          revision: remoteRevision,
          state: remote.state,
          schemaVersion: Number(remote.schemaVersion || SAVE_SCHEMA_VERSION),
          savedAtClient: remote.savedAtClient || null,
          backupReason: backupRemote ? reason : "periodic",
          createdAtClient: savedAtClient,
          createdAt: serverTimestamp()
        });
      }

      const revision = remoteRevision + 1;
      transaction.set(ref, {
        revision,
        schemaVersion: SAVE_SCHEMA_VERSION,
        state: candidate,
        deviceId,
        savedAtClient,
        updatedAt: serverTimestamp()
      });

      return { revision, savedAtClient };
    });

    knownRemoteRevision = result.revision;
    lastCloudSavedAtClient = result.savedAtClient;
    setCloudMeta({
      lastSyncedRevision: result.revision,
      lastSyncedFingerprint: candidateFingerprint,
      lastCloudSavedAtClient: result.savedAtClient
    });

    cloudReady = true;
    setStatus("synced", "Synced", "Local autosave and cloud save are up to date.");
  } catch (error) {
    if (error?.code === "life-rpg/remote-revision-changed" || error?.code === "life-rpg/empty-overwrite-blocked") {
      const snap = await getDoc(ref);
      if (snap.exists()) showConflict(normalizeRemote(snap.data()));
      return;
    }
    throw error;
  }
}

async function manualSync() {
  if (!currentUser) return;
  els.syncButton.disabled = true;
  setStatus("saving", "Checking…", "Comparing local and cloud progress.");

  try {
    await reconcileWithCloud();
    if (!conflictOpen) app.showToast("Save sync checked.");
  } catch (error) {
    console.error(error);
    setStatus("error", "Local safe · sync failed", friendlyError(error));
  } finally {
    els.syncButton.disabled = false;
  }
}

function showConflict(remote) {
  pendingConflict = remote;
  conflictOpen = true;
  cloudReady = false;

  if (els.conflictLocalSummary) els.conflictLocalSummary.textContent = summarizeState(app.getState());
  if (els.conflictCloudSummary) els.conflictCloudSummary.textContent = summarizeState(remote.state, remote.savedAtClient);

  setStatus("conflict", "Choose save", "Both this device and the cloud contain different progress. Nothing will be overwritten until you choose.");

  if (els.conflictDialog && !els.conflictDialog.open) {
    els.conflictDialog.showModal();
  }
}

async function useCloudConflictChoice() {
  if (!pendingConflict) return;
  const remote = pendingConflict;
  backupLocal("before-use-cloud");
  closeConflict();
  applyRemoteSave(remote, "conflict-use-cloud");
  app.showToast("Cloud save restored on this device.");
}

async function useLocalConflictChoice() {
  if (!pendingConflict) return;
  const remote = pendingConflict;
  knownRemoteRevision = remote.revision;
  closeConflict();
  cloudReady = true;

  try {
    await saveToCloud({ force: true, backupRemote: true, reason: "conflict-use-local" });
    app.showToast("This device was kept. The previous cloud save was backed up.");
  } catch (error) {
    console.error(error);
    setStatus("error", "Local safe · cloud pending", friendlyError(error));
  }
}

function closeConflict() {
  conflictOpen = false;
  pendingConflict = null;
  if (els.conflictDialog?.open) els.conflictDialog.close();
}

function applyRemoteSave(remote, reason) {
  backupLocal(reason);
  applyingRemote = true;

  try {
    app.replaceState(remote.state, { suppressCloud: true, source: "cloud" });
    acceptSyncedRevision(remote, fingerprint(cleanState(app.getState())));
    cloudReady = true;
    setStatus("synced", "Synced", "Cloud progress is now active on this device.");
  } finally {
    queueMicrotask(() => { applyingRemote = false; });
  }
}

function acceptSyncedRevision(remote, syncedFingerprint) {
  knownRemoteRevision = remote.revision;
  lastCloudSavedAtClient = remote.savedAtClient || new Date().toISOString();
  setCloudMeta({
    lastSyncedRevision: remote.revision,
    lastSyncedFingerprint: syncedFingerprint,
    lastCloudSavedAtClient: lastCloudSavedAtClient
  });
}

function setStatus(state, title, detail) {
  if (els.statusBadge) {
    els.statusBadge.dataset.state = state;
    els.statusBadge.textContent = title;
  }

  if (els.statusShort) {
    const shortMap = {
      local: "Local",
      synced: "Synced",
      saving: "Saving",
      conflict: "Choose",
      error: "Local safe"
    };
    els.statusShort.textContent = shortMap[state] || "Cloud";
  }

  if (els.cloudSaveStatus) els.cloudSaveStatus.textContent = title;
  if (els.cloudSaveDetail) els.cloudSaveDetail.textContent = detail;
  if (els.helpText && detail) els.helpText.textContent = detail;
  if (els.cloudLastSync) els.cloudLastSync.textContent = lastCloudSavedAtClient ? formatDateTime(lastCloudSavedAtClient) : "—";
}

function currentSaveRef() {
  return doc(db, "users", currentUser.uid, "saves", "current");
}

function normalizeRemote(data) {
  return {
    revision: Math.max(0, Number(data?.revision || 0)),
    schemaVersion: Number(data?.schemaVersion || 0),
    state: data?.state && typeof data.state === "object" ? data.state : {},
    savedAtClient: data?.savedAtClient || null,
    deviceId: data?.deviceId || null
  };
}

function cleanState(state) {
  return JSON.parse(JSON.stringify(state || {}));
}

function isMeaningfullyEmpty(state) {
  return progressScore(state) === 0;
}

function progressScore(state) {
  const story = state?.story || {};
  const completedScenes = Array.isArray(story.completedSceneIds) ? story.completedSceneIds.length : 0;
  const unlockedScenes = Array.isArray(story.unlockedSceneIds) ? story.unlockedSceneIds.length : 0;
  const questLogs = Array.isArray(state?.completionLog) ? state.completionLog.length : 0;
  const externalLogs = Array.isArray(state?.externalCompletionLog) ? state.externalCompletionLog.length : 0;
  const memories = Array.isArray(state?.memories) ? state.memories.length : 0;

  return (
    completedScenes * 1000 +
    unlockedScenes * 200 +
    questLogs * 20 +
    externalLogs * 20 +
    memories * 50 +
    Math.max(0, Number(state?.characterXP || 0)) +
    Math.max(0, Number(state?.storyEnergy || 0)) +
    Math.max(0, Number(state?.coins || 0))
  );
}

function summarizeState(state, savedAt = null) {
  const story = state?.story || {};
  const sceneCount = Array.isArray(story.completedSceneIds) ? story.completedSceneIds.length : 0;
  const questCount = Array.isArray(state?.completionLog) ? state.completionLog.length : 0;
  const externalCount = Array.isArray(state?.externalCompletionLog) ? state.externalCompletionLog.length : 0;
  const xp = Math.max(0, Number(state?.characterXP || 0));
  const parts = [
    `${xp} Character XP`,
    `${sceneCount} story scene${sceneCount === 1 ? "" : "s"}`,
    `${questCount + externalCount} logged clear${questCount + externalCount === 1 ? "" : "s"}`
  ];
  if (savedAt) parts.push(`saved ${formatDateTime(savedAt)}`);
  return parts.join(" · ");
}

function fingerprint(value) {
  return stableStringify(value);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function getCloudMeta() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setCloudMeta(patch) {
  const meta = { ...getCloudMeta(), ...patch, deviceId: getDeviceId() };
  localStorage.setItem(CLOUD_META_KEY, JSON.stringify(meta));
}

function getDeviceId() {
  const meta = getCloudMeta();
  if (meta.deviceId) return meta.deviceId;
  const id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ ...meta, deviceId: id }));
  return id;
}

function backupLocal(reason) {
  try {
    localStorage.setItem(LOCAL_ROLLBACK_KEY, JSON.stringify({
      reason,
      createdAt: new Date().toISOString(),
      state: cleanState(app.getState())
    }));
  } catch (error) {
    console.warn("Could not create local rollback copy", error);
  }
}

function exportSave() {
  const payload = {
    format: "LifeRPGSave",
    schemaVersion: SAVE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state: cleanState(app.getState())
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `life-rpg-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  app.showToast("Save exported.");
}

async function importSaveFromFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const importedState = parsed?.format === "LifeRPGSave" ? parsed.state : parsed;

    if (!importedState || typeof importedState !== "object" || !Number.isFinite(Number(importedState.characterXP ?? 0))) {
      throw new Error("This file does not look like a Life RPG save.");
    }

    const okay = window.confirm("Import this save? Your current local save will be kept as a rollback copy first.");
    if (!okay) return;

    backupLocal("before-import");
    applyingRemote = true;
    app.replaceState(importedState, { suppressCloud: true, source: "import" });
    applyingRemote = false;

    if (currentUser && cloudReady) {
      await saveToCloud({ force: true, backupRemote: true, reason: "manual-import" });
    } else {
      setStatus(currentUser ? "saving" : "local", currentUser ? "Local safe · cloud pending" : "Local only", "Imported save is active locally.");
    }

    app.showToast("Save imported successfully.");
  } catch (error) {
    console.error(error);
    app.showToast(`Import failed: ${friendlyError(error)}`);
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function friendlyError(error) {
  if (!error) return "Unknown error";
  const map = {
    "auth/unauthorized-domain": "This GitHub Pages domain is not authorized in Firebase Authentication.",
    "auth/popup-blocked": "The browser blocked the Google sign-in popup.",
    "auth/network-request-failed": "Network connection failed.",
    "permission-denied": "Firestore denied access. Check the published security rules.",
    "unavailable": "Firebase is temporarily unavailable or this device is offline."
  };
  return map[error.code] || error.message || String(error);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function byId(id) {
  return document.getElementById(id);
}
