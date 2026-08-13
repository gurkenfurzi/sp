# VERSION 36

## Stundenplan
Der Fehler mit mehreren Fächern zur gleichen Uhrzeit wurde im Parser selbst repariert.

- doppelte PDF.js-Klassenüberschriften werden entfernt
- pro Klasse + Tag + Tabellenzeile darf nur eine Zelle existieren
- wenn mehrere Kandidaten entstehen, wird anhand der tatsächlichen X-Position im PDF die Zelle gewählt, die am besten in der Klassen-Spalte sitzt
- zusätzliche Render-Sicherung verhindert mehrere Unterrichtskarten mit gleichem Start / gleicher Tabellenzeile
- Doppelstunden werden bei der Auswahl bevorzugt, wenn sie geometrisch korrekt erkannt wurden
- keine Fächer werden aufgrund ihres Namens geraten

## Notizbücher
- das hochgeladene Notebook-Design bleibt erhalten
- die Abkürzung steht im weißen Feld
- der volle Fachname steht sauber unter dem Notebook
- Themen-/Dateianzahl ebenfalls darunter
- jedes Fach hat jetzt ein eigenes `abbr`-Feld
- Abkürzung kann beim Erstellen eingegeben werden
- Abkürzung, Fachname und beide Notebook-Farben können später im Cover-Editor geändert werden
