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
const getDoc=async()=>({exists:()=>false,data:()=>null});
const getDocs=async()=>({docs:[]});
const doc=(...v)=>v,collection=(...v)=>v,query=(...v)=>v,orderBy=()=>null,limit=()=>null;
const serverTimestamp=()=>0;
window.testCloudWrites=0;
const setDoc=async()=>{window.testCloudWrites++;};
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
        # Correct a mistaken entry; blank removes a field without touching history.
        self.page.locator('#healthWellbeingForm [name="periodActive"]').select_option('')
        self.page.locator('#healthWellbeingForm [name="periodCramps"]').select_option('mild')
        self.page.locator('#healthWellbeingForm [name="consent"]').check()
        self.page.locator('#healthWellbeingForm button[type="submit"]').click()
        self.page.wait_for_function("""()=>document.getElementById('healthPeriod').textContent==='—'""")
        rec=self.records()
        self.assertEqual(rec[0]['wellbeing'],{'periodCramps':'mild','mood':'low'})
        self.assertEqual([],self.errors)

    def test_invalid_second_day_rolls_back_whole_import(self):
        invalid={'schema':'life-rpg-health-batch-v1','days':[
            {'date':self.date(),'steps':6000},
            {'date':self.date(1),'sleepMinutes':3000}]}
        self.load(invalid)
        self.page.wait_for_function("""()=>document.getElementById('healthBridgeStatus').textContent.includes('Import fehlgeschlagen')""")
        self.assertEqual(self.records(),[])
        self.assertEqual([],self.errors)
