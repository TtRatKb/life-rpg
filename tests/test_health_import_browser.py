"""End-to-end Health Journal form + IndexedDB, synthetic data and mocked Firebase.
No live account, HealthKit, or real private information is accessed.
"""
import functools
import http.server
import json
import pathlib
import re
import threading
import unittest
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
FIREBASE_MOCK="""
const initializeApp=()=>({}),getApps=()=>[],getApp=()=>({}),getAuth=()=>({}),getFirestore=()=>({});
window.fakeHealthCloud={};
const getDoc=async ref=>({exists:()=>Boolean(window.fakeHealthCloud[ref.at(-1)]),
  data:()=>window.fakeHealthCloud[ref.at(-1)]||null});
const getDocs=async()=>({docs:[]});
const doc=(...v)=>v,collection=(...v)=>v,query=(...v)=>v,orderBy=()=>null,limit=()=>null;
const serverTimestamp=()=>0,deleteField=()=>({__delete:true});
window.testCloudWrites=0;
const setDoc=async(ref,payload)=>{
  const date=ref.at(-1),old=window.fakeHealthCloud[date]||{};
  const newer={...old,...payload,
    imported:{...old.imported,...payload.imported},
    nutrition:{...old.nutrition,...payload.nutrition}};
  if(payload.wellbeing){
    newer.wellbeing={...old.wellbeing};
    for(const [key,value] of Object.entries(payload.wellbeing)){
      if(value?.__delete)delete newer.wellbeing[key];else newer.wellbeing[key]=value;
    }
  }
  window.fakeHealthCloud[date]=newer;window.testCloudWrites++;
};
const onAuthStateChanged=(auth,callback)=>{
  queueMicrotask(()=>callback({uid:'synthetic-health-test-user'}));
};
"""
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

class HealthImportBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler=functools.partial(QuietHandler,directory=str(ROOT))
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch(headless=True,args=['--no-sandbox'])
        html=(ROOT/'index.html').read_text()
        cls.html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
        cls.html=re.sub(r'<link\b[^>]*>','',cls.html)
        src=(ROOT/'health-bridge-dz44.js').read_text()
        cls.bridge=FIREBASE_MOCK+re.sub(r'^import .*;\s*$','',src,flags=re.M)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(service_workers='block')
        self.addCleanup(self.context.close)
        self.context.route('**/*',self.route)
        self.page=self.context.new_page()
        self.page.set_default_timeout(7000)
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/',wait_until='domcontentloaded')
        self.page.add_script_tag(url='/health-import-core.js')
        self.page.add_script_tag(content=self.bridge)
        self.page.locator('#view-healthsync').evaluate("""el=>{
          el.hidden=false; el.style.display='block';
        }""")
        self.page.wait_for_function("""()=>
          document.getElementById('healthBridgeStatus').textContent.includes('synchronisiert')
          || document.getElementById('healthBridgeStatus').textContent.includes('Cloud')
        """)

    def route(self,route):
        u=route.request.url
        if u==f'http://127.0.0.1:{self.server.server_port}/':
            route.fulfill(body=self.html,content_type='text/html')
        elif u.startswith(f'http://127.0.0.1:{self.server.server_port}/'):
            route.continue_()
        else:
            route.abort()

    def date(self,shift=0):
        return (date.today()-timedelta(days=shift)).isoformat()

    def records(self):
        return self.page.evaluate("""async()=>{
          const req=indexedDB.open('life-rpg-health-days-v1');
          const db=await new Promise((resolve,reject)=>{
            req.onsuccess=()=>resolve(req.result);
            req.onerror=()=>reject(req.error);
          });
          const tx=db.transaction('days','readonly');
          const all=tx.objectStore('days').getAll();
          return new Promise((resolve,reject)=>{
            all.onsuccess=()=>{resolve(all.result);db.close();};
            all.onerror=()=>reject(all.error);
          });
        }""")

    def load(self,values,consent=False):
        self.page.locator('#healthBatchPaste').fill(json.dumps(values))
        if consent:self.page.locator('#healthWellbeingConsent').check()
        self.page.locator('#healthBatchImport').click()

    def test_pasted_14_day_import_reimport_and_preserve(self):
        source={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(n),'steps':7000+n,'sleepMinutes':440} for n in range(14)]}
        self.load(source)
        self.page.wait_for_function("""()=>document.getElementById('healthBatchPaste').value===''""")
        saved=self.records()
        self.assertEqual(len(saved),14)
        self.assertTrue(all(row.get('pending') in (True,False) for row in saved))
        self.assertEqual(self.page.locator('#healthSleep').inner_text(),'440 min')
        # On exactly the same input the merge does not mutate any saved timestamps.
        before=sorted((x['date'],x['updatedAt']) for x in saved)
        self.load(source)
        self.page.wait_for_function("""()=>document.getElementById('healthBridgeStatus').textContent.includes('unverändert')""")
        after=self.records()
        self.assertEqual(len(after),14)
        self.assertEqual(before,sorted((x['date'],x['updatedAt']) for x in after))
        self.assertEqual([],self.errors)

    def test_sensitive_values_require_consent_and_do_not_backfill_story(self):
        sensitive={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(),'steps':8000,'periodActive':True,'periodCramps':'moderate','mood':'low'}]}
        self.load(sensitive)
        self.page.wait_for_function("""()=>document.getElementById('healthBridgeStatus').textContent.includes('Einwilligung')""")
        self.assertEqual(self.records(),[])
        self.page.locator('#healthWellbeingConsent').check()
        self.page.locator('#healthBatchImport').click()
        self.page.wait_for_function("""()=>document.getElementById('healthBatchPaste').value===''""")
        records=self.records()
        self.assertEqual(len(records),1)
        self.assertEqual(records[0]['wellbeing'],{'periodActive':True,'periodCramps':'moderate','mood':'low'})
        self.assertEqual(self.page.locator('#healthPeriod').inner_text(),'Eingetragen')
        self.assertFalse(self.page.locator('#healthWellbeingConsent').is_checked())
        self.assertEqual([],self.errors)

    def test_direct_cycle_and_mood_entry_can_be_corrected_without_flo(self):
        self.page.locator('.health-manual-wellbeing summary').click()
        self.page.locator('#healthWellbeingForm [name="periodActive"]').select_option('true')
        self.page.locator('#healthWellbeingForm [name="periodCramps"]').select_option('strong')
        self.page.locator('#healthWellbeingForm [name="mood"]').select_option('low')
        self.page.locator('#healthWellbeingForm [name="consent"]').check()
        self.page.locator('#healthWellbeingForm button[type="submit"]').click()
        self.page.wait_for_function("""()=>document.getElementById('healthPeriod').textContent==='Eingetragen'""")
        rec=self.records()
        self.assertEqual(rec[0]['wellbeing'],{
            'periodActive':True,'periodCramps':'strong','mood':'low'
        })
        self.assertFalse(self.page.locator('#healthWellbeingForm [name="consent"]').is_checked())
        self.page.wait_for_function("""() => {
          const row=window.fakeHealthCloud[Object.keys(window.fakeHealthCloud)[0]];
          return row && row.wellbeing?.periodActive===true;
        }""",timeout=4000)

        # Correct a mistaken entry; blank removes a field without touching history.
        self.page.locator('#healthWellbeingForm [name="periodActive"]').select_option('')
        self.page.locator('#healthWellbeingForm [name="periodCramps"]').select_option('mild')
        self.page.locator('#healthWellbeingForm [name="consent"]').check()
        self.page.locator('#healthWellbeingForm button[type="submit"]').click()
        self.page.wait_for_function("""()=>document.getElementById('healthPeriod').textContent==='—'""")
        rec=self.records()
        self.assertEqual(rec[0]['wellbeing'],{'periodCramps':'mild','mood':'low'})
        self.page.wait_for_function("""() => {
          const row=window.fakeHealthCloud[Object.keys(window.fakeHealthCloud)[0]];
          return row && row.wellbeing?.periodCramps==='mild'
            && !Object.hasOwn(row.wellbeing,'periodActive');
        }""",timeout=4000)
        self.assertEqual(self.page.evaluate('window.fakeHealthCloud[Object.keys(window.fakeHealthCloud)[0]].wellbeing'),{'periodCramps':'mild','mood':'low'})

        self.assertEqual([],self.errors)

    def setup_living_world(self):
        self.page.evaluate("""() => {
          window.syntheticRpgState={
            flags:{DYNARIOT_MOVE_IN_COMPLETE:true,HOUSEHOLD_ROUTINE_STARTED:true},
            dailyPlanner:{days:{}},timeTracking:{entries:[]},completionLog:[],
            rewardLedger:{events:[]}
          };
          window.LifeRPGApp={
            getState:()=>window.syntheticRpgState,saveState:()=>true,
            escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
          };
          window.LifeRPGStoryUI={getPersonScheduleStatus:person=>({
            unlocked:true,locationKey:'sharedApartment',working:false,
            talkReachable:true,roomId:person==='bakugo'?'kitchen':'living'
          })};
        }""")
        self.page.add_script_tag(url='/living-world-v3.js')
        self.page.add_script_tag(url='/social-delivery.js')

    def test_health_moment_only_after_explicit_opt_in_not_saved_as_health_history(self):
        self.setup_living_world()
        data={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(),'periodCramps':'strong','steps':5600}]}
        self.load(data,consent=True)
        self.page.wait_for_function("""() => document.getElementById('healthBatchPaste').value===''""")
        self.assertFalse(self.page.locator('#healthStoryReactionsOptIn').is_checked())
        self.assertIsNone(self.page.evaluate('LifeRPGHealthStoryContext.get()'))
        self.assertEqual(self.page.evaluate("""()=>
            LifeRPGLivingWorldV3._test.options().filter(x=>x.healthKind).length"""),0)

        self.page.locator('#healthStoryReactionsOptIn').check()
        self.page.wait_for_function("""() =>
          Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))""")
        self.assertEqual(self.page.evaluate('LifeRPGHealthStoryContext.get().kind'),'cramps')
        self.assertIsNone(self.page.evaluate("""()=>
          LifeRPGHealthStoryContext.get()?.periodCramps"""))
        self.page.wait_for_function("""() =>
          Boolean(document.querySelector('[data-social-delivery-health-echo]'))""")
        self.page.locator('[data-social-delivery-health-echo]').click()
        self.page.locator('#livingWorldV3Dialog').wait_for(state='visible')
        self.assertIn('cramps',self.page.locator('#livingWorldV3Body').inner_text().lower())

        # Walk the real dialogue. Choose explicitly whenever the scene asks.
        for _ in range(12):
            choices=self.page.locator('#livingWorldV3Dialog [data-lw3-choice]')
            if choices.count():
                choices.last.click()
            if self.page.locator('#livingWorldV3Dialog [data-lw3-finish]').count():
                self.page.locator('#livingWorldV3Dialog [data-lw3-finish]').click()
                break
            self.page.locator('#livingWorldV3Dialog [data-lw3-next]').click()
        else:
            self.fail('Health scene did not reach Finish within 12 dialogue steps')

        self.assertTrue(self.page.evaluate('LifeRPGHealthStoryContext.seenToday()'))
        self.assertFalse(self.page.evaluate("""() =>
          Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.assertEqual(self.page.evaluate("""() =>
          Object.keys(syntheticRpgState.livingWorldV3.completed).length"""),0)
        self.assertEqual(self.page.evaluate("""() =>
          Object.values(syntheticRpgState.socialDeliveryV1.observed).length"""),0)
        self.assertEqual(self.page.evaluate("""() =>
          (syntheticRpgState.story?.relationships||{})"""),{})
        self.assertEqual([],self.errors)

    def test_health_consent_revocation_and_chapter_gating(self):
        self.setup_living_world()
        data={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(),'sleepMinutes':280}]}
        self.load(data)
        self.page.wait_for_function("""() => document.getElementById('healthBatchPaste').value===''""")
        self.page.locator('#healthStoryReactionsOptIn').check()
        self.page.wait_for_function("""() => LifeRPGHealthStoryContext.get()?.kind==='sleep'""")
        self.page.evaluate("syntheticRpgState.flags.DYNARIOT_MOVE_IN_COMPLETE=false")
        self.assertFalse(self.page.evaluate("""() => Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.page.evaluate("syntheticRpgState.flags.DYNARIOT_MOVE_IN_COMPLETE=true")
        self.assertTrue(self.page.evaluate("""() => Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.page.locator('#healthStoryReactionsOptIn').uncheck()
        self.page.wait_for_function("""() =>
          !document.querySelector('[data-social-delivery-health-echo]')""")
        self.assertIsNone(self.page.evaluate('LifeRPGHealthStoryContext.get()'))
        self.assertEqual([],self.errors)

    def test_today_daily_checkin_cramps_uses_same_opt_in_without_copying_health_data(self):
        self.setup_living_world()
        self.page.evaluate("""today=>{
          syntheticRpgState.dailyPlanner.days[today]={
            checkIn:{health:{impact:'moderate',symptoms:['periodCramps']}}
          };
        }""",self.date())
        self.assertIsNone(self.page.evaluate('LifeRPGHealthStoryContext.get()'))
        self.page.locator('#healthStoryReactionsOptIn').check()
        self.page.wait_for_function("""() =>
          LifeRPGHealthStoryContext.get()?.kind==='cramps'""")
        self.assertTrue(self.page.evaluate("""()=>Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.assertEqual(self.records(),[])
        self.assertEqual([],self.errors)

    def test_private_moment_is_not_blocked_by_an_ordinary_moment(self):
        self.setup_living_world()
        self.page.evaluate("""today=>{
          syntheticRpgState.livingWorldV3.completed['lw3-routine-k']={date:today};
          syntheticRpgState.dailyPlanner.days[today]={
            checkIn:{health:{symptoms:['periodCramps']}}
          };
        }""",self.date())
        self.page.locator('#healthStoryReactionsOptIn').check()
        self.page.wait_for_function("""() =>
          Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))""")
        self.assertEqual(self.page.evaluate("""() =>
          LifeRPGLivingWorldV3._test.options().filter(x=>!x.healthKind).length"""),0)
        self.page.locator('#socialDeliveryCard [data-social-delivery-health-echo]').wait_for()
        self.assertIn('Something ordinary',self.page.locator('#livingWorldV3Card').inner_text())
        self.assertEqual([],self.errors)

    def test_ordinary_moment_still_available_after_health_seen(self):
        self.setup_living_world()
        self.page.evaluate("""today=>{
          syntheticRpgState.dailyPlanner.days[today]={
            checkIn:{health:{symptoms:['periodCramps']}}
          };
        }""",self.date())
        self.page.locator('#healthStoryReactionsOptIn').check()
        self.assertTrue(self.page.evaluate("""() =>
          Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.page.evaluate('LifeRPGHealthStoryContext.markSeen()')
        self.assertFalse(self.page.evaluate("""() =>
          Boolean(LifeRPGLivingWorldV3.notificationCandidate('wellbeing'))"""))
        self.assertTrue(self.page.evaluate("""() =>
          LifeRPGLivingWorldV3._test.options().some(x=>!x.healthKind)"""))
        self.assertEqual([],self.errors)

    def test_private_dialogue_choices_are_voluntary_and_four_tier_distinct(self):
        self.setup_living_world()
        self.page.evaluate("""today=>{
          syntheticRpgState.dailyPlanner.days[today]={
            checkIn:{health:{symptoms:['periodCramps']}}
          };
        }""",self.date())
        self.page.locator('#healthStoryReactionsOptIn').check()
        data=self.page.evaluate("""() => {
          const t=LifeRPGLivingWorldV3._test;
          const moment=t.healthMoments.find(x=>x.id==='lw-health-cramps-e');
          const flags=syntheticRpgState.flags;
          const keys=['HOUSEHOLD_ROUTINE_STARTED','HOUSEHOLD_FORMATION_PHASE_TWO_COMPLETE',
            'SHARED_APARTMENT_EMOTIONAL_HOME_STARTED'];
          const lines=[];
          for(const phase of [0,1,2,3]){
            keys.forEach(k=>delete flags[k]);
            if(phase>=1)flags.HOUSEHOLD_ROUTINE_STARTED=true;
            if(phase>=2)flags.HOUSEHOLD_FORMATION_PHASE_TWO_COMPLETE=true;
            if(phase>=3)flags.SHARED_APARTMENT_EMOTIONAL_HOME_STARTED=true;
            lines.push(t.sceneBeats(moment)[3].text);
          }
          const steps=t.sceneBeats(moment);
          return {lines,choices:steps[4].options.map(x=>x[0]),
            opening:steps.slice(0,4).map(x=>x.text),
            sunset:t.backgroundFor('kitchen','sunset'),
            night:t.backgroundFor('living','night')};
        }""")
        self.assertEqual(len(set(data['lines'])),4)
        self.assertTrue(any('rather not' in x.lower() for x in data['choices']))
        self.assertTrue(any('choose' in x.lower() or 'decide' in x.lower() for x in data['opening']))
        self.assertEqual(data['sunset'],'assets/story/backgrounds/time/shared_apartment_kitchen_sunset.webp')
        self.assertEqual(data['night'],'assets/story/backgrounds/time/shared_apartment_night.webp')

        self.page.locator('#socialDeliveryCard [data-social-delivery-health-echo]').click()
        self.page.locator('#livingWorldV3Dialog').wait_for(state='visible')
        self.assertIn('Private · not saved',self.page.locator('#livingWorldV3Dialog').inner_text())
        # Simulate consent removal while the modal is open (for example after
        # account/settings state changes). An actual pointer can't reach the
        # underlying checkbox through a modal dialog.
        self.page.evaluate("""() => {
          const el=document.getElementById('healthStoryReactionsOptIn');
          el.checked=false;
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }""")
        self.page.wait_for_function("""() =>
          !document.getElementById('livingWorldV3Dialog').open""")
        self.assertEqual([],self.errors)

    def test_health_and_ordinary_invitations_can_coexist_without_private_push(self):
        self.setup_living_world()
        self.page.evaluate("""today=>{
          syntheticRpgState.dailyPlanner.days[today]={
            checkIn:{health:{symptoms:['periodCramps']}}
          };
          const social=syntheticRpgState.socialDeliveryV1;
          social.items.push({id:'test-ordinary',type:'moment',status:'ready',
            momentId:'lw3-routine-e',day:today});
        }""",self.date())
        self.page.locator('#healthStoryReactionsOptIn').check()
        self.page.wait_for_function("""() =>
          Boolean(document.querySelector('[data-social-delivery-health-echo]'))""")
        self.assertEqual(self.page.locator('[data-social-delivery-moment]').count(),1)
        self.assertEqual(self.page.locator('[data-social-delivery-health-echo]').count(),1)
        self.assertEqual([],self.errors)

    def test_invalid_second_day_rolls_back_whole_import(self):
        invalid={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(),'steps':6000},
            {'date':self.date(1),'sleepMinutes':3000}]}
        self.load(invalid)
        self.page.wait_for_function("""()=>document.getElementById('healthBridgeStatus').textContent.includes('Import fehlgeschlagen')""")
        self.assertEqual(self.records(),[])
        self.assertEqual([],self.errors)
