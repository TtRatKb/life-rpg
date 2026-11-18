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
        # The background is a genuinely separate watercolor paper asset now.
        # No giant original screenshot stylesheet is loaded into this test.
        cls.html=html.replace("</body>",
          '<style>.hidden{display:none!important}.view:not(.active){display:none!important}</style>'+
          '<script src="/data/quests.js"></script>'+
          '<script src="/pako.min.js"></script>'+
          '<script src="/app.js"></script>'+
          '<script src="/journal.js"></script>'+
          '<script src="/bullet-journal-book.js"></script>'+
          '<script src="/journal-canva-isolated-layers.js"></script>'+
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

    def test_suggested_collage_is_immediately_usable_and_every_box_remains_customizable(self):
        # Three offset original watercolor frames on the left, two on the
        # right, with subtly different angles and nonuniform sizes. This is
        # the STARTING page, no drag or crafting required.
        layout=self.page.evaluate("LifeRPGJournalArtSpread.getLayout()")
        self.assertEqual(5,len(layout["cards"]))
        self.assertEqual(3,len([p for p in layout["cards"].values() if p["side"]=="left"]))
        self.assertEqual(2,len([p for p in layout["cards"].values() if p["side"]=="right"]))
        for field in ("gratitude","intentionText","happyMomentsText","focusText","bookNote"):
            self.assertGreater(abs(layout["cards"][field]["rotation"]),1)
            self.assertLess(abs(layout["cards"][field]["rotation"]),4)
        self.assertNotEqual(layout["cards"]["gratitude"]["x"],layout["cards"]["intentionText"]["x"])
        self.assertNotEqual(layout["cards"]["happyMomentsText"]["x"],layout["cards"]["intentionText"]["x"])
        # The two compact lower cards intentionally sit NEXT TO each other.
        self.assertLess(layout["cards"]["intentionText"]["x"],40)
        self.assertGreater(layout["cards"]["happyMomentsText"]["x"],70)
        self.assertLess(abs(layout["cards"]["happyMomentsText"]["y"]-
                            layout["cards"]["intentionText"]["y"]),10)
        self.assertNotEqual(layout["cards"]["focusText"]["x"],layout["cards"]["bookNote"]["x"])
        self.assertNotEqual(layout["cards"]["focusText"]["scale"],layout["cards"]["bookNote"]["scale"])
        self.assertEqual(-1.8,layout["cards"]["gratitude"]["rotation"])
        self.page.wait_for_function("""() =>
           [...document.querySelectorAll('#bjBookDailySpread .bj-layer-original-frame')]
            .every(card=>card.getBoundingClientRect().width>50)""")
        # Check that actual letter-writing areas do not overlap one another,
        # even when the decorative illustrated frame edges gently overlap.
        artwork=self.page.evaluate("""() => {
          const out={};
          for(const box of document.querySelectorAll('#bjBookDailySpread .bj-layer-original-frame')){
            const zone=box.querySelector('.bj-layer-write-zone');
            const rect=zone.getBoundingClientRect();
            out[box.dataset.bjField]={side:box.closest('[data-bj-page]').dataset.bjPage,
              x:rect.x,y:rect.y,w:rect.width,h:rect.height,
              transform:getComputedStyle(box).transform};
          }
          return out;
        }""")
        for i,(left,a) in enumerate(artwork.items()):
            self.assertNotEqual("none",a["transform"])
            for right,b in list(artwork.items())[i+1:]:
                if a["side"]!=b["side"]:continue
                intersection=max(0,min(a["x"]+a["w"],b["x"]+b["w"])-max(a["x"],b["x"]))*max(
                  0,min(a["y"]+a["h"],b["y"]+b["h"])-max(a["y"],b["y"]))
                self.assertLess(intersection,min(a["w"]*a["h"],b["w"]*b["h"])*.06,
                                f"Writing areas must stay readable: {left} / {right}")
        old=self.page.locator("#bjExtra-focusText")
        old.fill("Keep this written sentence while rearranging.")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""d =>
          LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.focusText?.startsWith('Keep this written')""",arg=self.day)
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.page.locator('[data-bj-choose-side="right"]').click()
        self.page.locator('[data-bj-add-card="focusText"]').click()
        slider=self.page.locator("#bjLayerAngle")
        slider.evaluate("""el=>{el.value='-5';el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));}""")
        self.assertAlmostEqual(-5,self.page.evaluate("""d =>
          LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.rotation""",self.day),delta=.1)
        self.page.locator('[data-bj-action-card="default"]').click()
        restored=self.page.evaluate("""d =>
          LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText""",self.day)
        self.assertEqual("right",restored["side"])
        self.assertAlmostEqual(1.6,restored["rotation"],delta=.1)
        self.assertAlmostEqual(1.07,restored["scale"],delta=.01)
        self.assertEqual("Keep this written sentence while rearranging.",old.input_value())
        self.page.locator('[data-bj-layer-mode="write"]').click()
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-layer-page:visible").count())
        self.page.reload(wait_until="domcontentloaded")
        for css in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                    "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+css)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual("Keep this written sentence while rearranging.",self.page.locator("#bjExtra-focusText").input_value())
        self.assertAlmostEqual(1.6,self.page.evaluate("""d =>
          LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.rotation""",self.day),delta=.1)

    def test_two_a4_pages_use_original_watercolor_not_rectangles(self):
        self.page.wait_for_function("document.querySelector(\'#bjBookDailySpread\')?.classList.contains(\'bj-layer-sprites-ready\')",timeout=15000)
        self.page.wait_for_function("""() => {
          const art=document.querySelector('#bjBookDailySpread .bj-layer-frame-crop');
          return art && getComputedStyle(art).backgroundImage.includes('data:image/webp;base64');
        }""",timeout=10000)
        self.assertTrue(self.page.locator("#bjBookDailySpread").is_visible())
        self.assertEqual(2,self.page.locator("#bjBookDailySpread > .bj-layer-page:visible").count())
        self.assertEqual(5,self.page.locator("#bjBookDailySpread .bj-layer-original-frame").count())
        self.assertEqual(8,self.page.locator("#bjBookDailySpread .bj-layer-art-piece").count())
        self.assertEqual(0,self.page.locator("#bjArtPaper").count(),"No screenshot atlas exists anywhere in the new Journal")
        data=self.page.evaluate("""() => {
          const a=document.querySelector('#bjBookDailySpread');
          const l=a.querySelector('[data-bj-page="left"]').getBoundingClientRect();
          const r=a.querySelector('[data-bj-page="right"]').getBoundingClientRect();
          const frame=a.querySelector('.bj-layer-frame-crop');
          return {l:{x:l.x,y:l.y,w:l.width,h:l.height},r:{x:r.x,w:r.width,h:r.height},
              src:getComputedStyle(frame).backgroundImage,
              art:a.style.getPropertyValue('--bj-clean-paper'),
              border:getComputedStyle(frame.parentElement).borderStyle};
        }""")
        self.assertGreater(data["l"]["w"],300)
        self.assertGreater(data["r"]["x"],data["l"]["x"]+data["l"]["w"]-2)
        self.assertAlmostEqual(data["l"]["h"]/data["l"]["w"],297/210,delta=.08)
        self.assertAlmostEqual(data["r"]["h"],data["l"]["h"],delta=3)
        self.assertIn("data:image/webp;base64",data["src"])
        self.assertIn("data:image/webp;base64",data["art"])
        self.assertIn("data:image/webp;base64",data["src"])
        self.assertGreater(self.page.evaluate("""()=>Object.keys(LifeRPGJournalCanvasLayers.assets).length"""),15)
        self.assertEqual("none",self.page.locator("#bjBookDailySpread .bj-layer-frame-crop").first.evaluate(
            "el=>getComputedStyle(el).maskImage"),"Transparent sprite must not be cropped by old elliptical masks")
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
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-filled.png"),full_page=True)
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
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-create.png"),full_page=True)
        self.assertTrue(self.page.locator(".bj-layer-shelf").is_visible())
        preview=self.page.locator('[data-bj-preview-frame="gratitude"]').evaluate(
            "el=>getComputedStyle(el).backgroundImage")
        self.assertIn("data:image/",preview,"The palette must show an actual original painted frame, not a placeholder")
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

    def test_original_frames_resize_and_per_line_inputs_save_every_character(self):
        # Load an existing multi-line canonical reflection BEFORE switching
        # visual layouts, exactly like an older save.
        existing="First line\nSecond line\nThird line\nFourth line\nFifth line"
        self.page.locator("#bjExtra-focusText").fill(existing)
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function(
            """d => LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.focusText?.startsWith('First line')""",
            arg=self.day
        )
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.page.locator('[data-bj-choose-side="right"]').click()
        detail=self.page.evaluate("""() => {
          const p=document.querySelector('[data-bj-page="right"]');
          const s=document.querySelector('#bjBookDailySpread');
          const r=p.getBoundingClientRect();
          return {active:s.dataset.bjEditSide,creative:s.classList.contains('bj-layer-creative'),
                  paperWidth:r.width,paperDisplay:getComputedStyle(p).display,
                  spreadWidth:s.getBoundingClientRect().width};
        }""")
        self.assertGreater(detail["paperWidth"],250,str(detail))
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.page.wait_for_function("""() => document.querySelector('[data-bj-field="focusText"]')?.getBoundingClientRect().width>20""")
        self.page.locator('[data-bj-box-mode="lined"]').click()
        before=self.page.locator('[data-bj-field="focusText"]').evaluate(
            "el => el.getBoundingClientRect().width")
        self.page.locator("#bjLayerScale").evaluate("""el => {
          el.value='55';
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }""")
        after=self.page.locator('[data-bj-field="focusText"]').evaluate(
            "el => el.getBoundingClientRect().width")
        self.assertLess(after,before*.65)
        size=self.page.evaluate("""d=>LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.scale""",self.day)
        self.assertAlmostEqual(.55,size,delta=.02)
        self.page.locator('[data-bj-layer-mode="write"]').click()
        lines=self.page.locator('[data-bj-field="focusText"] .bj-layer-line-input')
        self.assertGreaterEqual(lines.count(),5)
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-lined.png"),full_page=True)
        self.assertEqual(existing.split("\n"),
                         [lines.nth(i).input_value() for i in range(5)])
        self.assertTrue(self.page.locator("#bjExtra-focusText").evaluate("el=>getComputedStyle(el).display==='none'"))
        # Geometry must be checked in the box's own coordinate system:
        # the entire illustrated box (including its lines) is intentionally
        # rotated, so screen-aligned rectangles have different AABBs.
        geometry=self.page.locator('[data-bj-field="focusText"] .bj-layer-line-row').evaluate_all(
            "els=>els.slice(0,3).map(el=>({top:el.offsetTop,height:el.offsetHeight}))")
        self.assertAlmostEqual(geometry[1]["top"]-geometry[0]["top"],geometry[0]["height"],delta=1)
        lines.nth(1).fill("The edited second line")
        lines.nth(2).focus()
        self.page.wait_for_function(
            """d=>LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.focusText?.includes('The edited second line')""",
            arg=self.day
        )
        self.assertEqual(
            "First line\nThe edited second line\nThird line\nFourth line\nFifth line",
            self.page.locator("#bjExtra-focusText").input_value())
        # Changes to layout never change saved writing; a switch back to a
        # completely blank frame must show the original textarea verbatim.
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.page.locator('[data-bj-add-card="focusText"]').click()
        self.page.locator('[data-bj-box-mode="plain"]').click()
        self.page.locator('[data-bj-layer-mode="write"]').click()
        self.assertEqual(0,self.page.locator('[data-bj-field="focusText"] .bj-layer-line-row').count())
        self.page.screenshot(path=str(shots/"journal-soft-floral-blank.png"),full_page=True)
        self.assertEqual(
            "First line\nThe edited second line\nThird line\nFourth line\nFifth line",
            self.page.locator("#bjExtra-focusText").input_value())
        self.page.reload(wait_until="domcontentloaded")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertAlmostEqual(.55,self.page.evaluate(
            """d=>LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.focusText.scale""",self.day),delta=.02)
        self.assertEqual(
            "First line\nThe edited second line\nThird line\nFourth line\nFifth line",
            self.page.locator("#bjExtra-focusText").input_value())

    def test_checklist_has_a_real_text_input_per_row_and_independent_checkmarks(self):
        # "Today I will" starts as a checklist; other fields start BLANK.
        modes=self.page.evaluate("""()=>LifeRPGJournalArtSpread.getLayout().cards""")
        self.assertEqual("checklist",modes["intentionText"]["mode"])
        self.assertEqual("plain",modes["gratitude"]["mode"])
        self.assertEqual("plain",modes["focusText"]["mode"])
        # The initial book can render while its tab is hidden; its actual
        # pixel geometry is resolved on the first visible browser frame.
        self.page.wait_for_function("""()=>
          document.querySelector('[data-bj-field="intentionText"]')?.getBoundingClientRect().width>30
          && document.querySelectorAll('[data-bj-field="intentionText"] .bj-layer-line-row').length>=3""",timeout=7000)
        listrows=self.page.locator('[data-bj-field="intentionText"] .bj-layer-line-row')
        diagnostics=self.page.evaluate("""() => ({
          card:LifeRPGJournalArtSpread.getLayout().cards.intentionText,
          frames:[...document.querySelectorAll('[data-bj-field="intentionText"]')].map(n=>({
            tag:n.tagName,cls:n.className,
            inner:n.querySelector('.bj-layer-write-zone')?.innerHTML?.slice(0,1100),
            width:n.getBoundingClientRect().width
          })),
          source:!!document.querySelector('#bjExtra-intentionText'),
          sourceParent:document.querySelector('#bjExtra-intentionText')?.parentElement?.className,
          rows:document.querySelectorAll('[data-bj-field="intentionText"] .bj-layer-line-row').length
        })""")
        self.assertGreaterEqual(listrows.count(),3,str(diagnostics))
        self.assertEqual(listrows.count(),self.page.locator(
            '[data-bj-field="intentionText"] .bj-layer-line-input').count())
        self.assertEqual(listrows.count(),self.page.locator(
            '[data-bj-field="intentionText"] .bj-layer-checkbox').count())
        entry=listrows.nth(0).locator(".bj-layer-line-input")
        entry.fill("Make a tiny cup of tea")
        entry.press("Enter")
        second=listrows.nth(1).locator(".bj-layer-line-input")
        second.fill("Read something cozy")
        self.page.locator('[data-bj-field="intentionText"] .bj-layer-checkbox').nth(0).check()
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function("""d => LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.intentionText?.includes('Read something cozy')""",arg=self.day)
        self.assertTrue(self.page.evaluate("""d => LifeRPGApp.getState().journalPageLayoutV3.daily[d].cards.intentionText.checks[0]""",self.day))
        old=self.page.locator("#bjExtra-intentionText").input_value()
        self.assertIn("Make a tiny cup of tea",old)
        self.page.reload(wait_until="domcontentloaded")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        self.assertEqual(old,self.page.locator("#bjExtra-intentionText").input_value())
        self.assertTrue(self.page.locator(
            '[data-bj-field="intentionText"] .bj-layer-checkbox').nth(0).is_checked())

    def test_extra_illustrated_boxes_have_independent_text_and_can_fit_side_by_side(self):
        self.page.locator("#bjExtra-focusText").fill("The original focus remains original")
        self.page.evaluate("document.activeElement?.blur()")
        self.page.wait_for_function(
            """d=>LifeRPGApp.getState().journal.entries[d]?.dailySpreadV1?.focusText==='The original focus remains original'""",
            arg=self.day
        )
        old_rewards=self.page.evaluate("JSON.stringify(LifeRPGApp.getState().rewardLedger.events)")
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.page.locator('[data-bj-create-card="focusText"]').click()
        extra=self.page.locator('[data-bj-field^="custom-"]')
        self.assertEqual(1,extra.count())
        self.page.wait_for_function("""() => document.querySelector('[data-bj-field^="custom-"]')?.getBoundingClientRect().width>20""")
        key=extra.get_attribute("data-bj-field")
        self.assertGreaterEqual(len(key),9)
        original=self.page.locator('[data-bj-field="focusText"]')
        self.page.locator("#bjLayerScale").evaluate("""el=>{
          el.value="50";
          el.dispatchEvent(new Event("input",{bubbles:true}));
          el.dispatchEvent(new Event("change",{bubbles:true}));
        }""")
        # In creative mode the original right paper is intentionally hidden.
        # Compare the actual visible boxes after returning to the open spread,
        # then reselect the custom frame for its writing-style change.
        self.page.locator('[data-bj-layer-mode="write"]').click()
        self.assertLess(extra.evaluate("el=>el.getBoundingClientRect().width"),
                        original.evaluate("el=>el.getBoundingClientRect().width")*.7)
        self.page.locator('[data-bj-layer-mode="create"]').click()
        self.page.locator('[data-bj-add-card="'+key+'"]').click()
        self.page.locator('[data-bj-box-mode="lined"]').click()
        self.page.locator('[data-bj-layer-mode="write"]').click()
        lines=extra.locator(".bj-layer-line-input")
        self.assertGreaterEqual(lines.count(),3)
        lines.nth(0).fill("My entirely independent writing")
        lines.nth(1).fill("Another little note")
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-resized-copies.png"),full_page=True)
        lines.nth(1).blur()
        self.page.wait_for_function(
            """k=>LifeRPGApp.getState().journalPageLayoutV3?.daily?.[LifeRPGBulletJournalBook.getDate()]?.cards?.[k]?.text?.includes('Another little note')""",
            arg=key
        )
        self.assertEqual("The original focus remains original",
                         self.page.locator("#bjExtra-focusText").input_value())
        self.assertEqual(old_rewards,self.page.evaluate("JSON.stringify(LifeRPGApp.getState().rewardLedger.events)"))
        self.page.reload(wait_until="domcontentloaded")
        for name in ("styles.css","bullet-journal-book.css","journal-daily-spread-v1.css",
                     "bullet-journal-atelier.css","journal-art-editable.css"):
            self.page.add_style_tag(url="/"+name)
        self.page.evaluate("LifeRPGJournal.openReflection()")
        extra=self.page.locator('[data-bj-field="'+key+'"]')
        self.assertEqual(1,extra.count())
        self.assertEqual("My entirely independent writing",extra.locator(".bj-layer-line-input").nth(0).input_value())
        self.assertEqual("Another little note",extra.locator(".bj-layer-line-input").nth(1).input_value())
        self.assertEqual("The original focus remains original",
                         self.page.locator("#bjExtra-focusText").input_value())

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
            # Mode switching must NOT be cropped off-screen on a narrow phone.
            controls=self.page.locator('[data-bj-layer-mode="create"]').evaluate("""el => {
              const r=el.getBoundingClientRect();
              return {left:r.left,right:r.right,viewport:innerWidth,visible:getComputedStyle(el).display!=='none'};
            }""")
            self.assertTrue(controls["visible"],str(controls))
            self.assertGreaterEqual(controls["left"],-1,str(controls))
            self.assertLessEqual(controls["right"],controls["viewport"]+1,str(controls))
        shots=ROOT/"test-artifacts";shots.mkdir(exist_ok=True)
        self.page.screenshot(path=str(shots/"journal-soft-floral-mobile.png"),full_page=True)

if __name__=="__main__":unittest.main()
