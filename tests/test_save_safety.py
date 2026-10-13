"""Browser regressions using synthetic saves and an in-memory Firebase stub.

Run: python3 -m unittest discover -s tests -p 'test_save_safety.py' -v
Requires Python Playwright and Chromium (CHROMIUM_PATH overrides the binary).
No Firebase requests or production browser data are used.
"""
import functools
import http.server
import os
import pathlib
import re
import subprocess
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
MAIN = "lifeRpgPrototypeV01"
RECOVERY = "lifeRpgPendingSaveV01"
ROLLBACK = "lifeRpgLocalRollbackV01"

STORAGE_FAILURES = """(() => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    const flags = window.storageFailures || {};
    if ((this === localStorage && flags.main && key === 'lifeRpgPrototypeV01') ||
        ((flags.backup || (this === localStorage && flags.localBackup)) && key === 'lifeRpgLocalRollbackV01') ||
        (this === localStorage && flags.meta && key === 'lifeRpgCloudMetaV01') ||
        (this === sessionStorage && flags.session)) {
      throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
    }
    return original.call(this, key, value);
  };
})();
"""

FIREBASE_STUB = """
const initializeApp = () => ({}), getAuth = () => ({}), getFirestore = () => ({});
class GoogleAuthProvider { setCustomParameters() {} }
const browserLocalPersistence = {}, setPersistence = async () => {};
const onAuthStateChanged = () => {}, signInWithPopup = async () => {}, signOut = async () => {};
const doc = (...args) => args, collection = (...args) => args, serverTimestamp = () => 0;
const getDoc = async () => ({exists: () => false});
window.cloudWrites = 0;
const runTransaction = async (db, callback) => {
  if (window.pauseCloudTransaction) await new Promise(resolve => { window.resumeCloudTransaction = resolve; });
  return callback({
  get: getDoc, set: () => { window.cloudWrites++; }, delete: () => {}
  });
};
"""

