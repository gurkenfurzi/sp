const ST = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  STATE: 'State',
  USER_HEADERS: ['id','username','usernameKey','passwordSalt','passwordHash','recoverySalt','recoveryHash','createdAt','googleSub','email','provider'],
  SESSION_HEADERS: ['tokenHash','userId','expiresAt','createdAt'], // expiresAt = PERMANENT for non-expiring logins
  STATE_HEADERS: ['userId','stateFileId','updatedAt']
};

function setup() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('STUDIA_SPREADSHEET_ID');
  let filesFolderId = props.getProperty('STUDIA_FILES_FOLDER_ID');

  let ss;
  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.create('Studia Daten');
    spreadsheetId = ss.getId();
    props.setProperty('STUDIA_SPREADSHEET_ID', spreadsheetId);
  }

  ensureSheet_(ss, ST.USERS, ST.USER_HEADERS);
  ensureSheet_(ss, ST.SESSIONS, ST.SESSION_HEADERS);
  ensureSheet_(ss, ST.STATE, ST.STATE_HEADERS);

  let folder;
  if (filesFolderId) {
    folder = DriveApp.getFolderById(filesFolderId);
  } else {
    folder = DriveApp.createFolder('Studia Dateien');
    filesFolderId = folder.getId();
    props.setProperty('STUDIA_FILES_FOLDER_ID', filesFolderId);
  }

  const info = {
    ok: true,
    spreadsheetId,
    spreadsheetUrl: ss.getUrl(),
    filesFolderId,
    filesFolderUrl: folder.getUrl()
  };
  console.log(JSON.stringify(info, null, 2));
  return info;
}

function doGet(e) {
  try {
    ensureConfigured_();
    const req = requestData_(e);
    const action = normalizeAction_(req.action || 'health');
    const token = String(req.token || '');
    let result;

    switch (action) {
      case 'health':
      case 'ping':
        result = { ok: true, service: 'studia-google-account-sync', version: 178 };
        break;
      case 'me':
      case 'api/me':
      case '/api/me': {
        const user = requireUser_(token);
        result = { ok: true, user: publicUser_(user) };
        break;
      }
      case 'state':
      case 'api/state':
      case '/api/state': {
        const user = requireUser_(token);
        result = getState_(user.id);
        break;
      }
      case 'state_meta':
      case 'stateMeta':
      case 'api/state/meta':
      case '/api/state/meta': {
        const user = requireUser_(token);
        result = getStateMeta_(user.id);
        break;
      }
      case 'file': {
        requireUser_(token);
        const id = String(req.id || '');
        result = getFileData_(id);
        break;
      }
      case 'load':
        result = fail_('Diese Anfrage stammt vom alten Studia-Sync. Bitte Studia auf V178 aktualisieren.', 409);
        break;
      default:
        result = fail_('Unbekannte Aktion: ' + action, 404);
    }
    return json_(result);
  } catch (err) {
    return json_(fromError_(err));
  }
}

function doPost(e) {
  try {
    ensureConfigured_();
    const body = requestData_(e);
    const action = normalizeAction_(body.action || '');
    let result;

    switch (action) {
      case 'register':
      case 'api/auth/register':
      case '/api/auth/register':
        result = register_(body.username, body.password);
        break;
      case 'login':
      case 'api/auth/login':
      case '/api/auth/login':
        result = login_(body.username, body.password);
        break;
      case 'google_login':
      case 'api/auth/google':
      case '/api/auth/google':
        result = googleLogin_(body.credential);
        break;
      case 'recover':
      case 'api/auth/recover':
      case '/api/auth/recover':
        result = recover_(body.username, body.recoveryCode, body.newPassword);
        break;
      case 'logout':
        result = logout_(body.token);
        break;
      case 'state_put':
      case 'statePut':
      case 'api/state/put':
      case '/api/state/put': {
        const user = requireUser_(body.token);
        result = putState_(user.id, body.data);
        break;
      }
      case 'upload': {
        requireUser_(body.token);
        result = uploadFile_(body.dataUrl);
        break;
      }
      case 'save':
        result = fail_('Diese Anfrage stammt vom alten Studia-Sync. Bitte Studia auf V178 aktualisieren.', 409);
        break;
      default:
        result = fail_('Unbekannte Aktion: ' + action, 404);
    }
    return json_(result);
  } catch (err) {
    return json_(fromError_(err));
  }
}

