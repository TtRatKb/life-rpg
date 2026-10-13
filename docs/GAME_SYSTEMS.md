# Life RPG — Rewards, Skills und Balancevertrag

**Dokumentationsstand: 13.10.2026.** Konkrete Formeln und Grenzen stammen aus der geprüften bzw. von Codex dokumentierten Codebasis; vor einer Balanceänderung den aktuellen Code und vorhandene reale Eventtypen erneut prüfen.

## Kanonische Ereignisse und Auszahlungen

1. Echte Handlung oder bestätigter Abschluss erzeugt ein stabiles kanonisches Log-/Event-ID-Signal.
2. `LifeRPGApp.awardActivity()` und das zentrale Ledger in `app.js` vergeben zulässige Character-/Realm-/Coins-/Story-Rewards. Talent-/Gift-Hooks und source-spezifische Guards beachten.
3. `skills.js` leitet über `deriveEvents()`/`reconcile()` geeignete Skill-Ereignisse ab. Rendern, Toasts, Import und Rebuild sind **keine** neue Arbeit.
4. Quest, Habit, Daily Plan, Timer, Story-Momentum, Todoist und Schulcockpit dürfen die **selbe Handlung** nicht als unabhängige Praxis mehrfach bezahlen.
5. Bestehende Felder `duplicate`, `duplicateOf`, `rewardEventId`, `source`, `sourceId`, Zeitstempel und Metadaten erhalten. Undo/Delete mit `revokeActivityReward()` und Fachevent-Status abgleichen.

`recentCrossSourceDuplicate()` schützt laut dokumentierter Implementierung Reading (`quest`/`library`) und Gaming (`quest`/`game`) innerhalb von zehn Minuten. Dies ist **keine globale Dedupe für sämtliche Eventquellen**. Externe Event-IDs/Receipts bleiben notwendig, auch wenn Ledger-Zeilen eine begrenzte Aufbewahrungsdauer haben.

## XP-Typen und Balancing

- Character XP, Realm XP, Capability-/Stat-XP, Skill XP, Coins, Story Energy, Skill-Level-/Realm-Rank-Fortschritt und Talent-/Journey-Punkte sind unterschiedliche Projektionen; getrennt rechnen und rückgängig machen.
- Dokumentierte Habit-Skill-XP nach Aufwand `tiny / low / normal / high / boss = 3 / 5 / 8 / 12 / 18`.
- Zeitbasierte Skill-XP: `round2(2 * sqrt(actualMinutes))`, präzise `durationSeconds` berücksichtigen.
- Skill-Level-Bedarf: `60 + 25 * level + 5 * level²`. Kein Balancewert ohne ausdrückliche Freigabe verändern.
- Story Energy hat dokumentierte Tagesgrenzen 4/8/12 mit Multiplikatoren 1/0,72/0,42/0,12. Lokale Kalendertage, Tageswechsel und historische Zeitstempel beachten.
- Kotoba speichert tatsächliche Auszahlungen in Event-Metadaten: explizit gespeichertes `0` darf nicht durch ein positives Default ersetzt werden. Tages-/Track-Caps und separates Kanji-Budget erhalten.
- Vor jeder Änderung XP-/Talentpoint-Vorher-Nachher-Szenarien simulieren, insbesondere kurze Mehrfachaktionen, Level-Up-Kaskaden und historische Save-Reloads.

## Skills und fachliche Zuordnung

**Sieben Realms, 29 aktive Skills:** Work 5, Knowledge 5, Japanese 5, Health 4, Recovery 3, Home 3, Hobbies 4. `Japanese Foundations` (ID `language-learning`) bleibt nur für historische XP archiviert, kein sechster aktiver Japanese Skill und kein Breadth-Gate-Ziel.

- Echte Vocabulary Reviews gehören **immer** zu Japanese / Vocabulary & Kanji, unabhängig davon, ob Audio abgespielt, getippt oder gesprochen wird.
- Nur eigenständige Listening-, Production- oder echte Shadowing-Abschlüsse trainieren die jeweilige Spezialisierung.
- `10 Minute Clean` und `15 Minute Room Reset` gehören bei realem Abschluss zu Home / Tidying & Organisation. Wäsche und Geschirr eher Household Routines, Organisations-/Verwaltungsaufgaben entsprechend Life Management.
- `Discover a Song` ist eine qualifizierte einmalige bewusste Bewertung/Reflexion einer neuen Song-ID, nicht Stream/Autoplay/Skip oder `Already know`. Hobbies / Recreation & Play ist die dokumentierte Soll-Zuordnung; implementierte Event-Projektion muss verifiziert werden.
- Für unbekannte freie Custom-Aktionen keine willkürliche Skill-Zuordnung; explizite Auswahl oder transparenter unmapped-Status.
- Aufräumen, Erholung, Coloring, Lesen, Spielen und eigene Projekte sind legitime echte Arbeit/Erholung, nicht automatisch schlechtere XP-Kategorien.
- Abgeleitete Coins-only-Boni, mehrfach angezeigte Quest-/Activity-Logs oder Achievement-Dekorationen sind **keine zweite Skill-Praxis**.

## Wichtige Regressionen und Integrationsfälle

- Eine Event-ID doppelt importieren; Ledger, Skill Event-Projektion und Talentpunkte dürfen nicht wachsen.
- Quest+Habit+Timer und Todoist+Schulcockpit auf dasselbe reale Ereignis beziehen; keine mehrfachen Skill-XP.
- Schulcockpit-Korrektur pro **einzeln korrigierter Arbeit**, `+1`/`+5`/Undo/Redo, ohne erfundene Minuten oder personenbezogene Schülerdaten.
- Spotify-Artist/Track IDs deduplizieren, Remove/Readd und Reconnect dürfen keine Bonuspunkte erzeugen; Steam historische Achievements bleiben unbelohnt.
- Fachliches Undo und erneutes Laden/Rebuild müssen Skill-/Ledger-Historie konsistent halten, ohne alte Talentkäufe oder Points zu löschen.
- Ungeprüfter Rebuild/Backfill darf keine massenhaften XP auf Verdacht erzeugen. Verbindliche Produktentscheidungen gehen über einfache Heuristiken.
