# VERSION 40

## Der MINT-Doppelstunden-Bug ist gezielt repariert

Problem bis V39:
Eine zusammenhängende Zelle im PHS-Stundenplan konnte über zwei Unterrichtszeilen laufen,
obwohl zwischen diesen Unterrichtszeilen eine Pause liegt.

Beispiel:
- MINT 10:30–11:15
- Pause 11:15–11:30
- MINT 11:30–12:15

Der Parser stoppte bisher allein wegen der Pause. Dadurch verschwand die zweite Hälfte.

V40 trennt Erkennung und Darstellung:

### Erkennung
Eine PDF-Zelle darf über eine Pause hinweg als eine echte Doppel-/Mehrfachstunde erkannt werden.
Sie wird nur getrennt, wenn
- eine echte horizontale PDF-Gitterlinie erkannt wird, oder
- die nächste Zeile eigenen Unterrichtstext enthält.

### Darstellung
Wenn eine erkannte Mehrfachstunde eine Pause überquert, wird sie nur für die Anzeige aufgeteilt:

MINT 10:30–11:15 · Doppelstunde 1/2
Pause 11:15–11:30
MINT 11:30–12:15 · Doppelstunde 2/2

Intern bleibt sie weiterhin eine Doppelstunde. Dadurch bleiben auch Basisplan-Vergleich,
Verschiebungen und Entfallzählung korrekt.

Das funktioniert auch für Dreifach- und längere Stunden mit Pausen dazwischen.

Weiterhin:
- Aktuell & Änderungen / Basisplan
- Entfall nur bei wirklich leerer Stelle
- ersetzte Stunden = geändert, nicht Entfall
- Hitzestunden
- Klassenwechsel