function register_(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (username.length < 3 || username.length > 32) throw appError_('Benutzername muss 3–32 Zeichen lang sein.', 400);
  if (password.length < 8) throw appError_('Passwort muss mindestens 8 Zeichen haben.', 400);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    cleanupSessions_();
    const key = username.toLocaleLowerCase('de-DE');
    if (findUserByUsernameKey_(key)) throw appError_('Dieser Benutzername existiert bereits.', 409);

    const id = Utilities.getUuid();
    const passwordSalt = randomCode_(24);
    const recoverySalt = randomCode_(24);
    const recoveryCode = makeRecoveryCode_();
    const row = [
      id,
      username,
      key,
      passwordSalt,
      hashSecret_(passwordSalt, password),
      recoverySalt,
      hashSecret_(recoverySalt, normalizeRecovery_(recoveryCode)),
      Date.now(),
      '',
      '',
      'password'
    ];
    sheet_(ST.USERS).appendRow(row);
    const token = createSession_(id);
    return { ok: true, token, user: { id, username }, recoveryCode };
  } finally {
    lock.releaseLock();
  }
}

function login_(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  cleanupSessions_();
  const user = findUserByUsernameKey_(username.toLocaleLowerCase('de-DE'));
  if (!user || !constantEqual_(hashSecret_(user.passwordSalt, password), user.passwordHash)) {
    throw appError_('Benutzername oder Passwort falsch.', 401);
  }
  const token = createSession_(user.id);
  return { ok: true, token, user: publicUser_(user) };
}

function googleLogin_(credential) {
  credential = String(credential || '').trim();
  if (!credential) throw appError_('Google-Anmeldung wurde abgebrochen.', 400);

  let info;
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (res.getResponseCode() !== 200) throw new Error('Token ungültig');
    info = JSON.parse(res.getContentText() || '{}');
  } catch (err) {
    throw appError_('Google-Anmeldung konnte nicht geprüft werden.', 401);
  }

  if (!info.sub || String(info.email_verified) !== 'true') {
    throw appError_('Google-Konto konnte nicht bestätigt werden.', 401);
  }

  const configuredClientId = String(PropertiesService.getScriptProperties().getProperty('STUDIA_GOOGLE_CLIENT_ID') || '').trim();
  if (configuredClientId && String(info.aud || '') !== configuredClientId) {
    throw appError_('Dieses Google-Konto gehört nicht zur konfigurierten Studia-App.', 401);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    cleanupSessions_();
    let user = findUserByGoogleSub_(String(info.sub));
    if (!user && info.email) user = findUserByEmail_(String(info.email));

    if (!user) {
      const id = Utilities.getUuid();
      const username = uniqueGoogleUsername_(String(info.name || info.given_name || String(info.email || '').split('@')[0] || 'Studia'));
      const row = [
        id,
        username,
        username.toLocaleLowerCase('de-DE'),
        '', '', '', '', Date.now(),
        String(info.sub),
        String(info.email || ''),
        'google'
      ];
      sheet_(ST.USERS).appendRow(row);
      user = findUserById_(id);
    } else {
      const sh = sheet_(ST.USERS);
      if (!user.googleSub || !user.email || user.provider !== 'google') {
        sh.getRange(user.row, 9, 1, 3).setValues([[String(info.sub), String(info.email || user.email || ''), 'google']]);
        user = findUserById_(user.id);
      }
    }

    const token = createSession_(user.id);
    return { ok: true, token, user: publicUser_(user) };
  } finally {
    lock.releaseLock();
  }
}

function uniqueGoogleUsername_(seed) {
  let base = String(seed || 'Studia')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  if (base.length < 3) base = 'Studia';
  let candidate = base, n = 2;
  while (findUserByUsernameKey_(candidate.toLocaleLowerCase('de-DE'))) {
    candidate = (base.slice(0, 26 - String(n).length) + n).slice(0, 32);
    n++;
  }
  return candidate;
}

function recover_(username, recoveryCode, newPassword) {
  username = String(username || '').trim();
  recoveryCode = normalizeRecovery_(recoveryCode);
  newPassword = String(newPassword || '');
  if (newPassword.length < 8) throw appError_('Neues Passwort muss mindestens 8 Zeichen haben.', 400);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const user = findUserByUsernameKey_(username.toLocaleLowerCase('de-DE'));
    if (!user || !constantEqual_(hashSecret_(user.recoverySalt, recoveryCode), user.recoveryHash)) {
      throw appError_('Wiederherstellungscode ist falsch.', 401);
    }

    const users = sheet_(ST.USERS);
    const passwordSalt = randomCode_(24);
    const recoverySalt = randomCode_(24);
    const nextRecoveryCode = makeRecoveryCode_();
    users.getRange(user.row, 4, 1, 4).setValues([[
      passwordSalt,
      hashSecret_(passwordSalt, newPassword),
      recoverySalt,
      hashSecret_(recoverySalt, normalizeRecovery_(nextRecoveryCode))
    ]]);
    deleteSessionsForUser_(user.id);
    return { ok: true, recoveryCode: nextRecoveryCode };
  } finally {
    lock.releaseLock();
  }
}

