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
            'window.seriesDailyTest = {eligibleSeries,buildPicks,scoreSeries,pickCompletion,makePickFromCandidate,sourceAllowedForSlot,plannerGroup,chooseSourceCandidate,promoteTopVeryHighActiveGame,todayKey}; window.LifeRPGDaily = {')
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
        elif "/assets/journal/" in url:
            route.continue_()
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

    def test_daily_no_duplicate_games_and_assessment_icon(self):
        """Library games are one Daily activity family even across different slots."""
        result=self.page.evaluate("""() => {
          const d=window.seriesDailyTest, a=LifeRPGApp, root=a.getState();
          const first={id:'synthetic-game-1',title:'Synthetic Cozy Game',status:'playing',
            role:'fun',motivation:'very_high',createdAt:Date.now()};
          const second={id:'synthetic-game-2',title:'Synthetic Other Game',status:'playing',
            role:'fun',motivation:'high',createdAt:Date.now()};
          root.gameLibrary=root.gameLibrary||{items:[]};
          root.gameLibrary.items=[first,second];
          const sameGroup=d.plannerGroup('game',first)===d.plannerGroup('game',second);
          const group=d.plannerGroup('game',first);
          const questGroup=d.plannerGroup('quest',{plannerGroup:group});
          const day=d.todayKey();
          root.dailyPlanner.days[day]={date:day,
            checkIn:{time:'some',energy:'okay',stress:'low',obligations:'light'},
            picks:[{slot:'joy',sourceType:'game',sourceId:first.id,rerolls:0}],
            rerollHistory:{}};
          const promoted=d.promoteTopVeryHighActiveGame({persistChange:false});
          const withUsedGroup=d.chooseSourceCandidate('gentle',
            root.dailyPlanner.days[day].checkIn,[],[],[],[first,second],[],[],new Set(),
            new Set(),null,['game'],['Hobbies'],[group]);
          return {sameGroup,questGroup,group,promoted,
            otherGameSelected:withUsedGroup?.sourceType==='game',
            icon:LifeRPGSkills.getSkill('assessment-feedback')?.icon,
            savedPickCount:root.dailyPlanner.days[day].picks.length};
        }""")
        self.assertTrue(result['sameGroup'])
        self.assertEqual(result['questGroup'],result['group'])
        self.assertFalse(result['promoted'])
        self.assertFalse(result['otherGameSelected'])
        self.assertEqual(result['savedPickCount'],1)
        self.assertEqual(result['icon'],'📝')

    def test_soundgarden_keeps_verified_artist_and_in_app_embed_after_oauth_expires(self):
        """Lost session credentials must not turn a verified artist into a new prompt."""
        self.page.evaluate("""() => {
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:false,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            embedUrl:track=>'https://open.spotify.com/embed/track/'+track.spotifyTrackId,
            toggle:async()=>{},ready:Promise.resolve()
          };
          const id='0123456789abcdefghijAB';
          LifeRPGApp.getState().soundGarden={
            version:4,
            artists:[{name:'Synthetic Artist',key:'synthetic artist',spotifyArtistId:id}],
            catalog:{'synthetic artist':[
              {key:'synthetic artist::song one',title:'Song One',artist:'Synthetic Artist',
                artistKey:'synthetic artist',spotifyArtistId:id,
                spotifyTrackId:'ZYXWVUTSRQPONMLKJIHGFE',album:'Synthetic Album'}
            ]},
            history:[],tracks:{},days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.evaluate('LifeRPGSoundGarden.open()')
        self.page.evaluate('LifeRPGSoundGarden.next()')
        self.page.wait_for_function("""() => {
          const m=LifeRPGSoundGarden.getData();
          return Boolean(m.current?.spotifyTrackId);
        }""",timeout=4000)
        self.assertFalse(self.page.locator('#sgIdentity').inner_text().strip())
        self.assertIn('✓',self.page.locator('#sgArtists').inner_text())
        self.assertIn('Zuordnung ändern',self.page.locator('#sgArtists').inner_text())
        self.assertIn('Song One',self.page.locator('#sgDaily').inner_text())
        self.assertFalse(self.page.locator('#sgEmbed').evaluate('(el)=>el.hidden'))
        iframe=self.page.locator('#sgEmbed iframe')
        self.assertEqual(iframe.count(),1)
        self.assertIn('ZYXWVUTSRQPONMLKJIHGFE',iframe.get_attribute('src'))
        self.assertEqual(self.page.evaluate(
          'LifeRPGSoundGarden.getData().artists[0].spotifyArtistId'),
          '0123456789abcdefghijAB')


    def test_soundgarden_never_queries_apple_for_new_discovery_without_spotify(self):
        """Disconnected discovery keeps legacy state and never creates Apple suggestions."""
        apple_calls=[]
        self.context.route("https://itunes.apple.com/**",lambda route: (apple_calls.append(route.request.url),route.abort()))
        self.page.evaluate("""() => {
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:false,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            embedUrl:track=>'https://open.spotify.com/embed/track/'+track.spotifyTrackId,
            ready:Promise.resolve()
          };
          LifeRPGApp.getState().soundGarden={
            version:4,artists:[{name:'Synthetic Artist',key:'synthetic artist',artistId:12345}],
            catalog:{'synthetic artist':[{
              key:'synthetic artist::old song',title:'Old Song',artist:'Synthetic Artist',
              artistKey:'synthetic artist',artistId:12345,storeUrl:'https://music.apple.com/de/song/123'
            }]},
            history:[{key:'synthetic artist::reviewed',title:'Reviewed',
              artist:'Synthetic Artist',status:'liked',at:123}],
            tracks:{'synthetic artist::reviewed':{status:'liked'}},
            rewardedSongs:{'synthetic artist::reviewed':'preserved'},
            days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.evaluate('LifeRPGSoundGarden.open()')
        self.page.evaluate('LifeRPGSoundGarden.next()')
        self.page.wait_for_function("""() =>
          !document.getElementById('sgStatus').hidden""")
        state=self.page.evaluate("""() => {
          const m=LifeRPGSoundGarden.getData();
          return {current:m.current??null,artistId:m.artists[0].artistId,
            history:m.history.length,reward:m.rewardedSongs['synthetic artist::reviewed'],
            oldCatalog:m.catalog['synthetic artist'][0].title,
            message:document.getElementById('sgStatus').textContent};
        }""")
        self.assertIsNone(state['current'])
        self.assertEqual(state['artistId'],12345)
        self.assertEqual(state['history'],1)
        self.assertEqual(state['reward'],'preserved')
        self.assertEqual(state['oldCatalog'],'Old Song')
        self.assertIn('Spotify',state['message'])
        self.assertEqual(apple_calls,[])

    def test_soundgarden_authenticated_search_returns_official_spotify_track(self):
        """Existing verified Spotify artist bypasses old Apple IDs and metadata."""
        apple_calls=[]
        self.context.route("https://itunes.apple.com/**",lambda route: (apple_calls.append(route.request.url),route.abort()))
        self.page.evaluate("""() => {
          const artistId='0123456789abcdefghijAB',trackId='ZYXWVUTSRQPONMLKJIHGFE';
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:true,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            embedUrl:t=>'https://open.spotify.com/embed/track/'+t.spotifyTrackId,
            ready:Promise.resolve(),api:async url=>{
              if(url.startsWith('/artists/'))return {items:[]};
              if(url.startsWith('/search?'))return {tracks:{items:[{
                id:trackId,name:'Official Spotify Song',artists:[{id:artistId}],
                album:{name:'Original Album'},external_urls:{spotify:'https://open.spotify.com/track/'+trackId}
              }],next:null}};
              throw new Error('Unexpected Spotify endpoint: '+url);
            }
          };
          LifeRPGApp.getState().soundGarden={
            version:4,artists:[{name:'Synthetic Artist',key:'synthetic artist',
              artistId:12345,spotifyArtistId:artistId}],
            catalog:{'synthetic artist':[{
              key:'synthetic artist::old song',title:'Old Song',artist:'Synthetic Artist',
              artistKey:'synthetic artist',artistId:12345
            }]},
            history:[],tracks:{},days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.evaluate('LifeRPGSoundGarden.open()')
        self.page.evaluate('LifeRPGSoundGarden.next()')
        self.page.wait_for_function("""() =>
          LifeRPGSoundGarden.getData().current?.spotifyTrackId==='ZYXWVUTSRQPONMLKJIHGFE'""")
        state=self.page.evaluate("""() => {
          const m=LifeRPGSoundGarden.getData();
          return {trackId:m.current.spotifyTrackId,artistId:m.artists[0].artistId,
            catalogIds:m.catalog['synthetic artist'].map(x=>x.spotifyTrackId)};
        }""")
        self.assertEqual(state['trackId'],'ZYXWVUTSRQPONMLKJIHGFE')
        self.assertEqual(state['artistId'],12345)
        self.assertEqual(state['catalogIds'],['ZYXWVUTSRQPONMLKJIHGFE'])
        self.assertEqual(apple_calls,[])

    def test_soundgarden_old_apple_suggestion_is_not_deleted_on_load(self):
        """An unreviewed legacy proposal keeps its manual rating and Spotify replacement."""
        self.page.evaluate("""() => {
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:false,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            embedUrl:t=>'https://open.spotify.com/embed/track/'+t.spotifyTrackId,
            ready:Promise.resolve()
          };
          LifeRPGApp.getState().soundGarden={
            version:4,artists:[{name:'Synthetic Artist',key:'synthetic artist',artistId:12345}],
            current:{key:'synthetic artist::old song',title:'Old Song',artist:'Synthetic Artist',
              artistKey:'synthetic artist',artistId:12345,storeUrl:'https://music.apple.com/de/song/123'},
            catalog:{},history:[],tracks:{},days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.evaluate('LifeRPGSoundGarden.open()')
        self.assertIn('Old Song',self.page.locator('#sgDaily').inner_text())
        self.assertEqual(self.page.locator('[data-sg="spotify-new"]').count(),1)
        self.assertEqual(self.page.evaluate('LifeRPGSoundGarden.getData().current.title'),'Old Song')

    def test_soundgarden_artist_reverify_same_spotify_id_keeps_current_and_cache(self):
        """Clicking 'Zuordnung ändern' must not destroy an already correct ID's work."""
        self.page.evaluate("""() => {
          const id='0123456789abcdefghijAB';
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:true,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            embedUrl:t=>'https://open.spotify.com/embed/track/'+t.spotifyTrackId,
            findArtists:async()=>[{id,name:'Synthetic Artist',images:[],genres:[]}],
            ready:Promise.resolve()
          };
          LifeRPGApp.getState().soundGarden={
            version:4,artists:[{name:'Synthetic Artist',key:'synthetic artist',spotifyArtistId:id}],
            catalog:{'synthetic artist':[{
              key:'synthetic artist::song one',title:'Song One',artist:'Synthetic Artist',
              artistKey:'synthetic artist',spotifyArtistId:id,spotifyTrackId:'ZYXWVUTSRQPONMLKJIHGFE'
            }]},
            artistGuides:{'synthetic artist':{spotifyArtistId:id,trackIds:['ZYXWVUTSRQPONMLKJIHGFE']}},
            current:{key:'synthetic artist::song one',title:'Song One',artist:'Synthetic Artist',
              artistKey:'synthetic artist',spotifyArtistId:id,spotifyTrackId:'ZYXWVUTSRQPONMLKJIHGFE'},
            history:[],tracks:{},days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.evaluate('LifeRPGSoundGarden.open()')
        self.page.evaluate('LifeRPGSoundGarden.verifyArtist("synthetic artist")')
        self.page.wait_for_function("""() =>
          document.getElementById('sgStatus').textContent.includes('zugeordnet')""")
        result=self.page.evaluate("""() => {
          const m=LifeRPGSoundGarden.getData();
          return {current:m.current?.spotifyTrackId,
            guide:m.artistGuides['synthetic artist']?.trackIds,
            cache:m.catalog['synthetic artist']?.map(t=>t.spotifyTrackId)};
        }""")
        self.assertEqual(result['current'],'ZYXWVUTSRQPONMLKJIHGFE')
        self.assertEqual(result['guide'],['ZYXWVUTSRQPONMLKJIHGFE'])
        self.assertEqual(result['cache'],['ZYXWVUTSRQPONMLKJIHGFE'])

    def test_soundgarden_artist_tools_explain_missing_spotify_connection(self):
        """The Artist Tools verify action opens the login UI instead of silently doing nothing."""
        self.page.evaluate("""() => {
          window.LifeRPGSpotifyBridge={
            state:()=>({connected:false,busy:false}),clientId:()=>'',redirect:()=>location.origin+'/',
            ready:Promise.resolve()
          };
          LifeRPGApp.getState().soundGarden={
            version:4,artists:[{name:'Synthetic Artist',key:'synthetic artist',spotifyArtistId:null}],
            history:[],tracks:{},days:{},recentArtists:[]
          };
        }""")
        self.page.add_script_tag(url='/sound-garden.js')
        self.page.add_script_tag(url='/sound-garden-library.js')
        self.page.locator('[data-sgl-action="artist"][data-key="synthetic artist"]').click()
        self.page.locator('[data-sgl-action="verify"][data-key="synthetic artist"]').click()
        self.assertTrue(self.page.locator('#sgDialog').evaluate('(el)=>el.open'))
        self.assertIn('nicht verbunden',self.page.locator('.sgl-notice').inner_text())
        self.assertTrue(self.page.locator('#sgConnect').is_visible())
        self.assertIsNone(self.page.evaluate('LifeRPGSoundGarden.getData().artists[0].spotifyArtistId'))

    def test_spotify_browser_player_activates_in_user_click_and_plays_official_id(self):
        """Synthetic Spotify SDK + fake API: activation before first async boundary."""
        self.page.evaluate("""() => {
          localStorage.setItem('lifeRpg.soundGarden.spotifyClientId.v1','0123456789abcdef0123456789abcdef');
          sessionStorage.setItem('lifeRpg.soundGarden.spotifySession.v1',
            JSON.stringify({access:'synthetic-token',refresh:'synthetic-refresh',until:Date.now()+3600000}));
          window.fakeSpotifyPlayback={activation:0,put:[]};
          window.Spotify={Player:class {
            constructor(){this.listeners={};}
            addListener(name,fn){this.listeners[name]=fn;}
            activateElement(){window.fakeSpotifyPlayback.activation++;return Promise.resolve();}
            async connect(){queueMicrotask(()=>this.listeners.ready?.({device_id:'synthetic-device'}));return true;}
            disconnect(){}
          }};
          const originalFetch=window.fetch;
          window.fetch=(url,config={})=>{
            if(String(url).startsWith('https://api.spotify.com/v1/me/player/play')){
              window.fakeSpotifyPlayback.put.push({
                url:String(url),body:JSON.parse(config.body||'{}'),
                activated:window.fakeSpotifyPlayback.activation>0
              });
              return Promise.resolve(new Response(null,{status:204}));
            }
            return originalFetch(url,config);
          };
        }""")
        self.page.add_script_tag(url='/sound-garden-spotify.js')
        result=self.page.evaluate("""async() => {
          await LifeRPGSpotifyBridge.ready;
          const ret=await LifeRPGSpotifyBridge.play({
            spotifyTrackId:'ZYXWVUTSRQPONMLKJIHGFE',title:'Test Track',artist:'Synthetic Artist'
          });
          return {ret,activation:window.fakeSpotifyPlayback.activation,
            puts:window.fakeSpotifyPlayback.put,
            ready:LifeRPGSpotifyBridge.state().ready};
        }""")
        self.assertFalse(result['ret']['needsGesture'])
        self.assertTrue(result['ready'])
        self.assertGreaterEqual(result['activation'],1)
        self.assertEqual(len(result['puts']),1)
        self.assertTrue(result['puts'][0]['activated'])
        self.assertEqual(result['puts'][0]['body']['uris'],['spotify:track:ZYXWVUTSRQPONMLKJIHGFE'])

    def test_skillpoint_exchange_debits_two_credits_one_and_persists(self):
        """One 2:1 exchange changes only available Realm talent points."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Work=12;
          root.skills.realmBonusPoints.Hobbies=3;
          root.skills.realmBonusPoints.Knowledge=5;
          root.story ||= {};
          root.story.exchangeTestMarker='unchanged relationship history';
          root.journal.entries['2020-02-02']={date:'2020-02-02',bookNote:'Unchanged diary'};
        }""")
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_style_tag(url='/skillpoint-exchange.css')
        self.page.add_script_tag(url='/skillpoint-exchange.js')
        self.assertEqual(self.page.locator('#pointExchangePanel').count(),1)
        self.assertEqual(self.page.locator('#pointExchangeSource').input_value(),'Work')
        self.assertEqual(self.page.locator('#pointExchangeTarget').input_value(),'Hobbies')
        self.page.evaluate("LifeRPGApp.showView('skills')")
        before=self.page.evaluate("""() => ({
          work:LifeRPGSkills.getRealmPoints('Work'),
          hobbies:LifeRPGSkills.getRealmPoints('Hobbies'),
          knowledge:LifeRPGSkills.getRealmPoints('Knowledge'),
          xp:LifeRPGApp.getState().characterXP,
          skillTotal:JSON.stringify(LifeRPGSkills.getTotals()),
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          story:LifeRPGApp.getState().story.exchangeTestMarker,
          journal:LifeRPGApp.getState().journal.entries['2020-02-02'].bookNote,
          originalBonus:LifeRPGApp.getState().skills.realmBonusPoints.Work
        })""")
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGPointExchange.exchange('Work','Hobbies',{confirmed:true})"""))
        after=self.page.evaluate("""() => ({
          work:LifeRPGSkills.getRealmPoints('Work'),
          hobbies:LifeRPGSkills.getRealmPoints('Hobbies'),
          knowledge:LifeRPGSkills.getRealmPoints('Knowledge'),
          xp:LifeRPGApp.getState().characterXP,
          skillTotal:JSON.stringify(LifeRPGSkills.getTotals()),
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          story:LifeRPGApp.getState().story.exchangeTestMarker,
          journal:LifeRPGApp.getState().journal.entries['2020-02-02'].bookNote,
          originalBonus:LifeRPGApp.getState().skills.realmBonusPoints.Work,
          ledger:LifeRPGPointExchange.getTransactions()
        })""")
        self.assertEqual(after['work']['available'],before['work']['available']-2)
        self.assertEqual(after['hobbies']['available'],before['hobbies']['available']+1)
        self.assertEqual(after['knowledge']['available'],before['knowledge']['available'])
        self.assertEqual(after['work']['spent'],before['work']['spent']+2)
        self.assertEqual(after['hobbies']['earned'],before['hobbies']['earned']+1)
        self.assertEqual(after['work']['exchangedOut'],2)
        self.assertEqual(after['hobbies']['exchangedIn'],1)
        self.assertEqual(after['ledger'][0]['fromCost'],2)
        self.assertEqual(after['ledger'][0]['toCredit'],1)
        for field in ('xp','skillTotal','rewards','story','journal','originalBonus'):
            self.assertEqual(after[field],before[field],field)
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGPointExchange.exchange('Work','Work',{confirmed:true})"""))
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGPointExchange.exchange('Nope','Work',{confirmed:true})"""))
        self.assertEqual(self.page.evaluate(
          "LifeRPGPointExchange.getTransactions().length"),1)
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSkills && window.saveSafetyTest')
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_script_tag(url='/skillpoint-exchange.js')
        persisted=self.page.evaluate("""() => ({
          work:LifeRPGSkills.getRealmPoints('Work').available,
          hobbies:LifeRPGSkills.getRealmPoints('Hobbies').available,
          tx:LifeRPGPointExchange.getTransactions().length,
          story:LifeRPGApp.getState().story.exchangeTestMarker,
          journal:LifeRPGApp.getState().journal.entries['2020-02-02'].bookNote
        })""")
        self.assertEqual(persisted['work'],after['work']['available'])
        self.assertEqual(persisted['hobbies'],after['hobbies']['available'])
        self.assertEqual(persisted['tx'],1)
        self.assertEqual(persisted['story'],before['story'])
        self.assertEqual(persisted['journal'],before['journal'])

    def test_skillpoint_exchange_guards_overdraw_and_failed_save(self):
        """No lost Skillpoints when available balance is too low or saving fails."""
        self.page.evaluate("""() => {
          LifeRPGApp.getState().skills.realmBonusPoints.Work=4;
          LifeRPGApp.getState().skills.realmBonusPoints.Hobbies=0;
        }""")
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_script_tag(url='/skillpoint-exchange.js')
        before=self.page.evaluate("""() => ({
          source:LifeRPGSkills.getRealmPoints('Work').available,
          target:LifeRPGSkills.getRealmPoints('Hobbies').available
        })""")
        self.assertGreaterEqual(before['source'],2)
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGPointExchange.exchange('Work','Hobbies',{confirmed:true})"""))
        result=self.page.evaluate("""() => {
          const app=LifeRPGApp,original=app.saveState;
          const beforeLength=LifeRPGPointExchange.getTransactions().length;
          const beforeSource=LifeRPGSkills.getRealmPoints('Work').available;
          const beforeTarget=LifeRPGSkills.getRealmPoints('Hobbies').available;
          app.saveState=()=>false;
          let failed;
          try{failed=LifeRPGPointExchange.exchange('Work','Hobbies',{confirmed:true});}
          finally{app.saveState=original;}
          return {failed,beforeLength,afterLength:LifeRPGPointExchange.getTransactions().length,
            beforeSource,beforeTarget,
            afterSource:LifeRPGSkills.getRealmPoints('Work').available,
            afterTarget:LifeRPGSkills.getRealmPoints('Hobbies').available};
        }""")
        self.assertFalse(result['failed'])
        self.assertEqual(result['beforeLength'],result['afterLength'])
        self.assertEqual(result['beforeSource'],result['afterSource'])
        self.assertEqual(result['beforeTarget'],result['afterTarget'])
        # Even if a corrupted cloud payload replays an existing ID, it is
        # counted only once, not minted as an extra receiver point.
        self.page.evaluate("""() => {
          const state=LifeRPGApp.getState();
          state.pointExchangeV1.transactions.push({...state.pointExchangeV1.transactions[0]});
        }""")
        self.assertEqual(self.page.evaluate(
          "LifeRPGSkills.getRealmPoints('Hobbies').available"),
          result['afterTarget'])

    def test_bullet_journal_weekly_habit_unlock_and_real_checkins(self):
        """Weekly tracker is a genuine separate chapter; daily reflections stay put."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Health=12;
          const from=new Date(2026,9,10,12).getTime();
          const day=new Date(2026,9,14,12).getTime();
          root.habits={
            schemaVersion:4,reminders:{},
            items:[
              {id:'habit-a',name:'My personal reading',realm:'Hobbies',active:true,
               createdDate:'2026-10-10',scheduleStartDate:'2026-10-10',trackingFrom:from,
               schedule:{type:'daily'},effort:'low',daypart:'anytime'},
              {id:'habit-b',name:'My personal recovery',realm:'Recovery',active:true,
               createdDate:'2026-10-10',scheduleStartDate:'2026-10-10',trackingFrom:from,
               schedule:{type:'weekly',target:2},effort:'low',daypart:'anytime'}
            ],
            completions:[
              {id:'log-1',habitId:'habit-a',date:'2026-10-14',timestamp:day},
              {id:'log-2',habitId:'habit-b',date:'2026-10-14',timestamp:day}
            ]
          };
          root.journal.entries['2026-10-14']={
            date:'2026-10-14',gratitude:'A calm day',bookNote:'My own page'
          };
        }""")
        self.page.add_script_tag(url='/habits.js')
        self.page.add_script_tag(url='/journal.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_style_tag(url='/bullet-journal-habit-tracker.css')
        self.page.add_script_tag(url='/bullet-journal-habit-tracker.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2026-10-14')"))
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getChapter()"),'daily')
        self.assertFalse(self.page.evaluate(
            "LifeRPGBulletJournalHabitTracker.isUnlocked()"))
        self.assertTrue(self.page.locator('#bjBookWeeklySpread').evaluate('(x)=>x.hidden'))
        self.assertFalse(self.page.locator('#bjBookDailySpread').evaluate('(x)=>x.hidden'))
        self.assertIn('A calm day',self.page.locator('#bjBookRecorded').inner_text())
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'My own page')
        # The paper-embedded Weeks tab opens an actual, independent double page.
        self.page.locator('#bjBookDailySpread [data-bj-chapter="weekly"]').click()
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getChapter()"),'weekly')
        self.assertFalse(self.page.locator('#bjBookWeeklySpread').evaluate('(x)=>x.hidden'))
        self.assertTrue(self.page.locator('#bjBookDailySpread').evaluate('(x)=>x.hidden'))
        self.assertEqual(self.page.locator('#bjBookWeekDays [data-bj-week-day]').count(),7)
        self.assertIn('Preview with your own Habits',self.page.locator('#bjBookHabitTracker').inner_text())
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-row').count(),2)
        self.assertIn('My personal reading',self.page.locator('#bjBookHabitTracker').inner_text())
        self.assertIn('Preview with your own Habits',self.page.locator('#bjBookHabitTracker').inner_text())
        before=self.page.evaluate("""() => ({
          points:LifeRPGSkills.getRealmPoints('Health').available,
          completions:LifeRPGApp.getState().habits.completions.length,
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          note:LifeRPGApp.getState().journal.entries['2026-10-14'].bookNote,
          gratitude:LifeRPGApp.getState().journal.entries['2026-10-14'].gratitude
        })""")
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Health','journal-weekly-habit-tracker')"""))
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalHabitTracker.isUnlocked()"))
        self.assertNotIn('Preview with your own Habits',self.page.locator('#bjBookHabitTracker').inner_text())
        self.assertIn('My personal reading',self.page.locator('#bjBookHabitTracker').inner_text())
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-row').count(),2)
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-cell.state-done').count(),2)
        self.assertIn('2 recorded check-ins',self.page.locator('#bjBookHabitTracker').inner_text())
        self.page.locator('#bjBookWeekDays [data-bj-week-day="2026-10-14"]').click()
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getChapter()"),'daily')
        self.assertIn('A calm day',self.page.locator('#bjBookRecorded').inner_text())
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'My own page')
        self.page.locator('#bjBookDailySpread [data-bj-chapter="weekly"]').click()
        self.page.locator('[data-bj-action="week-prev"]').click()
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getWeek()"),'2026-10-05')
        self.assertEqual(self.page.locator('#bjBookWeekDays [data-bj-week-day]').count(),7)
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-cell.state-done').count(),0)
        self.assertEqual(self.page.locator('#bjBookDate').input_value(),'2026-10-14')
        after=self.page.evaluate("""() => ({
          points:LifeRPGSkills.getRealmPoints('Health').available,
          completions:LifeRPGApp.getState().habits.completions.length,
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          note:LifeRPGApp.getState().journal.entries['2026-10-14'].bookNote,
          gratitude:LifeRPGApp.getState().journal.entries['2026-10-14'].gratitude
        })""")
        self.assertEqual(after['points'],before['points']-1)
        self.assertEqual(after['completions'],before['completions'])
        self.assertEqual(after['rewards'],before['rewards'])
        self.assertEqual(after['note'],before['note'])
        self.assertEqual(after['gratitude'],before['gratitude'])
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Health','journal-weekly-habit-tracker')"""))
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSkills && window.saveSafetyTest')
        self.page.add_script_tag(url='/habits.js')
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_script_tag(url='/bullet-journal-habit-tracker.js')
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalHabitTracker.isUnlocked()"))
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.openWeekly('2026-10-14')"))
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getChapter()"),'weekly')
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-row').count(),2)
        self.assertEqual(self.page.evaluate(
            "LifeRPGSkills.getRealmPoints('Health').available"),after['points'])

    def test_journal_collections_preview_existing_media_and_one_point_unlock(self):
        """Real bookshelf content can be previewed at 0 SP. One Knowledge point
        unlocks a separate note page without selling the original libraries."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Knowledge=0;
          root.bookLibrary={schemaVersion:3,items:[
            {id:'book-real',title:'A real saved novel',author:'Known Author',status:'reading'},
            {id:'book-next',title:'A book on the shelf',status:'want'}],logs:[]};
          root.seriesLibrary={schemaVersion:1,items:[
            {id:'series-real',title:'My actual show',status:'watching'}],logs:[],plans:[]};
          root.gameLibrary={schemaVersion:11,items:[
            {id:'game-real',title:'A game I play',status:'playing'}],logs:[]};
        }""")
        for script in ['journal.js','bullet-journal-book.js',
                       'bullet-journal-collections.js','talent-v2.js',
                       'talent-tree-v2-graph.js']:
            self.page.add_script_tag(url='/'+script)
        for style in ['bullet-journal-book.css','bullet-journal-collections.css']:
            self.page.add_style_tag(url='/'+style)
        self.page.evaluate("LifeRPGTalentTreeGraph.refresh()")
        self.assertEqual(self.page.locator(
            '[data-talent-v3-preview="Knowledge|journal-reading-media-collection"]').count(),1)
        before=self.page.evaluate("""() => {
          const state=LifeRPGApp.getState();
          return {book:JSON.stringify(state.bookLibrary),
            series:JSON.stringify(state.seriesLibrary),
            games:JSON.stringify(state.gameLibrary),
            journal:JSON.stringify(state.journal),
            xp:JSON.stringify(state.rewardLedger),
            notes:JSON.stringify(state.journalCollectionsV1??null),
            purchased:LifeRPGTalentTreeGraph.isContentUnlocked(
              'Knowledge','journal-reading-media-collection'),
            points:LifeRPGSkills.getRealmPoints('Knowledge').available};
        }""")
        self.assertFalse(before['purchased'])
        self.assertEqual(before['points'],0)
        self.page.locator(
            '[data-talent-v3-preview="Knowledge|journal-reading-media-collection"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'collections')
        text=self.page.locator('#bjBookCollectionsContent').inner_text()
        for title in ['A real saved novel','A book on the shelf',
                      'My actual show','A game I play']:
            self.assertIn(title,text)
        self.assertIn('1 Knowledge point',text)
        self.assertEqual(self.page.locator('#bjCollectionsMemory').count(),0)
        self.assertEqual(before,self.page.evaluate("""() => {
          const state=LifeRPGApp.getState();
          return {book:JSON.stringify(state.bookLibrary),
            series:JSON.stringify(state.seriesLibrary),
            games:JSON.stringify(state.gameLibrary),
            journal:JSON.stringify(state.journal),
            xp:JSON.stringify(state.rewardLedger),
            notes:JSON.stringify(state.journalCollectionsV1??null),
            purchased:LifeRPGTalentTreeGraph.isContentUnlocked(
              'Knowledge','journal-reading-media-collection'),
            points:LifeRPGSkills.getRealmPoints('Knowledge').available};
        }"""))
        # After explicitly earning a test point, the native Talent purchase
        # must charge once, and the collection must become editable.
        self.page.evaluate("""() => {
          LifeRPGApp.getState().skills.realmBonusPoints.Knowledge=1;
        }""")
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent(
            'Knowledge','journal-reading-media-collection')"""))
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGSkills.getRealmPoints('Knowledge').available"""),0)
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent(
            'Knowledge','journal-reading-media-collection')"""))
        self.page.evaluate("LifeRPGBulletJournalCollections.render()")
        self.assertEqual(self.page.locator('#bjCollectionsMemory').count(),1)
        self.page.locator('#bjCollectionsMemory').fill('I loved these stories.')
        self.page.locator('[data-bj-collection-save]').click()
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().journalCollectionsV1.pages.readingMedia.note"""),
          'I loved these stories.')
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().bookLibrary.items[0].title"""),
          'A real saved novel')
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().seriesLibrary.items[0].title"""),
          'My actual show')
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().gameLibrary.items[0].title"""),
          'A game I play')
        self.page.evaluate("LifeRPGBulletJournalBook.showChapter('daily')")
        self.page.evaluate("LifeRPGBulletJournalBook.showChapter('collections')")
        self.assertEqual(self.page.locator('#bjCollectionsMemory').input_value(),
                         'I loved these stories.')

    def test_journal_collections_mobile_index_and_empty_libraries(self):
        """The collection preview is usable on mobile without fake data."""
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          s.bookLibrary={schemaVersion:3,items:[],logs:[]};
          s.seriesLibrary={schemaVersion:1,items:[],logs:[],plans:[]};
          s.gameLibrary={schemaVersion:11,items:[],logs:[]};
          s.skills.realmBonusPoints.Knowledge=0;
        }""")
        for script in ['journal.js','bullet-journal-book.js',
                       'bullet-journal-collections.js','talent-v2.js',
                       'talent-tree-v2-graph.js']:
            self.page.add_script_tag(url='/'+script)
        for style in ['bullet-journal-book.css','bullet-journal-collections.css']:
            self.page.add_style_tag(url='/'+style)
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.openCollections()"))
        self.assertIn('0 saved library items',
                      self.page.locator('#bjBookCollectionsIndex').inner_text())
        self.assertIn('A quiet space',self.page.locator(
            '#bjBookCollectionsContent').inner_text())
        self.assertEqual(self.page.locator(
            '#bjBookCollectionsSpread .bj-collection-title').count(),0)
        overflow=self.page.evaluate("""() => {
          const book=document.getElementById('bjBookCollectionsSpread');
          return book.scrollWidth-book.clientWidth;
        }""")
        self.assertLessEqual(overflow,2,overflow)
        self.assertEqual(self.page.locator('#bjCollectionsMemory').count(),0)

    def test_bullet_journal_monthly_live_data_and_navigation_read_only(self):
        """Monthly calendar is a separate chapter sourced from actual Habits,
        with correct month boundary, zero-point preview and no reward mutations."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState(),start=new Date(2026,8,29,12).getTime();
          root.skills.realmBonusPoints.Health=0;
          root.habits={schemaVersion:4,reminders:{},
            items:[
              {id:'oct-read',name:'Morning skincare',active:true,
                realm:'Health',createdDate:'2026-09-29',scheduleStartDate:'2026-09-29',
                trackingFrom:start,schedule:{type:'daily'},effort:'low',daypart:'anytime'},
              {id:'oct-walk',name:'Little walk',active:true,
                realm:'Recovery',createdDate:'2026-09-29',scheduleStartDate:'2026-09-29',
                trackingFrom:start,schedule:{type:'daily'},effort:'low',daypart:'anytime'}
            ],
            completions:[
              {id:'sep-check',habitId:'oct-read',date:'2026-09-30',
                timestamp:new Date(2026,8,30,12).getTime()},
              {id:'oct-1a',habitId:'oct-read',date:'2026-10-01',
                timestamp:new Date(2026,9,1,12).getTime()},
              {id:'oct-1b',habitId:'oct-walk',date:'2026-10-01',
                timestamp:new Date(2026,9,1,13).getTime()},
              {id:'oct-14',habitId:'oct-read',date:'2026-10-14',
                timestamp:new Date(2026,9,14,12).getTime()}
            ]};
          root.journal.entries['2026-10-14']={
            date:'2026-10-14',bookNote:'My existing page stays mine'};
        }""")
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'bullet-journal-monthly.js']:
            self.page.add_script_tag(url='/'+script)
        for style in ['bullet-journal-book.css','bullet-journal-monthly.css']:
            self.page.add_style_tag(url='/'+style)
        before=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {habits:JSON.stringify(s.habits),journal:JSON.stringify(s.journal),
            rewards:JSON.stringify(s.rewardLedger),
            points:LifeRPGSkills.getRealmPoints('Health').available,
            talent:JSON.stringify(s.talentTreeExpansion)};
        }""")
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open('2026-10-14')"))
        self.page.locator('#bjBookDailySpread [data-bj-chapter="monthly"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'monthly')
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getMonth()"),'2026-10-01')
        self.assertEqual(self.page.locator('#bjBookMonthCalendar .bj-month-day').count(),31)
        self.assertEqual(self.page.locator('#bjBookMonthCollection .bj-month-ritual').count(),2)
        self.assertIn('3 little check-ins',
                      self.page.locator('#bjBookMonthCollection').inner_text())
        self.assertIn('No points are spent',
                      self.page.locator('#bjBookMonthCollection').inner_text())
        self.assertIn('Morning skincare',
                      self.page.locator('#bjBookMonthCollection').inner_text())
        self.assertIn('Little walk',
                      self.page.locator('#bjBookMonthCollection').inner_text())
        oct_first=self.page.locator('#bjBookMonthCalendar [data-bj-month-day="2026-10-01"]')
        self.assertIn('2 recorded Habit check-ins',oct_first.get_attribute('aria-label'))
        # 31 Oct is in the future relative to this October snapshot.
        self.assertTrue(self.page.locator(
            '#bjBookMonthCalendar [data-bj-month-day="2026-10-31"]').is_disabled())
        self.page.locator('#bjBookMonthlySpread [data-bj-action="month-prev"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getMonth()"),'2026-09-01')
        self.assertEqual(self.page.locator('#bjBookMonthCalendar .bj-month-day').count(),30)
        self.assertIn('1 little check-in',
                      self.page.locator('#bjBookMonthCollection').inner_text())
        self.page.locator('#bjBookMonthlySpread [data-bj-action="month-next"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getMonth()"),'2026-10-01')
        self.page.locator('#bjBookMonthCalendar [data-bj-month-day="2026-10-14"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'daily')
        self.assertEqual(self.page.locator('#bjBookText').input_value(),
                         'My existing page stays mine')
        after=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {habits:JSON.stringify(s.habits),journal:JSON.stringify(s.journal),
            rewards:JSON.stringify(s.rewardLedger),
            points:LifeRPGSkills.getRealmPoints('Health').available,
            talent:JSON.stringify(s.talentTreeExpansion)};
        }""")
        self.assertEqual(before,after)

    def test_bullet_journal_monthly_mobile_calendar_stays_within_book(self):
        """On a phone the 7-day calendar stays within its page; tapping works."""
        self.page.set_viewport_size({'width':390,'height':844})
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'bullet-journal-monthly.js']:
            self.page.add_script_tag(url='/'+script)
        for style in ['bullet-journal-book.css','bullet-journal-monthly.css']:
            self.page.add_style_tag(url='/'+style)
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.openMonth('2026-09-15')"))
        self.assertEqual(self.page.locator('#bjBookMonthCalendar .bj-month-day').count(),30)
        sizes=self.page.evaluate("""() => {
          const calendar=document.getElementById('bjBookMonthCalendar');
          const page=calendar.closest('.bj-book-page');
          return {overflow:page.scrollWidth-page.clientWidth,
            columns:getComputedStyle(calendar.querySelector('.bj-month-calendar-grid'))
              .gridTemplateColumns.trim().split(/\\s+/).length};
        }""")
        self.assertLessEqual(sizes['overflow'],2,sizes)
        self.assertEqual(sizes['columns'],7,sizes)
        self.page.locator('#bjBookMonthCalendar [data-bj-month-day="2026-09-15"]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'daily')

    def test_journal_atelier_free_decoration_persists_and_pilot_never_saves(self):
        """The editor is free and additive. A standalone SVG persists by key;
        unapproved Sakura samples remain transient, no points/logs are changed."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState(),now=new Date();
          const key=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),
                     String(now.getDate()).padStart(2,'0')].join('-');
          window.atelierTestDate=key;
          root.journal.entries[key]={date:key,bookNote:'Do not touch my writing',
            gratitude:'A safe little book'};
          root.skills.realmBonusPoints.Health=0;
        }""")
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.page.add_script_tag(url='/bullet-journal-atelier.js')
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open(window.atelierTestDate)"))
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-item').count(),0)
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.assertEqual(self.page.locator('#bjAtelierStage').count(),1)
        self.assertEqual(self.page.locator('[data-bj-atelier-asset]').count(),6)
        self.page.wait_for_function("""() => [...document.querySelectorAll(
          '#bjAtelierMount .bj-atelier-pick img')].every(img=>img.complete&&img.naturalWidth>0)""")
        before=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
            habits:JSON.stringify(s.habits),rewards:JSON.stringify(s.rewardLedger),
            unlocks:JSON.stringify(s.talentTreeExpansion),
            note:s.journal.entries[window.atelierTestDate].bookNote,
            gratitude:s.journal.entries[window.atelierTestDate].gratitude};
        }""")
        self.page.locator('[data-bj-atelier-asset="paperclip-ink"]').click()
        saved=self.page.evaluate("""() =>
          LifeRPGApp.getState().journalAtelierV1.daily[window.atelierTestDate]""")
        self.assertEqual(len(saved),1)
        self.assertEqual(saved[0]['assetKey'],'paperclip-ink')
        self.assertFalse(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))
        self.page.locator('[data-bj-atelier-edit="larger"]').click()
        self.page.locator('[data-bj-atelier-edit="turn-right"]').click()
        resized=self.page.evaluate("""() =>
          LifeRPGApp.getState().journalAtelierV1.daily[window.atelierTestDate][0]""")
        self.assertGreater(resized['width'],saved[0]['width'])
        self.assertNotEqual(resized['angle'],saved[0]['angle'])
        self.page.locator('[data-bj-atelier-asset="sakura-branch"]').click()
        self.assertTrue(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))
        self.assertIn('not sold or saved',self.page.locator('#bjAtelierMount').inner_text())
        self.assertEqual(self.page.locator('#bjBookDailySpread .bj-atelier-item').count(),2)
        self.assertEqual(self.page.evaluate("""() =>
          JSON.stringify(LifeRPGApp.getState().journalAtelierV1.daily[window.atelierTestDate])"""),
          __import__('json').dumps([resized],separators=(',',':')))
        self.page.locator('[data-bj-atelier-edit="turn-left"]').click()
        self.page.locator('[data-bj-atelier-exit]').click()
        self.assertFalse(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))
        self.assertEqual(self.page.locator('#bjBookDailySpread .bj-atelier-item').count(),1)
        self.assertEqual(self.page.locator('[data-bj-atelier-asset="sakura-branch"]').count(),1)
        after=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
            habits:JSON.stringify(s.habits),rewards:JSON.stringify(s.rewardLedger),
            unlocks:JSON.stringify(s.talentTreeExpansion),
            note:s.journal.entries[window.atelierTestDate].bookNote,
            gratitude:s.journal.entries[window.atelierTestDate].gratitude};
        }""")
        self.assertEqual(before,after)
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSkills && window.saveSafetyTest')
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_script_tag(url='/bullet-journal-atelier.js')
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open(Object.keys(LifeRPGApp.getState().journalAtelierV1.daily)[0])"))
        self.assertEqual(self.page.locator('#bjBookDailySpread .bj-atelier-item').count(),1)
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().journalAtelierV1.daily[
            LifeRPGBulletJournalBook.getDate()][0].assetKey"""),'paperclip-ink')
        self.assertFalse(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))

    def test_sakura_v2_real_assets_are_in_unsupported_purchase_safe_preview(self):
        """Anime Sakura v2 replaces the rejected tag with five functioning SVGs.
        All five images load in the actual Atelier without touching saves/points."""
        self.page.evaluate("""() => {
          const now=new Date(),root=LifeRPGApp.getState();
          window.sakuraTestDate=[now.getFullYear(),
            String(now.getMonth()+1).padStart(2,'0'),
            String(now.getDate()).padStart(2,'0')].join('-');
          root.skills.realmBonusPoints.Health=0;
        }""")
        for script in ['journal.js','bullet-journal-book.js','bullet-journal-atelier.js']:
            self.page.add_script_tag(url='/'+script)
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open(window.sakuraTestDate)"))
        self.page.locator('[data-bj-atelier-toggle]').click()
        keys=['sakura-branch','sakura-washi','sakura-divider',
              'sakura-blossoms','sakura-memo']
        for key in keys:
            self.assertEqual(self.page.locator(
                f'#bjAtelierMount [data-bj-atelier-asset="{key}"]').count(),1)
        self.assertEqual(self.page.locator(
            '#bjAtelierMount [data-bj-atelier-asset="sakura-letter"]').count(),0)
        self.assertEqual(self.page.locator(
            '#bjAtelierMount .bj-atelier-pick img[src*="sakura-anime-"]').count(),5)
        self.page.wait_for_function("""() => [...document.querySelectorAll(
          '#bjAtelierMount .bj-atelier-pick img')].every(img=>
              img.complete&&img.naturalWidth>0&&img.naturalHeight>0)""")
        original=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
            journal:JSON.stringify(s.journal),
            entitlements:JSON.stringify(s.talentTreeExpansion),
            habits:JSON.stringify(s.habits),
            rewards:JSON.stringify(s.rewardLedger),
            decorations:JSON.stringify(s.journalAtelierV1??null)};
        }""")
        for key in keys:
            self.page.locator(
                f'#bjAtelierMount [data-bj-atelier-asset="{key}"]').click()
        self.assertEqual(self.page.locator(
            '#bjBookDailySpread [data-bj-deco-id]').count(),5)
        self.assertTrue(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))
        self.page.wait_for_function("""() => [...document.querySelectorAll(
          '#bjBookDailySpread .bj-atelier-item img')].every(img=>
              img.complete&&img.naturalWidth>0)""")
        self.assertEqual(original,self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
            journal:JSON.stringify(s.journal),
            entitlements:JSON.stringify(s.talentTreeExpansion),
            habits:JSON.stringify(s.habits),
            rewards:JSON.stringify(s.rewardLedger),
            decorations:JSON.stringify(s.journalAtelierV1??null)};
        }"""))
        self.page.locator('[data-bj-atelier-exit]').click()
        self.assertEqual(self.page.locator(
            '#bjBookDailySpread [data-bj-deco-id]').count(),0)
        self.assertFalse(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))

    def test_journal_atelier_direct_sticker_handles_and_default_writing_page(self):
        """Choose, spawn, rotate and resize a sticker *on the actual paper*.
        Default is the writing page, never the already-crowded Moments page."""
        self.page.set_viewport_size({'width':1240,'height':940})
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.page.add_script_tag(url='/bullet-journal-atelier.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open()"))
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.assertEqual(
            self.page.locator('[data-bj-atelier-side="left"]').get_attribute('aria-pressed'),
            'true')
        self.assertEqual(
            self.page.locator('[data-bj-atelier-side="right"]').get_attribute('aria-pressed'),
            'false')
        saved_before=self.page.evaluate("""() =>
          JSON.stringify(LifeRPGApp.getState().journalAtelierV1??null)""")
        self.page.locator('[data-bj-atelier-asset="sakura-blossoms"]').click()
        self.assertEqual(self.page.locator('#bjAtelierStageLeft .bj-atelier-item').count(),1)
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-item').count(),0)
        self.assertEqual(self.page.locator('#bjAtelierStageLeft [data-bj-deco-resize]').count(),1)
        self.assertEqual(self.page.locator('#bjAtelierStageLeft [data-bj-deco-rotate]').count(),1)
        initial=self.page.evaluate("""() =>
          LifeRPGJournalAtelier.getPlacements().find(p=>p.assetKey==='sakura-blossoms')""")
        self.assertEqual(initial['pageSide'],'left')
        # Actual drag of the resize grip changes the sticker width.
        rect=self.page.locator('[data-bj-deco-resize]').bounding_box()
        self.assertIsNotNone(rect)
        self.page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
        self.page.mouse.down()
        self.page.mouse.move(rect['x']+rect['width']/2+90,rect['y']+rect['height']/2,steps=8)
        self.page.mouse.up()
        larger=self.page.evaluate("""() =>
          LifeRPGJournalAtelier.getPlacements().find(p=>p.assetKey==='sakura-blossoms')""")
        self.assertGreater(larger['width'],initial['width']+45)
        self.assertEqual(larger['angle'],0)
        # The on-sticker rotate grip changes its angle, not its size.
        handle=self.page.locator('[data-bj-deco-rotate]').bounding_box()
        self.assertIsNotNone(handle)
        self.page.mouse.move(handle['x']+handle['width']/2,
                             handle['y']+handle['height']/2)
        self.page.mouse.down()
        self.page.mouse.move(handle['x']+handle['width']/2+100,
                             handle['y']+handle['height']/2,steps=8)
        self.page.mouse.up()
        turned=self.page.evaluate("""() =>
          LifeRPGJournalAtelier.getPlacements().find(p=>p.assetKey==='sakura-blossoms')""")
        self.assertGreater(abs(turned['angle']),10)
        self.assertEqual(turned['width'],larger['width'])
        self.assertTrue(self.page.evaluate("LifeRPGJournalAtelier.isPreview()"))
        self.assertEqual(saved_before,self.page.evaluate("""() =>
          JSON.stringify(LifeRPGApp.getState().journalAtelierV1??null)"""))
        self.page.keyboard.press('Delete')
        self.assertEqual(self.page.locator('#bjAtelierStageLeft .bj-atelier-item').count(),0)
        self.page.locator('[data-bj-atelier-exit]').click()
        self.assertEqual(saved_before,self.page.evaluate("""() =>
          JSON.stringify(LifeRPGApp.getState().journalAtelierV1??null)"""))

    def test_journal_atelier_direct_handles_mobile_are_touch_sized(self):
        """The controls remain tappable on a narrow notebook page."""
        self.page.set_viewport_size({'width':390,'height':844})
        for path in ['journal.js','bullet-journal-book.js','bullet-journal-atelier.js']:
            self.page.add_script_tag(url='/'+path)
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open()"))
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.page.locator('[data-bj-atelier-asset="sakura-memo"]').click()
        self.assertEqual(self.page.locator('#bjAtelierStageLeft .bj-atelier-item').count(),1)
        sizes=self.page.evaluate("""() => {
          const stage=document.querySelector('#bjAtelierStageLeft');
          const controls=['rotate','resize'].map(k=>
            stage.querySelector('[data-bj-deco-'+k+']')?.getBoundingClientRect());
          return {
            pageOverflow:stage.closest('.bj-book-page').scrollWidth-
                         stage.closest('.bj-book-page').clientWidth,
            dimensions:controls.map(r=>({width:r?.width,height:r?.height}))
          };
        }""")
        self.assertLessEqual(sizes['pageOverflow'],2,sizes)
        for control in sizes['dimensions']:
            self.assertGreaterEqual(control['width'],36)
            self.assertGreaterEqual(control['height'],36)

    def test_journal_atelier_mobile_decoration_does_not_cover_writing(self):
        """Editor decorations stay in a separate bounded band even on phone."""
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.page.add_script_tag(url='/bullet-journal-atelier.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open()"))
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.page.locator('[data-bj-atelier-asset="sakura-washi"]').click()
        values=self.page.evaluate("""() => {
          const stage=document.getElementById('bjAtelierStage');
          const paper=stage.closest('.bj-book-page');
          const writing=document.getElementById('bjBookText');
          const rect=stage.getBoundingClientRect();
          return {width:rect.width,viewport:document.documentElement.clientWidth,
            overflow:paper.scrollWidth-paper.clientWidth,
            writingOutside:!paper.contains(writing),
            ephemeral:LifeRPGJournalAtelier.isPreview(),
            noSavedDecorations:!LifeRPGApp.getState().journalAtelierV1};
        }""")
        self.assertLessEqual(values['width'],values['viewport'])
        self.assertLessEqual(values['overflow'],2)
        self.assertTrue(values['writingOutside'])
        self.assertTrue(values['ephemeral'])
        self.assertTrue(values['noSavedDecorations'])

    def test_journal_decorations_are_on_paper_tape_stretches_and_delete_removes(self):
        """Decorations belong to actual Daily book pages; tape length and Delete
        work without accidental notes/XP/entitlement or existing save changes."""
        self.page.set_viewport_size({'width':1240,'height':900})
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-atelier.css')
        self.page.add_script_tag(url='/bullet-journal-atelier.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open()"))
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.assertEqual(self.page.locator('#bjBookDailySpread #bjAtelierStage').count(),1)
        self.assertEqual(self.page.locator('#bjBookDailySpread #bjAtelierStageLeft').count(),1)
        geometry=self.page.evaluate("""() => {
          const stage=document.getElementById('bjAtelierStage');
          const paper=stage.closest('.bj-book-page-inner');
          const bounds=stage.getBoundingClientRect();
          return {
            stageOnRealPage:stage.parentElement===paper,
            height:bounds.height,
            heightMatch:Math.abs(bounds.height-paper.getBoundingClientRect().height),
            hasFakeWorkbench:stage.style.background!==''
              && getComputedStyle(stage).borderTopStyle!=='none',
          };
        }""")
        self.assertTrue(geometry['stageOnRealPage'])
        self.assertGreater(geometry['height'],250)
        self.assertLess(geometry['heightMatch'],3)
        self.assertFalse(geometry['hasFakeWorkbench'])
        baseline=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {
            points:LifeRPGSkills.getRealmPoints('Health').available,
            journal:JSON.stringify(s.journal),
            habits:JSON.stringify(s.habits),
            rewards:JSON.stringify(s.rewardLedger),
            purchases:JSON.stringify(s.talentTreeExpansion),
            saved:JSON.stringify(s.journalAtelierV1??null)
          };
        }""")
        self.assertEqual(self.page.locator('[data-bj-atelier-side="left"]').get_attribute('aria-pressed'),'true')
        self.page.locator('[data-bj-atelier-side="right"]').click()
        self.page.locator('[data-bj-atelier-asset="sakura-washi"]').click()
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-item.is-tape').count(),1)
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-tape-art').count(),1)
        item=self.page.evaluate("""() =>
          LifeRPGJournalAtelier.getPlacements().find(p=>p.assetKey==='sakura-washi')""")
        rect=self.page.locator('[data-bj-deco-stretch]').bounding_box()
        self.assertIsNotNone(rect)
        self.page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
        self.page.mouse.down()
        self.page.mouse.move(rect['x']+rect['width']/2+85,rect['y']+rect['height']/2,steps=6)
        self.page.mouse.up()
        stretched=self.page.evaluate("""() =>
          LifeRPGJournalAtelier.getPlacements().find(p=>p.assetKey==='sakura-washi')""")
        self.assertGreater(stretched['width'],item['width']+45)
        self.assertEqual(stretched['y'],item['y'])
        tapeHeight=self.page.evaluate("""() => document.querySelector(
          '#bjAtelierStage .bj-atelier-tape-art').getBoundingClientRect().height""")
        self.assertGreaterEqual(tapeHeight,30)
        self.assertLessEqual(tapeHeight,45)
        self.page.keyboard.press('Delete')
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-item').count(),0)
        self.assertEqual(self.page.locator('[data-bj-atelier-exit]').count(),1)
        self.page.locator('[data-bj-atelier-asset="sakura-blossoms"]').click()
        self.page.keyboard.press('Backspace')
        self.assertEqual(self.page.locator('#bjAtelierStage .bj-atelier-item').count(),0)
        self.assertEqual(baseline,self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {
            points:LifeRPGSkills.getRealmPoints('Health').available,
            journal:JSON.stringify(s.journal),
            habits:JSON.stringify(s.habits),
            rewards:JSON.stringify(s.rewardLedger),
            purchases:JSON.stringify(s.talentTreeExpansion),
            saved:JSON.stringify(s.journalAtelierV1??null)
          };
        }"""))
        # The free starter remains saveable on either actual paper page.
        self.page.locator('[data-bj-atelier-exit]').click()
        self.page.locator('[data-bj-atelier-side="left"]').click()
        self.page.locator('[data-bj-atelier-asset="paperclip-ink"]').click()
        self.assertEqual(self.page.locator('#bjAtelierStageLeft .bj-atelier-item').count(),1)
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGApp.getState().journalAtelierV1.daily[
            LifeRPGBulletJournalBook.getDate()][0].pageSide"""),'left')
        self.page.locator('#bjBookText').fill('My journal words must remain intact.')
        self.page.locator('#bjBookText').press('Backspace')
        self.assertTrue(self.page.locator('#bjBookText').input_value().endswith('intact'))
        self.assertEqual(self.page.locator('#bjAtelierStageLeft .bj-atelier-item').count(),1)
        self.page.evaluate("LifeRPGBulletJournalBook.save()")
        self.page.locator('[data-bj-atelier-toggle]').click()
        self.assertTrue(self.page.locator('#bjBookText').is_editable())

    def test_bullet_journal_daily_mini_preview_purchase_movement_and_persistence(self):
        """The Daily insert uses exactly one canonical day, costs one Health point
        once, and never edits Habit/Quest/XP history on display or layout changes."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Health=9;
          const from=new Date(2026,9,10,12).getTime();
          root.habits={
            schemaVersion:4,reminders:{},
            items:[
              {id:'daily-a',name:'My private daily reading',realm:'Hobbies',active:true,
               createdDate:'2026-10-10',scheduleStartDate:'2026-10-10',trackingFrom:from,
               schedule:{type:'daily'},effort:'low',daypart:'anytime'},
              {id:'daily-b',name:'My private recovery ritual',realm:'Recovery',active:true,
               createdDate:'2026-10-10',scheduleStartDate:'2026-10-10',trackingFrom:from,
               schedule:{type:'daily'},effort:'low',daypart:'anytime'}
            ],
            completions:[
              {id:'done-a',habitId:'daily-a',date:'2026-10-14',
               timestamp:new Date(2026,9,14,12).getTime()},
              {id:'done-b',habitId:'daily-b',date:'2026-10-13',
               timestamp:new Date(2026,9,13,12).getTime()}
            ]
          };
          root.journal.entries['2026-10-14']={
            date:'2026-10-14',bookNote:'This page belongs to me',
            gratitude:'Tea after work'
          };
        }""")
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'skills.js','talent-v2.js','talent-tree-v2-graph.js',
                       'bullet-journal-habit-tracker.js']:
            self.page.add_script_tag(url='/'+script)
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-daily-tracker.css')
        self.page.add_script_tag(url='/bullet-journal-daily-tracker.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2026-10-14')"))
        preview=self.page.locator('#bjBookDailyMini')
        self.assertIn('Your real Habits',preview.inner_text())
        self.assertEqual(preview.locator('.bj-daily-mini-row').count(),2)
        self.assertIn('My private daily reading',preview.inner_text())
        self.assertFalse(self.page.evaluate("LifeRPGBulletJournalDailyTracker.isUnlocked()"))
        self.assertFalse(self.page.evaluate(
            "LifeRPGTalentTreeGraph.isContentUnlocked('Health','journal-weekly-habit-tracker')"))
        before=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {
            points:LifeRPGSkills.getRealmPoints('Health').available,
            habits:JSON.stringify(s.habits),
            rewardLedger:JSON.stringify(s.rewardLedger),
            journal:JSON.stringify(s.journal.entries['2026-10-14'])
          };
        }""")
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Health','journal-daily-mini-habit-tracker')"""))
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalDailyTracker.isUnlocked()"))
        self.assertEqual(preview.locator('.bj-daily-mini-row').count(),2)
        self.assertIn('My private daily reading',preview.inner_text())
        self.assertEqual(preview.locator('.bj-daily-mini-row.is-done').count(),1)
        self.assertNotIn('example habits',preview.inner_text())
        self.assertIn('Tea after work',self.page.locator('#bjBookRecorded').inner_text())
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'This page belongs to me')
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Health','journal-daily-mini-habit-tracker')"""))
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGSkills.getRealmPoints('Health').available"""),before['points']-1)
        self.assertFalse(self.page.evaluate(
            "LifeRPGTalentTreeGraph.isContentUnlocked('Health','journal-weekly-habit-tracker')"))
        self.page.locator('[data-bj-daily-move]').click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGApp.getState().journalBookLayoutV1.dailyMiniSlot"),'below')
        self.assertTrue(self.page.evaluate("""() =>
          document.getElementById('bjBookDailyMini').previousElementSibling.id==='bjBookRecorded'"""))
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.changeDate('2026-10-13')"))
        self.assertEqual(preview.locator('.bj-daily-mini-row.is-done').count(),1)
        self.assertIn('My private recovery ritual',preview.inner_text())
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.changeDate('2026-10-14')"))
        self.assertTrue(self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return s.journal.entries['2026-10-14'].bookNote==='This page belongs to me';
        }"""))
        after=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {
            points:LifeRPGSkills.getRealmPoints('Health').available,
            habits:JSON.stringify(s.habits),
            rewardLedger:JSON.stringify(s.rewardLedger),
            journal:JSON.stringify(s.journal.entries['2026-10-14'])
          };
        }""")
        self.assertEqual(after['points'],before['points']-1)
        self.assertEqual(after['habits'],before['habits'])
        self.assertEqual(after['rewardLedger'],before['rewardLedger'])
        self.assertEqual(after['journal'],before['journal'])
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSkills && window.saveSafetyTest')
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'skills.js','talent-v2.js','talent-tree-v2-graph.js',
                       'bullet-journal-daily-tracker.js']:
            self.page.add_script_tag(url='/'+script)
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalDailyTracker.isUnlocked()"))
        self.assertEqual(self.page.evaluate(
            "LifeRPGApp.getState().journalBookLayoutV1.dailyMiniSlot"),'below')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2026-10-14')"))
        self.assertIn('My private daily reading',
                      self.page.locator('#bjBookDailyMini').inner_text())
        self.assertEqual(self.page.evaluate(
            "LifeRPGSkills.getRealmPoints('Health').available"),after['points'])

    def test_journal_ux_2b_compact_grid_and_zero_point_health_previews(self):
        """Eight saved Habits fit a compact multi-column Journal grid.
        Locked Health nodes preview the actual purchased components at 0 SP;
        layout experiments never write preferences, unlocks or Habit records."""
        self.page.set_viewport_size({'width':1440,'height':900})
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          const now=new Date(),today=[
            now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),
            String(now.getDate()).padStart(2,'0')].join('-');
          window.journal2bToday=today;
          root.skills.realmBonusPoints.Health=0;
          root.habits={schemaVersion:4,reminders:{},
            items:Array.from({length:8},(_,i)=>({
              id:'compact-'+i,
              name:['Zahnseide','Gym','Morning Skincare','Evening Skincare',
                'Supplements','Hair Oiling / Mask',
                'Throw One Thing Away','10-Minute Clean'][i],
              realm:'Health',active:true,createdDate:today,
              scheduleStartDate:today,
              trackingFrom:new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),
              schedule:{type:'daily'},effort:'low',daypart:'anytime'
            })),completions:[]};
        }""")
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'talent-v2.js','talent-tree-v2-graph.js',
                       'bullet-journal-habit-tracker.js','bullet-journal-daily-tracker.js']:
            self.page.add_script_tag(url='/'+script)
        for style in ['bullet-journal-book.css','bullet-journal-daily-tracker.css',
                      'bullet-journal-habit-tracker.css']:
            self.page.add_style_tag(url='/'+style)
        self.page.evaluate("LifeRPGTalentTreeGraph.refresh()")
        self.page.evaluate("LifeRPGTalentTreeGraph.focusRealm('Health')")
        daily_button=self.page.locator(
            '[data-talent-v3-preview="Health|journal-daily-mini-habit-tracker"]')
        self.assertEqual(daily_button.count(),1)
        self.assertIn('Preview layout',daily_button.inner_text())
        self.assertIn('Available: 0',self.page.locator(
            '#talent-v3-content-Health-journal-daily-mini-habit-tracker').inner_text())
        before=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
             owned:JSON.stringify(s.talentTreeExpansion?.unlocks?.Health||{}),
             layout:JSON.stringify(s.journalBookLayoutV1||null),
             habits:JSON.stringify(s.habits),
             rewards:JSON.stringify(s.rewardLedger)};
        }""")
        self.assertEqual(before['points'],0)
        daily_button.click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'daily')
        self.assertTrue(self.page.evaluate("""() =>
          document.querySelector('#view-bullet-journal').classList.contains('active')"""))
        self.assertEqual(self.page.locator('#bjBookDailyMini .bj-daily-mini-row').count(),8)
        self.assertEqual(self.page.locator('[data-bj-daily-exit-preview]').count(),1)
        grid=self.page.evaluate("""() => {
          const host=document.querySelector('#bjBookDailyMini');
          const rows=[...host.querySelectorAll('.bj-daily-mini-row')];
          return {
            height:host.getBoundingClientRect().height,
            columns:new Set(rows.map(r=>Math.round(r.getBoundingClientRect().x))).size,
            lines:new Set(rows.map(r=>Math.round(r.getBoundingClientRect().y))).size,
            scroll:host.scrollWidth-host.clientWidth
          };
        }""")
        self.assertLess(grid['height'],360,grid)
        self.assertGreaterEqual(grid['columns'],3,grid)
        self.assertLessEqual(grid['lines'],3,grid)
        self.assertLessEqual(grid['scroll'],2,grid)
        self.page.locator('[data-bj-daily-move]').click()
        self.assertTrue(self.page.evaluate("""() =>
          document.getElementById('bjBookDailyMini').previousElementSibling.id==='bjBookRecorded'"""))
        self.assertEqual(self.page.evaluate(
            "JSON.stringify(LifeRPGApp.getState().journalBookLayoutV1||null)"),
            before['layout'])
        self.page.locator('[data-bj-daily-exit-preview]').click()
        self.assertEqual(self.page.locator('[data-bj-daily-exit-preview]').count(),0)
        self.assertEqual(self.page.locator('[data-bj-daily-move]').count(),0)
        self.assertTrue(self.page.evaluate("""() =>
          document.getElementById('bjBookDailyMini').nextElementSibling.id==='bjBookRecorded'"""))
        self.page.evaluate("LifeRPGTalentTreeGraph.focusRealm('Health')")
        weekly_button=self.page.locator(
            '[data-talent-v3-preview="Health|journal-weekly-habit-tracker"]')
        self.assertEqual(weekly_button.count(),1)
        weekly_button.click()
        self.assertEqual(self.page.evaluate(
            "LifeRPGBulletJournalBook.getChapter()"),'weekly')
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-row').count(),8)
        self.assertEqual(self.page.locator('[data-bj-exit-preview]').count(),1)
        self.page.locator('[data-bj-exit-preview]').click()
        after=self.page.evaluate("""() => {
          const s=LifeRPGApp.getState();
          return {points:LifeRPGSkills.getRealmPoints('Health').available,
             owned:JSON.stringify(s.talentTreeExpansion?.unlocks?.Health||{}),
             layout:JSON.stringify(s.journalBookLayoutV1||null),
             habits:JSON.stringify(s.habits),
             rewards:JSON.stringify(s.rewardLedger)};
        }""")
        self.assertEqual(after,before)
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open(window.journal2bToday)"))
        mobile=self.page.evaluate("""() => {
          const page=document.querySelector('#bjBookDailyMini').closest('.bj-book-page');
          const rows=[...page.querySelectorAll('.bj-daily-mini-row')];
          return {overflow:page.scrollWidth-page.clientWidth,
                  lines:new Set(rows.map(r=>Math.round(r.getBoundingClientRect().y))).size};
        }""")
        self.assertLessEqual(mobile['overflow'],2,mobile)
        self.assertLessEqual(mobile['lines'],4,mobile)

    def test_bullet_journal_daily_mini_stays_readable_on_mobile(self):
        """The paper insert fits the stacked daily page without horizontal overflow."""
        self.page.set_viewport_size({'width':390,'height':844})
        for script in ['habits.js','journal.js','bullet-journal-book.js']:
            self.page.add_script_tag(url='/'+script)
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-daily-tracker.css')
        self.page.add_script_tag(url='/bullet-journal-daily-tracker.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2026-10-14')"))
        self.assertEqual(self.page.locator('#bjBookDailyMini .bj-daily-mini-row').count(),0)
        layout=self.page.evaluate("""() => {
          const host=document.querySelector('#bjBookDailyMini');
          const right=host.closest('.bj-book-page');
          const rect=host.getBoundingClientRect();
          return {width:rect.width,viewport:document.documentElement.clientWidth,
            rightWidth:right.getBoundingClientRect().width,
            scrollWidth:right.scrollWidth};
        }""")
        self.assertLessEqual(layout['width'],layout['viewport'])
        self.assertLessEqual(layout['scrollWidth'],layout['rightWidth']+2)

    def test_bullet_journal_live_habits_with_zero_points_and_canonical_log(self):
        """Personal daily and weekly Habits appear without purchase; Journal logs
        use exactly the original completion and XP ledger, never a second reward."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          const now=new Date();
          const key=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),
                     String(now.getDate()).padStart(2,'0')].join('-');
          window.journalLiveDate=key;
          root.skills.realmBonusPoints.Health=0;
          root.habits={
            schemaVersion:4,reminders:{},
            items:[{id:'live-canonical-habit',name:'My genuine routine',
              realm:'Recovery',active:true,createdDate:key,scheduleStartDate:key,
              trackingFrom:new Date(now.getFullYear(),now.getMonth(),now.getDate(),0).getTime(),
              schedule:{type:'daily'},effort:'low',daypart:'anytime',
              note:'Use my own existing habit'}],
            completions:[]
          };
        }""")
        for script in ['habits.js','journal.js','bullet-journal-book.js',
                       'skills.js','talent-v2.js','talent-tree-v2-graph.js',
                       'bullet-journal-habit-tracker.js']:
            self.page.add_script_tag(url='/'+script)
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_style_tag(url='/bullet-journal-daily-tracker.css')
        self.page.add_script_tag(url='/bullet-journal-daily-tracker.js')
        self.assertTrue(self.page.evaluate(
            "LifeRPGBulletJournalBook.open(window.journalLiveDate)"))
        daily=self.page.locator('#bjBookDailyMini')
        self.assertFalse(self.page.evaluate(
            "LifeRPGBulletJournalDailyTracker.isUnlocked()"))
        self.assertIn('My genuine routine',daily.inner_text())
        self.assertIn('Available: 0',daily.inner_text())
        self.assertEqual(daily.locator('[data-bj-daily-log]').count(),1)
        initial=self.page.evaluate("""() => ({
          completions:LifeRPGApp.getState().habits.completions.length,
          rewards:LifeRPGApp.getState().rewardLedger.events.length
        })""")
        daily.locator('[data-bj-daily-log]').click()
        self.assertEqual(daily.locator('.bj-daily-mini-row.is-done').count(),1)
        self.assertEqual(daily.locator('[data-bj-daily-log]').count(),0)
        completed=self.page.evaluate("""() => ({
          completions:LifeRPGApp.getState().habits.completions.length,
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          id:LifeRPGApp.getState().habits.completions.at(-1)?.habitId
        })""")
        self.assertEqual(completed['completions'],initial['completions']+1)
        self.assertEqual(completed['id'],'live-canonical-habit')
        self.assertGreaterEqual(completed['rewards'],initial['rewards'])
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGHabits.completeFromJournal('live-canonical-habit',window.journalLiveDate)"""))
        self.assertEqual(self.page.evaluate(
            "LifeRPGApp.getState().habits.completions.length"),completed['completions'])
        self.assertEqual(self.page.evaluate(
            "LifeRPGApp.getState().rewardLedger.events.length"),completed['rewards'])
        self.page.locator('#bjBookDailySpread [data-bj-chapter="weekly"]').click()
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-row').count(),1)
        self.assertEqual(self.page.locator(
            '#bjBookHabitTracker .bj-habit-cell.state-done').count(),1)
        self.assertIn('My genuine routine',self.page.locator('#bjBookHabitTracker').inner_text())
        self.page.locator('#bjBookHabitTracker [data-bj-habit-open]').first.click()
        self.assertTrue(self.page.evaluate("""() =>
          document.querySelector('#view-habits')?.classList.contains('active')"""))
        self.assertEqual(self.page.evaluate(
            "LifeRPGApp.getState().habits.completions.length"),completed['completions'])

    def test_bullet_journal_weekly_legacy_entitlement_survives_book_move(self):
        """An already-purchased Weekly Tracker costs zero extra points after routing migration."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Health=5;
          root.talentTreeExpansion={
            schemaVersion:7,version:'0.31.4-journal-habits1',
            unlocks:{Health:{'journal-weekly-habit-tracker':1695555555555}},
            dreamThreads:{},migrations:{}
          };
        }""")
        self.page.add_script_tag(url='/habits.js')
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_script_tag(url='/skills.js')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        self.page.add_script_tag(url='/bullet-journal-habit-tracker.js')
        before=self.page.evaluate("""() => ({
          available:LifeRPGSkills.getRealmPoints('Health').available,
          owner:LifeRPGTalentTreeGraph.isContentUnlocked('Health','journal-weekly-habit-tracker'),
          receipt:LifeRPGApp.getState().talentTreeExpansion.unlocks.Health['journal-weekly-habit-tracker']
        })""")
        self.assertTrue(before['owner'])
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.openWeekly('2026-10-14')"))
        self.assertEqual(self.page.locator('#bjBookHabitTracker .bj-habit-preview-intro').count(),0)
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Health','journal-weekly-habit-tracker')"""))
        after=self.page.evaluate("""() => ({
          available:LifeRPGSkills.getRealmPoints('Health').available,
          receipt:LifeRPGApp.getState().talentTreeExpansion.unlocks.Health['journal-weekly-habit-tracker']
        })""")
        self.assertEqual(after,{'available':before['available'],'receipt':before['receipt']})

    def test_bullet_journal_weekly_chapter_is_readable_on_mobile(self):
        """The full-screen weekly spread stacks instead of creating a modal or clipped toolbar."""
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.add_script_tag(url='/habits.js')
        self.page.add_script_tag(url='/journal.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.add_style_tag(url='/bullet-journal-habit-tracker.css')
        self.page.add_script_tag(url='/bullet-journal-habit-tracker.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.openWeekly('2026-10-18')"))
        self.assertFalse(self.page.locator('#bjBookWeeklySpread').evaluate('(x)=>x.hidden'))
        self.assertEqual(self.page.locator('#bjBookWeekDays [data-bj-week-day]').count(),7)
        self.assertEqual(self.page.locator('#bjBookTrackerTabs').count(),0)
        self.assertIn('Preview with your own Habits',self.page.locator('#bjBookHabitTracker').inner_text())
        layout=self.page.evaluate("""() => {
          const pages=[...document.querySelectorAll('#bjBookWeeklySpread .bj-book-page')];
          const pageRects=pages.map(x=>x.getBoundingClientRect());
          return {
            noDialog:!document.querySelector('#bulletJournalBookDialog'),
            left:pageRects[0].left,
            right:pageRects[1].left,
            stacked:pageRects[1].top>=pageRects[0].bottom-1,
            widths:pageRects.map(x=>x.width),
            viewport:document.documentElement.clientWidth
          };
        }""")
        self.assertTrue(layout['noDialog'])
        self.assertTrue(layout['stacked'])
        self.assertLess(abs(layout['left']-layout['right']),2)
        self.assertTrue(all(w<=layout['viewport'] for w in layout['widths']))
        self.page.locator('#bjBookWeekDays [data-bj-week-day="2026-10-14"]').click()
        self.assertEqual(self.page.evaluate("LifeRPGBulletJournalBook.getChapter()"),'daily')
        self.assertEqual(self.page.locator('#bjBookDate').input_value(),'2026-10-14')

    def test_bullet_journal_weekly_habits_respects_linked_quest_history(self):
        """The tracker uses the canonical Habits resolver, not a second ledger."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          const quest=LifeRPGApp.getQuestCatalog().find(x=>/10.Minute Clean/i.test(x.name));
          if(!quest)throw Error('Missing original 10 Minute Clean Quest');
          root.habits={
            schemaVersion:4,reminders:{},
            items:[{
              id:'linked-habit',name:'Quick room reset',realm:'Home',active:true,
              createdDate:'2026-10-01',scheduleStartDate:'2026-10-01',
              trackingFrom:new Date(2026,9,1,12).getTime(),
              schedule:{type:'daily'},effort:'low',daypart:'anytime',
              linkedQuestId:quest.id
            }],completions:[]
          };
          root.completionLog.push({
            questId:quest.id,at:new Date(2026,9,14,12).toISOString(),
            units:Math.max(60,Number(quest.units)||0)
          });
        }""")
        self.page.add_script_tag(url='/habits.js')
        const_result=self.page.evaluate("""() => {
          const week=LifeRPGHabits.getJournalTrackerWeek('2026-10-14');
          return {days:week.days,
            count:week.count,
            cells:week.habits[0]?.cells,
            originals:LifeRPGApp.getState().habits.completions.length};
        }""")
        self.assertEqual(const_result['count'],1)
        self.assertEqual(const_result['cells'][2],'done')
        self.assertEqual(const_result['originals'],0)
        self.assertEqual(len(const_result['days']),7)

    def test_bullet_journal_book_free_writing_and_legacy_entries_survive_reload(self):
        """A dated blank notebook page never rewrites existing reflections or pays rewards."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState(),date='2020-04-17';
          root.journal.entries[date]={
            date,createdAt:12345,updatedAt:12345,
            gratitude:'A quiet moment',smallWin:'Finished a novel',
            hardThing:'A long day',yearQuestion:'A small beautiful thing',
            yearQuestionPrompt:'What did you notice?'
          };
          root.story ||= {};root.story.bookRegressionMarker='keep';
          root.rewardLedger.events.push({
            id:'synthetic-recorded-1',source:'game',sourceId:'book-1',
            label:'Played a cozy game',at:new Date(2020,3,17,12).toISOString(),xp:3,
            coins:0,duplicate:false
          });
        }""")
        self.page.add_script_tag(url='/journal.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.assertEqual(self.page.locator('#bulletJournalBookOpen').count(),1)
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2020-04-17')"))
        self.assertTrue(self.page.locator('#view-bullet-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.assertEqual(self.page.locator('#bulletJournalBookDialog').count(),0)
        self.assertTrue(self.page.locator('#view-journal').evaluate("(e)=>!e.classList.contains('active')"))
        self.assertGreaterEqual(self.page.evaluate("""() => {
          const spread=document.querySelector('#view-bullet-journal .bj-book-spread');
          const main=document.querySelector('.app-shell > main');
          return spread.getBoundingClientRect().width/main.getBoundingClientRect().width;
        }"""),0.9)
        self.assertEqual(self.page.locator('#bjBookDailySpread .bj-book-writing .bj-book-nav').count(),1)
        self.assertEqual(self.page.locator('#bjBookRecorded .bj-book-answer').count(),4)
        self.assertIn('Played a cozy game',self.page.locator('#bjBookRecorded').inner_text())
        self.assertIn('A quiet moment',self.page.locator('#bjBookRecorded').inner_text())
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'')
        before=self.page.evaluate("""() => ({
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          xp:LifeRPGApp.getState().characterXP,
          journal:JSON.stringify(LifeRPGApp.getState().journal.entries['2020-04-17'])
        })""")
        note="Today was just a day.\\nAnd that's enough.\\n<unsafe-looking-not-markup>"
        self.page.locator('#bjBookText').fill(note)
        self.page.locator('[data-bj-action="save"]').click()
        self.assertIn('Saved',self.page.locator('#bjBookStatus').inner_text())
        edited=self.page.evaluate("""() => ({
          day:LifeRPGApp.getState().journal.entries['2020-04-17'],
          rewards:LifeRPGApp.getState().rewardLedger.events.length,
          xp:LifeRPGApp.getState().characterXP,
          story:LifeRPGApp.getState().story.bookRegressionMarker
        })""")
        self.assertEqual(edited['day']['bookNote'],note)
        self.assertEqual(edited['day']['gratitude'],'A quiet moment')
        self.assertEqual(edited['day']['smallWin'],'Finished a novel')
        self.assertEqual(edited['day']['hardThing'],'A long day')
        self.assertEqual(edited['day']['yearQuestion'],'A small beautiful thing')
        self.assertEqual(edited['day']['yearQuestionPrompt'],'What did you notice?')
        self.assertEqual(edited['rewards'],before['rewards'])
        self.assertEqual(edited['xp'],before['xp'])
        self.assertEqual(edited['story'],'keep')
        self.page.locator('[data-bj-action="close"]').click()
        self.assertFalse(self.page.locator('#view-bullet-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.assertTrue(self.page.locator('#view-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.page.evaluate('LifeRPGJournal.render()')
        self.assertIn('April 2020',self.page.locator('#journalArchive').inner_text())
        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGSkills && window.saveSafetyTest")
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2020-04-17')"))
        self.assertEqual(self.page.locator('#bjBookText').input_value(),note)
        self.assertEqual(self.page.locator('#bjBookRecorded .bj-book-answer').count(),4)
        self.assertEqual(self.page.evaluate(
          "LifeRPGApp.getState().story.bookRegressionMarker"),'keep')

    def test_bullet_journal_book_navigation_autosaves_and_edits_original_day(self):
        """No empty prompt grids, no future navigation, date changes preserve typing."""
        self.page.add_script_tag(url='/journal.js')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertTrue(self.page.evaluate("LifeRPGBulletJournalBook.open('2021-02-27')"))
        self.assertEqual(self.page.locator('#bjBookRecorded .bj-book-answer').count(),0)
        self.page.locator('#bjBookText').fill('Personal note on Saturday')
        self.page.locator('[data-bj-action="next"]').click()
        self.assertEqual(self.page.locator('#bjBookDate').input_value(),'2021-02-28')
        self.assertEqual(self.page.evaluate(
          "LifeRPGApp.getState().journal.entries['2021-02-27'].bookNote"),
          'Personal note on Saturday')
        self.page.locator('#bjBookText').fill('Sunday is a new page')
        self.page.locator('[data-bj-action="prev"]').click()
        self.assertEqual(self.page.locator('#bjBookDate').input_value(),'2021-02-27')
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'Personal note on Saturday')
        self.assertEqual(self.page.evaluate(
          "LifeRPGApp.getState().journal.entries['2021-02-28'].bookNote"),
          'Sunday is a new page')
        self.assertFalse(self.page.evaluate(
          "LifeRPGBulletJournalBook.changeDate('2099-01-01')"))
        self.assertEqual(self.page.locator('#bjBookDate').input_value(),'2021-02-27')
        self.page.locator('[data-bj-action="reflect"]').click()
        self.assertFalse(self.page.locator('#view-bullet-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.assertTrue(self.page.locator('#view-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.assertTrue(self.page.locator('#journalDayDialog').evaluate('(e)=>e.open'))
        self.assertEqual(self.page.evaluate(
          "LifeRPGApp.getState().journal.entries['2021-02-27'].bookNote"),
          'Personal note on Saturday')

    def test_bullet_journal_book_sidebar_navigation_saves_full_page_draft(self):
        """The book is its own Life RPG route, not a popup; sidebar exit autosaves."""
        self.page.add_script_tag(url='/journal.js')
        self.page.add_style_tag(url='/bullet-journal-book.css')
        self.page.add_script_tag(url='/bullet-journal-book.js')
        self.page.evaluate("LifeRPGApp.showView('journal')")
        self.page.locator('#bulletJournalBookOpen').click()
        self.assertTrue(self.page.locator('#view-bullet-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.assertEqual(self.page.locator('#bulletJournalBookDialog').count(),0)
        self.assertFalse(self.page.locator('#view-journal').evaluate("(e)=>e.classList.contains('active')"))
        self.page.locator('#bjBookText').fill('Saved through normal navigation')
        self.page.evaluate("LifeRPGApp.showView('journal')")
        self.assertTrue(self.page.locator('#view-journal').evaluate("(e)=>e.classList.contains('active')"))
        today=self.page.evaluate("""() => LifeRPGBulletJournalBook.getDate()""")
        self.assertEqual(self.page.evaluate("""d => LifeRPGApp.getState().journal.entries[d].bookNote""",today),
                         'Saved through normal navigation')
        self.assertTrue(self.page.evaluate('LifeRPGBulletJournalBook.open()'))
        self.assertEqual(self.page.locator('#bjBookText').input_value(),'Saved through normal navigation')
        self.assertEqual(self.page.locator('#bjBookDailySpread .bj-book-nav').count(),1)
        self.assertEqual(self.page.locator('#view-bullet-journal .bj-book-toolbar').count(),0)
        self.assertTrue(self.page.locator('#view-bullet-journal').evaluate("(e)=>e.classList.contains('active')"))

    def test_retired_mystery_refund_exact_once_and_preserves_other_purchases(self):
        """Old Work II and Hobbies I refund 2+1 through derived spending only."""
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          root.skills.realmBonusPoints.Work=12;
          root.skills.realmBonusPoints.Hobbies=12;
          // Seed the original permanent purchases as if restored from a cloud save.
          root.talentTreeExpansion={
            schemaVersion:7,version:'0.31.4-realm-mystery1',
            unlocks:{
              Work:{'realm-mystery-collection':2,'school-moments':1700000000000},
              Hobbies:{'mystery-collection':1,'coloring-studio':1}
            },
            dreamThreads:{},migrations:{}
          };
          root.journal ||= {entries:{},migrations:{}};
          root.journal.entries['2026-10-14']={
            date:'2026-10-14',gratitude:'This must survive refund',
            win:'Existing prompt answer',hard:'A difficult day'
          };
          root.story ||= {};
          root.story.syntheticPreserved='Still my story';
        }""")
        self.page.add_script_tag(url='/talent-v2.js')
        pre=self.page.evaluate("""() => ({
          work:LifeRPGSkills.getRealmPoints('Work'),
          hobbies:LifeRPGSkills.getRealmPoints('Hobbies'),
          coins:LifeRPGApp.getState().coins
        })""")
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        result=self.page.evaluate("""() => {
          const root=LifeRPGApp.getState(),graph=LifeRPGTalentTreeGraph;
          return {
            work:LifeRPGSkills.getRealmPoints('Work'),
            hobbies:LifeRPGSkills.getRealmPoints('Hobbies'),
            retired:root.talentTreeExpansion.migrations.retiredMysteryCollections20261018,
            savedWork:root.talentTreeExpansion.unlocks.Work,
            savedHobbies:root.talentTreeExpansion.unlocks.Hobbies,
            rewardNodes:[
              ...graph.meta.Work.content.filter(x=>x.id==='realm-mystery-collection'),
              ...graph.meta.Hobbies.content.filter(x=>x.id==='mystery-collection')
            ],
            diary:root.journal.entries['2026-10-14'].gratitude,
            story:root.story.syntheticPreserved,coins:root.coins
          };
        }""")
        self.assertEqual(result['rewardNodes'],[])
        self.assertEqual(result['retired']['retired']['Work']['realm-mystery-collection'],2)
        self.assertEqual(result['retired']['retired']['Hobbies']['mystery-collection'],1)
        self.assertEqual(result['savedWork'].get('school-moments'),1700000000000)
        self.assertEqual(result['savedHobbies'].get('coloring-studio'),1)
        self.assertNotIn('realm-mystery-collection',result['savedWork'])
        self.assertNotIn('mystery-collection',result['savedHobbies'])
        self.assertEqual(result['work']['spent'],pre['work']['spent']+1)
        self.assertEqual(result['hobbies']['spent'],pre['hobbies']['spent']+1)
        self.assertEqual(result['work']['available'],pre['work']['available']-1)
        self.assertEqual(result['hobbies']['available'],pre['hobbies']['available']-1)
        # Without retirement, these balances would have another 2 Work + 1
        # Hobbies point charged. The refund is not bonus-point fabrication.
        self.assertEqual(pre['work']['earned'],result['work']['earned'])
        self.assertEqual(pre['hobbies']['earned'],result['hobbies']['earned'])
        self.assertEqual(result['diary'],'This must survive refund')
        self.assertEqual(result['story'],'Still my story')
        self.assertEqual(result['coins'],pre['coins'])
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Work','realm-mystery-collection')"""))
        self.assertFalse(self.page.evaluate("""() =>
          LifeRPGTalentTreeGraph.purchaseContent('Hobbies','mystery-collection')"""))

        self.page.evaluate("LifeRPGApp.saveState({suppressCloud:true})")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.LifeRPGSkills && window.saveSafetyTest')
        self.page.add_script_tag(url='/talent-v2.js')
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        after_reload=self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          return {
            retired:root.talentTreeExpansion.migrations.retiredMysteryCollections20261018,
            work:LifeRPGSkills.getRealmPoints('Work'),
            hobbies:LifeRPGSkills.getRealmPoints('Hobbies'),
            diary:root.journal.entries['2026-10-14'].gratitude,
            story:root.story.syntheticPreserved,
            workUnlock:root.talentTreeExpansion.unlocks.Work['school-moments']
          };
        }""")
        self.assertEqual(after_reload['retired']['at'],result['retired']['at'])
        self.assertEqual(after_reload['retired']['retired'],result['retired']['retired'])
        self.assertEqual(after_reload['work']['available'],result['work']['available'])
        self.assertEqual(after_reload['hobbies']['available'],result['hobbies']['available'])
        self.assertEqual(after_reload['diary'],result['diary'])
        self.assertEqual(after_reload['story'],result['story'])
        self.assertEqual(after_reload['workUnlock'],1700000000000)

    def test_retired_mystery_does_not_charge_any_realm_or_leave_ui(self):
        """All seven discontinued collections are absent and cannot charge again."""
        realms=['Work','Knowledge','Japanese','Health','Recovery','Home','Hobbies']
        self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          for(const realm of ['Work','Knowledge','Japanese','Health','Recovery','Home','Hobbies'])
            root.skills.realmBonusPoints[realm]=8;
          root.talentTreeExpansion={
            schemaVersion:7,version:'0.31.4-realm-mystery1',
            unlocks:Object.fromEntries(['Work','Knowledge','Japanese','Health','Recovery','Home','Hobbies']
              .map(r=>[r,{[r==='Hobbies'?'mystery-collection':'realm-mystery-collection']:r==='Hobbies'?1:2}])),
            dreamThreads:{},migrations:{}
          };
        }""")
        self.page.add_script_tag(url='/talent-v2.js')
        before=self.page.evaluate("""() => Object.fromEntries(
          ['Work','Knowledge','Japanese','Health','Recovery','Home','Hobbies']
          .map(r=>[r,LifeRPGSkills.getRealmPoints(r).spent]))""")
        self.page.add_script_tag(url='/talent-tree-v2-graph.js')
        result=self.page.evaluate("""() => {
          const root=LifeRPGApp.getState();
          const realms=['Work','Knowledge','Japanese','Health','Recovery','Home','Hobbies'];
          return realms.map(realm=>({
            realm,spent:LifeRPGSkills.getRealmPoints(realm).spent,
            extra:LifeRPGTalentTreeGraph.extraSpent(realm),
            cards:LifeRPGTalentTreeGraph.meta[realm].content.filter(x=>x.title==='Mystery Collection').length,
            history:root.talentTreeExpansion.migrations.retiredMysteryCollections20261018.retired[realm]
          }));
        }""")
        for row in result:
            self.assertEqual(row['cards'],0)
            self.assertEqual(row['extra'],0)
            self.assertEqual(row['spent'],before[row['realm']])
            self.assertEqual(row['history'][('mystery-collection' if row['realm']=='Hobbies' else 'realm-mystery-collection')],
                             1 if row['realm']=='Hobbies' else 2)
        page_text=self.page.locator('#view-growth').inner_text()
        self.assertNotIn('Mystery Collection',page_text)

    def test_tvmaze_search_is_independent_of_slow_anime_provider(self):
        """The original TVmaze path must yield search results without contacting Jikan."""
        anime_requests = []
        def tvmaze(route):
            if '/search/shows' in route.request.url:
                route.fulfill(json=[dict(show=dict(
                    id=551,name='Synthetic Comfort Series',premiered='2001-01-01',
                    averageRuntime=42,status='Ended',
                    image=dict(medium='https://static.tvmaze.com/synthetic.jpg'),
                    url='https://www.tvmaze.com/shows/551'))])
            else:
                route.fulfill(status=404, json={})
        def anime(route):
            anime_requests.append(route.request.url)
            route.abort()
        self.context.route('https://api.tvmaze.com/**',tvmaze)
        self.context.route('https://api.jikan.moe/v4/**',anime)
        self.page.locator('[data-series-add]').first.click()
        self.page.locator('#seriesSearchForm [name="query"]').fill('Synthetic Comfort')
        self.page.locator('#seriesSearchForm button').first.click()
        self.page.locator('[data-series-catalog]').first.wait_for(state='visible',timeout=4000)
        self.assertEqual(anime_requests,[])
        self.assertIn('Synthetic Comfort Series',self.page.locator('#seriesSearchResults').inner_text())
        self.assertIn('Select the correct TVmaze title',self.page.locator('#seriesSearchStatus').inner_text())

        self.context.unroute('https://api.tvmaze.com/**',tvmaze)
        self.context.route('https://api.tvmaze.com/**',lambda route:route.abort())
        self.page.locator('#seriesSearchForm [name="query"]').fill('new search without result')
        self.page.locator('#seriesSearchForm button').first.click()
        self.page.wait_for_function("""() => {
          const message=document.getElementById('seriesSearchStatus').textContent;
          return message.includes('could not be reached');
        }""")
        self.assertEqual(self.page.locator('#seriesSearchResults [data-series-catalog]').count(),0)

        self.context.unroute('https://api.jikan.moe/v4/**',anime)
        self.context.route('https://api.jikan.moe/v4/**',lambda route:route.fulfill(json={
            'data':[{'mal_id':551,'title':'Synthetic Anime',
                'year':2026,'status':'Currently Airing',
                'images':{'jpg':{'image_url':'https://example.org/anime.jpg'}}}]}))
        self.page.locator('#seriesSearchForm [name="query"]').fill('Synthetic Anime')
        self.page.locator('#seriesSearchForm [data-series-anime-search]').click()
        self.page.locator('[data-series-catalog]').first.wait_for(state='visible')
        self.assertIn('Synthetic Anime',self.page.locator('#seriesSearchResults').inner_text())

    def test_catalog_search_buttons_render_results_and_seasons_without_hanging(self):
        """Reproduce the actual bug: 'Searching...' remains forever after click.

        This MUST exercise the real browser form submit handler, not merely the
        LifeRPGSeries.searchCatalog public function.
        """
        def tvmaze(route):
            url = route.request.url
            if '/search/shows' in url:
                route.fulfill(json=[dict(show=dict(
                    id=88001,name='Synthetic Comfort Series',
                    premiered='2026-01-12',averageRuntime=24,status='Running',
                    image=dict(medium='https://static.tvmaze.com/mock-poster.jpg'),
                    url='https://www.tvmaze.com/shows/88001'))])
            elif '/seasons' in url:
                route.fulfill(json=[
                    dict(number=1,episodeOrder=2,endDate='2026-03-28'),
                    dict(number=2,episodeOrder=2,endDate=None)])
            else:
                route.fulfill(json=[
                    dict(season=1,number=1,id=88011,runtime=24),
                    dict(season=1,number=2,id=88012,runtime=24),
                    dict(season=2,number=1,id=88021,runtime=24),
                    dict(season=2,number=2,id=88022,runtime=24)])
        self.context.route('https://api.tvmaze.com/**',tvmaze)
        self.context.route('https://api.jikan.moe/v4/**',lambda route:route.fulfill(
            json=dict(data=[dict(mal_id=88002,title='Synthetic Anime',
                year=2026,status='Currently Airing',
                images=dict(jpg=dict(image_url='https://example.org/anime.jpg')))])))

        self.page.locator('[data-series-add]').first.click()
        self.page.locator('#seriesSearchForm [name="query"]').fill('Synthetic Comfort')
        self.page.locator('#seriesSearchForm button').first.click()
        self.page.locator('#seriesSearchResults [data-series-catalog]').first.wait_for(
            state='visible',timeout=3500)
        self.assertIn('Synthetic Comfort Series',
                      self.page.locator('#seriesSearchResults').inner_text())
        self.assertNotIn('Searching',self.page.locator('#seriesSearchStatus').inner_text())

        self.page.locator('#seriesSearchResults [data-series-catalog]').first.click()
        self.page.wait_for_function("""() => {
          const node=document.getElementById('seriesCatalogPreview');
          return !node.hidden && node.querySelectorAll('.series-catalog-seasons li').length===2;
        }""",timeout=3500)
        self.assertIn('Season 2',self.page.locator('#seriesCatalogPreview').inner_text())
        self.assertEqual(self.page.locator('#seriesCatalogPreview img').count(),1)
        self.assertNotIn('Loading',self.page.locator('#seriesSearchStatus').inner_text())

        self.page.locator('#seriesSearchForm [name="query"]').fill('Synthetic Anime')
        self.page.locator('[data-series-anime-search]').click()
        self.page.locator('#seriesSearchResults [data-series-catalog]').first.wait_for(
            state='visible',timeout=3500)
        self.assertIn('Synthetic Anime',
                      self.page.locator('#seriesSearchResults').inner_text())
        self.assertNotIn('Searching',self.page.locator('#seriesSearchStatus').inner_text())
        self.assertFalse(self.errors)

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

    def test_catalog_preview_all_seasons_and_import_without_replacing_existing_logs(self):
        """Existing manual entries can gain two TVmaze seasons and a poster safely."""
        def catalog(route):
            url=route.request.url
            if '/search/shows' in url:
                route.fulfill(json=[dict(show=dict(
                    id=89103,name='Synthetic Polar Opposites',premiered='2026-01-11',
                    averageRuntime=24,image=dict(medium='https://static.tvmaze.com/synthetic.jpg'),
                    status='Running',url='https://www.tvmaze.com/shows/89103'))])
            elif '/seasons' in url:
                route.fulfill(json=[
                    dict(id=12,number=1,episodeOrder=None,endDate='2026-03-29'),
                    dict(id=13,number=2,episodeOrder=None,endDate=None)])
            else:
                route.fulfill(json=[
                    dict(id=10,season=1,number=1,runtime=24),
                    dict(id=11,season=1,number=2,runtime=24),
                    dict(id=20,season=2,number=1,runtime=24),
                    dict(id=21,season=2,number=2,runtime=24)])
        self.context.route('https://api.tvmaze.com/**',catalog)
        item=self.make(title='Synthetic Polar Opposites',ended=False,
                       seasons=[dict(number=1,episodeCount=2,ended=True)])
        old_id=item['seasons'][0]['episodes'][0]['id']
        self.page.evaluate("""id=>{const a=LifeRPGSeries,i=a.find(id);
          a.logEpisode(id,i.seasons[0].episodes[0].id,{historical:true});
        }""",item['id'])
        log_before=self.page.evaluate('JSON.stringify(LifeRPGSeries.getLogs())')
        xp_before=self.page.evaluate('LifeRPGApp.getState().characterXP')

        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        self.page.locator('[data-series-enrich]').click()
        self.assertTrue(self.page.locator('#seriesAdd').evaluate('(d)=>d.open'))
        self.assertTrue(self.page.locator('#seriesAddForm').evaluate('(e)=>e.hidden'))
        self.page.locator('#seriesSearchForm button').click()
        self.page.locator('[data-series-catalog]').click()
        self.page.wait_for_function(
            "document.getElementById('seriesSearchStatus').textContent.startsWith('Snapshot selected')")
        preview=self.page.locator('#seriesCatalogPreview')
        self.assertTrue(preview.is_visible())
        self.assertIn('Season 1',preview.inner_text())
        self.assertIn('Season 2',preview.inner_text())
        self.assertIn('2 known episodes',preview.inner_text())  # running season total unknown
        self.assertEqual(preview.locator('img').count(),1)
        self.page.locator('#seriesUpdateForm button').click()
        self.assertFalse(self.page.locator('#seriesAdd').evaluate('(d)=>d.open'))
        merged=self.page.evaluate('LifeRPGSeries.find(seriesId)')
        self.assertEqual(merged['id'],item['id'])
        self.assertEqual(merged['seasons'][0]['episodes'][0]['id'],old_id)
        self.assertEqual(merged['seasons'][0]['episodeCount'],2)
        self.assertEqual(len(merged['seasons']),2)
        self.assertEqual(merged['cover'],'https://static.tvmaze.com/synthetic.jpg')
        self.assertEqual(self.page.evaluate('JSON.stringify(LifeRPGSeries.getLogs())'),log_before)
        self.assertEqual(self.page.evaluate('LifeRPGApp.getState().characterXP'),xp_before)
        # Browser suite deliberately blocks external images; persisted URL is the contract.
        self.assertEqual(len(self.page.evaluate('LifeRPGSeries.find(seriesId).seasons')),2)

    def test_previous_season_import_no_retro_rewards_but_live_second_season_bonus(self):
        """Imported history is neither a rewarded watch nor a fake current-week log."""
        item=self.make(title='Two Season Synthetic',ended=True,seasons=[
            dict(number=1,episodeCount=2,ended=True),
            dict(number=2,episodeCount=2,ended=True)])
        before=self.page.evaluate('LifeRPGApp.getState().characterXP')
        result=self.page.evaluate("""() => {
          const a=LifeRPGSeries,i=a.find(seriesId),first=i.seasons[0],second=i.seasons[1];
          const past=a.markSeasonHistorical(i.id,first.id);
          const duplicate=a.markSeasonHistorical(i.id,first.id);
          const afterPast=LifeRPGApp.getState().characterXP;
          const progress=a.nextEpisode(i);
          const fresh=a.logEpisode(i.id,progress.id);
          const afterFresh=LifeRPGApp.getState().characterXP;
          const last=a.logEpisode(i.id,second.episodes[1].id);
          return {pastOk:past.ok,previousLogs:past.logs.length,duplicate:duplicate.duplicate,
            afterPast,afterFresh,finalXP:LifeRPGApp.getState().characterXP,
            next:a.label(i,progress),firstMilestone:Object.keys(i.milestones).some(k=>k.includes(first.id)),
            secondMilestone:Object.keys(i.milestones).some(k=>k.includes(second.id)),
            seriesMilestone:Boolean(i.milestones.series),finished:i.status==='completed',
            historical:a.getLogs().filter(l=>l.historical).length};
        }""")
        self.assertEqual(result['afterPast'],before)
        self.assertEqual(result['previousLogs'],2)
        self.assertEqual(result['historical'],2)
        self.assertTrue(result['pastOk'])
        self.assertTrue(result['duplicate'])
        self.assertEqual(result['next'],'S2E1')
        self.assertEqual(result['afterFresh']-before,15)
        self.assertEqual(result['finalXP']-before,50)  # two new episodes + season + series
        self.assertFalse(result['firstMilestone'])
        self.assertTrue(result['secondMilestone'])
        self.assertTrue(result['seriesMilestone'])
        self.assertTrue(result['finished'])
        self.page.evaluate('LifeRPGApp.showView("week")')
        self.page.wait_for_function('document.getElementById("seriesWeek")')
        self.assertEqual(self.page.locator('#seriesWeek').inner_text().count('Two Season Synthetic'),2)

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
            version='0.31.4-series10' if name in ['series-library.js','pwa.js'] else '0.31.4-series8' if name in ['series-library.css','my-week.js'] else '0.31.4-series2' if name in ['app.js','daily.js'] else '0.31.4-series1'
            self.assertIn(f'{name}?v={version}',html)
            self.assertIn(f'{name}?v={version}',sw)
        self.assertIn('life-rpg-v0.31.4-dm1',sw)
        self.assertIn('const VERSION = "0.31.4-dm1"',(ROOT/'pwa.js').read_text())

    def test_series_light_cozy_shelf_and_dialog_have_readable_contrast(self):
        """Catch the dark-background/dark-ink regression from the real screenshot."""
        self.page.add_style_tag(path=str(ROOT/'series-library.css'))
        self.assertEqual(self.page.locator('#view-series .series-hero').count(), 1)
        self.assertEqual(self.page.locator('#view-series .series-panel').count(), 1)
        self.assertEqual(self.page.locator('.series-empty .series-empty-mark').count(), 1)
        self.assertEqual(self.page.locator('.series-empty [data-series-add]').count(), 1)
        result=self.page.evaluate("""() => {
          const col=el => getComputedStyle(document.querySelector(el)).color.match(/\\d+(?:\\.\\d+)?/g).slice(0,3).map(Number);
          const light=[250,237,242];
          const lin=x => {x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
          const lum=a=>.2126*lin(a[0])+.7152*lin(a[1])+.0722*lin(a[2]);
          const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
          return {title:contrast(col('.series-hero h1'),light),
            body:contrast(col('.series-lead'),light),
            empty:contrast(col('.series-empty p'),[255,250,246]),
            gradient:getComputedStyle(document.querySelector('.series-hero')).backgroundImage.includes('gradient'),
            darkFallback:document.querySelector('#seriesShelf').style.backgroundColor};
        }""")
        for value in ['title','body','empty']:
            self.assertGreaterEqual(result[value],4.5,value)
        self.assertTrue(result['gradient'])
        self.page.locator('.series-empty [data-series-add]').click()
        self.assertTrue(self.page.locator('#seriesAdd').evaluate('(d)=>d.open'))
        self.assertEqual(self.page.locator('#seriesAdd h2').inner_text(),'Add a series')
        dialog=self.page.evaluate("""() => {
          const d=getComputedStyle(document.getElementById('seriesAdd'));
          const h=getComputedStyle(document.querySelector('#seriesAdd h2'));
          return {background:d.backgroundColor,title:h.color};
        }""")
        self.assertIn('255, 250, 246',dialog['background'])
        self.assertNotEqual(dialog['title'],dialog['background'])
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertLessEqual(self.page.locator('#seriesAdd').bounding_box()['width'],390)
        self.page.locator('#seriesAdd [data-series-close]').click()
        self.make()
        self.assertEqual(self.page.locator('#view-series .series-card').count(),1)
        card_color=self.page.locator('.series-card').evaluate('(el)=>getComputedStyle(el).backgroundColor')
        self.assertIn('255, 254, 253',card_color)
        self.page.evaluate('LifeRPGSeries.open(seriesId)')
        self.assertTrue(self.page.locator('#seriesDetail').evaluate('(d)=>d.open'))
        detail_color=self.page.locator('#seriesDetail').evaluate('(el)=>getComputedStyle(el).backgroundColor')
        self.assertIn('255, 250, 246',detail_color)

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
