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
            '<script src="/task-projects.js"></script><script src="/task-planning-core.js"></script>'
            '<script src="/task-planning-ui.js"></script><script src="/task-pack-core.js"></script>'
            '<script src="/task-pack-ui.js"></script><script src="/task-work-windows-core.js"></script>'
            '<script src="/task-work-windows.js"></script><script src="/task-wizard.js"></script>'
            '<script src="/task-free-days-core.js"></script><script src="/task-google-calendar-core.js"></script>'
            '<script src="/task-google-calendar.js"></script><script src="/task-focus-core.js"></script><script src="/task-free-days.js"></script></body>')

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

    def test_native_planner_removes_todoist_list_and_allows_task_edit(self):
        self.page.wait_for_function("window.LifeRPGNativePlanner && document.querySelector('#taskPlanningPanel .npt-card')")
        self.assertEqual(0,self.page.locator('#todoistPageMount').count())
        self.page.locator('form[data-tp-inbox] input[name=title]').fill('Fiktive Pflichtaufgabe')
        self.page.locator('form[data-tp-inbox] button').click()
        self.page.locator('.npt-settings summary').first.click()
        self.page.locator('.npt-item button[data-npt-edit]').first.click()
        form=self.page.locator('form[data-npt-edit-form]')
        form.locator('[name=title]').fill('Fiktive Pflichtaufgabe aktualisiert')
        form.locator('[name=dueDate]').fill('2026-11-10')
        form.locator('[name=minutes]').fill('45')
        form.locator('[name=mandatory]').select_option('yes')
        form.locator('button[type=submit]').click()
        self.assertEqual('Fiktive Pflichtaufgabe aktualisiert',self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.inbox[0].title'))
        self.assertEqual(45,self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.inbox[0].minutes'))
        self.page.locator('.npt-settings summary').last.click()
        settings=self.page.locator('form[data-npt-settings]')
        settings.locator('[name=d0]').fill('150')
        settings.locator('[name=reserve]').select_option('40')
        settings.locator('button[type=submit]').click()
        self.assertEqual(150,self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.planningSettings.weekdays[0]'))
        self.assertEqual(40,self.page.evaluate('LifeRPGApp.getState().taskProjectsV1.planningSettings.reservePercent'))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGNativePlanner && LifeRPGApp.getState().taskProjectsV1?.planningSettings?.reservePercent===40")

    def test_selective_private_pack_import_and_idempotent_routines(self):
        self.page.wait_for_function("window.LifeRPGTaskPacks && window.LifeRPGTaskPackCore")
        payload = {'schema':'life-rpg-task-pack-v1','id':'synthetic-autumn-2026','title':'Fiktiver Plan',
            'groups':[{'id':'class-plans','title':'Fiktive Jahrespläne','kind':'project','anchorDate':'2026-10-19',
                       'tasks':[{'id':'math','title':'Fiktive Matheplanung','dueDate':'2026-11-02','minutes':60,
                                 'mandatory':True,'dateKind':'target'}]},
                      {'id':'other','title':'Fiktive Zusatzaufgabe','kind':'inbox',
                       'tasks':[{'id':'other-a','title':'Nur optionaler Test','dueDate':'2026-11-06',
                                 'minutes':15,'mandatory':False}]}],
            'routines':[{'id':'bills','title':'Fiktive Rechnungsprüfung','cadence':'weekly','weekday':6,
                         'steps':['Rechnungen prüfen','Ggf. zahlen']}]}
        import json
        self.page.locator('.tpk-import summary').click()
        self.page.locator('input[data-tpk-file]').set_input_files(
            files={'name':'synthetic.json','mimeType':'application/json','buffer':json.dumps(payload).encode()})
        self.page.locator('[data-tpk-pick="group:other"]').uncheck()
        self.page.locator('[data-tpk-import]').click()
        state=self.page.evaluate('LifeRPGApp.getState().taskProjectsV1')
        self.assertEqual(1,len(state['projects']))
        self.assertEqual(0,len(state['inbox']))
        self.assertEqual(1,len(state['routinesV1']))
        self.page.locator('[data-tpk-import]').click()
        state=self.page.evaluate('LifeRPGApp.getState().taskProjectsV1')
        self.assertEqual(1,len(state['projects']))
        self.assertEqual(1,len(state['routinesV1']))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskPacks && LifeRPGApp.getState().taskProjectsV1?.projects?.length===1")

    def test_guided_character_task_survives_reload(self):
        self.page.wait_for_function("window.LifeRPGTaskWizard && document.querySelector('#taskWizardMount')")
        self.page.locator('[data-twd-toggle="open"]').click()
        self.page.locator('[data-twd-select-char="bakugo"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('[data-twd-choose="task"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount input[name=title]').fill('Synthetic: lesson prep')
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-due]').first.click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-minutes="30"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-mandatory="yes"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-hurdle="high"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-context="home"]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.page.locator('#taskWizardMount [data-twd-next]').click()
        self.assertEqual('Synthetic: lesson prep',self.page.evaluate("LifeRPGApp.getState().taskProjectsV1.inbox[0].title"))
        self.assertEqual('high',self.page.evaluate("LifeRPGApp.getState().taskProjectsV1.inbox[0].hurdle"))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskWizard && LifeRPGApp.getState().taskProjectsV1?.inbox?.[0]?.title==='Synthetic: lesson prep'")

    def test_biweekly_work_window_and_timetable_conflicts(self):
        self.page.wait_for_function("window.LifeRPGTaskWindows && window.LifeRPGNativePlanner")
        self.page.evaluate("""() => {
            window.LifeRPGWeekV2={
              getOccurrences:(date)=>date==='2026-10-26'?[{
                start:new Date('2026-10-26T09:30:00'),end:new Date('2026-10-26T10:00:00'),canceled:false,type:'teaching'
              }]:[],
              isHoliday:()=>false,isSickDay:()=>false,render:()=>{}
            };
          }""")
        self.page.locator('[data-tww-add]').click()
        form=self.page.locator('#taskWorkWindowForm')
        form.locator('[name=title]').fill('Synthetic school prep')
        form.locator('[name=date]').fill('2026-10-26')
        form.locator('[name=start]').fill('09:00')
        form.locator('[name=end]').fill('11:00')
        form.locator('[name=repeat]').select_option('biweekly')
        form.locator('button[type=submit]').click()
        self.assertTrue(self.page.evaluate("LifeRPGApp.getState().taskProjectsV1.useWorkWindowsV1"))
        self.assertEqual(90,self.page.evaluate("LifeRPGTaskWindows.dayWindows('2026-10-26')[0].availableMinutes"))
        self.assertEqual(0,len(self.page.evaluate("LifeRPGTaskWindows.dayWindows('2026-11-02')")))
        self.assertEqual(120,self.page.evaluate("LifeRPGTaskWindows.dayWindows('2026-11-09')[0].availableMinutes"))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskWindows && LifeRPGApp.getState().taskProjectsV1?.workWindowsV1?.length===1")

    def test_free_day_suggestions_without_hard_today_and_calendar_conflict(self):
        self.page.wait_for_function("window.LifeRPGFreeDay && window.LifeRPGFreeDayCore")
        self.page.evaluate("""() => {
          LifeRPGTaskProjects.createTask({
            title:'Synthetic work next week',dueDate:'2026-11-01',minutes:120,
            mandatory:true,hurdle:'high',context:'home'
          });
        }""")
        self.page.locator('[data-tfd-date]').fill('2026-10-20')
        self.assertIn('Synthetic work next week',self.page.locator('#taskFreeDayMount').inner_text())
        self.page.locator('[data-tfd-style="frog"]').click()
        self.assertIn('Synthetic work next week',self.page.locator('#taskFreeDayMount').inner_text())
        self.page.evaluate("""() => {
          const previous = LifeRPGGoogleCalendar.busy;
          LifeRPGGoogleCalendar.busy = d => d==='2026-10-20'?[{start:'14:00',end:'16:00',title:'Synthetic appointment'}]:[];
          window.dispatchEvent(new Event('life-rpg:google-calendar-updated'));
        }""")
        self.page.locator('[data-tfd-block]').click()
        form=self.page.locator('#taskFreeDayForm')
        form.locator('[name=date]').fill('2026-10-20')
        form.locator('[name=start]').fill('09:00')
        form.locator('[name=end]').fill('15:00')
        form.locator('button[type=submit]').click()
        self.assertEqual(300,self.page.evaluate("LifeRPGTaskWindows.dayWindows('2026-10-20')[0].availableMinutes"))
        self.assertEqual(60,self.page.evaluate("LifeRPGTaskWindows.dayWindows('2026-10-20')[0].conflictMinutes"))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGFreeDay && LifeRPGApp.getState().taskProjectsV1?.workWindowsV1?.length===1")

    def test_companion_starts_and_completes_existing_project_step_without_duplicate_reward(self):
        self.page.wait_for_function("window.LifeRPGFreeDay && window.LifeRPGTaskFocusCore")
        self.page.evaluate("""() => {
            LifeRPGTaskProjects.createTask({
              title:'Synthetic uncomfortable message',dueDate:'2026-11-02',minutes:20,
              mandatory:true,hurdle:'high',context:'home'
            });
        }""")
        self.page.locator('[data-tfd-budget="15"]').click()
        self.assertIn('Synthetic uncomfortable message',self.page.locator('#taskFreeDayMount').inner_text())
        self.page.locator('[data-tfd-focus]').first.click()
        self.assertIn('Synthetic uncomfortable message',self.page.locator('.tfd-focus').inner_text())
        self.page.locator('[data-tfd-guide="bakugo"]').click()
        self.page.locator('[data-tfd-step]').click()
        self.assertIn('ersten',self.page.locator('.tfd-focus').inner_text())
        self.assertEqual(1,len(self.page.evaluate("LifeRPGApp.getState().taskProjectsV1.inbox")))
        self.page.locator('[data-tfd-done]').click()
        self.assertEqual(0,len(self.page.evaluate("LifeRPGTaskProjects.getOpen()")))
        self.assertTrue(self.page.evaluate("!!LifeRPGApp.getState().taskProjectsV1.inbox[0].doneAt"))
        self.assertIn('Geschafft',self.page.locator('.tfd-focus').inner_text())
        self.page.locator('[data-tfd-undo]').click()
        self.assertEqual(1,len(self.page.evaluate("LifeRPGTaskProjects.getOpen()")))
        self.page.locator('[data-tfd-done]').click()
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("window.LifeRPGTaskProjects && LifeRPGApp.getState().taskProjectsV1?.inbox?.length===1")
        self.assertEqual(0,len(self.page.evaluate("LifeRPGTaskProjects.getOpen()")))

    def test_free_day_zero_budget_and_calendar_does_not_imply_errands(self):
        self.page.wait_for_function("window.LifeRPGFreeDay")
        self.page.evaluate("""() => LifeRPGTaskProjects.createTask({
          title:'Synthetic classroom file',dueDate:'2026-11-01',minutes:90,mandatory:true
        })""")
        self.page.locator('[data-tfd-budget="0"]').click()
        self.assertIn('nicht arbeiten',self.page.locator('#taskFreeDayMount').inner_text())
        self.assertEqual(0,self.page.locator('[data-tfd-focus]').count())
        self.page.locator('[data-tfd-budget="open"]').click()
        self.assertTrue(self.page.locator('[data-tfd-focus]').count()>0)
        self.page.evaluate("""() => {LifeRPGGoogleCalendar.busy = () => [{start:'14:00',end:'16:00'}]}""")
        self.assertFalse(self.page.evaluate("LifeRPGFreeDay._test.outOfHome('2026-10-20')"))
