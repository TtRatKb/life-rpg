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
        elif route.request.url.startswith(origin):
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
        # Isolated browser fixture has no Firebase session. Remove the unrelated sign-in gate from screenshots only.
        self.page.add_style_tag(content="#mobileCloudGate{display:none!important}")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(1,self.page.locator("#bjExtra-focusText").count())
        self.assertEqual(1,self.page.locator("#bjBookMoodText").count())
        self.assertEqual(1,self.page.locator("[data-bj-preview='gratitude']").count())
        self.page.locator("#bjBookPrompt-gratitude").fill("g" * 49)
        self.assertIn("49 characters",self.page.locator("[data-bj-preview='gratitude']").inner_text())
        self.page.locator("#bjBookPrompt-gratitude").fill("g" * 50)
        self.assertIn("50 characters",self.page.locator("[data-bj-preview='gratitude']").inner_text())
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
        self.page.set_viewport_size({"width":390,"height":844})
        self.page.screenshot(path=str(screenshots/"journal-soft-floral-mobile.png"),full_page=True)
        self.page.reload(wait_until="domcontentloaded")
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("A gentle intention, not a task.",self.page.locator("#bjExtra-focusText").input_value())
