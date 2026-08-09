# VERSION 19

Stundenplan-Parser-Reparatur:
- nur echte Klassenüberschriften (BF 1A/B, BF 2, M O1/U1, W O1/U1/U2) werden als Spalten erkannt
- LF8/LF11 usw. können nicht mehr fälschlich Klassenköpfe werden
- mehrzeilige Sondertermine werden zusammengesetzt
- „Klassenleitungs-“ + „stunden“ wird zu „Klassenleitungsstunden“
- Sondertermine werden nicht mit normalen Unterrichtsstunden verschmolzen
- Live-Cloudflare-Abruf aus Version 18 bleibt bestehen
