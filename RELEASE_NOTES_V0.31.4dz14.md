# Life RPG V0.31.4dz14 — Auto Shop + Free-Choice Coloring

## Automatischer Shop aus Games & Library
- `Want to Play`-Games können jetzt explizit als **Owned / already accessible** markiert werden.
- Nur `Want to Play` + **nicht owned** wird automatisch in den Reward Shop gespiegelt.
- Sichere Migration: Alle Games, die bereits vor DZ14 im Save existieren, werden zunächst als **owned** übernommen. Dadurch wird die bestehende Steam-/Backlog-Bibliothek nicht fälschlich zum Einkaufszettel.
- Neue bzw. bewusst als **not owned** markierte Want-to-Play-Games erscheinen automatisch im Shop.
- Steam-Library-/andere aktive Games bleiben automatisch owned.

## Bücher
- `Want to Read` + Physical / Kindle / Audiobook / Other erscheint automatisch im Shop.
- `Owned / Unread`, `Kindle Unlimited`, `Borrowed`, Reading, Finished und DNF bleiben draußen.
- Der vorhandene Library-Status bleibt die Quelle der Wahrheit; es wird keine zweite Bücherliste gepflegt.

## Preise & Kaufstatus
- Neuer Button **Preise prüfen** im Shop.
- Steam-Games mit App-ID: Preisabfrage über Steam Worker v5, deutscher Store (`DE`).
- Bücher: Preisabfrage über Google Books, wenn für die passende Ausgabe ein EUR-Verkaufspreis bereitgestellt wird.
- Wenn kein verlässlicher Buchpreis verfügbar ist, bleibt der automatische Shop-Eintrag bestehen und Preis/Produktlink können manuell ergänzt werden.
- Ein über den Shop als gekauft markiertes verknüpftes Game wird in Games automatisch `Owned`.
- Ein verknüpftes Buch wird automatisch `Owned / Unread`.
- Wird ein Kauf wiederhergestellt/rückgängig gemacht, kehrt die Quelle entsprechend zu `Want to Play/Read` zurück.
- Automatisch gespiegelt Einträge werden nicht separat gelöscht; stattdessen wird der Besitz/Status in Games bzw. Library geändert.

## Steam Worker v5
- Neuer Store-Endpoint für Preisabfragen: `/api/steam/store`.
- Worker-Protokoll auf v5 angehoben; bestehende Achievements-/Library-/Recently-Played-Funktionen bleiben erhalten.
- Siehe `STEAM_WORKER_V5_DEPLOY.md` für den einmaligen Cloudflare-Schritt.

## Coloring Studio — freie Kaufreihenfolge
- Nach dem einmaligen Unlock des Coloring Studios sind **alle noch gesperrten Coloring Cards direkt in der Galerie kaufbar**.
- Keine lineare Reihenfolge mehr: Jede Karte kann die erste gekaufte Karte sein.
- Kosten bleiben wie im bestehenden Talent-System: **1 Hobbies Point pro Karte**.
- Bereits gekaufte Karten, stabile Unlock-IDs, Painting-Keys, IndexedDB-Paintings und Fortschritt werden nicht verändert.
- Ist das Coloring Studio selbst noch gesperrt, führt der Button weiterhin zuerst zum Studio-Unlock.

## Sicherheit / Migration
- Keine Browserdaten löschen.
- Keine Painting-Daten oder Coloring-Unlocks zurücksetzen.
- DZ3 Local-Save-Compaction bleibt unverändert aktiv.
- Cloud Save / Export behalten den normalen vollständigen State.
- Auf **V0.31.4dz13** installieren.
