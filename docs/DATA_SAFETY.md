# Life RPG — Datenhaltung und verlustfreie Migration

**Dokumentationsstand: 13.10.2026.** Technische Schlüssel und Funktionen vor Änderungen in aktuellem `app.js`/`cloud-save.js` gegenprüfen.

## Hauptsave und sichere Schreibvorgänge

- Hauptsave-Key im LocalStorage: `lifeRpgPrototypeV01`.
- Dokumentierte Kompakt-/Kompressionsformate: `life-rpg-local-compact-v2` und `life-rpg-local-deflate-v3`; ältere gespeicherte Formate bleiben lesbar. `pako.min.js` gehört zum Decode-Pfad.
- `app.js` besitzt Schutzmechanismen für unlesbare Saves, darunter `localSaveDecodeFailure`. Bei Decode-Fehlern niemals automatisch `defaultState()` über den Originalsave schreiben.
- `saveState()` kann `false` liefern. Ein erfolgreich geänderter In-Memory-State, gerenderter Toast oder Activity Log ist noch kein Beweis, dass der Write persisted wurde.
- Bei Quota-/Decode-/Import-/Sync-Fehlern den Fehlschlag sichtbar machen und den ursprünglichen Zustand erhalten. Kanonische Logs, Receipts, Rollback-Daten und Nutzereingaben niemals als wegwerfbaren Cache behandeln.
- Optionaler Cache darf nur über bereits explizit als optional dokumentierte Cache-Bereinigungen verändert werden. Keine pauschale Website-Daten-Löschung.

## Separate Datenbestände und Cloud

- Drawing und Coloring besitzen jeweils eigene IndexedDB-Datenbanken: `life-rpg-drawing-studio-v2` und `life-rpg-coloring-studio-v2`. Ein Hauptsave-Export ist **kein** nachgewiesenes Komplettbackup beider Studios.
- `cloud-save.js` verantwortet Hauptsave-Abgleich und Konfliktentscheidung. Local-only-/Offline-Modus, UID-Zuordnung, Rollback und Schutz vor parallelen Cloud-Schreibvorgängen erhalten.
- Nebenintegrationen schreiben nicht selbst das kanonische Hauptsave-Dokument; zugelassene Event-Bridges verwenden ihren dokumentierten Pfad.
- `life-rpg:state-persisted` und `life-rpg:state-saved` haben unterschiedliche Rollen. Hintergrund-Persistenz muss Cloud-Sync weiterhin informieren, ohne globale UI-Neurender-Schleifen auszulösen.
- Lokaler Erfolg, noch ausstehende Cloud-Synchronisierung und bestätigte Cloud-Persistenz müssen klar unterscheidbar sein. Keine falsche „gespeichert“-Meldung.

## Verhalten bei Speicherfehlern

- `saveState()` bleibt bei fehlgeschlagenem Hauptsave-Write `false`; es sendet kein Persistenz-Erfolgsevent. Eine verifizierte Kopie des unveränderten Save-Formats wird nach Möglichkeit unter `lifeRpgPendingSaveV01` in **SessionStorage** abgelegt. Sie enthält auch den vorherigen Hauptsave zur Prüfung, ob ein anderer Tab ihn inzwischen verändert hat.
- Beim Reload im selben Tab wird diese ausstehende Kopie geladen und erneut lokal gespeichert. Bei verändertem Hauptsave oder unlesbaren Daten erfolgt keine automatische Übernahme; der Schreibschutz bewahrt beide gespeicherten Eingaben. Bestehende Save-Formate werden nicht geändert.
- Eine dauerhafte Warnung bietet einen Export des aktuellen In-Memory-Fortschritts auch ohne Firebase an. Solange die Hauptspeicherung aussteht, fordert `beforeunload` eine Navigationswarnung an. Cloud-Schreibvorgänge verlangen zunächst erfolgreiche lokale Persistenz; ausstehende lokale Daten gelten nicht als synchronisiert.
- `replaceState()` migriert eine unabhängige Kopie und meldet nur nach erfolgreichem lokalem Write Erfolg. Bei Fehlschlag bleibt der vorherige State einschließlich seiner ausstehenden Recovery aktiv. Import und Cloud-Übernahme prüfen dieses Ergebnis.
- `backupLocal()` prüft den geschriebenen Rollback per Readback. Scheitern LocalStorage und SessionStorage, bleibt die Cloud-Konfliktwahl offen und die Übernahme blockiert. Quota-/Metadaten-Bereinigung löscht keine Rollback-Kopie.

**Verbleibende Grenzen:** SessionStorage ist eine Wiederherstellung für Reloads im selben Tab, keine dauerhafte Sicherung nach Tab-/Browser-Schließung. Wenn beide Speicher voll oder gesperrt sind, bleibt nur In-Memory-State plus manueller Export. Browser können `beforeunload` insbesondere mobil, ohne vorherige Nutzerinteraktion oder bei Prozessabbruch unterdrücken. Ein Download-Klick beweist nicht, dass die Datei extern sicher aufbewahrt wird. Gleichzeitige Tab-Änderungen werden bei Recovery blockiert, nicht automatisch zusammengeführt. Rollback bleibt eine einzelne Kopie; ein SessionStorage-Rollback muss vor Tab-Schließung separat gesichert werden. Echte Safari-/iPhone- und authentifizierte Firebase-End-to-End-Prüfungen stehen aus.

## Migrationsvertrag

- Migrationscode ist wiederholbar und idempotent: identische Altstände zweimal importieren oder migrieren darf keine zusätzliche Auszahlung, Freischaltung oder Datenlöschung erzeugen.
- Schema-Versionen, IDs und Referenzen bewahren. `migrateQuestReferencesInState()` berücksichtigt unter anderem Questlogs, Ledger und Planner-Referenzen; neue ID-Migrationen müssen vergleichbar vollständig arbeiten.
- `app.js` enthält Feldlisten sowie Pack-/Unpack-Funktionen. Bei einem neuen State-Feld den kompletten Serialize/Deserialize-, Export/Import- und Cloud-Snapshot-Pfad prüfen, nicht nur den laufenden State.
- Historische Activity Logs, Reward-Receipts, externe Event-Identitäten, Story-Flags, Lesepositionen sowie gekaufte Talents, Journey Points, Musik-/Steam-/Coloring-Daten bleiben kanonisch. Abgeleitete Skill-Ereignisse können rekonstruierbare Projektionen sein, die kanonischen Logs nicht.
- Keine stillen rückwirkenden Balance-Neuberechnungen. Gewünschte historische Skill-XP-Korrekturen nur aus vertrauenswürdigen, deduplizierten Ereignissen; Character-/Realm-XP, Coins und Story Energy nicht noch einmal auszahlen.
- Nach vorab gesicherter synthetischer Altversion: Laden → Speichern → Reload → Import/Export → erneut migrieren prüfen. Auch abgeschnittene/kaputte Payloads und fehlendes `pako` testen, ohne die ursprüngliche Eingabe zu überschreiben.

## Datenschutz

- Keine echten Saves, Gesundheitsinformationen, Journaltexte, Beziehungsentscheidungen oder Schülerdaten in Repo, Logs, Issues, Testfixtures oder PR-Ausgaben übernehmen.
- Synthetische Testkonten und isolierte Browserprofile; keine produktiven Firebase-Änderungen während Regressionen.
- Keine automatischen Browser-Storage-Clear- oder Cloud-Reset-Schritte als Debugging-Shortcut.
