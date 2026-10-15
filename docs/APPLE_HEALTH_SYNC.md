# Apple Health → Life RPG: rückwirkender Abgleich (Entwurf für iPhone-Kurzbefehle)

Life RPG ist eine Website/PWA und kann **nicht direkt HealthKit lesen**. Die kostenlose iOS-App **Kurzbefehle** liest die von dir ausgewählten Daten **auf dem iPhone**, berechnet Tageswerte und stellt Life RPG freiwillig eine JSON-Zusammenfassung bereit. Life RPG kann anschließend **1–93 Tage** zusammen importieren (empfohlen: die letzten **14 Tage**). Dafür ist keine zusätzliche kostenpflichtige App erforderlich.

## Vor dem ersten Import

1. Öffne auf dem iPhone **Health → Health Journal** in Life RPG und melde dich beim gleichen Google-Konto wie auf dem Mac an.
2. Prüfe in Apples Health-App, welche Werte **wirklich vorhanden** sind. Besonders wichtig: Flo schreibt seine eigenen Menstruationseinträge nach Angaben des Anbieters **nicht automatisch zurück nach Apple Health**. Fehlt ein Eintrag in Apple Health, kann ihn auch ein Kurzbefehl von dort nicht liefern.
3. Entscheide selbst, ob du Zyklus- oder Stimmungswerte importierst. Life RPG verlangt dafür im Journal eine **zusätzliche ausdrückliche Checkbox**. Ohne Zustimmung werden diese Werte nicht gespeichert.
4. Benutze für Zyklus-/Stimmungsdaten **keinen URL-Hash/alten Ein-Tages-Link**. Der JSON-Import ist bewusst eine Eingabe nach deiner aktiven Bestätigung.

## JSON-Sammelformat

In **Kurzbefehle** kannst du ein *Wörterbuch/Dictionary* mit den Schlüsseln `schema` und `days` erstellen und als JSON-Text in die Zwischenablage kopieren oder als `.json`-Datei in „Dateien“ sichern.

```json
{
  "schema": "life-rpg-health-batch-v1",
  "days": [
    {"date": "2026-10-14", "steps": 7500, "sleepMinutes": 435},
    {"date": "2026-10-15", "steps": 8100, "sleepMinutes": 460, "waterMl": 1550}
  ]
}
```

Die Werte im Beispiel sind **synthetisch**. Bitte nicht ohne echte Health-Daten übernehmen.

Jeder Tag besitzt `date` im lokalen Format `YYYY-MM-DD`. Zulässige Felder (alle optional, aber mindestens ein Wert je Tag):
- Aktivität: `steps` (Anzahl), `activeKcal` (kcal), `exerciseMin` (Minuten), `standHours` (Stunden).
- **Schlaf:** `sleepMinutes` (tatsächlich geschlafene Minuten, **nicht** gesamte Bettzeit). Schlafphasen nicht zusätzlich zur Gesamtzeit addieren; Überschneidungen und Datensätze mehrerer Geräte vermeiden.
- Nährwerte: `proteinG`, `carbsG`, `fatG`, `fiberG`, `waterMl`, `caloriesKcal`, `vitaminCMg`, `vitaminDUg`. Werte müssen tatsächlich in Apple Health verfügbar sein; Life RPG rät oder schätzt nichts.
- **Nur mit Zustimmung und vorhandener Quelle:** `periodActive` (`true`/`false`, **nicht** aus Periodenkrämpfen erraten), `periodCramps` (`none`, `mild`, `moderate`, `strong`), `mood` (`very_low`, `low`, `neutral`, `good`, `very_good`). Hier handelt es sich um freiwillige grobe Selbsteinschätzungen, nicht um automatisierte medizinische Interpretationen.

**Nicht vorhandene Werte einfach weglassen** – keine erfundenen Nullen, keine vermuteten Periodenanfänge. Life RPG speichert diese Felder nicht automatisch in Daily Plan oder Story.

## So bereitest du den kostenlosen Kurzbefehl vor

Die Namen können in deiner iOS-Version und Sprache leicht abweichen. Diese Anleitung ist ein Bauplan – **kein bereits installiertes oder auf deinem Gerät ausgeführtes Shortcut**.

1. Öffne **Kurzbefehle** → neuer Kurzbefehl, zum Beispiel „Life RPG · Health 14 Tage“.
2. Lege eine Liste `days` an. Nutze **Wiederholen (14-mal)** und berechne pro Wiederholung das lokale Datum für heute minus 13, 12, …, 0 Tage. Formatiere jedes Datum als `yyyy-MM-dd`. Benutze die lokale Kalenderzeit, keine UTC-Konvertierung.
3. Für jeden Tag nutze **Health-Daten suchen / Find Health Samples** mit einem Filter auf den gewünschten Tag (`Startdatum` innerhalb des Tages) und dem Typ **Schritte / Steps**. Summiere die Werte über die Health-Samples zu einem *einzigen* Tageswert. Berücksichtige, dass dieselben Schritte aus mehreren Quellen eventuell doppelt vorliegen; überprüfe eine Testtageszahl mit der Health-App.
4. Erstelle ein Wörterbuch für den Tag: `date` = berechnetes Datum, `steps` = **nur der tatsächlich errechnete Wert**. Füge es deiner Tagesliste hinzu.
5. Erstelle nach dem Wiederholen das oberste Wörterbuch mit `schema` = `life-rpg-health-batch-v1` und `days` = der Liste. Wandle das Wörterbuch in JSON/Text um und wähle **In Zwischenablage kopieren** oder **Datei sichern**.
6. Öffne Life RPG → Health Journal, füge den JSON-Text ein oder wähle die Datei und drücke **Tage rückwirkend importieren**. Importiere dieselbe Zeitspanne ruhig erneut: identische Tageswerte werden erkannt und nicht doppelt gespeichert.

