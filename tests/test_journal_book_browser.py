"""Isolated browser regression: daily check-in reflection -> the actual book.

Uses synthetic localStorage only; no cloud connection, HealthKit or personal data.
"""
import functools
import http.server
import pathlib
import re
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class JournalBookBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(SilentHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        html = (ROOT / "index.html").read_text()
        html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
        html = re.sub(r"<link\b[^>]*>", "", html)
        cls.html = html.replace("</body>",
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
        self.context = self.browser.new_context(service_workers="block")
        self.addCleanup(self.context.close)
        self.context.route("**/*", self.route)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(f"http://127.0.0.1:{self.server.server_port}/", wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGApp && window.LifeRPGJournal && window.LifeRPGBulletJournalBook")
        self.day = self.page.evaluate("""() => {
           const d=new Date();
           return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
        }""")

    def tearDown(self):
        self.assertEqual([], self.errors, "Uncaught browser errors")

    def route(self, route):
        origin = f"http://127.0.0.1:{self.server.server_port}/"
        if route.request.url == origin:
            route.fulfill(body=self.html, content_type="text/html")
        elif route.request.url.startswith(origin) or route.request.url.startswith("https://fonts.googleapis.com/") or route.request.url.startswith("https://fonts.gstatic.com/"):
            route.continue_()
        else:
            route.abort()

    def test_daily_prompt_writes_same_entry_and_survives_reload_without_duplicate_reward(self):
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertTrue(self.page.locator("#view-bullet-journal.active").count()==1)
        self.assertEqual(1,self.page.locator("#bjBookPrompt-gratitude").count())
        self.assertEqual(1,self.page.locator("#bjBookText").count())
        self.page.locator("#bjBookPrompt-gratitude").fill("A synthetic sunshine moment.")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.gratitude === 'A synthetic sunshine moment.'""",arg=self.day)
        self.page.locator("#bjBookText").fill("A private synthetic notebook note.")
        self.page.locator("#bjBookDayTitle").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.bookNote === 'A private synthetic notebook note.'""",arg=self.day)
        self.assertEqual(1,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===day+':base-v0310').length""",arg=self.day))
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGJournal && window.LifeRPGBulletJournalBook")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("A synthetic sunshine moment.",self.page.locator("#bjBookPrompt-gratitude").input_value())
        self.assertEqual("A private synthetic notebook note.",self.page.locator("#bjBookText").input_value())
        self.page.locator("#bjBookPrompt-gratitude").fill("A synthetic sunshine moment.")
        self.page.locator("#bjBookText").click()
        self.assertEqual(1,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===day+':base-v0310').length""",arg=self.day))

    def test_journal_book_navigation_does_not_erase_prompt(self):
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.page.locator(".bj-art-more > summary").click()
        self.page.locator("#bjBookPrompt-smallWin").fill("Synthetic small win")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.smallWin === 'Synthetic small win'""",arg=self.day)
        self.page.locator("#view-bullet-journal [data-bj-chapter='weekly']").first.click()
        self.page.locator("#bjBookWeeklySpread [data-bj-chapter='daily']").click()
        self.assertEqual("Synthetic small win",self.page.locator("#bjBookPrompt-smallWin").input_value())

    def test_soft_floral_live_meter_optional_notes_and_screenshots(self):
        self.page.set_viewport_size({"width": 1440, "height": 950})
        self.page.add_style_tag(url="/styles.css")
        self.page.add_style_tag(url="/bullet-journal-book.css")
        self.page.add_style_tag(url="/journal-daily-spread-v1.css")
        self.page.add_style_tag(url="/journal-art-background-v2.css")
        self.page.add_style_tag(url="/journal-art-editable.css")
        # Preview uses the same publicly hosted typefaces as the shipped app.
        self.page.evaluate("""() => {
          const link=document.createElement('link');
          link.rel='stylesheet';
          link.href='https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=Parisienne&family=Sue+Ellen+Francisco&family=Shadows+Into+Light&display=swap';
          document.head.appendChild(link);
        }""")
        try:
            self.page.wait_for_function("document.fonts.check('400 28px Parisienne') && document.fonts.check('400 17px \"Sue Ellen Francisco\"')",timeout=3500)
        except Exception:
            pass

        # Isolated browser fixture has no Firebase session. Remove the unrelated sign-in gate from screenshots only.
        self.page.add_style_tag(content="#mobileCloudGate{display:none!important}")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#bjExtra-focusText").count())
        self.assertEqual(1,self.page.locator("#bjBookMoodText").count())
        self.assertEqual(1,self.page.locator("[data-bj-preview='gratitude']").count())
        style=self.page.locator("#bjBookPrompt-gratitude").evaluate("""el => {
          const c=getComputedStyle(el);return {font:c.fontFamily,size:c.fontSize,weight:c.fontWeight,line:c.lineHeight};
        }""")
        self.assertIn("Sue Ellen Francisco",style["font"])
        self.assertEqual("17px",style["size"])
        self.assertEqual("400",style["weight"])
        self.assertEqual("35px",style["line"])
        art=self.page.locator("#bjBookDailySpread img.bj-daily-illustration")
        self.assertEqual(3,art.count())
        self.page.wait_for_function("""() => [...document.querySelectorAll('#bjBookDailySpread img.bj-daily-illustration')].every(img => img.complete && img.naturalWidth>0)""",timeout=15000)
        overlaps=self.page.evaluate("""() => {
            const imgs=[...document.querySelectorAll('#bjBookDailySpread img.bj-daily-illustration')];
            const fields=[...document.querySelectorAll('#bjBookDailySpread textarea')];
            const intersects=(a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            return imgs.some(img => fields.some(field => intersects(img.getBoundingClientRect(),field.getBoundingClientRect())));
        }""")
        self.assertFalse(overlaps,"Illustration overlays a writable field")

        self.page.locator("#bjBookPrompt-gratitude").fill("g" * 49)
        self.assertIn("49 characters",self.page.locator("#bjArtSaveStatus").inner_text())
        self.page.locator("#bjBookPrompt-gratitude").fill("g" * 50)
        self.assertIn("50 characters",self.page.locator("#bjArtSaveStatus").inner_text())
        self.page.locator("#bjExtra-focusText").fill("A gentle intention, not a task.")
        self.page.locator("#bjBookText").click()
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.dailySpreadV1?.focusText === 'A gentle intention, not a task.'""",arg=self.day)
        count=self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
            e => e.source==='journal-reflection-field-effort' && e.sourceId.startsWith(day+':gratitude:')).length""",arg=self.day)
        self.assertEqual(1,count)
        self.page.locator("#bjBookPrompt-gratitude").fill("g" * 50)
        self.page.locator("#bjBookText").click()
        self.assertEqual(count,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
            e => e.source==='journal-reflection-field-effort' && e.sourceId.startsWith(day+':gratitude:')).length""",arg=self.day))
        screenshots=ROOT/"test-artifacts"
        screenshots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(screenshots/"journal-soft-floral-desktop.png"),full_page=True)
        for width,height,label in [(768,1024,"tablet"),(390,844,"mobile"),(320,640,"small-mobile")]:
            self.page.set_viewport_size({"width":width,"height":height})
            self.page.screenshot(path=str(screenshots/("journal-soft-floral-"+label+".png")),full_page=True)
            self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"),"Horizontal overflow at "+str(width))
            if width <= 440:
                size=self.page.locator("#bjBookPrompt-gratitude").evaluate("el=>getComputedStyle(el).fontSize")
                self.assertEqual("16px",size)
        self.page.reload(wait_until="domcontentloaded")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("A gentle intention, not a task.",self.page.locator("#bjExtra-focusText").input_value())

    def test_original_art_page_uses_canonical_live_editors_and_rewards(self):
        self.page.add_style_tag(url="/styles.css")
        self.page.add_style_tag(url="/bullet-journal-book.css")
        self.page.add_style_tag(url="/journal-daily-spread-v1.css")
        self.page.add_style_tag(url="/journal-art-background-v2.css")
        self.page.add_style_tag(url="/journal-art-editable.css")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#bjArtPaper").count())
        for field, selector in {
            "gratitude":"#bjBookPrompt-gratitude",
            "focusText":"#bjExtra-focusText",
            "intentionText":"#bjExtra-intentionText",
            "happyMomentsText":"#bjExtra-happyMomentsText",
            "bookNote":"#bjBookText",
        }.items():
            self.assertEqual(1,self.page.locator("#bjArtPaper "+selector).count(),field)
            self.assertEqual(field,self.page.locator("#bjArtPaper "+selector).get_attribute("data-bj-art"))
        self.page.locator("#bjBookPrompt-gratitude").fill("Jasmine sunshine and a calm morning, just for my synthetic test.")
        self.page.locator("#bjExtra-focusText").fill("A gentle plan")
        self.page.locator("#bjExtra-happyMomentsText").fill("A lovely little moment")
        self.page.locator("#bjBookText").fill("My own journal notes")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""day => {
          const e=LifeRPGApp.getState().journal.entries[day];
          return e?.gratitude?.startsWith('Jasmine sunshine') &&
            e?.dailySpreadV1?.focusText==='A gentle plan' &&
            e?.dailySpreadV1?.happyMomentsText==='A lovely little moment' &&
            e?.bookNote==='My own journal notes';
        }""",arg=self.day)
        self.assertEqual(1,self.page.evaluate("""day => LifeRPGApp.getState().rewardLedger.events.filter(
          e => e.source==='journal-reflection-base' && e.sourceId===day+':base-v0310').length""",arg=self.day))
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_function("window.LifeRPGBulletJournalBook && window.LifeRPGJournalArtSpread")
        # The isolated fixture intentionally strips every CSS link. Reapply the
        # production styles after reload so the mobile geometry is meaningful.
        for stylesheet in ["styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                           "journal-art-background-v2.css","journal-art-editable.css"]:
            self.page.add_style_tag(url="/"+stylesheet)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("A gentle plan",self.page.locator("#bjExtra-focusText").input_value())
        self.assertEqual("My own journal notes",self.page.locator("#bjBookText").input_value())
        self.assertTrue(self.page.locator("#bjArtPaper").is_visible())
        self.assertEqual(1,self.page.locator("#bjBookPrompt-smallWin").count(),
                         "Other existing reflection fields must remain available beneath the art page")
        self.page.locator(".bj-art-more > summary").click()
        self.assertTrue(self.page.locator("#bjBookPrompt-smallWin").is_visible())
        self.page.set_viewport_size({"width":390,"height":844})
        mobile_geometry=self.page.evaluate("""() => {
            const scroller=document.querySelector('.bj-art-scroller'),paper=document.querySelector('#bjArtPaper');
            return {viewport:innerWidth,client:scroller.clientWidth,scroll:scroller.scrollWidth,
                    sheet:paper.getBoundingClientRect().width,overflow:getComputedStyle(scroller).overflowX};
        }""")
        self.page.wait_for_function("""() => {
            const paper=document.querySelector('#bjArtPaper'),scroller=document.querySelector('.bj-art-scroller');
            return paper.getBoundingClientRect().width <= scroller.clientWidth + 2;
        }""")
        self.assertEqual("overview",self.page.locator("#bjBookDailySpread").get_attribute("data-bj-view"))
        self.page.locator('[data-bj-jump="bookNote"]').click()
        self.assertEqual("writing",self.page.locator("#bjBookDailySpread").get_attribute("data-bj-view"))
        self.assertTrue(self.page.locator("#bjArtPaper").bounding_box()["width"]>mobile_geometry["client"])
        self.assertEqual("bjBookText",self.page.evaluate("document.activeElement?.id"))
        self.page.locator('[data-bj-mode="overview"]').click()
        screenshots=ROOT/"test-artifacts"
        screenshots.mkdir(exist_ok=True)
        for width,height,label in [(1440,900,"desktop"),(768,1024,"tablet"),
                                   (390,844,"mobile"),(320,640,"small-mobile")]:
            self.page.set_viewport_size({"width":width,"height":height})
            self.page.locator(".bj-art-more").evaluate("el=>el.open=false")
            self.page.wait_for_function("""() => {
                const paper=document.querySelector('#bjArtPaper'),scroller=document.querySelector('.bj-art-scroller');
                return paper.getBoundingClientRect().width <= scroller.clientWidth + 3;
            }""")
            geometry=self.page.evaluate("""() => ({viewport:innerWidth,
                pageWidth:document.documentElement.scrollWidth,
                artWidth:document.querySelector('#bjArtPaper').getBoundingClientRect().width,
                scrollerWidth:document.querySelector('.bj-art-scroller').clientWidth})""")
            self.assertLessEqual(geometry["pageWidth"],width+2,str(geometry))
            self.assertLessEqual(geometry["artWidth"],geometry["scrollerWidth"]+3,str(geometry))
            self.page.screenshot(path=str(screenshots/("journal-art-v2-"+label+".png")),full_page=True)
        self.page.set_viewport_size({"width":390,"height":844})
        self.page.locator('[data-bj-jump="gratitude"]').click()
        self.page.screenshot(path=str(screenshots/"journal-art-v2-mobile-writing.png"),full_page=True)
        self.page.locator("#bjBookPrompt-gratitude").fill("Another synthetic thought saved after mobile zoom.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""day => LifeRPGApp.getState().journal.entries[day]?.gratitude==='Another synthetic thought saved after mobile zoom.'""",arg=self.day)
