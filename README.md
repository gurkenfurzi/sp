# VERSION 37

## Aktueller Plan vs. Basisplan
- PDF-Seiten werden nicht mehr zusammengeworfen.
- Der normale/aktuelle Wochenplan ist die führende Quelle.
- Eine Seite mit Überschrift `1. BASISPLAN ...` wird separat als Basisplan gelesen.
- Der Basisplan dient nur zum Vergleich.
- Wenn im Basisplan Unterricht steht, im aktuellen Plan aber die entsprechende Tabellenzeile leer ist, wird der ursprüngliche Unterricht als `Entfall` angezeigt.
- Das ursprüngliche Fach, Lehrer und Raum werden beim Entfall durchgestrichen.
- Änderungen/Vertretungen aus dem aktuellen Plan haben immer Vorrang.

## Mehrfachstunden
- Die frühere künstliche Begrenzung auf maximal zwei zusammengeführte Tabellenzeilen wurde entfernt.
- 2, 3 und längere zusammenhängende Unterrichtsblöcke können anhand der PDF-Gitterlinien erkannt werden.
- Pausen trennen Mehrfachstunden weiterhin.

## Hitzestunden
- SchoolBloom sucht in der PDF nach `Hitzebedingte Kurzstunden`.
- Die Beginn-/Ende-Tabelle wird direkt aus dem PDF-Text ausgelesen.
- Erkannte Unterrichtszeiten ersetzen automatisch die normalen Uhrzeiten.
- Erkannte Pausen werden ebenfalls übernommen.
- Falls die kleine Zeittabelle in PDF.js nicht sauber extrahierbar ist, wird nur bei eindeutig vorhandener Hitzestunden-Kennzeichnung auf die derzeit in der PDF gezeigten Kurzstundenzeiten zurückgegriffen:
  1 08:00–08:35
  2 08:35–09:10
  Pause 09:10–09:25
  3 09:25–10:00
  4 10:00–10:35
  Pause 10:35–10:50
  5 10:50–11:25
  6 11:25–12:00
  Große Pause 12:00–12:25
  7 12:25–13:00
  8 13:00–13:35
- Im Stundenplan steht bei aktivem Kurzstundenplan `☀️ Hitzestunden aktiv`.

## Fächer
Die Notizbuch-Abkürzungen und getrennt einstellbaren Notebook-Farben aus VERSION 36 bleiben erhalten.
