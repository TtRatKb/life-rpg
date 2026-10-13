"""Series regressions: real affected scripts / DOM, synthetic saves, mocked Firebase.
TVmaze cases are deterministic mocks, never live provider QA.

Run: python3 -m unittest discover -s tests -p 'test_series_library.py' -v
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
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, *args):
        pass


class SeriesLibraryTests(unittest.TestCase):
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
        baseline = None
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
                               '<script src="/series-library.js"></script>'
                               '<script src="/time.js"></script><script src="/my-week.js"></script>'
                               '<script src="/daily.js"></script><script src="/skills.js"></script>'
                               '<script type="module" src="/cloud-save.js"></script></body>')
        cls.daily_source = (ROOT / 'daily.js').read_text().replace('window.LifeRPGDaily = {',
            'window.seriesDailyTest = {eligibleSeries,buildPicks,scoreSeries,pickCompletion,makePickFromCandidate,sourceAllowedForSlot}; window.LifeRPGDaily = {')
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
        self.page.wait_for_function("window.LifeRPGSeries && window.seriesDailyTest && window.LifeRPGSkills && window.saveSafetyTest")
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
        elif "/daily.js" in url:
            route.fulfill(body=self.daily_source, content_type="text/javascript")
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


    def make(self, **options):
        return self.page.evaluate("""spec => {
          const r=LifeRPGSeries.addItem({title:'Synthetic Cozy Series',ended:true,seasons:[{number:1,episodeCount:2,ended:true,minutes:24}],...spec});
          window.seriesId=r.item.id; return r.item;
        }""", options)

    def test_episode_dedupe_undo_redo_milestones_rewatch_and_reload(self):
        self.make()
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,root=LifeRPGApp.getState(),item=a.find(seriesId),ep=item.seasons[0].episodes;
          const base=root.characterXP,coins=root.coins;
          const first=a.logEpisode(item.id,ep[0].id),duplicate=a.logEpisode(item.id,ep[0].id);
          const firstXP=root.characterXP-base;
          const last=a.logEpisode(item.id,ep[1].id),completed=root.characterXP-base;
          LifeRPGSkills.rebuild();
          const skillEvents=root.skills.events.filter(e=>e.source==='series');
          const milestones=root.rewardLedger.events.filter(e=>e.source==='series-milestone').length;
          a.undo(last.log.id);const undone=root.characterXP-base;
          a.logEpisode(item.id,ep[1].id);const redone=root.characterXP-base;
          a.startRewatch(item.id);a.logEpisode(item.id,ep[0].id);a.logEpisode(item.id,ep[1].id);
          const repeat=root.characterXP-base,history=a.getLogs().length;
          return {firstXP,completed,undone,redone,repeat,history,milestones,duplicate:duplicate.duplicate,skillCount:skillEvents.length,
            skillIds:skillEvents.map(e=>e.skillId),coins:root.coins-coins};
        }""")
        self.assertEqual(result, dict(firstXP=15,completed=50,undone=15,redone=50,repeat=80,history=4,milestones=2,duplicate=True,skillCount=2,skillIds=['recreation-play','recreation-play'],coins=50))
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries && window.LifeRPGSkills')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),4)
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary.items[0].watchCycles.length'),2)

    def test_unknown_ongoing_specials_and_historical_import(self):
        self.make(ended=False,seasons=[dict(number=1,episodeCount=None,ended=False)])
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,item=a.find(seriesId),root=LifeRPGApp.getState(),base=root.characterXP;
          const e=a.addEpisode(item.id,item.seasons[0].id,{}).episode;
          a.logEpisode(item.id,e.id,{historical:true});
          const blocked=a.updateItem(item.id,{status:'completed'});
          const review=a.saveReview(item.id,8,'Synthetic notes'),edit=a.saveReview(item.id,9,'');
          return {xp:root.characterXP-base,status:a.find(item.id).status,blocked:blocked.ok,review:edit.ok,notes:a.find(item.id).review.notes,
             milestones:Object.keys(a.find(item.id).milestones).length};
        }""")
        self.assertEqual(result,dict(xp=0,status='watching',blocked=False,review=True,notes='',milestones=0))
        self.make(title='Synthetic Ended',seasons=[dict(number=1,episodeCount=1,ended=True,episodes=[dict(number=1),dict(number=None,special=True)])])
        self.assertTrue(self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId);a.logEpisode(i.id,i.seasons[0].episodes[0].id);return a.complete(i);}"""))

    def test_quota_failure_rolls_back_rewards_and_keeps_form_input(self):
        self.make()
        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        self.page.locator('#seriesReviewForm textarea').fill('Keep this synthetic draft')
        self.page.evaluate('window.storageFailures={main:true}')
        self.page.locator('#seriesReviewForm button').first.click()
        self.assertEqual(self.page.locator('#seriesReviewForm textarea').input_value(),'Keep this synthetic draft')
        self.assertIn('not saved',self.page.locator('#seriesDetailNotice').inner_text())
        result=self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),before=LifeRPGApp.getState().characterXP;const r=a.logEpisode(i.id,i.seasons[0].episodes[0].id);return {ok:r.ok,xp:LifeRPGApp.getState().characterXP-before,count:a.getLogs().length};}""")
        self.assertEqual(result,dict(ok=False,xp=0,count=0))
        self.page.evaluate('window.storageFailures={}')
        self.page.locator('#seriesReviewForm button').first.click()
        self.assertEqual(self.page.evaluate('LifeRPGSeries.find(seriesId).review.notes'),'Keep this synthetic draft')
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),0)

    def test_daily_concrete_episode_and_week_time_semantics(self):
        self.make(comfort=True,motivation='high',priority='favorite')
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),t=seriesDailyTest,root=LifeRPGApp.getState();
          const pick=t.makePickFromCandidate('joy',{sourceType:'series',item:i},{energy:'low'});
          const initially=t.pickCompletion(pick).done;
          const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;root.dailyPlanner.days[key]={date:key,checkIn:{energy:'low',time:'some',stress:'high',obligations:'light'},picks:[pick]};LifeRPGDaily.render();
          const native=document.querySelector('[data-daily-series]')?.dataset.dailySeries===i.id;
          const start=new Date();start.setHours(20,30,0,0);const end=new Date(+start+24*60000);
          a.planEpisode(i.id,pick.seriesEpisodeId,start.toISOString(),end.toISOString());
          const before=root.characterXP,at=new Date(Date.now()+1);a.logEpisode(i.id,pick.seriesEpisodeId,{at:at.toISOString()});
          const done=t.pickCompletion(pick).done,after=root.characterXP;LifeRPGDaily.render();t.pickCompletion(pick);
          const history=a.getLogs()[0];return {initially,native,done,delta:after-before,unchanged:root.characterXP===after,
            noFakeTime:root.timeTracking.entries.length===0,unknownMinutes:history.minutes===null,noInterval:history.startAt===null,
            care:t.sourceAllowedForSlot('series',i,'gentle',{energy:'low'}),noFocus:!t.sourceAllowedForSlot('series',i,'focus',{}),week:document.getElementById('seriesWeek').textContent};
        }""")
        for field in ['native','done','unchanged','noFakeTime','unknownMinutes','noInterval','care','noFocus']:
            self.assertTrue(result[field],field)
        self.assertFalse(result['initially'])
        self.assertEqual(result['delta'],15)
        self.assertIn('Planned',result['week'])
        self.assertIn('Only completed at',result['week'])
        self.assertIn('20:30',result['week'])
        self.assertGreater(self.page.locator('#weekColumns [data-week-series]').count(),0)
        self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),end=new Date(Date.now()-60000),start=new Date(+end-23*60000);a.logEpisode(i.id,i.seasons[0].episodes[1].id,{startAt:start.toISOString(),endAt:end.toISOString()});}""")
        self.assertIn('Confirmed interval',self.page.locator('#seriesWeek').inner_text())
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().timeTracking.entries.length'),0)

    def test_provider_and_season_edits_keep_ids_receipts_and_sequels(self):
        self.make()
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),ep=i.seasons[0].episodes[0],log=a.logEpisode(i.id,ep.id).log;
          const before=LifeRPGApp.getState().characterXP,receipt=log.rewardEventId;
          a.updateSeason(i.id,i.seasons[0].id,{number:2,episodeCount:3,ended:false});
          a.updateEpisode(i.id,ep.id,{number:7,minutes:30});
          const other=a.addItem({title:'Synthetic Sequel',seasons:[]}).item;a.linkSequel(i.id,other.id);
          a.logEpisode(i.id,ep.id);return {same:a.getLogs()[0].rewardEventId===receipt,delta:LifeRPGApp.getState().characterXP-before,logs:a.getLogs().length,
             sameEpisode:a.find(i.id).seasons[0].episodes[0].id===ep.id,links:a.find(i.id).links.length,items:LifeRPGApp.getState().seriesLibrary.items.length};
        }""")
        self.assertEqual(result,dict(same=True,delta=0,logs=1,sameEpisode=True,links=1,items=2))

    def test_cross_source_quest_both_orders_and_no_japanese_skill(self):
        self.make(recovery=True)
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),base=root.characterXP;
          const template=LifeRPGApp.getQuestCatalog().find(q=>q.name.includes('Comfort Episode'));const quest={...template,id:'q-custom-watch-test',manualStatus:'Available',systemRole:'',custom:true};root.customQuests.push(quest);root.selectedQuestIds.push(quest.id);
          LifeRPGApp.logQuestProgress(quest.id,1);a.logEpisode(i.id,i.seasons[0].episodes[0].id);
          LifeRPGSkills.rebuild();
          const watching=root.rewardLedger.events.filter(e=>e.dedupeFamily==='watching');
          return {duplicates:watching.filter(e=>e.duplicate).length,series:root.skills.events.filter(e=>e.source==='series').length,
            japanese:root.skills.events.filter(e=>e.source==='series'&&e.skillId.startsWith('japanese')).length};
        }""")
        self.assertEqual(result,dict(duplicates=1,series=0,japanese=0))
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries && window.LifeRPGSkills')
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=LifeRPGApp.getState().seriesLibrary.items[0],root=LifeRPGApp.getState();
          root.rewardLedger.events=root.rewardLedger.events.filter(e=>e.dedupeFamily!=='watching');root.completionLog=[];
          a.logEpisode(i.id,i.seasons[0].episodes[1].id);const base=root.characterXP;
          const q=root.customQuests.find(q=>q.id==='q-custom-watch-test');root.selectedQuestIds.push(q.id);LifeRPGApp.logQuestProgress(q.id,1);
          LifeRPGSkills.rebuild();return {delta:root.characterXP-base,skill:root.skills.events.filter(e=>e.source==='series').map(e=>e.skillId),quest:root.skills.events.filter(e=>e.source==='quest').length};
        }""")
        self.assertEqual(result,dict(delta=0,skill=['recovery-unwinding'],quest=0))

    def test_codec_old_save_device_restore_and_cloud_snapshot(self):
        self.make()
        self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId);a.logEpisode(i.id,i.seasons[0].episodes[0].id);a.saveReview(i.id,8,'Synthetic review');}""")
        snapshot=self.page.evaluate('JSON.parse(JSON.stringify(LifeRPGApp.getState()))')
        for use_compression in [False,True]:
            result=self.page.evaluate("""compress => {const p=window.pako;if(!compress)window.pako=null;const state=saveCodecTest.persistenceStateSnapshot(),raw=saveCodecTest.serializeLocalState(state);window.pako=p;localStorage.setItem('lifeRpgPrototypeV01',raw);return JSON.parse(raw).__lifeRpgLocalSaveFormat;}""",use_compression)
            self.assertIn(result,['life-rpg-local-compact-v2','life-rpg-local-deflate-v3'])
            self.page.reload()
            self.page.wait_for_function('window.LifeRPGSeries')
            self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary'),snapshot['seriesLibrary'])
        self.page.evaluate("""() => {delete LifeRPGApp.getState().seriesLibrary;LifeRPGApp.saveState();}""")
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs()'),[])
        # Restore is intentionally a synthetic Firebase snapshot, using the existing conflict path.
        self.page.evaluate("""s => {saveSafetyTest.conflict({state:s,revision:7,savedAtClient:new Date().toISOString()});}""",snapshot)
        self.page.evaluate('saveSafetyTest.useCloudConflictChoice()')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),1)
        item_id=snapshot['seriesLibrary']['items'][0]['id']
        episode_id=snapshot['seriesLibrary']['items'][0]['seasons'][0]['episodes'][0]['id']
        self.assertTrue(self.page.evaluate('([id,e]) => LifeRPGSeries.logEpisode(id,e).duplicate',[item_id,episode_id]))

    def test_catalog_mock_selection_unknown_values_and_offline_fallback(self):
        self.context.route('https://api.tvmaze.com/**',lambda route: route.fulfill(
            json=[dict(score=1,show=dict(id=123,name='Synthetic Match',premiered=None,runtime=None,averageRuntime=None,image=None,status='Running',url='https://www.tvmaze.com/shows/123')),dict(score=0.8,show=dict(id=456,name='Synthetic Wrong Match',premiered='2020-01-01',runtime=24,image=None,status='Ended',url='https://www.tvmaze.com/shows/456'))]))
        rows=self.page.evaluate("LifeRPGSeries.searchCatalog('synthetic')")
        self.assertEqual(len(rows),2)
        self.assertIsNone(rows[0]['minutes'])
        self.assertIsNone(rows[0]['year'])
        self.context.set_offline(True)
        self.page.evaluate('document.querySelector("[data-series-add]").click()')
        self.page.locator('#seriesAddForm input[name=title]').fill('Synthetic Offline Anime Part 2')
        self.page.locator('#seriesAddForm button').click()
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary.items[0].title'),'Synthetic Offline Anime Part 2')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs()'),[])

    def test_bulk_atomic_failure_and_review_no_rewards(self):
        self.make()
        result=self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),before=root.characterXP;
          const failed=a.logEpisodes(i.id,[i.seasons[0].episodes[0].id,'unavailable']);
          const count=a.getLogs().length,delta=root.characterXP-before;
          const ok=a.logEpisodes(i.id,i.seasons[0].episodes.map(e=>e.id),{minutes:24});
          const after=root.characterXP;a.saveReview(i.id,10,'Synthetic note');a.saveReview(i.id,null,'');
          return {failed:failed.ok,count,delta,ok:ok.ok,logs:a.getLogs().length,noReviewReward:after===root.characterXP};}""")
        self.assertEqual(result,dict(failed=False,count=0,delta=0,ok=True,logs=2,noReviewReward=True))

    def test_ui_touch_dialog_xss_and_unsaved_draft_survives_external_render(self):
        self.make(title='<img src=x onerror=alert(1)>')
        self.assertEqual(self.page.locator('#seriesBoard img').count(),0)
        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        self.assertTrue(self.page.locator('#seriesDetail').evaluate('(d)=>d.open'))
        self.page.locator('#seriesReviewForm textarea').fill('Unsubmitted synthetic text')
        self.page.evaluate('LifeRPGApp.saveState(); LifeRPGApp.renderAll();')
        self.assertEqual(self.page.locator('#seriesReviewForm textarea').input_value(),'Unsubmitted synthetic text')
        self.page.locator('#seriesDetail [data-series-close]').click()
        self.assertFalse(self.page.locator('#seriesDetail').evaluate('(d)=>d.open'))


    def test_series_export_import_roundtrip_without_repaying_rewards(self):
        import json
        self.make()
        self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId);a.logEpisode(i.id,i.seasons[0].episodes[0].id);a.saveReview(i.id,9,'Synthetic portable review');}""")
        before=self.page.evaluate('JSON.parse(JSON.stringify(LifeRPGApp.getState().seriesLibrary))')
        with self.page.expect_download() as download:
            self.page.evaluate("document.getElementById('exportSaveButton').click()")
        exported=json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(exported['state']['seriesLibrary'],before)
        self.page.on('dialog',lambda dialog:dialog.accept())
        self.page.evaluate("""async payload => {await saveSafetyTest.importSaveFromFile({target:{value:'synthetic',files:[{text:async()=>JSON.stringify(payload)}]}});}""",exported)
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary'),before)
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().characterXP'),exported['state']['characterXP'])
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary'),before)

    def test_undo_after_ledger_eviction_restores_only_owned_receipts(self):
        self.make()
        result=self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),before=root.characterXP;
          a.logEpisodes(i.id,i.seasons[0].episodes.map(e=>e.id));const after=root.characterXP;
          const log=a.getLogs()[1];root.rewardLedger.events=root.rewardLedger.events.filter(e=>!['series','series-milestone'].includes(e.source));
          const undo=a.undo(log.id),undone=root.characterXP;
          const redo=a.logEpisode(i.id,log.episodeId);LifeRPGSkills.rebuild();
          return {paid:after-before,undo:undo.ok,undone:undone-before,redo:redo.ok,restored:root.characterXP-before,events:root.skills.events.filter(e=>e.source==='series').length};}""")
        self.assertEqual(result,dict(paid=50,undo=True,undone=15,redo=True,restored=50,events=2))

    def test_specific_episode_timer_dedupe_both_orders(self):
        self.make(recovery=True)
        result=self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState();
          const end=new Date(),start=new Date(+end-24*60000);
          LifeRPGTime.logInterval({startAt:start.toISOString(),endAt:end.toISOString(),label:'Comfort episode',categoryId:'recovery',subcategory:'Other recovery'});
          a.logEpisode(i.id,i.seasons[0].episodes[0].id,{at:end.toISOString(),startAt:start.toISOString(),endAt:end.toISOString()});LifeRPGSkills.rebuild();
          return {dup:a.getLogs()[0].deduped,series:root.skills.events.filter(e=>e.source==='series').length,time:root.skills.events.filter(e=>e.source==='time').length};}""")
        self.assertEqual(result,dict(dup=False,series=0,time=1))
        # A separate synthetic isolated save exercises the reverse order.
        self.page.evaluate("""() => {const root=LifeRPGApp.getState();root.rewardLedger.events=[];root.timeTracking.entries=[];root.seriesLibrary.logs=[];}""")
        result=self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState();a.logEpisode(i.id,i.seasons[0].episodes[0].id);
          const end=new Date(),start=new Date(+end-24*60000),before=root.characterXP;
          LifeRPGTime.logInterval({startAt:start.toISOString(),endAt:end.toISOString(),label:'Comfort episode',categoryId:'recovery',subcategory:'Other recovery'});
          LifeRPGSkills.rebuild();return {delta:root.characterXP-before,series:root.skills.events.filter(e=>e.source==='series').length,time:root.skills.events.filter(e=>e.source==='time').length};}""")
        self.assertEqual(result,dict(delta=0,series=1,time=0))

    def test_catalog_snapshot_choice_loading_failure_rate_limit_and_no_overwrite(self):
        def catalog(route):
            url=route.request.url
            if '/search/shows' in url:
                route.fulfill(json=[dict(show=dict(id=123,name='Synthetic Catalog',premiered='2020-01-01',averageRuntime=24,image=None,status='Ended',url='https://www.tvmaze.com/shows/123'))])
            elif '/seasons' in url:
                route.fulfill(json=[dict(id=7,number=1,episodeOrder=None,endDate='2020-01-01')])
            else:
                route.fulfill(json=[dict(id=90,season=1,number=1,runtime=None),dict(id=91,season=1,number=None,runtime=10)])
        self.context.route('https://api.tvmaze.com/**',catalog)
        self.page.evaluate('document.querySelector("[data-series-add]").click()')
        self.page.locator('#seriesSearchForm input').fill('synthetic')
        self.page.locator('#seriesSearchForm button').click()
        self.page.locator('[data-series-catalog]').click()
        self.page.wait_for_function("document.getElementById('seriesSearchStatus').textContent.startsWith('Snapshot selected')")
        self.page.locator('#seriesAddForm button').click()
        item=self.page.evaluate('LifeRPGApp.getState().seriesLibrary.items[0]')
        self.assertEqual(item['provider']['id'],123)
        self.assertEqual(item['seasons'][0]['episodeCount'],1)
        self.assertTrue(item['seasons'][0]['episodes'][1]['special'])
        self.assertIn('TVmaze',self.page.locator('#seriesDetailBody').inner_text())
        self.page.evaluate("""id=>{const a=LifeRPGSeries,i=a.find(id);a.updateSeason(id,i.seasons[0].id,{episodeCount:3,ended:false});a.logEpisode(id,i.seasons[0].episodes[0].id);}""",item['id'])
        before=self.page.evaluate('JSON.stringify(LifeRPGApp.getState().seriesLibrary)')
        self.context.unroute('https://api.tvmaze.com/**',catalog)
        self.context.route('https://api.tvmaze.com/**',lambda route:route.fulfill(status=429,json={}))
        self.page.wait_for_timeout(1100)
        error=self.page.evaluate("LifeRPGSeries.searchCatalog('new synthetic').then(()=>null,e=>e.message)")
        self.assertIn('busy',error)
        self.assertEqual(self.page.evaluate('JSON.stringify(LifeRPGApp.getState().seriesLibrary)'),before)

    def test_phone_layout_and_core_pwa_asset_versions(self):
        self.page.set_viewport_size(dict(width=390,height=844))
        self.page.add_style_tag(path=str(ROOT/'series-library.css'))
        self.make()
        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        size=self.page.locator('#seriesDetail').bounding_box()
        self.assertLessEqual(size['width'],390)
        self.assertGreaterEqual(self.page.locator('#seriesReviewForm button').first.bounding_box()['height'],44)
        html=(ROOT/'index.html').read_text();sw=(ROOT/'service-worker.js').read_text()
        for name in ['series-library.js','series-library.css','app.js','daily.js','my-week.js','skills.js','time.js','pwa.js']:
            version='0.31.4-series2' if name in ['app.js','daily.js','series-library.js','series-library.css','pwa.js'] else '0.31.4-series1'
            self.assertIn(f'{name}?v={version}',html)
            self.assertIn(f'{name}?v={version}',sw)
        self.assertIn('life-rpg-v0.31.4-series2',sw)
        self.assertIn('const VERSION = "0.31.4-series2"',(ROOT/'pwa.js').read_text())

    def test_complete_local_bootstrap_with_external_services_blocked(self):
        # Real index and all local modules. Firebase stays mocked; service workers stay blocked.
        self.html=(ROOT/'index.html').read_text()
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSeries && window.LifeRPGDaily && window.LifeRPGSkills')
        self.page.wait_for_timeout(1200)
        self.assertEqual(self.page.locator('#seriesShelf').count(),1)
        self.make()
        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        self.assertTrue(self.page.locator('#seriesDetail').evaluate('(d)=>d.open'))


    def test_want_to_watch_native_daily_invitation_and_first_log(self):
        self.make(status='want',comfort=False,motivation='high',priority='favorite')
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),t=seriesDailyTest;
          const comfort=a.addItem({title:'Synthetic Comfort',status:'watching',comfort:true,seasons:[{number:1,episodeCount:2}]}).item;
          a.addItem({title:'Synthetic Unknown Want',status:'want',seasons:[]});
          const eligible=a.eligibleItems().map(x=>x.id),before=root.characterXP;
          root.selectedQuestIds=[];
          const checkIn={energy:'low',stress:'high',time:'decent',obligations:'open',mood:'okay',sleep:'fine'};
          const picks=t.buildPicks(checkIn,[],{},new Set(LifeRPGApp.getQuestCatalog().map(q=>q.id))),pick=picks.find(p=>p.sourceId===i.id);
          if(!pick)throw new Error('Want title missing from real candidate pipeline');
          const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
          root.dailyPlanner.days[key]={date:key,checkIn,picks:[pick]};LifeRPGDaily.render();
          const suggestedStatus=i.status,initial=t.pickCompletion(pick).done,optionalBefore=t.sourceAllowedForSlot('series',i,'gentle',checkIn);
          document.querySelector('[data-daily-series]').click();
          const selectedStatus=a.find(i.id).status,selectionXP=root.characterXP-before;
          const log=a.logEpisode(i.id,pick.seriesEpisodeId),duplicate=a.logEpisode(i.id,pick.seriesEpisodeId);
          return {eligible:eligible.includes(i.id)&&eligible.includes(comfort.id)&&eligible.length===2,suggestedStatus,selectedStatus,selectionXP,
            initial,done:t.pickCompletion(pick).done,delta:root.characterXP-before,duplicate:duplicate.duplicate,
            optional:optionalBefore,focus:t.sourceAllowedForSlot('series',i,'focus',checkIn),cycle:log.log.watchCycleId===pick.seriesCycleId};
        }""")
        self.assertEqual(result,dict(eligible=True,suggestedStatus='want',selectedStatus='watching',selectionXP=0,initial=False,done=True,delta=15,duplicate=True,optional=True,focus=False,cycle=True))

    def test_partial_rewatch_keeps_first_history_and_returns_without_rewards(self):
        self.make(seasons=[dict(number=1,episodeCount=1,ended=True),dict(number=2,episodeCount=2,ended=True)])
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),base=root.characterXP,first=i.activeCycleId,ep=i.seasons.flatMap(s=>s.episodes);
          const original=a.logEpisode(i.id,ep[0].id).log,receipt=JSON.stringify(i.milestones);
          const rewatch=a.startRewatch(i.id),second=rewatch.cycle.id;
          const duplicate=a.startRewatch(i.id),sameEmptyCycle=duplicate.cycle.id===second;
          a.logEpisodes(i.id,ep.map(e=>e.id));const rewatchXP=root.characterXP-base;
          const noFirstBonus=JSON.stringify(i.milestones)===receipt,coinsBefore=root.coins;
          a.activateCycle(i.id,first);const resumed=a.nextEpisode(i).id===ep[1].id;
          const before=root.characterXP;a.activateCycle(i.id,first);const noSwitchReward=root.characterXP===before;
          a.logEpisodes(i.id,[ep[1].id,ep[2].id]);const completed=root.characterXP-base;
          a.activateCycle(i.id,second);a.logEpisode(i.id,ep[0].id);
          return {sameEmptyCycle,noFirstBonus,resumed,noSwitchReward,rewatchXP,completed,unchanged:root.characterXP-base===completed,
            firstReceipt:a.getLogs().find(l=>l.id===original.id).rewardEventId===original.rewardEventId,cycles:i.watchCycles.length,
            milestones:Object.keys(i.milestones).length,coinsBefore,coinsAfter:root.coins,logs:a.getLogs().length};
        }""")
        self.assertEqual(result,dict(sameEmptyCycle=True,noFirstBonus=True,resumed=True,noSwitchReward=True,rewatchXP=70,completed=120,unchanged=True,firstReceipt=True,cycles=2,milestones=3,coinsBefore=0,coinsAfter=50,logs=6))
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),6)
        self.page.evaluate("""() => {const a=LifeRPGSeries,i=LifeRPGApp.getState().seriesLibrary.items[0];a.open(i.id);document.getElementById('seriesCycleForm').elements.cycleId.value=i.watchCycles[0].id;document.getElementById('seriesCycleForm').requestSubmit();}""")
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().seriesLibrary.items[0].activeCycleId === LifeRPGApp.getState().seriesLibrary.items[0].watchCycles[0].id'),True)

    def test_failed_completion_restores_visible_resources_and_retains_draft(self):
        self.make(seasons=[dict(number=1,episodeCount=1,ended=True)])
        self.page.evaluate('LifeRPGApp.renderAll(); LifeRPGSeries.open(seriesId)')
        self.page.locator('#seriesReviewForm textarea').fill('Retain synthetic unsaved draft')
        result=self.page.evaluate("""() => {
          const app=LifeRPGApp,a=LifeRPGSeries,i=a.find(seriesId),root=app.getState();
          const ids=['coinsValue','coinsMoneyValue','xpLabel','profileXP','levelValue','storyEnergyValue','storyEnergyValueLarge'];
          const visible=()=>ids.map(id=>document.getElementById(id).textContent).concat(document.getElementById('xpBar').style.width);
          const before=visible(),xp=root.characterXP,coins=root.coins;let during=null,rewards=0;
          const award=app.awardActivity;app.awardActivity=(...args)=>{rewards++;return award(...args);};
          window.addEventListener('life-rpg:local-save-error',()=>{during=visible();},{once:true});
          storageFailures={main:true,session:true};const failed=a.logEpisode(i.id,i.seasons[0].episodes[0].id);
          app.awardActivity=award;
          return {failed:failed.ok,before,after:visible(),transientCoins:during[0],xp:root.characterXP-xp,coins:root.coins-coins,
            rewards,logs:a.getLogs().length,pending:app.hasPendingLocalSave()};
        }""")
        self.assertFalse(result['failed'])
        self.assertEqual(result['transientCoins'],'50')
        self.assertEqual(result['before'],result['after'])
        self.assertEqual((result['xp'],result['coins'],result['rewards'],result['logs'],result['pending']),(0,0,3,0,False))
        self.assertEqual(self.page.locator('#seriesReviewForm textarea').input_value(),'Retain synthetic unsaved draft')
        self.page.evaluate('storageFailures={}')
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),0)

    def test_archive_restore_preserves_ids_logs_rewards_reviews_and_plans(self):
        self.make(provider=dict(name='TVmaze',id=999,url='https://www.tvmaze.com/shows/999'))
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState(),ep=i.seasons[0].episodes;
          a.logEpisode(i.id,ep[0].id);a.saveReview(i.id,9,'Synthetic saved review');
          a.planEpisode(i.id,ep[1].id,new Date().toISOString(),new Date(Date.now()+120000).toISOString());
          const log=JSON.stringify(a.getLogs()),plans=JSON.stringify(a.getPlans()),before=root.characterXP;
          a.open(i.id);document.querySelector('[data-series-archive]').click();
          const hidden=!document.querySelector(`[data-series-open="${i.id}"]`),eligible=a.eligibleItems().some(x=>x.id===i.id);
          const blocked=a.logEpisode(i.id,ep[1].id).ok;
          const duplicate=a.addItem({title:'Synthetic duplicate catalog',provider:i.provider,seasons:[]}).ok;
          const archived=Boolean(a.find(i.id).archivedAt);
          document.querySelector('[data-series-restore]').click();
          const repeated=a.logEpisode(i.id,ep[0].id).duplicate;
          return {hidden,eligible,blocked,duplicate,archived,repeated,delta:root.characterXP-before,logs:JSON.stringify(a.getLogs())===log,
            plans:JSON.stringify(a.getPlans())===plans,review:a.find(i.id).review.notes,active:i.activeCycleId===a.find(i.id).activeCycleId};
        }""")
        self.assertEqual(result,dict(hidden=True,eligible=False,blocked=False,duplicate=False,archived=True,repeated=True,delta=0,logs=True,plans=True,review='Synthetic saved review',active=True))
        self.page.evaluate("""() => {const a=LifeRPGSeries,i=a.find(seriesId);a.archiveItem(i.id);document.getElementById('seriesDetail').close();document.getElementById('seriesShowArchived').checked=true;document.getElementById('seriesShowArchived').dispatchEvent(new Event('input',{bubbles:true}));}""")
        self.assertEqual(self.page.locator('[data-series-open]').count(),1)
        self.page.reload()
        self.page.wait_for_function('window.LifeRPGSeries')
        self.assertTrue(self.page.evaluate('Boolean(LifeRPGApp.getState().seriesLibrary.items[0].archivedAt)'))
        self.assertEqual(self.page.evaluate('LifeRPGSeries.getLogs().length'),1)

    def test_review_actions_roll_back_safely_with_pending_prior_progress(self):
        self.make()
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),root=LifeRPGApp.getState();storageFailures={main:true};
          root.profile.name='Synthetic pending unrelated progress';LifeRPGApp.saveState();
          const recovery=sessionStorage.getItem('lifeRpgPendingSaveV01'),cycle=i.activeCycleId;
          const rewatch=a.startRewatch(i.id),archive=a.archiveItem(i.id);
          return {rewatch:rewatch.ok,archive:archive.ok,recovery:sessionStorage.getItem('lifeRpgPendingSaveV01')===recovery,
            cycle:a.find(i.id).activeCycleId===cycle,archived:Boolean(a.find(i.id).archivedAt),pending:LifeRPGApp.hasPendingLocalSave(),name:root.profile.name};
        }""")
        self.assertEqual(result,dict(rewatch=False,archive=False,recovery=True,cycle=True,archived=False,pending=True,name='Synthetic pending unrelated progress'))


    def test_series_sidebar_navigation_and_native_deeplink(self):
        """The real grouped Life Hub must keep the Series entry on desktop and mobile."""
        self.make()
        # Without this script, tests see the raw HTML nav, which hides the real regression:
        # Life Hub rebuilds it and drops any view absent from GROUPS.
        self.page.add_script_tag(url='/life-hub-v314dk.js')
        self.page.wait_for_function('window.LifeRPGLifeHub && document.querySelector(".bottom-nav.life-hub-nav")')
        present = self.page.evaluate("""() => {
          const groups=LifeRPGLifeHub._test.groups;
          return groups.find(g=>g.id==='play')?.items.some(([id])=>id==='series')||false;
        }""")
        self.assertTrue(present)
        sidebar = self.page.locator('.life-nav-group[data-group="play"] .nav-button[data-view="series"]')
        self.assertEqual(sidebar.count(), 1)
        self.assertIn('Series', sidebar.inner_text())
        self.assertEqual(self.page.locator('#view-series #seriesShelf').count(), 1)
        self.assertEqual(self.page.locator('#view-library #seriesShelf').count(), 0)

        self.page.locator('.life-nav-parent[data-group="play"]').click()
        self.assertEqual(self.page.locator('#view-hub-play [data-life-route="series"]').count(), 1)
        self.page.locator('.life-nav-group[data-group="play"] .nav-button[data-view="library"]').click()
        self.assertTrue(self.page.locator('#view-library').evaluate('(el) => el.classList.contains("active")'))
        sidebar.click()
        self.assertTrue(self.page.locator('#view-series').evaluate('(el) => el.classList.contains("active")'))
        self.assertTrue(sidebar.evaluate('(el) => el.classList.contains("active")'))
        self.assertFalse(self.page.locator('#view-library').evaluate('(el) => el.classList.contains("active")'))

        self.page.locator('#view-series [data-series-open]').first.click()
        self.assertTrue(self.page.locator('#seriesDetail').evaluate('(el) => el.open'))
        self.page.locator('#seriesDetail [data-series-close]').click()
        self.page.locator('.life-nav-group[data-group="play"] .nav-button[data-view="games"]').click()
        self.assertTrue(self.page.locator('#view-games').evaluate('(el) => el.classList.contains("active")'))
        self.page.evaluate('LifeRPGSeries.open(seriesId, LifeRPGSeries.nextEpisode(LifeRPGSeries.find(seriesId)).id)')
        self.assertTrue(self.page.locator('#view-series').evaluate('(el) => el.classList.contains("active")'))
        self.assertTrue(sidebar.evaluate('(el) => el.classList.contains("active")'))

        # Mobile navigation builds an alternate submenu from GROUPS.
        self.page.locator('#seriesDetail [data-series-close]').click()
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.locator('.life-nav-parent[data-group="play"]').click()
        self.assertEqual(self.page.locator('#lifeHubMobileMenu [data-life-route="series"]').count(), 1)
        self.page.locator('#lifeHubMobileMenu [data-life-route="series"]').click()
        self.assertTrue(self.page.locator('#view-series').evaluate('(el) => el.classList.contains("active")'))

if __name__ == '__main__':
    unittest.main()
