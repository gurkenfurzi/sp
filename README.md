# VERSION 21

Wesentlicher Stundenplan-Parser-Fix:
- PDF-Zeitzeilen werden zuerst aus mehreren Textobjekten zu kompletten horizontalen Zeilen zusammengesetzt.
- Mo-1, Mo-2, Di-1 usw. werden danach erkannt.
- Fehlende Zeilenpositionen werden anhand des Tagesrasters interpoliert.
- Erst danach wird die M-U1-Spalte den Unterrichtszeiten zugeordnet.
- Doppelstunden bleiben als ein Eintrag mit kompletter Zeitspanne sichtbar.
- Cloudflare Live-Aktualisierung bleibt unverändert aktiv.
