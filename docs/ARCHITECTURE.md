# Life RPG — technischer Architekturwegweiser

**Dokumentationsstand: 13.10.2026.** Diese Datei beschreibt aus Code und vorheriger Codex-Bestandsaufnahme bekannte Strukturen. Sie ist kein automatisch aktueller Runtime-Beleg. Vor Änderungen die jeweiligen Module erneut prüfen.

## Laufzeit und Module

- Statische HTML/CSS/JavaScript-Anwendung, zum dokumentierten Stand ohne `package.json`, Build-Pipeline oder repositoryeigenen automatisierten Test-Runner.
- `index.html` verbindet klassische Skripte mit ES-Modulen. IIFEs und andere Module kommunizieren über `window.LifeRPGApp`, weitere `window.LifeRPG*`-APIs, DOM- und Window-Events. Initialisierungsreihenfolge ist Teil des technischen Vertrags.
- `app.js` hält gemeinsamen State, Datenmigrationen, Persistenz und das zentrale Reward-Ledger. Fachmodule wie `habits.js`, `games.js`, `library.js`, `daily.js` und `time.js` schreiben reale Aktivitätsereignisse. `skills.js` projiziert daraus Skill-Ereignisse.
- Vor Codeänderungen prüfen: Auslöser → kanonisches Log/Event → `awardActivity()`/Ledger → Skill-Reconcile → UI-Projektion → Save-/Cloud-Pfad. UI-Labels allein beweisen keine ausgezahlten XP.
- `pwa.js` lädt zusätzliche Module dynamisch; `service-worker.js` steuert Cache/Offline-Verhalten. Verweise, Query-Versionen, Loader, Precache und Cache-Key bei geänderten Dateien zusammen prüfen. Keine alten Komplettdateien über einen neueren Release-Baum kopieren.
- Versionsstrings können innerhalb des Repositorys neuere Zwischenstände zeigen als ältere Handoff-Texte. Der Git-Commit, das tatsächliche Deployment und der Teststatus sind getrennte Aussagen.

## Integrationsgrenzen

| Bereich | Technischer Eintrittspunkt / Grenze |
| --- | --- |
| Firebase Hauptsave | `cloud-save.js`: Auth, Cloud-Save-Abgleich, Konfliktwahl, Local-only, Single-flight/Rollback |
| Schulcockpit | `work-event-bridge.js` und `work-event-cloud.js`: minimalistische, UID-gebundene `users/{uid}/schoolEvents`, Receipts und Cursor, kein Unterrichts- oder Schülerdaten-Import |
| Kotoba Quest | `kotoba-integration.js`: bestätigte Lernereignisse, Event-IDs, Verbindungs-Cutoff, Tagesbudgets, keine Rückkopplung von Life-RPG-Events |
| Todoist | `todoist-sync.js`: externe Tasks, Baseline/Receipts, Token nur im passenden Session-/Device-Kontext |
| Steam | `games.js` und separater `steam-worker/worker.js`: `STEAM_API_KEY` ausschließlich serverseitig, historische Achievements ohne rückwirkende Auszahlung |
| Spotify | `sound-garden-spotify.js`: OAuth/Playback und Spotify-ID-basierte Dedupe, keine Stream-Farming-Rewards |
| Apple Health | `health-bridge-dz44.js`: bewusster iPhone-Shortcut-Import, Datums-/Zahlenvalidierung; PWA besitzt keinen direkten HealthKit-Zugriff |

Beim Schulcockpit wird nur für Progression erforderliches Metadatenmaterial verarbeitet, nicht Schüleridentität, Ergebnisse oder Schulmaterial. Bei Kotoba bleiben SRS/Sprachübungen in Kotoba; Life RPG projiziert echte abgeschlossene Aktivitäten. Steam-Historie ist nicht automatisch eine Life-RPG-Spielsession.

## Sicherheit und Deployment

- Externe Texte und Nutzereingaben vor HTML-Ausgabe mit vorhandener Escape-Logik behandeln.
- Keine OAuth-Tokens, persönlichen Identifikatoren oder serverseitigen Secrets in Cloud-Save, Reward-Event-Metadaten, Frontend-Releases oder öffentliche Repo-Dokumente schreiben.
- Firebase-Webkonfiguration ersetzt keine Authentication-/Security-Rules. Externe Prüfungen nur mit autorisierten Testkonten.
- `STEAM_WORKER_V5_DEPLOY.md` ist ein separater Deployment-Hinweis: Worker-Änderungen sind nicht automatisch GitHub-Pages-Dateiänderungen.
- Vor Cleanup alle Verwendungen über JS/CSS, dynamische Loader, Story-Packs, Manifest/Service Worker, historische Save-IDs und Assets prüfen. Unreferenziert im sichtbaren UI heißt noch nicht sicher löschbar.
- Nicht jede Bilddatei muss precached werden: Runtime-Assets nach Bedarf laden, reale hochwertige Standalone-Bilder bevorzugen und Cache-Versionierung berücksichtigen.
