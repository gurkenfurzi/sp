# VERSION 35 — Stabiler Neuaufbau

Basis: VERSION 31 (nicht V34).

Wichtigste Reparaturen
- Stundenplan: V33/V34-Overlap-Logik entfernt. Wieder V31-PDF-Engine.
- Nur exakt doppelte Parser-Datensätze werden herausgefiltert; nichts wird geraten, zusammengeführt oder umbenannt.
- Formen-Bug an der Ursache repariert: Normales Text-/Objekt-Rendering stellt SVG-Formen danach automatisch wieder her.
- Formen verschwinden beim Einfügen/Auswählen von Text nicht mehr.

Notizbücher
- Verwendet direkt das vom Nutzer hochgeladene Notebook-SVG.
- Die ursprünglichen zwei Rosatöne sind pro Fach separat einstellbar:
  - Hauptfarbe
  - dunkle Akzentfarbe
- Live-Vorschau im Cover-Editor.

Editor / Übersicht
- Stabiler Canva-artiger Schnellbereich ohne DOM-Umbauten:
  - Hinzufügen
  - Text
  - Elemente
  - Anordnen
  - Ansicht
- Darunter nur die Werkzeuge der ausgewählten Kategorie.
- Bestehende V30/V31 Zeichen-, Auswahl-, Zoom- und Pfadlogik bleibt erhalten.
- Fächer sind über einen direkten Home-Shortcut leichter erreichbar.
- Study Pet hat einen sichtbaren „Pause starten“-Button.

Hinweis
- Diese Version priorisiert Stabilität und klare Navigation.
