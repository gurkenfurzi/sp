Studia V259 — GOOGLE ONLY / AUTOMATIC SYNC

1. Upload ALL files in this ZIP to the GitHub Pages repo.
2. In Google Apps Script replace Code.gs with backend-v259/Code.gs.
3. Save -> Deploy -> Manage deployments -> Edit -> New version -> Deploy.
4. Deployment must run as you and be accessible to Anyone.
5. Open the /exec URL directly. It now opens Studia (not JSON).
6. For a health check use: /exec?action=health
   Expected: version 259 / google-script-run-v259.

How it works:
- GitHub still contains the Studia app and keeps its existing localStorage/IndexedDB data.
- The Google Apps Script web app displays that GitHub app full-screen.
- Sync requests use google.script.run directly to Apps Script/Google Sheets.
- No Firebase, Cloudflare, CORS fetch, JSONP or third-party sync iframe transport.
- Local changes schedule automatic sync; focus/online/visibility and a foreground interval also reconcile devices.