Die bereits vorhandene tägliche URL-Automation kann unverändert weiterlaufen; dieser Sammelimport ist die **verlässliche manuelle Ergänzung**. Der Button „Cloud-Abgleich“ in Life RPG synchronisiert nur bereits importierte Daten mit Firebase und kann selbst **nicht** Apple Health aufrufen.

### Weitere Health-Typen ergänzen

Wenn Schritte zuverlässig funktionieren, kannst du denselben Tages-Durchlauf nach und nach um **Schlaf**, **aktive Kalorien** oder **Health-erfasste Nährstoffe** ergänzen. Verwende die echte Datentyp-Auswahl in deiner Kurzbefehle-App; nicht jeder Apple-Health-Datentyp wird in allen iOS-Versionen gleich angeboten.

Schlaf ist besonders fehleranfällig, weil Schlaf über Mitternacht reicht. Verwende sinnvollerweise das Schlafende als Zuordnung zum Folgetag und summiere nur *Asleep*-Abschnitte, nicht zusätzlich *In Bed* oder Gesamt- und Einzelschlafphasen doppelt. Zunächst mit der Health-App gegenprüfen.

Eine automatisierte Abfrage von Stimmung, Menstruation oder Krämpfen über Kurzbefehle ist **nicht für dein konkretes Gerät bestätigt**. Bitte solche Felder nur aus tatsächlich verfügbaren, eindeutig interpretierbaren Datensätzen oder bewusst manuell ergänzen. **Flo-Importe in Apple Health sind nicht vorauszusetzen.**

## Flo-Fallback: Werte direkt im Health Journal loggen

Wenn Flo die Periodendaten nicht in Apple Health bereitstellt, kannst du in Life RPG **Health Journal → gewünschter Tag → „Zyklus & Stimmung … manuell ergänzen“** aufklappen. Dort lassen sich Menstruation (ja/nein), Krämpfe und Stimmung mit einem Klick speichern oder korrigieren. Eine zusätzliche Checkbox bestätigt, dass diese sensiblen Daten gespeichert werden sollen. **„Keine Angabe“ entfernt einen zuvor gespeicherten Wert**, ohne vorhandene Aktivitäts- und Ernährungsdaten zu löschen. Das ist eine optionale Tagesnotiz, kein Zyklusprognose- oder Verhütungstool.

## Sicherheit und Fehlerverhalten

- Importiert werden höchstens **93 Tage** (nur aktuelle Daten innerhalb der letzten ca. 92 Tage) und höchstens **60 KB JSON**. Ungültige Daten, unzulässige Zahlen und doppelte Tagesdaten innerhalb einer Datei werden komplett abgelehnt.
- Ein Batch wird **atomar** in der bestehenden, nutzerkontogebundenen IndexedDB gespeichert. Der Spielstand selbst, Quests, Rewards und Story werden **nicht** verändert.
- Wiederholte Imports aktualisieren nur wirklich neue Werte. Fehlende Felder löschen nichts, und vorhandene manuelle Nährstoffangaben bleiben erhalten. Korrekturen an bereits importierten numerischen Health-Tageswerten sind erlaubt.
- Gespeichert wird in `users/{uid}/healthDays/{date}` nach Anmeldung; ohne Cloudverbindung bleibt der lokale Import ausstehend. Der Status unterscheidet diese Fälle. Keine Passwörter, Health-Dateien oder personenbezogenen Gesundheitsbeispiele ins öffentliche GitHub-Repository laden.
- Gesundheitswerte sind **keine verlässliche medizinische Diagnose** und weder Stimmungs- noch Zyklusprognosen dienen als Verhütungsmethode.

## Noch nicht Teil dieser Version

- Automatisch direkt aus Apple Health auf „Jetzt synchronisieren“ tippen: **mit einer reinen PWA nicht möglich**.
- Fertig installierbare Apple-Kurzbefehle-Datei oder automatischer täglicher Rückwärtsscan ohne Nutzerkonfiguration: noch **nicht** entwickelt/auf einem iPhone geprüft.
- Automatische Life-RPG-Story-Trigger aus sensiblen Health-Werten: **nicht aktiviert**; dafür wäre eine eigene, ausdrücklich freigegebene Story-Privacy-Integration nötig.
