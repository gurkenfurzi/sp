# VERSION 38

## Verschobene Stunden sind kein Entfall mehr
V37 verglich Basisplan und aktuellen Plan noch zu stark über die ursprüngliche Tabellenzeile.
Dadurch konnte z. B. ein LF2, das am Freitag von 13:30 auf 09:45 verschoben wurde, unten zusätzlich als Entfall erscheinen.

V38 vergleicht pro Wochentag:
- Fach
- Lehrer
- Anzahl der Unterrichtsblöcke

Beispiel:
- Basisplan: 1x LF2 bei Herr Zeilfelder um 13:30
- aktueller Plan: 1x LF2 bei Herr Zeilfelder um 09:45
- Ergebnis: Verschiebung, KEIN Entfall.

Ein Entfall wird nur noch erzeugt, wenn im aktuellen Plan wirklich weniger Blöcke dieses Fachs/Lehrers vorhanden sind als im Basisplan.
Zusätzlich muss die ursprüngliche Basisplan-Zeile im aktuellen Plan leer sein.

## Zwei Ansichten im Stundenplan
Oben gibt es jetzt:
- `✦ Aktuell & Änderungen` — Standard und wichtigste Ansicht
- `▦ Basisplan` — regulärer Normalplan ohne Wochenänderungen

Der aktuelle Plan bleibt die Standardansicht und wird weiterhin für Home / nächste Stunde verwendet.

## Weiterhin enthalten
- echter Entfall mit durchgestrichenem Basis-Fach
- Doppel-, Dreifach- und längere Stundenblöcke
- Hitzestunden aus der PDF
- dynamische Hitzepausen
- Klassenwechsel
- Notebook-Abkürzungen/Farben
