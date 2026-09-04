/* Studia Geräte-Sync über Google Apps Script.
   Als Web-App bereitstellen: Ausführen als "Ich", Zugriff "Jeder".
   Die Daten bleiben als private JSON-Datei im Google Drive des Script-Eigentümers. */

function doGet(e) {
  var p = e && e.parameter || {};
  var callback = String(p.callback || '');
  if (!/^[A-Za-z_$][\w$\.]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput('Ungültiger Callback.');
  }
  var result = { ok: false, error: 'Keine Daten vorhanden.' };
  try {
    if (p.action !== 'load') throw new Error('Unbekannte Aktion.');
    var key = cleanKey_(p.key);
    var file = findFile_(key);
    if (!file) throw new Error('Für diesen Sync-Schlüssel gibt es noch keine Sicherung.');
    result = { ok: true, payload: file.getBlob().getDataAsString('UTF-8'), updatedAt: file.getLastUpdated().toISOString() };
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var p = e && e.parameter || {};
    if (p.action !== 'save') throw new Error('Unbekannte Aktion.');
    var key = cleanKey_(p.key);
    var payload = String(p.payload || '');
    if (!payload) throw new Error('Leere Sicherung.');
    JSON.parse(payload);
    var file = findFile_(key);
    if (file) file.setContent(payload);
    else DriveApp.createFile(fileName_(key), payload, MimeType.PLAIN_TEXT);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  } finally {
    lock.releaseLock();
  }
}

function cleanKey_(key) {
  key = String(key || '').trim();
  if (key.length < 12) throw new Error('Der Sync-Schlüssel muss mindestens 12 Zeichen lang sein.');
  return key;
}

function fileName_(key) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8);
  var hex = digest.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  return 'studia-sync-' + hex + '.json';
}

function findFile_(key) {
  var files = DriveApp.getFilesByName(fileName_(key));
  return files.hasNext() ? files.next() : null;
}
