# Life RPG – Release Notes V0.31.4bq

## Hintergrund-Zeitvarianten integriert
Diese Delta-Version pflegt die neu generierten High-Res-Hintergründe mit echter Tageszeitbindung ins System ein.

### Neu bzw. aktualisiert
- **Station**: dawn / sunset / night aktualisiert
- **Collector District / City**: dawn / sunset / night aktualisiert
- **Koharu Café**: dawn / sunset / night aktualisiert
- **DynaRiot Agency**: dawn / sunset / night neu integriert
- **Gym**: dawn / sunset / night neu integriert
- **Riverside Park**: dawn / sunset / night neu integriert
- **School**: dawn / sunset / night neu integriert
- **Konbini**: dawn / sunset / night neu integriert

### Systemverhalten
- Story-Szenen ziehen jetzt für diese Orte automatisch die passenden Varianten je nach Tageszeit.
- World-/Location-Karten nutzen jetzt ebenfalls die passenden Tageszeit-Hintergründe.
- Die bisherige feste Tageslicht-Sperre für **School** wurde entfernt, damit dort nun ebenfalls Dawn/Sunset/Night greifen können.
- Vorhandene Day-Basisbilder bleiben als Tageslicht-Fallback aktiv, wo keine separate neue Day-Variante erzeugt wurde.

## Enthaltene geänderte Dateien
- `story-ui.js`
- `app.js`
- `assets/story/backgrounds/time/*.webp` (neue bzw. ersetzte Tageszeit-Varianten)
