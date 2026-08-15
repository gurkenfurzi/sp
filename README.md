# SchoolBloom – Version 91 Recovery Stable

Basis: letzte vom Nutzer bestätigte ladende Editor-Version (V85).

Stabilitätsänderungen:
- PDF.js wird erst beim PDF-Lesen geladen; ein CDN/PDF-Fehler blockiert den App-Start nicht.
- Paper.js lädt asynchron und blockiert den ersten Seitenaufbau nicht.
- Der Service Worker interceptet keine Navigation und löscht alte kaputte Caches.
- Kein automatischer Reload bei Service-Worker-Wechsel.
- Boot-Failsafe verhindert einen schwarzen Bildschirm.

Editor:
- Textformate befinden sich im Text-Bereich; eigener Formate-Tab entfernt.
- Eigene Fonts können lokal hinzugefügt werden.
- Listen lassen sich auf ein ausgewähltes Textfeld anwenden, ohne den Text vorher zu markieren.
- Freier +/- und Pinch-Zoom; manueller Zoom wird beim Texteingeben nicht automatisch überschrieben.
- Schließen eines Text-/Formatpanels stellt die Hauptleiste wieder her.
