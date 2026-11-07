"""Journal Refresh V1: synthetic browser smoke + real runtime screenshots.
No personal saves, Google account, Firebase, Health or external task data are used.
"""
import functools
import http.server
import pathlib
import re
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts" / "journal-refresh-v1"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

class SoftFloralJournalBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0),
            functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        html = (ROOT / "index.html").read_text()
        html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
        html = re.sub(r"<link\b[^>]*>", "", html)
        cls.html = html.replace("</body>",
            '<link rel="stylesheet" href="/styles.css">'
            '<link rel="stylesheet" href="/bullet-journal-book.css">'
            '<link rel="stylesheet" href="/journal-daily-spread-v1.css">'
            '<style>.hidden{display:none!important}.view:not(.active){display:none!important}#mobileCloudGate{display:none!important}</style>'
            '<script src="/data/quests.js"></script>'
            '<script src="/pako.min.js"></script>'
            '<script src="/app.js"></script>'
            '<script src="/journal.js"></script>'
            '<script src="/bullet-journal-book.js"></script>'
            '</body>')
        ARTIFACTS.mkdir(parents=True, exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.ctx=self.browser.new_context(viewport={"width":1440,"height":900},
                                           service_workers="block")
        self.addCleanup(self.ctx.close)
        self.ctx.route("**/*",self.route)
        self.page=self.ctx.new_page()
        self.errors=[]
        self.page.on("pageerror",lambda error:self.errors.append(str(error)))
        self.page.goto(f"http://127.0.0.1:{self.server.server_port}/",
                       wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp && window.LifeRPGJournal && window.LifeRPGBulletJournalBook")
        self.day=self.page.evaluate("""() => {
            const d=new Date();
            return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
        }""")

    def tearDown(self):
        self.assertEqual([],self.errors,"Uncaught browser JS error")

    def route(self,route):
        origin=f"http://127.0.0.1:{self.server.server_port}/"
        if route.request.url==origin:
            route.fulfill(body=self.html,content_type="text/html")
        elif route.request.url.startswith(origin):
            route.continue_()
        elif route.request.url.startswith(("https://fonts.googleapis.com/","https://fonts.gstatic.com/")):
            route.continue_()
        else:
            route.abort()

    def test_live_reward_no_typing_payout_and_private_fields_reload(self):
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#bjBookDayTitle").count())
        self.assertEqual("daily journal",self.page.locator("#bjBookDayTitle").inner_text())
        self.page.locator("#bjBookPrompt-gratitude").fill("a"*49)
        self.assertIn("49 characters",self.page.locator('[data-bj-meter="gratitude"]').inner_text())
        preview=self.page.evaluate("""day=>LifeRPGJournal.getReflectionRewardPreview(day,'gratitude','a'.repeat(49))""",self.day)
        self.assertEqual(1,preview["remaining"])
        self.assertEqual(0,self.page.evaluate("""day=>LifeRPGApp.getState().rewardLedger.events.filter(
            e=>e.source==='journal-reflection-field-effort'&&e.sourceId.startsWith(day+':gratitude:')).length""",self.day))
        self.page.locator("#bjBookPrompt-gratitude").fill("a"*50)
        self.assertIn("50 characters",self.page.locator('[data-bj-meter="gratitude"]').inner_text())
        self.page.locator("#bjBookPrompt-gratitude").blur()
        self.page.wait_for_function("""day=>LifeRPGApp.getState().journal.entries[day]?.gratitude==='a'.repeat(50)""",arg=self.day)
        self.assertEqual(1,self.page.evaluate("""day=>LifeRPGApp.getState().rewardLedger.events.filter(
            e=>e.source==='journal-reflection-field-effort'&&e.sourceId.startsWith(day+':gratitude:')).length""",self.day))
        self.page.locator("#bjBookExtra-focusText").fill("I want a quiet afternoon.")
        self.page.locator("#bjBookExtra-focusText").blur()
        self.page.wait_for_function("""day=>LifeRPGApp.getState().journal.entries[day]?.dailySpreadV1?.focusText==='I want a quiet afternoon.'""",arg=self.day)
        self.assertEqual(1,self.page.evaluate("""day=>LifeRPGApp.getState().rewardLedger.events.filter(
            e=>e.source==='journal-reflection-field-effort'&&e.sourceId.startsWith(day+':gratitude:')).length""",self.day))
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGJournal && window.LifeRPGBulletJournalBook")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("a"*50,self.page.locator("#bjBookPrompt-gratitude").input_value())
        self.assertEqual("I want a quiet afternoon.",self.page.locator("#bjBookExtra-focusText").input_value())

    def test_real_desktop_and_mobile_screenshots(self):
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.page.locator("#bjBookPrompt-gratitude").fill("Warm tea, good music, and the first flowers on my walk.")
        self.page.locator("#bjBookPrompt-smallWin").fill("I gave myself time to read.")
        self.page.locator("#bjBookPrompt-hardThing").fill("My mind was busy. That's okay.")
        self.page.locator("#bjBookText").fill("A little collection of things I want to remember.\nThe world felt softer today.")
        self.page.locator("#bjBookExtra-happyMomentsText").fill("The smell of rain and a favorite song.")
        self.page.locator("#bjBookExtra-focusText").fill("Just one lovely thing.")
        self.page.locator("#bjBookExtra-intentionText").fill("Make space for rest.")
        self.page.locator("#bjBookDayTitle").click()
        self.page.wait_for_function("""day=>LifeRPGApp.getState().journal.entries[day]?.dailySpreadV1?.intentionText==='Make space for rest.'""",arg=self.day)
        self.page.evaluate("document.fonts.ready")
        self.page.screenshot(path=str(ARTIFACTS / "journal-desktop-1440.png"),full_page=True,animations="disabled")
        self.page.set_viewport_size({"width":390,"height":844})
        self.page.screenshot(path=str(ARTIFACTS / "journal-mobile-390.png"),full_page=True,animations="disabled")
        metrics=self.page.evaluate("""() => ({
            window:window.innerWidth,
            scroll:document.documentElement.scrollWidth,
            elements:[...document.querySelectorAll('body *')].filter(e=>{
                const r=e.getBoundingClientRect();
                return r.right>window.innerWidth+2 && r.width>0;
            }).slice(0,12).map(e=>({id:e.id,tag:e.tagName,
                cls:String(e.className).slice(0,60),right:Math.round(e.getBoundingClientRect().right)}))
        })""")
        if metrics["scroll"]>metrics["window"]+2:
            print("MOBILE_OVERFLOW_DIAGNOSTICS", metrics,flush=True)
        self.assertLessEqual(metrics["scroll"],metrics["window"]+2,"Mobile should not horizontally overflow")

if __name__=="__main__":
    unittest.main()