function logout_(token) {
  token = String(token || '');
  if (!token) return { ok: true };
  const tokenHash = sha256_(token);
  const sh = sheet_(ST.SESSIONS);
  const rows = rows_(sh);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0]) === tokenHash) sh.deleteRow(i + 2);
  }
  return { ok: true };
}

function createSession_(userId) {
  const token = randomCode_(64) + Utilities.getUuid().replace(/-/g, '');
  // Login bleibt ohne Ablaufdatum gültig. Er endet nur durch explizites Abmelden,
  // Kontowiederherstellung/Passwortwechsel oder wenn die lokalen App-Daten gelöscht werden.
  sheet_(ST.SESSIONS).appendRow([sha256_(token), userId, 'PERMANENT', Date.now()]);
  return token;
}

function requireUser_(token) {
  token = String(token || '');
  if (!token) throw appError_('Nicht angemeldet.', 401);
  const tokenHash = sha256_(token);
  const rows = rows_(sheet_(ST.SESSIONS));
  for (let i = 0; i < rows.length; i++) {
    // Alle vorhandenen gültigen Token werden ab v23 ohne Zeitlimit akzeptiert.
    // Dadurch bleiben auch bereits angemeldete Geräte angemeldet, ohne neu einloggen zu müssen.
    if (String(rows[i][0]) === tokenHash) {
      const user = findUserById_(String(rows[i][1]));
      if (!user) break;
      return user;
    }
  }
  throw appError_('Nicht angemeldet. Bitte erneut anmelden.', 401);
}

function cleanupSessions_() {
  // Permanente Sitzungen werden nicht automatisch gelöscht.
  // Abmelden oder Kontowiederherstellung entfernt Sitzungen gezielt.
  return;
}

function deleteSessionsForUser_(userId) {
  const sh = sheet_(ST.SESSIONS);
  const rows = rows_(sh);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === String(userId)) sh.deleteRow(i + 2);
  }
}

function getState_(userId) {
  const meta = findStateRow_(userId);
  if (!meta || !meta.fileId) return { ok: true, data: null, updatedAt: 0 };
  try {
    const raw = DriveApp.getFileById(meta.fileId).getBlob().getDataAsString('UTF-8');
    return { ok: true, data: JSON.parse(raw || '{}'), updatedAt: meta.updatedAt };
  } catch (err) {
    throw appError_('Gespeicherte Daten konnten nicht gelesen werden.', 500);
  }
}

function getStateMeta_(userId) {
  const meta = findStateRow_(userId);
  return { ok: true, updatedAt: meta ? meta.updatedAt : 0 };
}

function putState_(userId, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const json = JSON.stringify(data || {});
    const folder = filesFolder_();
    let meta = findStateRow_(userId);
    let fileId;
    if (meta && meta.fileId) {
      const f = DriveApp.getFileById(meta.fileId);
      f.setContent(json);
      fileId = f.getId();
    } else {
      const f = folder.createFile(`state-${userId}.json`, json, MimeType.PLAIN_TEXT);
      fileId = f.getId();
    }
    const updatedAt = Date.now();
    const sh = sheet_(ST.STATE);
    if (meta) sh.getRange(meta.row, 1, 1, 3).setValues([[userId, fileId, updatedAt]]);
    else sh.appendRow([userId, fileId, updatedAt]);
    return { ok: true, updatedAt };
  } finally {
    lock.releaseLock();
  }
}

function uploadFile_(dataUrl) {
  dataUrl = String(dataUrl || '');
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) throw appError_('Bildformat wird nicht unterstützt.', 400);
  const mime = m[1] || 'application/octet-stream';
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 5 * 1024 * 1024) throw appError_('Bild ist zu groß.', 413);
  const ext = extensionForMime_(mime);
  const blob = Utilities.newBlob(bytes, mime, `bild-${Date.now()}-${randomCode_(8)}.${ext}`);
  const file = filesFolder_().createFile(blob);
  return { ok: true, ref: 'gdrive:' + file.getId() };
}

function getFileData_(id) {
  id = String(id || '').trim();
  if (!id) throw appError_('Bild-ID fehlt.', 400);
  try {
    const blob = DriveApp.getFileById(id).getBlob();
    const bytes = blob.getBytes();
    const mime = blob.getContentType() || 'image/jpeg';
    return { ok: true, dataUrl: `data:${mime};base64,${Utilities.base64Encode(bytes)}` };
  } catch (err) {
    throw appError_('Bild konnte nicht geladen werden.', 404);
  }
}

function extensionForMime_(mime) {
  const map = {
    'image/jpeg':'jpg', 'image/jpg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif', 'image/heic':'heic', 'image/heif':'heif'
  };
  return map[String(mime).toLowerCase()] || 'bin';
}

function findUserByUsernameKey_(key) {
  const rows = rows_(sheet_(ST.USERS));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][2]) === String(key)) return userFromRow_(rows[i], i + 2);
  }
  return null;
}

