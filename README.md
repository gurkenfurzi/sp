# VERSION 39

## Fix: Montag Ethik + MINT
Die PDF-Gitterlinie zwischen zwei echten Stunden kann beim Rendern manchmal zu schwach sein.
Dadurch konnte der Parser zwei echte Zeilen zusammenfassen und die zweite Stunde (z. B. MINT) verschlucken.

V39 nutzt zusätzlich Textbeweise:
Wenn zwei benachbarte Zeilen derselben Klassenspalte jeweils eigenen sinnvollen Unterrichtstext
enthalten, dürfen sie nicht zusammengeführt werden.

Damit bleiben z. B.:
- Ethik / ROE / R14
- MINT / MUS / R14

zwei getrennte Stunden.

Echte Doppel-, Dreifach- und längere Stunden bleiben möglich, weil eine echte zusammengeführte
Untis-Zelle typischerweise einen gemeinsamen Textblock besitzt, nicht einen separaten Textblock pro Zeile.

## Entfall
Entfall gilt ausschließlich, wenn die ursprüngliche Basisplan-Zeile im aktuellen Plan leer ist.
Wenn dort stattdessen ein anderes Fach steht, ist es eine Änderung/Ersetzung und KEIN Entfall.

Solche aktuell stattfindenden Ersatz-/Änderungsstunden bekommen klein `geändert`.

## Weiterhin
- verschobene Stunden sind kein Entfall
- Aktuell & Änderungen / Basisplan Umschalter
- echte Entfälle durchgestrichen
- Hitzestunden
- Mehrfachstunden
- Klassenwechsel
