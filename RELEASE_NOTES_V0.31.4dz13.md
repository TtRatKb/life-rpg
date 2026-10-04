# Life RPG V0.31.4dz13 — Sound Garden: Live-Versionen ausschließen

## Änderung
- Sound Garden schließt erkannte Live-/Konzertversionen jetzt standardmäßig aus neuen Daily-Discovery- und Artist-Core-Listen aus.
- Der Filter greift sowohl bei Spotify als auch beim Apple/iTunes-Fallback.
- Typische Marker wie `(Live)`, `- Live`, `Live at …`, `Live from …`, `Live Version`, `Recorded Live`, `In Concert` und `MTV Unplugged` werden erkannt.
- Normale Songtitel, die nur das Wort „Live“ enthalten (z. B. `Live Forever`), werden nicht pauschal blockiert.
- Bereits bewertete/gehörte historische Einträge werden nicht gelöscht oder verändert.
- Bereits gecachte Artist-Guides blenden erkannte Live-Titel sofort aus; falls dadurch weniger als das gewählte Core-Ziel übrig bleiben, baut ein Aktualisieren der Core-Liste die fehlenden Studio-Titel nach.

## Sicherheit
- Keine Änderung an Rewards, Spotify-Artist-Bindings, Playlist-Saves oder Save-Struktur.
- Keine Browserdaten löschen.
- Auf V0.31.4dz12 installieren.
