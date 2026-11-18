"""Life RPG Illustrated Journal real-browser regression (synthetic data only).
Never accesses account saves, HealthKit, Firebase, external purchases or personal records.
"""
import functools
import http.server
import pathlib
import re
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]

class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

class JournalBookBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler=functools.partial(SilentHandler,directory=str(ROOT))
        cls.server=http.server.ThreadingHTTPServer(("127.0.0.1",0),handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(headless=True,args=["--no-sandbox"])
        html=(ROOT/"index.html").read_text()
        html=re.sub(r"<script\b[^>]*>.*?</script>","",html,flags=re.S)
        html=re.sub(r"<link\b[^>]*>","",html)
        html=html.replace("</head>",
           '<link rel="stylesheet" href="/journal-art-background-v2.css"></head>')
        cls.html=html.replace("</body>",
          '<style>.hidden{display:none!important}.view:not(.active){display:none!important}</style>'+
          '<script src="/data/quests.js"></script>'+
          '<script src="/pako.min.js"></script>'+
          '<script src="/app.js"></script>'+
          '<script src="/journal.js"></script>'+
          '<script src="/bullet-journal-book.js"></script>'+
          '<script src="/journal-art-editable.js"></script>'+
          '<script src="/bullet-journal-atelier.js"></script>'+
          '</body>')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop()
        cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(service_workers="block",viewport={"width":1440,"height":970})
        self.addCleanup(self.context.close)
        self.context.route("**/*",self.route)
        self.page=self.context.new_page()
        self.errors=[]
        self.page.on("pageerror",lambda error:self.errors.append(str(error)))
        self.page.goto(f"http://127.0.0.1:{self.server.server_port}/",wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGJournalArtSpread && window.LifeRPGBulletJournalBook")
        self.day=self.page.evaluate("""() => {
          const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
        }""")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.add_style_tag(content="#mobileCloudGate{display:none!important}")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#view-bullet-journal.active").count())

    def tearDown(self):
        self.assertEqual([],self.errors,"Uncaught browser errors")

    def route(self,route):
        origin=f"http://127.0.0.1:{self.server.server_port}/"
        if route.request.url==origin:
            route.fulfill(body=self.html,content_type="text/html")
        elif route.request.url.startswith(origin):
            route.continue_()
        else:
            route.abort()

    def test_two_a4_pages_use_original_watercolor_not_rectangles(self):
        self.page.wait_for_function("document.querySelector(\'#bjBookDailySpread\')?.classList.contains(\'bj-layer-sprites-ready\')",timeout=15000)
        self.assertTrue(self.page.locator("#bjBookDailySpread").is_visible())
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-layer-page:visible").count())
        self.assertEqual(5,self.page.locator("#bjBookDailySpread .bj-layer-original-frame").count())
        self.assertEqual(8,self.page.locator("#bjBookDailySpread .bj-layer-art-piece").count())
        self.assertEqual(1,self.page.locator("#bjArtPaper").count(),"Original atlas stays hidden, not shown as one flattened page")
        data=self.page.evaluate("""() => {
          const a=document.querySelector('#bjBookDailySpread');
          const l=a.querySelector('[data-bj-page="left"]').getBoundingClientRect();
          const r=a.querySelector('[data-bj-page="right"]').getBoundingClientRect();
          const frame=a.querySelector('.bj-layer-frame-crop');
          return {l:{x:l.x,y:l.y,w:l.width,h:l.height},r:{x:r.x,w:r.width,h:r.height},
              src:getComputedStyle(frame).backgroundImage,
              art:a.style.getPropertyValue('--bj-original-atlas'),
              border:getComputedStyle(frame.parentElement).borderStyle};
        }""")
        self.assertGreater(data["l"]["w"],300)
        self.assertGreater(data["r"]["x"],data["l"]["x"]+data["l"]["w"]-2)
        self.assertAlmostEqual(data["l"]["h"]/data["l"]["w"],297/210,delta=.08)
        self.assertAlmostEqual(data["r"]["h"],data["l"]["h"],delta=3)
        self.assertIn("data:image/webp;base64",data["src"])
        self.assertIn("data:image/webp;base64",data["art"])
        self.assertEqual("none",data["border"],"Frames are actual watercolor crops, not CSS rectangles")
        self.assertFalse(self.page.locator('[data-bj-mode="create"]').count())
        for field in ("gratitude","focusText","intentionText","happyMomentsText","bookNote"):
            self.assertEqual(1,self.page.locator('[data-bj-field="'+field+'"] .bj-layer-field').count())
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-desktop.png"),full_page=True)

    def test_writing_and_reward_idempotency_survive_reload(self):
        self.page.locator("#bjBookPrompt-gratitude").fill("A synthetic beautiful morning.")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""d => LifeRPGApp.getState().journal.entries[d]?.gratitude==='A synthetic beautiful morning.'""",arg=self.day)
        self.page.locator("#bjExtra-focusText").fill("Rest when it feels right")
        self.page.locator("#bjBookText").fill("My original synthetic thoughts.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""d => {
          const e=LifeRPGApp.getState().journal.entries[d];
          return e?.bookNote==='My original synthetic thoughts.' && e?.dailySpreadV1?.focusText==='Rest when it feels right';
        }""",arg=self.day)
        initial=self.page.evaluate("""d => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===d+':base-v0310').length""",arg=self.day)
        self.assertEqual(1,initial)
        self.page.reload(wait_until="domcontentloaded")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("A synthetic beautiful morning.",self.page.locator("#bjBookPrompt-gratitude").input_value())
        self.assertEqual("My original synthetic thoughts.",self.page.locator("#bjBookText").input_value())
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(initial,self.page.evaluate("""d => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===d+':base-v0310').length""",arg=self.day))

    def test_creative_hide_restore_move_and_original_decoration_survive(self):
        self.page.locator("#bjExtra-focusText").fill("Never delete this text.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""d => LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.focusText==='Never delete this text.'""",arg=self.day)
        reward_before=self.page.evaluate("JSON.stringify(LifeRPGApp.getState().rewardLedger.events)")
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.assertTrue(self.page.locator(".bj-layer-shelf").is_visible())
        self.assertEqual(1,self.page.locator("#bjBookDailySpread > .bj-layer-page:visible").count())
        self.page.locator('[data-bj-choose-side="right"]').click()
        self.assertTrue(self.page.locator('[data-bj-page="right"]').is_visible())
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.page.locator('[data-bj-action-card="remove"]').click()
        self.assertEqual(0,self.page.locator('[data-bj-field="focusText"]').count())
        self.assertEqual("Never delete this text.",self.page.locator("#bjExtra-focusText").input_value())
        self.assertFalse(self.page.evaluate("""d => LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.visible""",self.day))
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.assertEqual(1,self.page.locator('[data-bj-field="focusText"]').count())
        self.assertEqual("Never delete this text.",self.page.locator("#bjExtra-focusText").input_value())
        before=self.page.evaluate("""d => LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.x""",self.day)
        grip=self.page.locator('[data-bj-handle="focusText"]')
        grip.focus();grip.press("ArrowRight")
        after=self.page.evaluate("""d => LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.x""",self.day)
        self.assertGreater(after,before)
        # Old, separately saved stickers have not been deleted during layout changes.
        self.assertEqual(reward_before,self.page.evaluate("JSON.stringify(LifeRPGApp.getState().rewardLedger.events)"))
        self.page.locator('[data-bj-layer-mode="write"]').click()
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-layer-page:visible").count())
        self.assertFalse(self.page.locator("#bjExtra-focusText").evaluate("el=>el.readOnly"))
        self.page.reload(wait_until="domcontentloaded")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("Never delete this text.",self.page.locator("#bjExtra-focusText").input_value())
        self.assertGreater(self.page.evaluate("""d => LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.x""",self.day),before)

    def test_navigation_and_mobile_do_not_duplicate_or_erase(self):
        self.page.locator(".bj-layer-extras > summary").click()
        self.page.locator("#bjBookPrompt-smallWin").fill("A synthetic little win.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""d => LifeRPGApp.getState().journal.entries[d]?.smallWin==='A synthetic little win.'""",arg=self.day)
        self.page.locator("#bjBookDailySpread [data-bj-chapter='weekly']").click()
        self.assertTrue(self.page.locator("#bjBookWeeklySpread").is_visible())
        self.assertFalse(self.page.locator(".bj-layer-extras").is_visible())
        self.page.locator("#bjBookWeeklySpread [data-bj-chapter='daily']").click()
        self.assertEqual("A synthetic little win.",self.page.locator("#bjBookPrompt-smallWin").input_value())
        yesterday=self.page.evaluate("""() => {
          const d=new Date();d.setDate(d.getDate()-1);
          return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
        }""")
        self.page.evaluate("(d)=>LifeRPGBulletJournalBook.changeDate(d)",yesterday)
        self.page.evaluate("(d)=>LifeRPGBulletJournalBook.changeDate(d)",self.day)
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(1,self.page.locator("#bjBookText").count())
        for width in (768,390,320):
            self.page.set_viewport_size({"width":width,"height":850})
            info=self.page.evaluate("""() => {
              const el=document.querySelector('#bjBookDailySpread');
              return {doc:document.documentElement.scrollWidth,viewport:innerWidth,
                      client:el.clientWidth,scroll:el.scrollWidth}
            }""")
            self.assertLessEqual(info["doc"],info["viewport"]+2,str(info))
            self.assertGreater(info["scroll"],info["client"],str(info))
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-mobile.png"),full_page=True)

if __name__=="__main__":unittest.main()
