# Life RPG — zielgerichtete Tests und QA

**Dokumentationsstand: 13.10.2026.** Diese Datei nennt Testfälle, nicht den Nachweis, dass sie tatsächlich bereits automatisiert existieren oder erfolgreich gelaufen sind.

## Testumgebung

- Zum dokumentierten Stand gibt es keinen repositoryeigenen `package.json`-Build-/Test-Runner. Nicht `npm test`, `npm run build` oder angeblich vorhandene Playwright-Skripte behaupten, wenn sie nicht tatsächlich existieren.
- Für einen lokalen Browser-Start im Repository-Hauptverzeichnis bei verfügbarem Python: `python3 -m http.server 8000 --bind 127.0.0.1`. Der ursprünglich dokumentierte feste Checkout-Pfad `/workspace/life-rpg` ist **nicht überall gültig**.
- Für Browser-Regressionen einen isolierten Browserkontext verwenden (Playwright, wenn tatsächlich verfügbar; sonst realistische manuelle oder andere vorhandene Tools). Vor jedem Test echte verfügbare Befehle/Abhängigkeiten ermitteln.
- Nur synthetische Saves, Fake-Daten und autorisierte Test-Accounts. Keine Live-Firebase-Daten, nicht heimlich das produktive Browserprofil öffnen.
- Zunächst schmal testen: relevante Dateien + Nachbarn, dann bei Integrations-/Save-/Reward-Änderungen breiter; bei Fehlerschlag konkrete Ursache und nicht ausgeführte Fälle melden.

## Prüfmatrix nach Änderungstyp

| Änderung | Mindestens prüfen |
| --- | --- |
| Bootstrap / PWA / CSS | Browserstart, JS-Console, fehlende Assets, Initialisierung und sichtbare/unsichtbare DOM-Kopien |
| Activity / Habit | Anlegen, Abschließen, Ledger, Coins/XP/Skill, Reload |
| Save / Migration | alte + aktuelle Kompakt-/Deflate-Stände, Roundtrip, zweite Migration, kaputter Decode, fehlendes `pako`, Quota-Fehler, Import/Export |
| Cloud-Sync | lokale vs. bestätigte Cloud-Speicherung, Offline/Local-only, Konfliktentscheidung, parallele Writes und Rollback |
| Rewards / Skills | Duplikat-ID, Cross-Source-Duplikate innerhalb/außerhalb von Schutzfenstern, Revoke/Undo, Reload/Reconcile, Skill-Level/Talent-Käufe |
| Datum und XP-Caps | lokale Tagesgrenze, Zeitzonenwechsel, historische Events und Null-Auszahlung |
| Story | Erstlesen, Fortsetzen nach Reload, Abschluss, Replay ohne kanonische Nebenwirkung, Legacy-Entitlement |
| Zeit und PWA | Hintergrund/Rückkehr, präzise Dauer, nur eine Timerinstanz, korrektes Stop/Cancel, Service-Worker-Update und Offline-Caches |
| Externe Bridges | Stub/Mock-Tests als solche kennzeichnen; für reale Cross-App-QA authentifizierte Testkonten und bestätigte Provider-Ereignisse nötig |

Bei jeder Story-Prüfung unveröffentlichte Inhalte im Bericht anonymisieren (IDs und technisches Verhalten statt Spoiler-Text). Bei DOM-Tests versteckte Dashboard-Kopien nicht mit aktiven Elementen verwechseln.

## Vorgehen bei Reparaturen

Gezielte Save-Regressionen sind jetzt in `tests/test_save_safety.py` ausführbar:

```sh
python3 -m unittest discover -s tests -p 'test_save_safety.py' -v
```

Voraussetzungen: Python mit Playwright und Chromium (`CHROMIUM_PATH` kann den standardmäßigen Pfad `/usr/bin/chromium` ersetzen). Die Suite startet einen temporären lokalen Server und isolierte Browserkontexte, lädt `app.js`/`cloud-save.js` mit dem echten App-DOM und ersetzt Firebase durch eine In-Memory-Attrappe. Externe Requests sind gesperrt; produktive Cloud- und Browserdaten werden nicht verwendet. Geprüft werden Quota/Reload/Recovery, vollständiger Storage-Ausfall mit Export und Navigationswarnung, Backup-/Replace-/Import-Fehler, beide Konfliktentscheidungen, Rollback-Erhalt, Save-Formate und ein lokaler Fehler während eines Cloud-Uploads. Diese Prüfungen ersetzen keinen echten Provider- oder Gerätetest.

1. Vor Änderungen `git status --short`, aktuellen Commit und relevante Modulintegration dokumentieren.
2. Konkreten Fehler reproduzieren oder als unbestätigten Verdacht kennzeichnen.
3. Geringstmögliche Änderung implementieren, Datenformate und Event-IDs erhalten.
4. Wiederholbare Regression für den Fehler schreiben/ausführen, soweit die Umgebung dies zulässt.
5. Benachbarte kritische Pfade prüfen und `git status --short` erneut ausführen.
6. Abschlussbericht mit **bestanden / fehlgeschlagen / nicht ausgeführt**, Testkommandos, geänderten Dateien, beobachtetem Verhalten, Risiken und nötigen Gerätetests.

**Keine Scheinsicherheit:** Syntaxprüfung ist kein Browser-Test; isolierte Browser-Tests sind keine echten iPhone-/Safari-/Firebase-End-to-End-Tests; passender GitHub-Commit ist kein Beleg für installierte PWA-Assets oder bestätigten Cloud-Save.
