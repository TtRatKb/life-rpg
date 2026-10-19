# Google Kalender → Life RPG (optionale Nur-Lesen-Verbindung)

**Stand:** 19. Oktober 2026. Nur eine optionale, explizit vom Nutzer aktivierte Browser-Verbindung. Der ChatGPT-Kalender-Connector autorisiert **nicht** automatisch Life RPG.

## Google-Seite einmalig einrichten

1. Google Cloud Console öffnen und Projekt auswählen/anlegen.
2. **Google Calendar API** für das Projekt aktivieren.
3. Google Auth Platform / Consent Screen konfigurieren (inklusive eigener Testnutzer, falls die App im Testmodus ist).
4. OAuth-Client vom Typ **Webanwendung** anlegen. Unter **Autorisierte JavaScript-Quellen** den Origin der Life-RPG-Seite eintragen: `https://ttratkb.github.io` (ohne Repository-Pfad). Für eigene lokale Entwicklung zusätzlich passende localhost-Origins.
5. Die **Client-ID** in Life RPG unter **Meine Aufgaben → Google Kalender** eintragen; **kein Client Secret** eintragen und keine Zugangsdaten in GitHub committen.
6. Auf „Google-Anmeldung vorbereiten“, dann „Mit Google verbinden“ klicken und den Google-Dialog mit `calendar.readonly` autorisieren. Ggf. im Google-Cloud-Testmodus vorher die verwendete Google-Adresse als Testnutzer eintragen.

Google-Dokumentation: https://developers.google.com/identity/oauth2/web/guides/use-token-model
API-Referenz: https://developers.google.com/calendar/api/v3/reference/calendarList/list und https://developers.google.com/calendar/api/v3/reference/events/list

## Kalender-Auswahl

- **Schule Unterricht**, **Schule Aufsichten** → *Ignorieren*, da diese Kalender bereits mit „Meine Woche“ konkurrieren können.
- **Schule Termine**, **Schule Fahrten**, **Privat Google** → *Termin, blockiert Zeit*.
- **Schule Arbeitsblöcke** → *Arbeitsfenster*. Daraus wird **keine** bereits geleistete Arbeitszeit.
- Alle sonstigen Kalender zunächst *Ignorieren*. Einstellungen sind frei änderbar.
- Private Termine können einen manuell gewählten **Puffer davor** haben (z. B. 60 Minuten für Anfahrt); das ist keine automatische Routenberechnung.

## Datensicherheit / Grenzen

- Das Zugriffsrecht ist **ausschließlich lesend** und wurde technisch auf `https://www.googleapis.com/auth/calendar.readonly` begrenzt.
- Google Access-Token, Titel, Orte und Uhrzeiten von Kalenderterminen werden **nicht im Life-RPG-Hauptsave, nicht in Firebase und nicht auf GitHub gespeichert**. Sie werden während der geöffneten Sitzung im Arbeitsspeicher des Browsers gehalten.
- Ausschließlich öffentliche OAuth-Client-ID und Kalender-Rollen/zeitliche Puffer werden im **separaten lokalen Browser-Speicher** für bequemes Wiederverbinden behalten; Kalender-IDs können personenbezogene Adressen enthalten und dürfen nie in Tests/Repos übernommen werden.
- Ein Kalender kann nur während aktiver Freigabe synchronisiert werden. Bei geschlossenem Browser oder abgelaufener Freigabe **kein Hintergrundabgleich** und somit keine garantierte Live-Verfügbarkeit.
- Ganztägige Ereignisse werden *nicht* automatisch als 24-stündig blockiert eingestuft, um Geburtstage usw. nicht als Sperre zu zählen.
- Externe Kalendereinträge geben keine XP/Rewards. Bestätigte tatsächliche Zeit muss über die kanonischen Life-RPG-Zeitlogs laufen.
- Alle bestehenden Life-RPG-Stundenpläne, Nutzer-Tasks, Schülerdatenschutzgrenzen, Save-IDs und Rewards bleiben unverändert.
- Ohne eigene Client-ID kann die Nutzerin weiterhin **manuell in „Meine Woche“** Termine eintragen oder freiwillige Arbeitsfenster im Task Companion setzen. Die Google-Verbindung ist dann nur vorbereitet, nicht aktiviert.
- Google OAuth-Consent-Verifizierung und Berechtigungen können je nach Projekt-/Veröffentlichungsstatus bei Google weitere Konfiguration erfordern. Es werden keine Secrets benötigt; APIs können je nach Google-Projekt Nutzungsquoten haben.

## QA

Synthetische Unit-Tests für Kalendertypen, Zeitpuffer, überlappende Blöcke, Feiertage und freie Tage; Playwright ohne persönliche OAuth-Sitzung. Ein echter Google-Login, Apple-Kalender-Spiegelung, iPhone-Safari und Firebase-End-to-End sind ohne expliziten Nutzer-Testzugang nicht verifiziert.
