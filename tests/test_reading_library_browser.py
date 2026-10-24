"""Browser smoke test with synthetic empty state and no external services."""
import functools
import http.server
import pathlib
import re
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ReadingLibraryBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        html = (ROOT / "index.html").read_text()
        html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
        html = re.sub(r"<link\b[^>]*>", "", html)
        cls.html = html.replace("</body>",
            '<style>.hidden{display:none!important}</style>'
            '<script src="/data/quests.js"></script><script src="/pako.min.js"></script>'
            '<script src="/app.js"></script><script src="/library.js"></script></body>')

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
        self.page.wait_for_function("window.LifeRPGLibrary && window.LifeRPGApp")
        self.page.evaluate("LifeRPGApp.showView('library')")

    def tearDown(self):
        self.assertEqual([], self.errors, "uncaught page errors")

    def route(self, route):
        origin = f"http://127.0.0.1:{self.server.server_port}/"
        if route.request.url == origin:
            route.fulfill(body=self.html, content_type="text/html")
        elif not route.request.url.startswith(origin) or route.request.resource_type in ("image", "media", "font"):
            route.abort()
        else:
            route.continue_()

    def test_fanfiction_add_and_caught_up_does_not_finish(self):
        self.page.locator("#addBookButton").click()
        self.page.locator("#bookKind").select_option("fanfiction")
        self.assertTrue(self.page.locator("#bookKindDetails").is_visible())
        self.assertFalse(self.page.locator("#bookLookupPanel").is_visible())
        self.page.locator("#bookTitle").fill("Synthetic AO3 Work")
        self.page.locator("#bookAuthor").fill("ExampleWriter")
        self.page.locator("#bookExternalUrl").fill("https://archiveofourown.org/works/123")
        self.page.locator("#bookCurrentChapter").fill("2")
        self.page.locator("#bookTotalChapters").fill("3")
        self.page.locator("#bookPublicationStatus").select_option("ongoing")
        self.page.locator('input[name="bookStatus"][value="reading"]').check()
        self.page.locator('#bookForm button[type="submit"]:not([data-save-another])').click()
        self.page.wait_for_function("LifeRPGLibrary.getItems().some(x=>x.title==='Synthetic AO3 Work')")
        self.assertEqual(2, self.page.evaluate("LifeRPGLibrary.getItems().find(x=>x.title==='Synthetic AO3 Work').currentChapter"))
        self.page.locator('#libraryBoard [data-book-log-type="chapter"]').click()
        work = self.page.evaluate("LifeRPGLibrary.getItems().find(x=>x.title==='Synthetic AO3 Work')")
        self.assertEqual(3, work["currentChapter"])
        self.assertEqual("reading", work["status"])
        self.assertTrue(self.page.locator("#libraryBoard").get_by_text("Caught up", exact=False).count() > 0)
        self.assertTrue(self.page.locator("#libraryBoard a[href='https://archiveofourown.org/works/123']").count() > 0)

    def test_manhwa_volume_tracking_and_filters(self):
        self.page.evaluate("LifeRPGLibrary.openBook()")
        self.page.locator("#bookKind").select_option("manhwa")
        self.page.locator("#bookProgressUnit").select_option("volumes")
        self.assertTrue(self.page.locator("#bookVolumeDetails").is_visible())
        self.page.locator("#bookTitle").fill("Synthetic Manhwa")
        self.page.locator("#bookCurrentVolume").fill("1")
        self.page.locator("#bookTotalVolumes").fill("8")
        self.page.locator('input[name="bookStatus"][value="reading"]').check()
        self.page.locator('#bookForm button[type="submit"]:not([data-save-another])').click()
        self.page.locator('[data-library-kind="manhwa"]').click()
        self.assertEqual(1, self.page.locator("#libraryBoard .library-book-card-v16").count())
        self.page.locator('#libraryBoard [data-book-log-type="volume"]').click()
        item = self.page.evaluate("LifeRPGLibrary.getItems().find(x=>x.title==='Synthetic Manhwa')")
        self.assertEqual("manhwa", item["kind"])
        self.assertEqual(2, item["currentVolume"])
        self.assertEqual(0, item["currentChapter"])
        self.assertEqual("reading", item["status"])

    def test_ao3_bookmarklet_import_want_to_read_without_overwriting_progress(self):
        bookmarklet = self.page.locator("#libraryAo3Bookmarklet").get_attribute("href")
        self.assertTrue(bookmarklet.startswith("javascript:"))
        ao3_fixture = '''<!doctype html><html><body>
          <h2 class="title heading">The Synthetic Story</h2>
          <h3 class="byline heading"><a rel="author">TestWriter</a></h3>
          <h5 class="fandom heading"><a class="tag">My Hero Academia</a></h5>
          <dl><dd class="chapters">5/?</dd></dl>
          <button id="sendToLifeRpg">Add to Life RPG</button>
        </body></html>'''
        self.context.route("https://archiveofourown.org/works/123", lambda route:
            route.fulfill(body=ao3_fixture, content_type="text/html"))
        ao3 = self.context.new_page()
        ao3.goto("https://archiveofourown.org/works/123")
        ao3.evaluate("""code => document.getElementById('sendToLifeRpg').addEventListener('click',
            () => (0, eval)(code.slice('javascript:'.length)))""", bookmarklet)

        with self.context.expect_page() as new_page:
            ao3.locator("#sendToLifeRpg").click()
        imported = new_page.value
        imported.on("pageerror", lambda error: self.errors.append(str(error)))
        imported.wait_for_function("window.LifeRPGLibrary && document.querySelector('#bookDialog').open")
        self.assertEqual("The Synthetic Story", imported.locator("#bookTitle").input_value())
        self.assertEqual("TestWriter", imported.locator("#bookAuthor").input_value())
        self.assertEqual("My Hero Academia", imported.locator("#bookFandom").input_value())
        self.assertEqual("5", imported.locator("#bookTotalChapters").input_value())
        self.assertEqual("ongoing", imported.locator("#bookPublicationStatus").input_value())
        self.assertTrue(imported.locator('input[name="bookStatus"][value="want"]').is_checked())
        self.assertEqual(0, imported.evaluate("LifeRPGLibrary.getItems().length"), "import does not save before confirmation")
        imported.locator('input[name="bookStatus"][value="reading"]').check()
        imported.locator("#bookCurrentChapter").fill("2")
        imported.locator('#bookForm button[type="submit"]:not([data-save-another])').click()
        self.assertEqual(1, imported.evaluate("LifeRPGLibrary.getItems().length"))

        with self.context.expect_page() as second_page:
            ao3.locator("#sendToLifeRpg").click()
        existing = second_page.value
        existing.on("pageerror", lambda error: self.errors.append(str(error)))
        existing.wait_for_function("window.LifeRPGLibrary && document.querySelector('#bookDialog').open")
        self.assertEqual("2", existing.locator("#bookCurrentChapter").input_value())
        self.assertTrue(existing.locator('input[name="bookStatus"][value="reading"]').is_checked())
        self.assertEqual(1, existing.evaluate("LifeRPGLibrary.getItems().length"), "same AO3 work is not duplicated")


if __name__ == "__main__":
    unittest.main()
