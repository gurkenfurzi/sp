STUDIA V255 SYNC

WICHTIG:
1. Google Apps Script: backend-v255/Code.gs komplett als Code.gs einsetzen.
2. Speichern.
3. Bereitstellen > Bereitstellungen verwalten > Bearbeiten > Neue Version > Bereitstellen.
4. /exec im Inkognito-Fenster testen. Erwartet:
   {"ok":true,"service":"studia-google-account-sync","version":255,"transport":"post+jsonp-v255"}
5. Danach dieselbe /exec-URL in Studia auf Laptop und Handy verwenden.
6. Gleiches Studia-Konto auf beiden Geräten.
7. Laptop synchronisieren, dann Handy, dann Laptop nochmal.

V255 verwendet keinen postMessage-Bridge-Rueckweg mehr.
POST = Daten an Apps Script senden.
JSONP GET = Sync-Ergebnis aus Apps Script abholen.
