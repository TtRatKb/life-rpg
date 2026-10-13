# Life RPG — verbindliche Codex-Arbeitsregeln

Diese Datei gilt für das gesamte Repository. Der aktuelle Code ist die technische Wahrheit; dokumentierte Releases, deployter Stand und bestätigtes Laufzeitverhalten sind zu unterscheiden. Explizite Nutzeraufträge geben den Umfang vor. Bei unklarer Datenmigration, Belohnungslogik oder Story-Entscheidung nichts erfinden oder eigenmächtig festlegen.

## Projektidentität

- Life RPG ist eine cozy Gamification-PWA mit interaktiver, englischsprachiger Romance-/Life-Sim-Visual-Novel; kein gewöhnliches Produktivitätsdashboard.
- Sieben Realms: Work, Knowledge, Japanese, Health, Recovery, Home, Hobbies. Erholung, Gaming und Hobbys sind legitimer Fortschritt; keine Schuld-, FOMO-, Straf- oder Pay-to-win-Mechaniken.
- Bestehende Spielsysteme und freigegebenen Canon respektieren. Keine ungefragten Features, Balanceänderungen, Story-Fortsetzungen oder visuellen Neugestaltungen.
- Der Nutzer ist zugleich Entwickler und Spieler: unreleaste Story, geheime Trigger, Beziehungseffekte und CGs nicht in Berichten, Tests, PR-Beschreibungen oder öffentlichen Dateien spoilern.

## Arbeitsweise und Architektur

- Statische HTML/CSS/JavaScript-App ohne dokumentierten repositoryeigenen `package.json`-Build-/Testrunner; keine erfundenen npm-, Build- oder Testbefehle.
- `index.html` lädt klassische Skripte und ES-Module; IIFEs nutzen `window.LifeRPGApp`/`window.LifeRPG*` und DOM-Events. Lade- und Initialisierungsreihenfolge schützen. `pwa.js` und `service-worker.js` mit Versions-/Cache-Verweisen beachten.
- Vor Änderungen reale Aufrufer, Zustandsmodell, Persistenz, Event-IDs und Empfänger der betroffenen Module lesen. Keine älteren Komplettdateien über neuere Dateien kopieren.
- Vor und nach Änderungen `git status --short` prüfen. Fremde Änderungen bewahren. Isolierte Branches/Arbeitsumgebungen sind erlaubt und für risikoreiche Aufgaben erwünscht.
- Ohne ausdrücklichen Auftrag weder Anwendungscode großflächig refactoren noch Dateien löschen, Nutzer-/Cloud-Daten verändern, externe Dienste deployen oder Änderungen nach `main` übernehmen.
- **Standardabschluss bei ausdrücklich beauftragten Codeänderungen:** Im selben Auftrag die Änderung gezielt implementieren, relevante Tests ausführen, auf einem eigenen Branch committen, zu GitHub pushen und einen **Draft Pull Request gegen `main`** eröffnen. Das Pushen des Arbeitsbranches und das Erstellen des Draft-PR sind damit für solche Aufgaben grundsätzlich freigegeben; nicht für reine Analysen, Reviews oder Entwürfe. Anderslautende Vorgaben im einzelnen Auftrag haben Vorrang.
- **Freigabegrenze:** Nie eigenständig in `main` mergen, die produktive App deployen oder produktive Nutzer-/Cloud-Daten verändern. Bei blockiertem Push oder PR-Zugriff den konkreten Fehler melden, keine Zugangsdaten erbitten oder Umgehungen versuchen. Ist der Branch bereits gepusht, direkt einen GitHub-Vergleichslink (`main...branch`) ausgeben, statt wiederholt fehlgeschlagene API-Aufrufe auszuführen.
- **Übergabe ohne Nachfragen:** Den fertigen PR-Link (oder bei blockierter PR-Erstellung den Vergleichslink) zusammen mit kurzer Änderungs-, Test- und Risikozusammenfassung ausgeben. Eine veröffentlichte Codex-Umgebung ist kein GitHub-Push und kein App-Deployment; den tatsächlichen Remote-Stand prüfen und korrekt benennen.

## Daten- und Migrationssicherheit

