# VERSION 59

Diese Version repariert zwei grundlegende Probleme statt weitere CSS-Schichten darüberzulegen.

## Desktop
Der Editor nutzt jetzt die echte vorhandene DOM-Struktur:
- obere Leiste über volle Breite
- linke echte Werkzeugleiste
- große zentrale Arbeitsfläche
- Eigenschaften, Ebenen und Textformate in EINER festen rechten Sidebar
- Sidebar ist separat scrollbar
- Arbeitsfläche ist separat scrollbar
- Einfügen/Text/Elemente öffnen als linkes Canva-artiges Panel
- kein gestapeltes riesiges Eigenschaften-Layout mehr
- keine erfundenen/nonexistenten `canvasWorkspace`-Container mehr

## Handy / Modals
- Modal-Fenster sind jetzt wirklich vertikal scrollbar.
- iPhone `100dvh`, Safe Areas, Momentum-Scrolling und `touch-action: pan-y`.
- Graph-Funktionseditor hat sticky Kopf und sticky Übernehmen-Leiste.

## Graph-Funktionen
- sichtbarer sqrt-/Code-Ansatz entfernt.
- Wurzel ist eine echte visuelle Wurzel.
- Bruch ist ein echter visueller Bruch.
- Exponent ist ein echter Exponent.
- sin/cos/tan/Betrag/e^x sind mathematisch dargestellt.
- Markieren + Wurzel/Bruch/Exponent funktioniert wie beim normalen Formel-Editor.
- Erst beim Speichern übersetzt SchoolBloom die visuellen Bausteine intern in die Rechenfunktion.
- In der Funktionsliste wird die Funktion ebenfalls mathematisch angezeigt, nicht als `sqrt(...)`.
