# VERSION 18

Der Button **Jetzt aktualisieren** lädt die aktuelle PHS-Stundenplan-PDF sofort live über:

https://dry-surf-fec5.muelliaccc.workers.dev

Fallbacks:
1. Cloudflare Worker live
2. GitHub Actions Spiegel (`Stundenplan.pdf`)
3. direkter PHS-Abruf

Nach jedem erfolgreichen Abruf zeigt die App Quelle und Uhrzeit an.