CLOUD_HOOKS = """
window.saveSafetyTest = {
  applyRemoteSave, useCloudConflictChoice, useLocalConflictChoice, backupLocal,
  importSaveFromFile, saveToCloud, setCloudMeta,
  conflict(remote) { currentUser = {uid:'synthetic-user'}; showConflict(remote); },
  status() { return {cloudReady, conflictOpen, knownRemoteRevision, applyingRemote}; },
  signedIn() { currentUser = {uid:'synthetic-user'}; cloudReady = true; }
};
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class SaveSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
            headless=True, args=["--no-sandbox"])
        baseline = os.environ.get("SAVE_SAFETY_BASELINE_REF")
        def source(name):
            return subprocess.check_output(["git", "show", f"{baseline}:{name}"], cwd=ROOT, text=True) if baseline else (ROOT / name).read_text()
        cls.app_source = source("app.js")
        cls.app_source = cls.app_source.replace('window.LifeRPGApp = {',
            'window.saveCodecTest = {serializeLocalState, persistenceStateSnapshot}; window.LifeRPGApp = {')
        # Keep the real app DOM but load only the directly affected modules.
        # Unrelated gameplay render loops and assets are outside these tests.
        html = (ROOT / "index.html").read_text()
        html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S)
        html = re.sub(r'<link\b[^>]*>', '', html)
        cls.html = html.replace('</body>', '<script src="/pako.min.js"></script>'
                               '<script src="/data/quests.js"></script>'
                               '<script src="/app.js"></script>'
                               '<script type="module" src="/cloud-save.js"></script></body>')
        cloud = source("cloud-save.js")
        cls.cloud = FIREBASE_STUB + re.sub(
            r'^import\s+.*?from\s+"[^"]+";', '', cloud, flags=re.M | re.S) + CLOUD_HOOKS

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(service_workers="block")
        self.addCleanup(self.context.close)
        self.context.add_init_script(STORAGE_FAILURES)
        self.context.route("**/*", self.route)
        self.page = self.context.new_page()
        self.page.set_default_timeout(10000)
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(f"http://127.0.0.1:{self.server.server_port}/", wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp && window.saveSafetyTest")
        # Let startup-derived UI settle before installing the failure flags.
        self.page.wait_for_timeout(250)
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")

    def tearDown(self):
        self.assertEqual([], self.errors, "Uncaught browser errors")

    def route(self, route):
        url = route.request.url
        if url == f"http://127.0.0.1:{self.server.server_port}/":
            route.fulfill(body=self.html, content_type="text/html")
        elif "/cloud-save.js" in url:
            route.fulfill(body=self.cloud, content_type="text/javascript")
        elif "/app.js" in url:
            route.fulfill(body=self.app_source, content_type="text/javascript")
        elif "/pako.min.js" in url and getattr(self, 'block_pako', False):
            route.abort()
        elif route.request.resource_type in ("image", "media", "font"):
            route.abort()
        elif not url.startswith(f"http://127.0.0.1:{self.server.server_port}/"):
            route.abort()
        else:
            route.continue_()

    def remote(self):
        return self.page.evaluate("""() => {
          const state = JSON.parse(JSON.stringify(LifeRPGApp.getState()));
          state.characterXP = 456;
          return {state, revision:7, savedAtClient:'2026-10-13T12:00:00Z'};
        }""")

    def test_quota_failure_recovers_latest_change_on_reload(self):
        raw = self.page.evaluate(f"localStorage.getItem('{MAIN}')")
        self.assertFalse(self.page.evaluate("""() => {
          storageFailures = {main:true};
          LifeRPGApp.getState().profile.name = 'Synthetic unsaved change';
          return LifeRPGApp.saveState();
        }"""))
        self.assertEqual(raw, self.page.evaluate(f"localStorage.getItem('{MAIN}')"))
        self.page.reload()
        self.page.wait_for_function("window.LifeRPGApp")
        self.assertEqual('Synthetic unsaved change', self.page.evaluate("LifeRPGApp.getState().profile.name"))

    def test_replace_failure_keeps_old_state_and_reports_failure(self):
        before = self.page.evaluate("LifeRPGApp.getState().characterXP")
        self.page.evaluate("storageFailures = {main:true}")
        self.assertFalse(self.page.evaluate("r => LifeRPGApp.replaceState(r.state)", self.remote()))
        self.assertEqual(before, self.page.evaluate("LifeRPGApp.getState().characterXP"))

    def test_cloud_choice_backup_failure_keeps_conflict_and_local_state(self):
        before = self.page.evaluate("LifeRPGApp.getState().characterXP")
        self.page.evaluate("r => saveSafetyTest.conflict(r)", self.remote())
        self.page.evaluate("storageFailures = {backup:true}")
        self.page.evaluate("saveSafetyTest.useCloudConflictChoice()")
        status = self.page.evaluate("saveSafetyTest.status()")
        self.assertTrue(status['conflictOpen'])
        self.assertFalse(status['cloudReady'])
        self.assertEqual(before, self.page.evaluate("LifeRPGApp.getState().characterXP"))

    def test_cloud_choice_write_failure_does_not_claim_synced(self):
        before = self.page.evaluate("LifeRPGApp.getState().characterXP")
        self.page.evaluate("r => saveSafetyTest.conflict(r)", self.remote())
        self.page.evaluate("storageFailures = {main:true}")
        self.page.evaluate("saveSafetyTest.useCloudConflictChoice()")
        status = self.page.evaluate("saveSafetyTest.status()")
        self.assertTrue(status['conflictOpen'])
        self.assertFalse(status['cloudReady'])
        self.assertEqual(before, self.page.evaluate("LifeRPGApp.getState().characterXP"))
        self.assertIsNotNone(self.page.evaluate(f"localStorage.getItem('{ROLLBACK}')"))

    def test_failed_remote_restore_pauses_previously_ready_cloud(self):
        self.page.evaluate("saveSafetyTest.signedIn(); storageFailures = {main:true}")
        self.assertFalse(self.page.evaluate("r => saveSafetyTest.applyRemoteSave(r, 'synthetic-restore')", self.remote()))
        self.assertFalse(self.page.evaluate("LifeRPGCloudStatus.snapshot().ready"))

    def test_recovery_survives_repeated_reload_while_quota_remains_full(self):
        self.page.evaluate("""() => {
          storageFailures = {main:true};
          LifeRPGApp.getState().profile.name = 'Pending across reloads';
          LifeRPGApp.saveState();
        }""")
        self.context.add_init_script("window.storageFailures = {main:true};")
        for _ in range(2):
            self.page.reload(wait_until="domcontentloaded")
            self.page.wait_for_function("window.LifeRPGApp")
            self.assertEqual('Pending across reloads', self.page.evaluate("LifeRPGApp.getState().profile.name"))
            self.assertTrue(self.page.evaluate("LifeRPGApp.hasPendingLocalSave()"))
        self.assertTrue(self.page.evaluate("""() => {
          storageFailures = {};
          return LifeRPGApp.saveState({suppressCloud:true});
        }"""))
        self.assertIsNone(self.page.evaluate(f"sessionStorage.getItem('{RECOVERY}')"))
        self.assertEqual(0, self.page.locator('#localSaveWarning').count())

    def test_both_storages_fail_warn_export_and_do_not_emit_success(self):
        result = self.page.evaluate("""() => {
          let successes = 0;
          window.addEventListener('life-rpg:state-persisted', () => successes++);
          storageFailures = {main:true, session:true};
          LifeRPGApp.getState().profile.name = 'Only in memory';
          const saved = LifeRPGApp.saveState();
          const event = new Event('beforeunload', {cancelable:true});
          window.dispatchEvent(event);
          return {saved, successes, warns:event.defaultPrevented};
        }""")
        self.assertEqual({'saved':False, 'successes':0, 'warns':True}, result)
        self.assertIn('only in memory', self.page.locator('#localSaveWarning').inner_text())
        with self.page.expect_download() as download:
            self.page.locator('#localSaveWarning button').click()
        import json
        exported = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual('Only in memory', exported['state']['profile']['name'])

    def test_session_backup_fallback_and_successful_cloud_restore_reload(self):
        self.page.evaluate("r => saveSafetyTest.conflict(r)", self.remote())
        self.page.evaluate("storageFailures = {localBackup:true}")
        self.page.evaluate("saveSafetyTest.useCloudConflictChoice()")
        self.assertIsNotNone(self.page.evaluate(f"sessionStorage.getItem('{ROLLBACK}')"))
        self.assertFalse(self.page.evaluate("saveSafetyTest.status().conflictOpen"))
        self.assertTrue(self.page.evaluate("LifeRPGCloudStatus.snapshot().ready"))
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp")
        self.assertEqual(456, self.page.evaluate("LifeRPGApp.getState().characterXP"))

    def test_import_failure_keeps_state_and_never_uploads(self):
        before = self.page.evaluate("LifeRPGApp.getState().characterXP")
        self.page.on('dialog', lambda dialog: dialog.accept())
        self.page.evaluate("storageFailures = {main:true}; saveSafetyTest.signedIn()")
        self.page.evaluate("""async r => {
          await saveSafetyTest.importSaveFromFile({target:{value:'synthetic', files:[
            {text:async () => JSON.stringify({format:'LifeRPGSave',state:r.state})}
          ]}});
        }""", self.remote())
        self.assertEqual(before, self.page.evaluate("LifeRPGApp.getState().characterXP"))
        self.assertEqual(0, self.page.evaluate("cloudWrites"))
        self.assertFalse(self.page.evaluate("saveSafetyTest.status().applyingRemote"))
        self.assertIn('Import failed', self.page.locator('#toast').inner_text())

    def test_local_conflict_choice_failure_stays_open_without_cloud_write(self):
        self.page.evaluate("r => saveSafetyTest.conflict(r)", self.remote())
        self.page.evaluate("""() => {
          storageFailures = {main:true};
          LifeRPGApp.getState().profile.name = 'Pending local choice';
          LifeRPGApp.saveState();
        }""")
        self.page.evaluate("saveSafetyTest.useLocalConflictChoice()")
        self.assertTrue(self.page.evaluate("saveSafetyTest.status().conflictOpen"))
        self.assertEqual(0, self.page.evaluate("cloudWrites"))

    def test_quota_retry_and_metadata_failure_preserve_rollback(self):
        self.page.evaluate(f"localStorage.setItem('{ROLLBACK}', 'synthetic previous backup')")
        self.page.evaluate("""() => {
          storageFailures = {main:true, meta:true};
          LifeRPGApp.saveState();
          saveSafetyTest.setCloudMeta({lastSyncedRevision:123});
        }""")
        self.assertEqual('synthetic previous backup', self.page.evaluate(f"localStorage.getItem('{ROLLBACK}')"))

    def test_failed_local_save_during_cloud_upload_is_not_reported_synced(self):
        self.page.evaluate("""() => {
          saveSafetyTest.signedIn();
          pauseCloudTransaction = true;
          window.uploadResult = saveSafetyTest.saveToCloud({force:true}).catch(error => {window.uploadError = String(error);});
        }""")
        self.page.wait_for_function("!!window.resumeCloudTransaction || !!window.uploadError")
        self.assertIsNone(self.page.evaluate("window.uploadError || null"))
        self.page.evaluate("""() => {
          storageFailures = {main:true};
          LifeRPGApp.getState().profile.name = 'Changed during upload';
          LifeRPGApp.saveState();
          resumeCloudTransaction();
        }""")
        self.page.evaluate("uploadResult")
        self.assertEqual('Local save failed', self.page.locator('#cloudSaveStatus').inner_text())
        self.assertFalse(self.page.evaluate("LifeRPGCloudStatus.snapshot().ready"))

    def test_legacy_compact_deflate_roundtrip_and_idempotent_reload(self):
        for format_name in ('legacy', 'compact', 'deflate'):
            actual_format = self.page.evaluate("""format => {
              const state = saveCodecTest.persistenceStateSnapshot();
              state.profile.name = 'Synthetic ' + format;
              state.syntheticSafetyData = {receipts:['stable-id'], nested:{value:42}};
              let raw;
              if (format === 'legacy') raw = JSON.stringify(state);
              else {
                const pako = window.pako;
                if (format === 'compact') window.pako = undefined;
                try { raw = saveCodecTest.serializeLocalState(state); }
                finally { window.pako = pako; }
              }
              localStorage.setItem('lifeRpgPrototypeV01', raw);
              return JSON.parse(raw).__lifeRpgLocalSaveFormat || 'legacy';
            }""", format_name)
            self.assertEqual({'legacy':'legacy','compact':'life-rpg-local-compact-v2',
                              'deflate':'life-rpg-local-deflate-v3'}[format_name], actual_format)
            for _ in range(2):
                self.page.reload(wait_until="domcontentloaded")
                self.page.wait_for_function("window.LifeRPGApp")
                self.assertEqual('Synthetic ' + format_name, self.page.evaluate("LifeRPGApp.getState().profile.name"))
                self.assertEqual({'receipts':['stable-id'], 'nested':{'value':42}},
                                 self.page.evaluate("LifeRPGApp.getState().syntheticSafetyData"))

    def test_invalid_save_stays_write_protected(self):
        self.page.evaluate(f"localStorage.setItem('{MAIN}', '{{broken synthetic save')")
        self.page.on('dialog', lambda dialog: dialog.dismiss())
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp")
        self.assertFalse(self.page.evaluate("LifeRPGApp.saveState()"))
        self.assertEqual('{broken synthetic save', self.page.evaluate(f"localStorage.getItem('{MAIN}')"))

    def test_missing_pako_does_not_overwrite_deflate_save(self):
        raw = self.page.evaluate(f"localStorage.getItem('{MAIN}')")
        self.assertIn('life-rpg-local-deflate-v3', raw)
        self.block_pako = True
        self.page.on('dialog', lambda dialog: dialog.dismiss())
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp")
        self.assertFalse(self.page.evaluate("LifeRPGApp.saveState()"))
        self.assertEqual(raw, self.page.evaluate(f"localStorage.getItem('{MAIN}')"))

    def test_recovery_does_not_overwrite_another_tab_save(self):
        self.page.evaluate("""() => {
          storageFailures = {main:true};
          LifeRPGApp.getState().profile.name = 'Pending recovery';
          LifeRPGApp.saveState();
          storageFailures = {};
          const other = saveCodecTest.persistenceStateSnapshot();
          other.profile.name = 'Different tab progress';
          localStorage.setItem('lifeRpgPrototypeV01', saveCodecTest.serializeLocalState(other));
        }""")
        raw = self.page.evaluate(f"localStorage.getItem('{MAIN}')")
        pending = self.page.evaluate(f"sessionStorage.getItem('{RECOVERY}')")
        self.page.on('dialog', lambda dialog: dialog.accept() if dialog.type == 'beforeunload' else dialog.dismiss())
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp")
        self.assertFalse(self.page.evaluate("LifeRPGApp.saveState()"))
        self.assertEqual(raw, self.page.evaluate(f"localStorage.getItem('{MAIN}')"))
        self.assertEqual(pending, self.page.evaluate(f"sessionStorage.getItem('{RECOVERY}')"))


if __name__ == "__main__":
    unittest.main()