function findUserByGoogleSub_(sub) {
  const rows = rows_(sheet_(ST.USERS));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][8] || '') === String(sub)) return userFromRow_(rows[i], i + 2);
  }
  return null;
}

function findUserByEmail_(email) {
  const key = String(email || '').trim().toLocaleLowerCase('en-US');
  if (!key) return null;
  const rows = rows_(sheet_(ST.USERS));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][9] || '').trim().toLocaleLowerCase('en-US') === key) return userFromRow_(rows[i], i + 2);
  }
  return null;
}

function findUserById_(id) {
  const rows = rows_(sheet_(ST.USERS));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return userFromRow_(rows[i], i + 2);
  }
  return null;
}

function userFromRow_(r, row) {
  return {
    row,
    id:String(r[0] || ''),
    username:String(r[1] || ''),
    usernameKey:String(r[2] || ''),
    passwordSalt:String(r[3] || ''),
    passwordHash:String(r[4] || ''),
    recoverySalt:String(r[5] || ''),
    recoveryHash:String(r[6] || ''),
    createdAt:Number(r[7] || 0),
    googleSub:String(r[8] || ''),
    email:String(r[9] || ''),
    provider:String(r[10] || (r[4] ? 'password' : ''))
  };
}

function publicUser_(user) {
  return { id:user.id, username:user.username, email:user.email || '', provider:user.provider || 'password' };
}

function findStateRow_(userId) {
  const rows = rows_(sheet_(ST.STATE));
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(userId)) return { row:i + 2, userId:String(rows[i][0]), fileId:String(rows[i][1] || ''), updatedAt:Number(rows[i][2] || 0) };
  }
  return null;
}

function ensureConfigured_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('STUDIA_SPREADSHEET_ID') || !props.getProperty('STUDIA_FILES_FOLDER_ID')) {
    throw appError_('Backend noch nicht eingerichtet. Führe zuerst setup() aus.', 503);
  }
}

function spreadsheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('STUDIA_SPREADSHEET_ID'));
}

function filesFolder_() {
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('STUDIA_FILES_FOLDER_ID'));
}

function sheet_(name) {
  const sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw appError_(`Tabelle ${name} fehlt. Führe setup() erneut aus.`, 500);
  return sh;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  else {
    const current = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    if (current.join('|') !== headers.join('|')) sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sh;
}

function rows_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function normalizeAction_(value) {
  let a = String(value || '').trim();
  try { a = decodeURIComponent(a); } catch (_) {}
  a = a.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').replace(/\/+$/, '');
  a = a.replace(/^api\//i, '').replace(/^auth\//i, 'auth/');
  const aliases = {
    'auth/register':'register', 'account/register':'register', 'signup':'register', 'sign-up':'register',
    'auth/login':'login', 'account/login':'login', 'signin':'login', 'sign-in':'login',
    'auth/google':'google_login', 'google/login':'google_login',
    'auth/recover':'recover', 'account/recover':'recover',
    'state/put':'state_put', 'state-put':'state_put', 'stateput':'state_put',
    'state/meta':'state_meta', 'statemeta':'state_meta',
    'api/me':'me', 'api/state':'state', 'api/state/meta':'state_meta'
  };
  const key = a.toLowerCase();
  return aliases[key] || key;
}

function requestData_(e) {
  const out = {};
  if (e && e.parameter) Object.keys(e.parameter).forEach(k => out[k] = e.parameter[k]);
  const raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') Object.keys(parsed).forEach(k => out[k] = parsed[k]);
    } catch (_) {
      /* application/x-www-form-urlencoded fallback */
      raw.split('&').forEach(pair => {
        if (!pair) return;
        const i = pair.indexOf('=');
        const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
        const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
        if (k) out[k] = v;
      });
    }
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(message, status) {
  return { ok:false, error:String(message || 'Fehler'), status:Number(status || 400) };
}

function appError_(message, status) {
  const err = new Error(message);
  err.appStatus = status;
  return err;
}

function fromError_(err) {
  console.error(err && err.stack ? err.stack : err);
  return fail_(err && err.message ? err.message : 'Unbekannter Fehler.', err && err.appStatus ? err.appStatus : 500);
}

function makeRecoveryCode_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = [];
  for (let g = 0; g < 5; g++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    groups.push(s);
  }
  return 'ST-' + groups.join('-');
}

function normalizeRecovery_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function randomCode_(length) {
  let s = '';
  while (s.length < length) s += Utilities.getUuid().replace(/-/g, '') + Math.random().toString(36).slice(2);
  return s.slice(0, length);
}

function hashSecret_(salt, secret) {
  return sha256_(String(salt) + '|' + String(secret));
}

function sha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => (b + 256) % 256).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
