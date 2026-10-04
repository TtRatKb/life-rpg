# Steam Worker v5 — Shop-Preischeck aktivieren

Für automatische Steam-Preise im Life-RPG-Shop braucht der bereits vorhandene Cloudflare Steam Worker einmal den neuen v5-Code. Die normale GitHub-Pages-App kann den Steam-Store-Preis nicht zuverlässig direkt aus dem Browser abrufen.

## Einmaliger Schritt nach dem DZ14-Upload
1. Cloudflare → **Workers & Pages** → den bereits vorhandenen Life-RPG Steam Worker öffnen.
2. Den Worker-Code durch den vollständigen Inhalt von `steam-worker/worker.js` aus diesem DZ14-Paket ersetzen.
3. Deployen.
4. **Die Worker-URL in Life RPG nicht ändern.**
5. Das vorhandene Secret `STEAM_API_KEY` unverändert lassen.
6. Life RPG → **Settings → Steam → Test Worker**.
7. Der Test sollte **Protocol v5** und Unterstützung für **Shop prices** melden.

## Was v5 ergänzt
- Neuer Endpoint: `/api/steam/store?appid=<APPID>&cc=DE&lang=german`
- Aktueller deutscher Steam-Store-Preis, Listenpreis/Rabatt, Währung, Store-Link und Header-Bild.
- Der Store-Preis-Endpunkt benötigt selbst keinen Steam-API-Key; die bestehenden Library-/Achievement-Endpunkte verwenden weiterhin das vorhandene Secret.

Der Ordner `steam-worker/` ist für Cloudflare bestimmt. Er muss nicht als Runtime-Datei der GitHub-Pages-Seite deployed werden; er kann dort lediglich zur Versionshistorie mitgeführt werden.