- Niemals reale Saves, Logs, XP, Ranks, Talent-/Journey-Käufe, Unlocks, Story-Entitlements, Steam-/Musik-Historie oder Drawing-/Coloring-IndexedDB verlieren oder still überschreiben.
- Fehlgeschlagenes Speichern (Quota, Decode, IndexedDB, Cloud, Offline) sichtbar behandeln; In-Memory-Zustand ist kein Persistenznachweis. Unlesbare lokale Saves niemals durch Defaults ersetzen; Schreibschutz und `saveState() === false` beachten.
- Keine pauschale Löschung von LocalStorage, IndexedDB, Cookies oder Website-Daten. Cloud-Konfliktwahl, Local-only-Modus, Rollback und ältere Save-Formate erhalten.
- Migrationen idempotent halten; stabile IDs, kanonische Logs, alte Referenzen und bereits erworbene Entitlements bewahren. Historisches Backfill ausschließlich aus vertrauenswürdigen Ereignissen und nur nach ausdrücklichem Auftrag.
- Nur synthetische Daten und isolierte Browser/Testkonten verwenden. Keine Gesundheits-, Schüler-, Journal- oder Zugangsdaten in Git, Fixtures, Logs oder Issues.

## Rewards, Skills und Balancing

- Echte bestätigte Handlung → kanonisches Ereignis → passende Skill-XP-Projektion. Dieselbe Arbeit niemals durch Quest, Habit, Timer, Daily Plan oder externe Bridge mehrfach auszahlen.
- Neue Activity-Rewards durch vorhandenes `LifeRPGApp.awardActivity()` und Ledger führen; stabile IDs/Receipts, Undo, Dedupe, Tagesbudgets und Rebuild-Semantik respektieren.
- Character-/Realm-/Skill-XP, Coins, Story Energy, Ranks und Talentpunkte getrennt prüfen. Keine XP-Auszahlungen durch Rendern, Replay, Import-Derivate oder UI-Feedback.
- 29 aktive Skills respektieren; `Japanese Foundations`/`language-learning` ist ein historisches Archiv. Alle Vocabulary-Review-Modi trainieren Vocabulary & Kanji, eigenständige Listening-/Production-Sessions ihre Spezialisierung.
- Balancing nur mit expliziter Freigabe verändern und Vorher-/Nachher-Fälle samt Save-Auswirkung angeben.

## Story, Visuals und Integrationen

- Englische Storyprosa aus Lucas Ich-Perspektive, glaubwürdige langsame Charakterentwicklung; Story-Entscheidungen im Replay bleiben sandboxed, historische Freischaltungen bestehen.
- Vor Story-/Asset-Änderungen einschlägige Canon-Quellen und tatsächliche Runtime-Referenzen prüfen. Keine Collagen/Crops als Runtime-Art; keine ungeprüfte Löschung alter Assets.
- Schulcockpit/Kotoba/Todoist/Spotify/Steam/Apple Health nur innerhalb ihrer bestehenden Daten- und Berechtigungsgrenzen anbinden. Keine Schülerdaten oder API-Secrets in Life RPG übertragen; keine Doppel-Rewards.

## Tests und Abgabe

- Betroffene Pfade mit echten ausführbaren Checks prüfen: mindestens Syntax/Initialisierung sowie je nach Änderung Save-Roundtrip, Migration, Reload, Dedupe, Undo/Rebuild, Offline/Cloud, Story-Replay und PWA-Cache.
- Kein automatischer Test gilt als echter Safari-/iPhone-/Firebase-End-to-End-Test. Bestanden, fehlgeschlagen und nicht geprüft ausdrücklich unterscheiden.
- Abschlussbericht: betroffene Dateien, verändertes Verhalten, durchgeführte Tests, verbleibende Risiken und nötige manuelle Freigaben. Klein und gezielt ändern; ohne Zustimmung nichts deployen.

## Nachschlagewerke (nur bei Bedarf öffnen)

- `docs/ARCHITECTURE.md` — Module, Initialisierung, PWA und externe Integrationen
- `docs/DATA_SAFETY.md` — konkrete Save-Formate, Migrationen und Cloud-Schutz
- `docs/GAME_SYSTEMS.md` — Reward-Ledger, Skill XP, Formeln und Dedupe
- `docs/TESTING.md` — konkrete Regressionen, Testumgebung und QA-Berichte

Die Detaildokumente sind eine Momentaufnahme und ersetzen nicht die Prüfung des aktuellen Codes. Sie enthalten keine vertraulichen Projekt-CANON-Geheimnisse.
