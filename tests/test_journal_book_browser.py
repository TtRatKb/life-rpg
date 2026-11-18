"""Life RPG Journal book browser regression · two physical pages + creative editor.
Synthetic browser state only. Never signs in, reads private saves or calls Firebase.
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
        cls.html=html.replace("</body>",
            '<style>.hidden{display:none!important}.view:not(.active){display:none!important}</style>'
            '<script src="/data/quests.js"></script>'
            '<script src="/pako.min.js"></script>'
            '<script src="/app.js"></script>'
            '<script src="/journal.js"></script>'
            '<script src="/bullet-journal-book.js"></script>'
            '<script src="/journal-art-editable.js"></script>'
            '</body>')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(service_workers="block")
        self.addCleanup(self.context.close)
        self.context.route("**/*",self.route)
        self.page=self.context.new_page()
        self.errors=[]
        self.page.on("pageerror",lambda error:self.errors.append(str(error)))
        self.page.goto(f"http://127.0.0.1:{self.server.server_port}/",wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp && window.LifeRPGJournal && window.LifeRPGJournalArtSpread")
        self.day=self.page.evaluate("""() => {
          const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
        }""")

    def tearDown(self):
        self.assertEqual([],self.errors,"Uncaught browser errors")

    def route(self,route):
        base=f"http://127.0.0.1:{self.server.server_port}/"
        if route.request.url==base:
            route.fulfill(body=self.html,content_type="text/html")
        elif route.request.url.startswith(base):
            route.continue_()
        else:
            route.abort()

    def styles(self):
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.add_style_tag(content="#mobileCloudGate{display:none!important}")

    def open_book(self):
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#view-bullet-journal.active").count())

    def test_same_canonical_fields_and_rewards_survive_reload(self):
        self.styles()
        self.open_book()
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(1,self.page.locator("#bjBookText").count())
        self.page.locator("#bjBookPrompt-gratitude").fill("A synthetic sunshine moment.")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.gratitude === 'A synthetic sunshine moment.'""",arg=self.day)
        self.page.locator("#bjBookText").fill("A private synthetic notebook note.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.bookNote === 'A private synthetic notebook note.'""",arg=self.day)
        self.assertEqual(1,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===day+':base-v0310').length""",arg=self.day))
        self.page.reload(wait_until="domcontentloaded")
        self.styles()
        self.open_book()
        self.assertEqual("A synthetic sunshine moment.",self.page.locator("#bjBookPrompt-gratitude").input_value())
        self.assertEqual("A private synthetic notebook note.",self.page.locator("#bjBookText").input_value())
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(1,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===day+':base-v0310').length""",arg=self.day))

    def test_two_full_pages_not_a_single_stretched_image(self):
        self.page.set_viewport_size({"width":1440,"height":970})
        self.styles()
        self.open_book()
        spread=self.page.locator("#bjBookDailySpread")
        self.assertTrue(spread.is_visible())
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-art-page:visible").count())
        self.assertEqual(0,self.page.locator("#bjArtPaper").count(),"Old one-page screenshot must be gone")
        self.assertEqual(5,self.page.locator("#bjBookDailySpread .bj-art-card").count())
        rects=self.page.evaluate("""() => {
          const rect=s=>document.querySelector(s).getBoundingClientRect();
          const l=rect('.bj-daily-left'),r=rect('.bj-daily-right');
          return {left:{x:l.x,width:l.width,height:l.height},
                  right:{x:r.x,width:r.width,height:r.height}};
        }""")
        self.assertGreater(rects["left"]["width"],350)
        self.assertGreater(rects["right"]["x"],rects["left"]["x"]+rects["left"]["width"]-2)
        self.assertAlmostEqual(rects["left"]["height"]/rects["left"]["width"],297/210,delta=0.08)
        self.assertAlmostEqual(rects["right"]["height"],rects["left"]["height"],delta=3)
        self.assertEqual(3,self.page.locator("#bjBookDailySpread img.bj-art-illustration").count())
        for field in ["gratitude","focusText","intentionText","happyMomentsText","bookNote"]:
            self.assertEqual(1,self.page.locator('[data-bj-card="'+field+'"]').count())
            self.assertEqual(1,self.page.locator('[data-bj-card="'+field+'"] .bj-art-field').count())
        # All cards' text baselines use identical unit lines, not printed
        # background text at inconsistent handwritten image coordinates.
        lineStyles=self.page.evaluate("""() => [...document.querySelectorAll('#bjBookDailySpread .bj-art-field')].map(el=>{
          const s=getComputedStyle(el);return [s.lineHeight,s.backgroundSize,s.fontFamily]})""")
        self.assertTrue(all(x[0] == lineStyles[0][0] and x[1]==lineStyles[0][1] for x in lineStyles))
        self.assertIn("Sue Ellen Francisco",lineStyles[0][2])
        self.assertIn("repeating-linear-gradient",self.page.locator("#bjBookText").evaluate("el=>getComputedStyle(el).backgroundImage"))

    def test_free_layout_can_hide_restore_move_and_preserve_content(self):
        self.styles()
        self.open_book()
        self.page.locator("#bjExtra-focusText").fill("A focus worth keeping.")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.dailySpreadV1?.focusText==='A focus worth keeping.'""",arg=self.day)
        initial=self.page.evaluate("""() => ({
          rewards:JSON.stringify(LifeRPGApp.getState().rewardLedger.events),
          atelier:JSON.stringify(LifeRPGApp.getState().journalAtelierV1||null)
        })""")
        self.page.locator('[data-bj-mode="create"]').click()
        self.assertTrue(self.page.locator("#bjArtSidebar").is_visible())
        self.assertEqual(1,self.page.locator("#bjBookDailySpread > .bj-art-page:visible").count())
        self.page.locator('[data-bj-side="right"]').click()
        self.assertTrue(self.page.locator(".bj-daily-right").is_visible())
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.page.locator('[data-bj-selected-action="hide"]').click()
        self.assertEqual(0,self.page.locator('#bjBookDailySpread [data-bj-card="focusText"]').count())
        self.assertEqual("A focus worth keeping.",self.page.locator("#bjExtra-focusText").input_value())
        state=self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].cards.focusText""",arg=self.day)
        self.assertFalse(state["visible"])
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.assertEqual(1,self.page.locator('#bjBookDailySpread [data-bj-card="focusText"]').count())
        self.assertEqual("A focus worth keeping.",self.page.locator("#bjExtra-focusText").input_value())
        # Keyboard drag is deterministic, including reload/sync persistence.
        before=self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].cards.focusText.x""",arg=self.day)
        handle=self.page.locator('[data-bj-card-handle="focusText"]')
        handle.focus();handle.press("ArrowRight")
        after=self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].cards.focusText.x""",arg=self.day)
        self.assertGreater(after,before)
        self.page.locator('[data-bj-paper="plain"]').click()
        self.assertEqual("plain",self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].paper.right""",arg=self.day))
        self.page.locator('[data-bj-mode="write"]').click()
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-art-page:visible").count())
        self.assertFalse(self.page.locator("#bjExtra-focusText").evaluate("el=>el.readOnly"))
        self.page.reload(wait_until="domcontentloaded")
        self.styles();self.open_book()
        self.assertEqual("A focus worth keeping.",self.page.locator("#bjExtra-focusText").input_value())
        self.assertEqual("plain",self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].paper.right""",arg=self.day))
        self.assertGreater(self.page.evaluate("""day => LifeRPGApp.getState().journalBookLayoutV2.daily[day].cards.focusText.x""",arg=self.day),before)
        end=self.page.evaluate("""() => ({
          rewards:JSON.stringify(LifeRPGApp.getState().rewardLedger.events),
          atelier:JSON.stringify(LifeRPGApp.getState().journalAtelierV1||null)
        })""")
        self.assertEqual(initial,end,"Layout editing must never affect earned rewards or sticker saves")

    def test_week_navigation_date_switch_and_mobile_horizontal_pan(self):
        self.styles();self.open_book()
        self.page.locator(".bj-art-more > summary").click()
        self.page.locator("#bjBookPrompt-smallWin").fill("A small synthetic win")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.smallWin==='A small synthetic win'""",arg=self.day)
        self.page.locator("#bjBookDailySpread [data-bj-chapter='weekly']").click()
        self.assertTrue(self.page.locator("#bjBookWeeklySpread").is_visible())
        self.assertFalse(self.page.locator(".bj-art-more").is_visible(),"Extra daily fields hidden in Weekly chapter")
        self.page.locator("#bjBookWeeklySpread [data-bj-chapter='daily']").click()
        self.assertEqual("A small synthetic win",self.page.locator("#bjBookPrompt-smallWin").input_value())
        # Switching date rebuilds the prompt; the old input must not survive
        # alongside the new one with a duplicate ID.
        yesterday=self.page.evaluate("""() => {
          const d=new Date();d.setDate(d.getDate()-1);
          return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
        }""")
        self.page.evaluate("(date)=>LifeRPGBulletJournalBook.changeDate(date)",yesterday)
        self.page.evaluate("(date)=>LifeRPGBulletJournalBook.changeDate(date)",self.day)
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(1,self.page.locator("#bjExtra-focusText").count())
        for width in [768,390,320]:
            self.page.set_viewport_size({"width":width,"height":850})
            self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth<=innerWidth+2"))
            info=self.page.evaluate("""() => {
              const spread=document.querySelector('#bjBookDailySpread');
              return {client:spread.clientWidth,scroll:spread.scrollWidth,overflow:getComputedStyle(spread).overflowX}
            }""")
            self.assertGreater(info["scroll"],info["client"],str(info))
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.set_viewport_size({"width":1440,"height":970})
        self.page.screenshot(path=str(shots/"journal-soft-floral-desktop.png"),full_page=True)
        self.page.locator('[data-bj-mode="create"]').click()
        self.page.screenshot(path=str(shots/"journal-soft-floral-create.png"),full_page=True)
        self.page.set_viewport_size({"width":390,"height":844})
        self.page.screenshot(path=str(shots/"journal-soft-floral-mobile.png"),full_page=True)

if __name__=="__main__":
    unittest.main()
