"""Task Projects: real DOM smoke test with a synthetic save, no external accounts."""
import functools
import http.server
import pathlib
import re
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

class TaskProjectBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(SilentHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1',0), handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(headless=True,args=['--no-sandbox'])
        html=(ROOT/'index.html').read_text()
        html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
        html=re.sub(r'<link\b[^>]*>','',html)
        cls.html=html.replace('</body>',
            '<script src="/data/quests.js"></script><script src="/pako.min.js"></script>'
            '<script src="/app.js"></script><script src="/task-projects-core.js"></script>'
            '<script src="/task-projects.js"></script></body>')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(service_workers='block')
        self.addCleanup(self.context.close)
        self.context.route('**/*',self.route)
        self.page=self.context.new_page()
        self.errors=[]
        self.page.on('pageerror',lambda err:self.errors.append(str(err)))
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/',wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskProjects && document.querySelector('#taskProjectMount .tp-app')")
        self.page.evaluate("LifeRPGApp.showView('tasks')")

    def tearDown(self):
        self.assertEqual([],self.errors,'Uncaught page errors')

    def route(self,route):
        url=route.request.url
        origin=f'http://127.0.0.1:{self.server.server_port}/'
        if url==origin:
            route.fulfill(body=self.html,content_type='text/html')
        elif not url.startswith(origin) or route.request.resource_type in ('image','media','font'):
            route.abort()
        else:
            route.continue_()

    def test_template_generates_steps_and_survives_reload(self):
        self.page.locator('.tp-create summary').click()
        form=self.page.locator('form[data-tp-create]')
        form.locator('[name=title]').fill('Fiktive Mathearbeit 6A')
        form.locator('[name=anchor]').fill('2026-11-20')
        form.locator('[name=inclusion]').select_option('yes')
        form.locator('[name=format]').select_option('digital')
        form.locator('button[type=submit]').click()
        self.assertEqual(1,self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.projects.length'))
        self.assertTrue(self.page.locator('.tp-project').count()==1)
        self.assertTrue(self.page.get_by_text('Inklusionsarbeit konzipieren',exact=True).count()>=1)
        before=self.page.evaluate("({p:LifeRPGApp.getState().taskProjectsV1.projects[0].id,design:LifeRPGApp.getState().taskProjectsV1.projects[0].tasks.find(t=>t.stepId==='design').id})")
        self.page.locator('[data-tp-done]').first.click()
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskProjects && LifeRPGApp.getState().taskProjectsV1?.projects?.length===1")
        after=self.page.evaluate("({p:LifeRPGApp.getState().taskProjectsV1.projects[0].id,design:LifeRPGApp.getState().taskProjectsV1.projects[0].tasks.find(t=>t.stepId==='design').id,done:LifeRPGApp.getState().taskProjectsV1.projects[0].tasks.find(t=>t.stepId==='design').doneAt})")
        self.assertEqual(before['p'],after['p'])
        self.assertEqual(before['design'],after['design'])
        self.assertTrue(after['done'])

    def test_quick_capture_and_feierabend_does_not_delete_tasks(self):
        self.page.locator('form[data-tp-inbox] input[name=title]').fill('Fiktive Mail schreiben')
        self.page.locator('form[data-tp-inbox] button').click()
        self.assertEqual(1,len(self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.inbox')))
        self.page.locator('[data-tp-toggle-duty]').click()
        self.assertIn('Feierabendmodus',self.page.locator('#taskProjectTodayMount').inner_text())
        self.assertEqual(1,len(self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.inbox')))
