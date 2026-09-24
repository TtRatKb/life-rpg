# Life RPG V0.31.4cu — Meine Woche V2

**Delta über V0.31.4ct.** Dieses Archiv enthält vollständige Ersatzdateien, aber kein vollständiges Repository und keine Save-Datei. Die sieben Dateien aus dem ZIP-Unterordner gehören in das Stammverzeichnis der vorhandenen Life-RPG-Web-App; gleichnamige Dateien werden ersetzt. Alle übrigen Dateien/Assets bleiben bestehen. Bitte zuvor ein Save-Export anfertigen. Nicht auf einem älteren Repo-Stand (etwa CQ/main-9 ohne CR/CS/CT) anwenden.

## Funktionen

- Pastell-Wochenkalender mit Blockpalette rechts; Maus-Klick/-Ziehen, Touch-Tipp oder langes Berühren/Ziehen; Zeitraster im Fünf-Minuten-Takt; vorhandene Blöcke über den Kalender öffnen und bearbeiten.
- Wiederkehrender Stundenplan mit **Versionen ab Gültigkeitsdatum**. Neue Unterrichtsstunde: 85 min; Aufsicht/GA: 20 min; Mittagszeit: 35 min. Bestehende 45-Minuten-Stunden, alte Zeiträume und historische Zeitlogs werden nicht überschrieben.
- Einmalige/wöchentliche geplante Blöcke: Vertretungsunterricht, Vertretungsaufsicht, Vertretungs-GA, Vertretungs-Mittagszeit, Konferenzen und Elterngespräche. Unterrichtsplanung und Korrekturen gehören dagegen zum echten Schnelllog. Geplante Termine sind **keine** belohnte Arbeitszeit.
- Schnelllog: ein Datum, 24-Stunden-Startzeit, Dauer **oder** Endzeit, optionale Bezeichnung, freier Zeitvorschlag. Konferenzstandard 14:30; Elterngespräch 14:00. Ungültige/überlappende Intervalle werden zurückgewiesen.
- Bestehende Timer mit Sekundenanzeige; bewusstes Starten, **Stoppen & erfassen** versus **Abbrechen ohne Log**; keine sekündliche Vollansichts-Neuzeichnung.
- Abgeschlossene wiederkehrende Schulblöcke werden aus dem Stundenplan in das kanonische Zeit-/Reward-Ledger übernommen — genau einmal je Slot. Neu aktivierte Automatik beginnt mit dem **Tag der ersten CU-Nutzung**, gespeichert als `weekPlanner.autoFrom`; kein stiller historischer Massen-Backfill. Nach App-Schließung wird beim Wiederöffnen/Focus nachgezogen; keine vorgetäuschte Hintergrundausführung.
- Nur `Daily Check-in → health.illness = yes` **und** `health.sickLeave = yes` unterdrücken die festen Blöcke am betreffenden Tag. Eine nachträgliche Krankmeldung entfernt ausschließlich zugehörige automatisch erzeugte Slot-Logs/Rewards, nicht unabhängige manuelle Einträge oder den Stundenplan. Ferien/einzelne Ausfälle haben gesonderte Ausnahmen. Automatik kann aus-/eingeschaltet werden.
- Jeder neue Auto-Log bekommt ein eigenes einmaliges Reward-Ereignis. Beim späteren Eintragen oder Entfernen anderer Auto-Logs bleiben die Reward-IDs aller **unberührten** Einträge stabil; eine Rücknahme widerruft nur den betroffenen Reward. Ein Zeitintervall kann nicht zusätzlich durch den Timer oder das Schnelllog vergütet werden. Bewusste manuelle Korrekturen sind von Auto-Rücknahmen ausgenommen.
- Wochenstunden, echte Zeitlogs und punktuelle Quest-/Quick-Logs mit tatsächlich vorhandenem Zeitpunkt; keine erfundenen Quest-Dauern.

## Datenerhaltung

`state.weekPlanner` wird in-place zu Schema 2 erweitert; `plans`, `appointments`, `exceptions`, `timeTracking.entries`, frühere manuelle Rewards, aktive Timer und andere Save-Bereiche bleiben erhalten. Der erste Automatik-Anker wird sofort gespeichert. `app.js`, `daily.js`, Cloud-Save-, Story- und Asset-Dateien werden durch dieses Delta nicht ersetzt. Die vorhandenen Cloud-Save-Mechanismen werden nicht umgestellt. Die Daten werden im Browser des Nutzers weiter über die vorhandene Save- und Cloud-Sync-Infrastruktur persistiert.

## Prüfungen vor Auslieferung

- JavaScript-Syntax; HTML-IDs/Selektoren und Script-Reihenfolge; Versionen von Index, PWA und Service-Worker.
- Headless Chromium mit den tatsächlichen geänderten `my-week.js`-/`time.js`-Dateien und einem Legacy-Save-Datenmodell: Schema-1-Übernahme ohne Verlust von Stundenplan, 45-Minuten-Slot, Einzeltermin, Story/Nonogram/Reward-Feldern; automatischer Anker; simuliertes Neuladen; Kalender-Edit; Planversion ab Datum; automatische Einmalerfassung; Krankmeldung/Rücknahme und Wiederherstellung; unveränderte manuelle Reward-ID; Überschneidungs- und Timer-Schutz; geplanter Einzeltermin ohne Belohnung; gezielte Rücknahme eines verknüpften Logs.
- Separate Reward-Ledger-Prüfung: zusätzliche Auto-Logs und deren Rücknahme stellen bestehende Auto-/Manual-Reward-Ereignisse nicht erneut aus.
- Desktop-Drag und Touch-Tipp; 24h-Start/Ende und ungültige Uhrzeit; Kategoriepalette/Voreinstellungen; Ausfall/Wiederherstellung; keine Browser-JavaScript-Fehler in den Tests.

**Testgrenze:** Der aktuelle vollständige CT-Repository-Stand, ein Export des echten persönlichen Saves, echtes iPad/Safari und eine geräteübergreifende Cloud-Sync-Session lagen für diesen Test nicht vor. Die lokalen Prüfungen belegen den geprüften Kandidaten mit den mitgelieferten CT-App-/Daily-Snapshots und repräsentativen Daten, nicht einen absolvierten Gerätetest. Nach Einspielen bitte kurz den vorhandenen Stundenplan, ein manuelles Zeitlog und Cloud-Sync auf deinem Gerät kontrollieren; der vorherige Save-Export ist die Rückfallbasis.

## Inhalt (vollständige Ersatzdateien)

`index.html`, `my-week.js`, `my-week.css`, `time.js`, `pwa.js`, `service-worker.js`, `RELEASE_NOTES_V0.31.4cu.md`.
