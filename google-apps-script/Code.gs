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
      case 'bridge_v263':
        return v263BridgePage_(req);
      case 'app_v262':
      case 'app_v260':
      case 'app':
        return v260AppDirect_();
      case 'app_v259':
        return v259AppShell_();
      case 'health':
      case 'ping':
        result = { ok: true, service: 'studia-google-account-sync', version: 265, transport: 'form-bounce-v265', automatic: true, ui: 'github' };
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
      case 'bridge_bounce_v265': {
        let bounceResult;
        try { bounceResult = v265HandleBounce_(body); }
        catch (bounceErr) { bounceResult = fromError_(bounceErr); }
        return v265BounceHtml_(body.callId, bounceResult);
      }
      case 'bridge_relay_v264': {
        let relayResult;
        try { relayResult = v264HandleRelay_(body); }
        catch (relayErr) { relayResult = fromError_(relayErr); }
        return v264RelayHtml_(body.callId, relayResult, String(body.acceptGzip || '') === '1');
      }
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
      case 'sync':
      case 'state_sync':
      case 'stateSync':
      case 'api/state/sync':
      case '/api/state/sync': {
        const user = requireUser_(body.token);
        result = syncStateFast_(user.id, decodeSyncIncoming_(body));
        break;
      }
      case 'sync_bridge': {
        let bridgeResult;
        try {
          const user = requireUser_(body.token);
          bridgeResult = syncStateFast_(user.id, decodeSyncIncoming_(body));
        } catch (bridgeErr) {
          bridgeResult = fromError_(bridgeErr);
        }
        return bridgeHtml_(body.bridgeId, bridgeResult, String(body.replyGzip || '') === '1');
      }


      case 'sync_bridge_v253': {
        let bridgeResult;
        try {
          const user = requireUser_(body.token);
          const incoming = v249DecodeField_(body, 'data', 'dataGzip');
          const base = v249DecodeField_(body, 'base', 'baseGzip');
          bridgeResult = syncStateV249_(user, incoming, base, String(body.deviceId || ''), String(body.deviceName || ''));
          bridgeResult.version = 253;
          bridgeResult.storage = 'sheet-fast-v253';
        } catch (bridgeErr) {
          bridgeResult = fromError_(bridgeErr);
        }
        return bridgeHtml_(body.bridgeId, bridgeResult, String(body.replyGzip || '') === '1');
      }

      case 'sync_bridge_v249': {
        let bridgeResult;
        try {
          const user = requireUser_(body.token);
          const incoming = v249DecodeField_(body, 'data', 'dataGzip');
          const base = v249DecodeField_(body, 'base', 'baseGzip');
          bridgeResult = syncStateV249_(user, incoming, base, String(body.deviceId || ''), String(body.deviceName || ''));
        } catch (bridgeErr) {
          bridgeResult = fromError_(bridgeErr);
        }
        return bridgeHtml_(body.bridgeId, bridgeResult, String(body.replyGzip || '') === '1');
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
    'state/sync':'sync', 'state-sync':'sync', 'statesync':'sync', 'sync':'sync',
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



/* ===== Studia V247: fast compressed spreadsheet state + iframe bridge ===== */
const V247_FAST_SHEET = 'StateFast';
const V247_CHUNK = 45000;

function fastStateSheet_() {
  const ss = spreadsheet_();
  let sh = ss.getSheetByName(V247_FAST_SHEET);
  if (!sh) {
    sh = ss.insertSheet(V247_FAST_SHEET);
    sh.getRange(1,1,1,3).setValues([['userId','updatedAt','chunkCount']]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function fastStateRow_(sh, userId) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const ids = sh.getRange(2,1,last-1,1).getDisplayValues();
  for (let i=0;i<ids.length;i++) if (String(ids[i][0]) === String(userId)) return i+2;
  return null;
}

function fastEncode_(obj) {
  const json = JSON.stringify(obj || {});
  const gz = Utilities.gzip(Utilities.newBlob(json, 'application/json', 'state.json'));
  return Utilities.base64Encode(gz.getBytes());
}

function fastDecode_(encoded) {
  if (!encoded) return {};
  const bytes = Utilities.base64Decode(String(encoded));
  const json = Utilities.ungzip(Utilities.newBlob(bytes, 'application/gzip', 'state.json.gz')).getDataAsString('UTF-8');
  return JSON.parse(json || '{}');
}

function readFastState_(userId) {
  const sh = fastStateSheet_();
  const row = fastStateRow_(sh, userId);
  if (!row) return {data:{}, updatedAt:0, exists:false};
  const meta = sh.getRange(row,1,1,3).getValues()[0];
  const count = Math.max(0, Number(meta[2] || 0));
  if (!count) return {data:{}, updatedAt:Number(meta[1]||0), exists:true};
  const parts = sh.getRange(row,4,1,count).getDisplayValues()[0];
  return {data:fastDecode_(parts.join('')), updatedAt:Number(meta[1]||0), exists:true};
}

function writeFastState_(userId, data, updatedAt) {
  const sh = fastStateSheet_();
  const encoded = fastEncode_(data || {});
  const parts = [];
  for (let i=0;i<encoded.length;i+=V247_CHUNK) parts.push(encoded.slice(i,i+V247_CHUNK));
  let row = fastStateRow_(sh, userId);
  if (!row) row = sh.getLastRow()+1;
  const needCols = 3 + Math.max(1, parts.length);
  if (sh.getMaxColumns() < needCols) sh.insertColumnsAfter(sh.getMaxColumns(), needCols-sh.getMaxColumns());
  const oldCount = row <= sh.getLastRow() ? Number(sh.getRange(row,3).getValue()||0) : 0;
  sh.getRange(row,1,1,3).setValues([[String(userId), Number(updatedAt||Date.now()), parts.length]]);
  if (parts.length) {
    const r = sh.getRange(row,4,1,parts.length);
    r.setNumberFormat('@');
    r.setValues([parts]);
  }
  if (oldCount > parts.length) sh.getRange(row,4+parts.length,1,oldCount-parts.length).clearContent();
}

function decodeSyncIncoming_(body) {
  if (body && body.dataGzip) {
    const bytes = Utilities.base64Decode(String(body.dataGzip));
    const txt = Utilities.ungzip(Utilities.newBlob(bytes, 'application/gzip', 'incoming.json.gz')).getDataAsString('UTF-8');
    return JSON.parse(txt || '{}');
  }
  const d = body ? body.data : null;
  if (d && typeof d === 'object') return d;
  if (typeof d === 'string' && d.trim()) return JSON.parse(d);
  return {};
}

function bridgeHtml_(bridgeId, result, gzipReply) {
  let payload = result || fail_('Sync fehlgeschlagen', 500);
  if (payload.ok && gzipReply && payload.data && typeof payload.data === 'object') {
    const dataGzip = fastEncode_(payload.data);
    payload = Object.assign({}, payload, {data:null, dataGzip:dataGzip, encoding:'gzip-base64'});
  }
  const id = String(bridgeId || '');
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c');
  const safeId = JSON.stringify(id).replace(/</g, '\\u003c');
  const html = '<!doctype html><meta charset="utf-8"><script>parent.postMessage({type:"studia-sync-bridge",id:'+safeId+',payload:'+safePayload+'},"*");<\\/script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function syncStateFast_(userId, incoming) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1200)) throw appError_('Cloud ist gerade beschäftigt · bitte einmal erneut synchronisieren.', 409);
  try {
    const remoteRec = readFastState_(userId);
    const local = incoming && typeof incoming === 'object' ? incoming : {};
    const merged = mergeStudiaState_(local, remoteRec.data || {});
    const updatedAt = Date.now();
    writeFastState_(userId, merged, updatedAt);
    return {ok:true, data:merged, updatedAt, version:247, storage:'sheet-fast'};
  } finally {
    lock.releaseLock();
  }
}

/* ===== Legacy V246 Drive sync kept for compatibility only ===== */
function syncState_(userId, incoming) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const meta = findStateRow_(userId);
    let remote = {};
    let fileId = meta && meta.fileId ? meta.fileId : '';
    if (fileId) {
      try {
        const raw = DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
        remote = JSON.parse(raw || '{}');
      } catch (_) {
        remote = {};
      }
    }
    const merged = mergeStudiaState_(incoming && typeof incoming === 'object' ? incoming : {}, remote);
    const json = JSON.stringify(merged || {});
    if (fileId) {
      DriveApp.getFileById(fileId).setContent(json);
    } else {
      const f = filesFolder_().createFile(`state-${userId}.json`, json, MimeType.PLAIN_TEXT);
      fileId = f.getId();
    }
    const updatedAt = Date.now();
    const sh = sheet_(ST.STATE);
    if (meta) sh.getRange(meta.row, 1, 1, 3).setValues([[userId, fileId, updatedAt]]);
    else sh.appendRow([userId, fileId, updatedAt]);
    return { ok:true, data:merged, updatedAt, version:246 };
  } finally {
    lock.releaseLock();
  }
}

function studiaClone_(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function studiaId_(x) { return x && typeof x === 'object' && x.id != null ? String(x.id) : ''; }
function studiaClean_(v) {
  if (Array.isArray(v)) return v.map(studiaClean_);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).forEach(k => { if (k !== '__studiaSyncMeta' && k !== '__studiaUpdatedAt') o[k] = studiaClean_(v[k]); });
    return o;
  }
  return v;
}
function studiaSame_(a,b) { try { return JSON.stringify(studiaClean_(a)) === JSON.stringify(studiaClean_(b)); } catch (_) { return false; } }
function studiaMergeMeta_(a,b) {
  const A=a||{}, B=b||{}, o={version:1,fields:{},tombstones:{}};
  [...new Set([...Object.keys(A.fields||{}),...Object.keys(B.fields||{})])].forEach(k=>o.fields[k]=Math.max(Number((A.fields||{})[k]||0),Number((B.fields||{})[k]||0)));
  [...new Set([...Object.keys(A.tombstones||{}),...Object.keys(B.tombstones||{})])].forEach(n=>{o.tombstones[n]={};const aa=(A.tombstones||{})[n]||{},bb=(B.tombstones||{})[n]||{};[...new Set([...Object.keys(aa),...Object.keys(bb)])].forEach(id=>o.tombstones[n][id]=Math.max(Number(aa[id]||0),Number(bb[id]||0)));});
  return o;
}
function studiaMergePlain_(r,l) {
  if (l == null) return studiaClone_(r);
  if (r == null) return studiaClone_(l);
  if (Array.isArray(l) || Array.isArray(r)) return studiaClone_(l);
  if (typeof l === 'object' && typeof r === 'object') return Object.assign({},studiaClone_(r),studiaClone_(l));
  return studiaClone_(l);
}
function studiaMergeCollection_(name,larr,rarr,meta) {
  const la=Array.isArray(larr)?larr:[], ra=Array.isArray(rarr)?rarr:[];
  const L={},R={}; la.forEach(x=>{const id=studiaId_(x);if(id)L[id]=x}); ra.forEach(x=>{const id=studiaId_(x);if(id)R[id]=x});
  const ids=[...new Set([...la.map(studiaId_),...ra.map(studiaId_)].filter(Boolean))], out=[];
  ids.forEach(id=>{const l=L[id],r=R[id];let v;if(l&&r){const lt=Number(l.__studiaUpdatedAt||l.updatedAt||l.modifiedAt||l.v219LocalSavedAt||0),rt=Number(r.__studiaUpdatedAt||r.updatedAt||r.modifiedAt||r.v219LocalSavedAt||0);v=rt>lt?studiaClone_(r):lt>rt?studiaClone_(l):studiaMergePlain_(r,l);v.__studiaUpdatedAt=Math.max(lt,rt,Number(v.__studiaUpdatedAt||0));}else v=studiaClone_(l||r);const dead=Number((((meta||{}).tombstones||{})[name]||{})[id]||0),vt=Number((v||{}).__studiaUpdatedAt||(v||{}).updatedAt||(v||{}).modifiedAt||(v||{}).v219LocalSavedAt||0);if(!(dead&&dead>=vt)&&v)out.push(v);});
  const seen={};out.forEach(x=>{try{seen[JSON.stringify(studiaClean_(x))]=1}catch(_){}});[...la,...ra].forEach(x=>{if(studiaId_(x))return;let k;try{k=JSON.stringify(studiaClean_(x))}catch(_){k=String(x)}if(!seen[k]){seen[k]=1;out.push(studiaClone_(x))}});
  return out;
}
function mergeStudiaState_(local,remote) {
  local=local&&typeof local==='object'?local:{}; remote=remote&&typeof remote==='object'?remote:{};
  const TRACKED=['homework','tests','writtenTests','grades','flashcards','subjects','absences','studySessions','reminders','flashDecks','quizzes','studySheets'];
  const lm=local.__studiaSyncMeta||{}, rm=remote.__studiaSyncMeta||{}, meta=studiaMergeMeta_(lm,rm), out={};
  const keys=[...new Set([...Object.keys(local),...Object.keys(remote)])].filter(k=>k!=='__studiaSyncMeta');
  keys.forEach(k=>{if(TRACKED.indexOf(k)>=0){out[k]=studiaMergeCollection_(k,local[k],remote[k],meta);return;}const lt=Number((lm.fields||{})[k]||0),rt=Number((rm.fields||{})[k]||0);out[k]=rt>lt?studiaClone_(remote[k]):lt>rt?studiaClone_(local[k]):studiaMergePlain_(remote[k],local[k]);});
  out.__studiaSyncMeta=meta;
  return out;
}
/* ===== /Studia V246 ===== */


/* =========================================
   STUDIA V249 — VERIFIED MULTI-DEVICE SYNC
   ========================================= */

const V249_DEVICE_SHEET = 'SyncDevices';

function v249DecodeField_(body, plainKey, gzipKey) {
  if (body && body[gzipKey]) {
    const bytes = Utilities.base64Decode(String(body[gzipKey]));
    const txt = Utilities.ungzip(Utilities.newBlob(bytes, 'application/gzip', gzipKey + '.gz')).getDataAsString('UTF-8');
    return JSON.parse(txt || '{}');
  }
  const v = body ? body[plainKey] : null;
  if (v && typeof v === 'object') return v;
  if (typeof v === 'string' && v.trim()) return JSON.parse(v);
  return {};
}

function v249Clone_(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function v249Clean_(v) {
  if (Array.isArray(v)) return v.map(v249Clean_);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach(k => {
      if (k === '__studiaSyncMeta' || k === '__studiaUpdatedAt') return;
      o[k] = v249Clean_(v[k]);
    });
    return o;
  }
  return v;
}

function v249Same_(a, b) {
  try { return JSON.stringify(v249Clean_(a)) === JSON.stringify(v249Clean_(b)); }
  catch (_) { return false; }
}

function v249IsObj_(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function v249ItemId_(v) {
  return v249IsObj_(v) && v.id != null ? String(v.id) : '';
}

function v249MergeArray_(local, remote, base) {
  local = Array.isArray(local) ? local : [];
  remote = Array.isArray(remote) ? remote : [];
  base = Array.isArray(base) ? base : [];
  const hasIds = [...local, ...remote, ...base].some(x => v249ItemId_(x));
  if (!hasIds) {
    const out = [];
    const seen = {};
    [...local, ...remote].forEach(x => {
      let k; try { k = JSON.stringify(v249Clean_(x)); } catch (_) { k = String(x); }
      if (!seen[k]) { seen[k] = 1; out.push(v249Clone_(x)); }
    });
    return out;
  }
  const L = {}, R = {}, B = {};
  local.forEach(x => { const id=v249ItemId_(x); if(id) L[id]=x; });
  remote.forEach(x => { const id=v249ItemId_(x); if(id) R[id]=x; });
  base.forEach(x => { const id=v249ItemId_(x); if(id) B[id]=x; });
  const order=[];
  [...local,...remote,...base].forEach(x=>{const id=v249ItemId_(x);if(id&&order.indexOf(id)<0)order.push(id)});
  const out=[];
  order.forEach(id=>{
    const hl=Object.prototype.hasOwnProperty.call(L,id), hr=Object.prototype.hasOwnProperty.call(R,id), hb=Object.prototype.hasOwnProperty.call(B,id);
    const l=L[id], r=R[id], b=B[id];
    if(!hl && hb){
      if(hr && !v249Same_(r,b)) out.push(v249Clone_(r));
      return;
    }
    if(!hr && hb){
      if(hl && !v249Same_(l,b)) out.push(v249Clone_(l));
      return;
    }
    if(hl && hr) out.push(v249Merge3_(l,r,hb?b:undefined));
    else if(hl) out.push(v249Clone_(l));
    else if(hr) out.push(v249Clone_(r));
  });
  const seenNoId={};
  [...local,...remote].forEach(x=>{
    if(v249ItemId_(x))return;
    let k;try{k=JSON.stringify(v249Clean_(x))}catch(_){k=String(x)}
    if(!seenNoId[k]){seenNoId[k]=1;out.push(v249Clone_(x))}
  });
  return out;
}

function v249Merge3_(local, remote, base) {
  if (v249Same_(local, base)) return v249Clone_(remote);
  if (v249Same_(remote, base)) return v249Clone_(local);
  if (v249Same_(local, remote)) return v249Clone_(local);

  if (Array.isArray(local) || Array.isArray(remote) || Array.isArray(base)) {
    return v249MergeArray_(local, remote, base);
  }

  if (v249IsObj_(local) || v249IsObj_(remote) || v249IsObj_(base)) {
    const L=v249IsObj_(local)?local:{}, R=v249IsObj_(remote)?remote:{}, B=v249IsObj_(base)?base:{};
    const out={};
    const keys=[...new Set([...Object.keys(L),...Object.keys(R),...Object.keys(B)])];
    keys.forEach(k=>{
      if(k==='__studiaSyncMeta')return;
      const hl=Object.prototype.hasOwnProperty.call(L,k), hr=Object.prototype.hasOwnProperty.call(R,k), hb=Object.prototype.hasOwnProperty.call(B,k);
      if(!hl && hb){
        if(hr && !v249Same_(R[k],B[k])) out[k]=v249Clone_(R[k]);
        return;
      }
      if(!hr && hb){
        if(hl && !v249Same_(L[k],B[k])) out[k]=v249Clone_(L[k]);
        return;
      }
      if(hl && hr) out[k]=v249Merge3_(L[k],R[k],hb?B[k]:undefined);
      else if(hl) out[k]=v249Clone_(L[k]);
      else if(hr) out[k]=v249Clone_(R[k]);
    });
    return out;
  }

  // Both sides changed the same scalar since base. The device initiating this
  // sync wins for that scalar; arrays/objects above are merged instead.
  return local !== undefined ? v249Clone_(local) : v249Clone_(remote);
}

function v249DeviceSheet_(){
  const ss=spreadsheet_();
  let sh=ss.getSheetByName(V249_DEVICE_SHEET);
  if(!sh){sh=ss.insertSheet(V249_DEVICE_SHEET);sh.appendRow(['userId','deviceId','deviceName','lastSeen']);sh.setFrozenRows(1)}
  return sh;
}

function v249TouchDevice_(userId, deviceId, deviceName){
  deviceId=String(deviceId||'').trim()||('unknown-'+sha256_(String(deviceName||'device')).slice(0,12));
  deviceName=String(deviceName||'Gerät').slice(0,100);
  const sh=v249DeviceSheet_(), rows=rows_(sh), now=Date.now();
  let row=0;
  for(let i=0;i<rows.length;i++) if(String(rows[i][0])===String(userId)&&String(rows[i][1])===deviceId){row=i+2;break}
  if(row) sh.getRange(row,1,1,4).setValues([[String(userId),deviceId,deviceName,now]]);
  else sh.appendRow([String(userId),deviceId,deviceName,now]);
  const fresh=rows_(sh).filter(r=>String(r[0])===String(userId)&&now-Number(r[3]||0)<90*24*60*60*1000);
  return Math.max(1,fresh.length);
}

function v249CloudId_(){
  const sid=String(PropertiesService.getScriptProperties().getProperty('STUDIA_SPREADSHEET_ID')||'');
  return sha256_(sid).slice(0,8).toUpperCase();
}

function syncStateV249_(user, incoming, base, deviceId, deviceName){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1800)) throw appError_('Cloud ist gerade beschäftigt · bitte in wenigen Sekunden erneut synchronisieren.',409);
  try{
    const remoteRec=readFastState_(user.id);
    const merged=v249Merge3_(incoming||{}, remoteRec.data||{}, base||{});
    const updatedAt=Date.now();
    writeFastState_(user.id, merged, updatedAt);
    const deviceCount=v249TouchDevice_(user.id,deviceId,deviceName);
    return {
      ok:true,
      data:merged,
      updatedAt,
      version:249,
      storage:'sheet-fast-v249',
      cloudId:v249CloudId_(),
      deviceCount,
      account:publicUser_(user)
    };
  } finally { lock.releaseLock(); }
}


/* =========================================
   STUDIA V259 — GOOGLE-ONLY DIRECT BRIDGE
   The user opens the Apps Script web app itself.
   It embeds the GitHub UI so GitHub localStorage / IndexedDB remain intact,
   while all cloud calls go through google.script.run (no CORS / JSONP).
   ========================================= */
const V259_APP_URL = 'https://gurkenfurzi.github.io/sp/?studiaGoogle=1&v=259';

function v259AppShell_() {
  const src = V259_APP_URL;
  const safeSrc = JSON.stringify(src).replace(/<\//g, '<\\/');
  const html = '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>Studia</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff8f6}#studiaApp{display:block;width:100%;height:100%;border:0;background:#fff8f6}</style></head><body>'
    + '<iframe id="studiaApp" src='+safeSrc+' allow="clipboard-read; clipboard-write; fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    + '<script>(function(){var app=document.getElementById("studiaApp");'
    + 'function send(m){try{app.contentWindow.postMessage(m,"https://gurkenfurzi.github.io")}catch(e){try{app.contentWindow.postMessage(m,"*")}catch(_){}}}'
    + 'window.addEventListener("message",function(ev){if(ev.source!==app.contentWindow)return;var m=ev.data;if(!m||m.type!=="studia-v259-call"||!m.id)return;'
    + 'google.script.run.withSuccessHandler(function(r){send({type:"studia-v259-response",id:m.id,result:r})}).withFailureHandler(function(er){send({type:"studia-v259-response",id:m.id,error:String(er&&er.message||er||"Google-Sync fehlgeschlagen")})}).v259ClientCall(m.request||{});});'
    + 'app.addEventListener("load",function(){send({type:"studia-v259-ready",version:259})});setTimeout(function(){send({type:"studia-v259-ready",version:259})},500);'
    + '})();<\/script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Studia')
    .setFaviconUrl('https://gurkenfurzi.github.io/sp/assets/icons/favicon.png')
    .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function v259PackResult_(result) {
  const out = Object.assign({}, result || {});
  if (out.data && typeof out.data === 'object') {
    const txt = JSON.stringify(out.data);
    if (txt.length > 12000) {
      const gz = Utilities.gzip(Utilities.newBlob(txt, 'application/json', 'state.json'));
      out.dataGzip = Utilities.base64Encode(gz.getBytes());
      delete out.data;
      out.encoding = 'gzip-base64';
    }
  }
  return out;
}

function v259ClientCall(req) {
  try {
    ensureConfigured_();
    req = req && typeof req === 'object' ? req : {};
    const action = normalizeAction_(req.action || 'health');
    let result;
    switch (action) {
      case 'health':
      case 'ping':
        result = {ok:true, service:'studia-google-account-sync', version:259, transport:'google-script-run-v259', automatic:true};
        break;
      case 'register':
        result = register_(req.username, req.password);
        break;
      case 'login':
        result = login_(req.username, req.password);
        break;
      case 'recover':
        result = recover_(req.username, req.recoveryCode, req.newPassword);
        break;
      case 'logout':
        result = logout_(req.token);
        break;
      case 'me': {
        const user = requireUser_(req.token);
        result = {ok:true, user:publicUser_(user), version:259};
        break;
      }
      case 'sync': {
        const user = requireUser_(req.token);
        const incoming = v249DecodeField_(req, 'data', 'dataGzip');
        const base = v249DecodeField_(req, 'base', 'baseGzip');
        result = syncStateV249_(user, incoming, base, String(req.deviceId || ''), String(req.deviceName || ''));
        result.version = 259;
        result.transport = 'google-script-run-v259';
        break;
      }
      default:
        result = fail_('Unbekannte V259-Aktion: ' + action, 404);
    }
    return v259PackResult_(result);
  } catch (err) {
    return fromError_(err);
  }
}


/* =========================================
   STUDIA V262 — DIRECT GOOGLE HTML HOST WITH EXTERNAL ASSETS
   No nested GitHub iframe. Apps Script fetches the current GitHub HTML server-side
   and serves it as the actual HtmlService page. The page can therefore call
   google.script.run directly while relative assets still resolve to GitHub.
   ========================================= */
const V260_APP_URL = 'https://gurkenfurzi.github.io/sp/?v=262&googleHost=1';
const V260_BASE_URL = 'https://gurkenfurzi.github.io/sp/';

function v260AppDirect_() {
  let html = '';
  try {
    const res = UrlFetchApp.fetch(V260_APP_URL, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Cache-Control': 'no-cache' }
    });
    const code = Number(res.getResponseCode() || 0);
    if (code < 200 || code >= 300) throw new Error('GitHub lieferte HTTP ' + code);
    html = String(res.getContentText() || '');
    if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) throw new Error('Studia-HTML ist unvollständig');
  } catch (err) {
    html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studia</title></head><body style="font-family:Arial,sans-serif;padding:24px;background:#fff8f6;color:#5f514c"><h2>Studia konnte nicht geladen werden</h2><p>Google erreicht die GitHub-App gerade nicht.</p><pre style="white-space:pre-wrap">'+escapeHtmlV260_(String(err && err.message || err))+'</pre></body></html>';
  }
  const baseTag = '<base href="' + V260_BASE_URL + '" target="_top">';
  html = html.replace(/<head([^>]*)>/i, '<head$1><meta name="studia-google-host" content="v262">');
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>' + baseTag);
  else html = html.replace(/<html([^>]*)>/i, '<html$1><head>' + baseTag + '</head>');
  // Avoid an old manifest pointing at the Google origin; assets continue to resolve via <base>.
  html = html.replace(/<link\s+rel=["']manifest["'][^>]*>/ig, '');
  return HtmlService.createHtmlOutput(html)
    .setTitle('Studia')
    .setFaviconUrl('https://gurkenfurzi.github.io/sp/assets/icons/favicon.png')
    .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtmlV260_(s) {
  return String(s || '').replace(/[&<>"']/g, function(ch) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
  });
}

function v260PackResult_(result) {
  const out = Object.assign({}, result || {});
  if (out.data && typeof out.data === 'object') {
    const txt = JSON.stringify(out.data);
    if (txt.length > 12000) {
      const gz = Utilities.gzip(Utilities.newBlob(txt, 'application/json', 'state.json'));
      out.dataGzip = Utilities.base64Encode(gz.getBytes());
      delete out.data;
      out.encoding = 'gzip-base64';
    }
  }
  return out;
}

function v260ClientCall(req) {
  try {
    ensureConfigured_();
    req = req && typeof req === 'object' ? req : {};
    const action = normalizeAction_(req.action || 'health');
    let result;
    switch (action) {
      case 'health':
      case 'ping':
        result = {ok:true, service:'studia-google-account-sync', version:261, transport:'google-script-run-external-assets-v261', automatic:true};
        break;
      case 'register':
        result = register_(req.username, req.password);
        break;
      case 'login':
        result = login_(req.username, req.password);
        break;
      case 'recover':
        result = recover_(req.username, req.recoveryCode, req.newPassword);
        break;
      case 'logout':
        result = logout_(req.token);
        break;
      case 'me': {
        const user = requireUser_(req.token);
        result = {ok:true, user:publicUser_(user), version:261};
        break;
      }
      case 'state': {
        const user = requireUser_(req.token);
        const rec = readFastState_(user.id);
        result = {ok:true, data:rec.data || {}, updatedAt:rec.updatedAt || 0, version:261};
        break;
      }
      case 'sync': {
        const user = requireUser_(req.token);
        const incoming = v249DecodeField_(req, 'data', 'dataGzip');
        const base = v249DecodeField_(req, 'base', 'baseGzip');
        result = syncStateV249_(user, incoming, base, String(req.deviceId || ''), String(req.deviceName || ''));
        result.version = 261;
        result.transport = 'google-script-run-external-assets-v261';
        break;
      }
      default:
        result = fail_('Unbekannte V260-Aktion: ' + action, 404);
    }
    return v260PackResult_(result);
  } catch (err) {
    return fromError_(err);
  }
}


/* =========================================
   STUDIA V263 — HIDDEN GOOGLE BRIDGE
   Visible UI stays on GitHub Pages. This tiny Apps Script page is embedded invisibly
   and only exposes google.script.run through postMessage. No Google chrome is visible.
   ========================================= */
function v263BridgePage_(req) {
  const nonce = String((req && req.nonce) || '');
  const n = JSON.stringify(nonce).replace(/<\//g, '<\\/');
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
    + '<script>(function(){var N='+n+';function send(x){try{window.top.postMessage(x,"*")}catch(e){}}'
    + 'function ready(){send({type:"studia-v263-ready",nonce:N,version:263})}'
    + 'window.addEventListener("message",function(ev){var m=ev.data;if(!m||m.type!=="studia-v263-call"||m.nonce!==N||!m.id)return;'
    + 'google.script.run.withSuccessHandler(function(r){send({type:"studia-v263-response",nonce:N,id:m.id,result:r})})'
    + '.withFailureHandler(function(er){send({type:"studia-v263-response",nonce:N,id:m.id,error:String(er&&er.message||er||"Google-Sync fehlgeschlagen")})})'
    + '.v263ClientCall(m.request||{});});ready();setTimeout(ready,300);setTimeout(ready,1200);})();<\\/script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Studia Sync')
    .addMetaTag('viewport','width=device-width,initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function v263ClientCall(req) {
  try {
    ensureConfigured_();
    req = req && typeof req === 'object' ? req : {};
    const action = normalizeAction_(req.action || 'health');
    let result;
    switch (action) {
      case 'health':
      case 'ping':
        result = {ok:true, service:'studia-google-account-sync', version:263, transport:'hidden-google-bridge-v263', automatic:true, ui:'github'};
        break;
      case 'register':
        result = register_(req.username, req.password);
        break;
      case 'login':
        result = login_(req.username, req.password);
        break;
      case 'recover':
        result = recover_(req.username, req.recoveryCode, req.newPassword);
        break;
      case 'logout':
        result = logout_(req.token);
        break;
      case 'me': {
        const user = requireUser_(req.token);
        result = {ok:true, user:publicUser_(user), version:263};
        break;
      }
      case 'sync': {
        const user = requireUser_(req.token);
        const incoming = v249DecodeField_(req, 'data', 'dataGzip');
        const base = v249DecodeField_(req, 'base', 'baseGzip');
        result = syncStateV249_(user, incoming, base, String(req.deviceId || ''), String(req.deviceName || ''));
        result.version = 263;
        result.transport = 'hidden-google-bridge-v263';
        break;
      }
      default:
        result = fail_('Unbekannte V263-Aktion: ' + action, 404);
    }
    return v259PackResult_(result);
  } catch (err) {
    return fromError_(err);
  }
}


/* =========================================
   STUDIA V264 — GITHUB RELAY TRANSPORT
   GitHub stays the visible app. Apps Script processes the request, then emits
   tiny same-origin GitHub relay iframes. Those relay chunks message the top-level
   GitHub page, avoiding CORS, JSONP and direct Apps-Script postMessage issues.
   ========================================= */
function v264HandleRelay_(body) {
  body = body && typeof body === 'object' ? body : {};
  const action = normalizeAction_(body.relayAction || 'health');
  let result;
  switch (action) {
    case 'health':
    case 'ping':
      result = {ok:true, service:'studia-google-account-sync', version:264, transport:'github-relay-v264', automatic:true, ui:'github'};
      break;
    case 'register':
      result = register_(body.username, body.password);
      break;
    case 'login':
      result = login_(body.username, body.password);
      break;
    case 'recover':
      result = recover_(body.username, body.recoveryCode, body.newPassword);
      break;
    case 'logout':
      result = logout_(body.token);
      break;
    case 'me': {
      const user = requireUser_(body.token);
      result = {ok:true, user:publicUser_(user), version:264};
      break;
    }
    case 'sync': {
      const user = requireUser_(body.token);
      const incoming = v249DecodeField_(body, 'data', 'dataGzip');
      const base = v249DecodeField_(body, 'base', 'baseGzip');
      result = syncStateV249_(user, incoming, base, String(body.deviceId || ''), String(body.deviceName || ''));
      result.version = 264;
      result.transport = 'github-relay-v264';
      break;
    }
    default:
      result = fail_('Unbekannte V264-Aktion: ' + action, 404);
  }
  return result;
}

function v264RelayHtml_(callId, result, gzipReply) {
  const id = String(callId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120);
  let json = JSON.stringify(result || {ok:false,error:'Leere Cloud-Antwort',version:264});
  let bytes, enc = 'raw';
  if (gzipReply) {
    try {
      bytes = Utilities.gzip(Utilities.newBlob(json, 'application/json')).getBytes();
      enc = 'gz';
    } catch (_) { bytes = Utilities.newBlob(json, 'application/json').getBytes(); }
  } else {
    bytes = Utilities.newBlob(json, 'application/json').getBytes();
  }
  const b64 = Utilities.base64EncodeWebSafe(bytes);
  const size = 5200;
  const parts = [];
  for (let i=0;i<b64.length;i+=size) parts.push(b64.slice(i,i+size));
  if (!parts.length) parts.push('');
  const total = parts.length;
  const base = 'https://gurkenfurzi.github.io/sp/sync-bridge.html#';
  let frames = '';
  for (let i=0;i<total;i++) {
    const src = base + id + '|' + i + '|' + total + '|' + enc + '|' + parts[i];
    frames += '<iframe aria-hidden="true" tabindex="-1" style="position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none" src="' + src + '"></iframe>';
  }
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"></head><body>'
    + frames
    + '<script>setTimeout(function(){try{document.body.dataset.done="1"}catch(e){}},1500)<\/script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Studia Sync')
    .addMetaTag('viewport','width=device-width,initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/* ===== Studia V265 — same-iframe form bounce for Safari/PWA ===== */
const V265_BRIDGE_URL = 'https://gurkenfurzi.github.io/sp/sync-bridge.html';
const V265_TRANSPORT_CHUNK = 4500;
function v265B64UrlJson_(obj){const bytes=Utilities.newBlob(JSON.stringify(obj||{}),'application/json').getBytes();return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g,'')}
function v265BounceHtml_(callId,result){const id=String(callId||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,120),payload=v265B64UrlJson_(result||{ok:false,error:'Leere Google-Antwort',version:265}),action=V265_BRIDGE_URL+'#'+id+'|'+payload,safe=action.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const html='<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"></head><body><form id="studiaBounce" method="get" target="_self" action="'+safe+'"><input type="hidden" name="v" value="265"><input type="hidden" name="c" value="'+id+'"></form><script>document.getElementById("studiaBounce").submit();<\/script></body></html>';return HtmlService.createHtmlOutput(html).setTitle('Studia Sync').addMetaTag('viewport','width=device-width,initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)}
function v265FastMeta_(userId){const sh=fastStateSheet_(),row=fastStateRow_(sh,userId);if(!row)return{updatedAt:0,storageCells:0,transportChunks:0};const meta=sh.getRange(row,1,1,3).getValues()[0],cells=Math.max(0,Number(meta[2]||0));if(!cells)return{updatedAt:Number(meta[1]||0),storageCells:0,transportChunks:0};const last=String(sh.getRange(row,3+cells).getDisplayValue()||''),perCell=Math.ceil(V247_CHUNK/V265_TRANSPORT_CHUNK),transportChunks=Math.max(0,(cells-1)*perCell+Math.ceil(last.length/V265_TRANSPORT_CHUNK));return{updatedAt:Number(meta[1]||0),storageCells:cells,transportChunks}}
function v265FastChunk_(userId,index,expectedUpdatedAt){const sh=fastStateSheet_(),row=fastStateRow_(sh,userId);if(!row)return{ok:true,version:265,updatedAt:0,index,chunk:'',transportChunks:0};const meta=sh.getRange(row,1,1,3).getValues()[0],updatedAt=Number(meta[1]||0),cells=Math.max(0,Number(meta[2]||0));if(expectedUpdatedAt&&updatedAt!==Number(expectedUpdatedAt))throw appError_('Cloud wurde während des Ladens geändert.',409);const perCell=Math.ceil(V247_CHUNK/V265_TRANSPORT_CHUNK),cellIndex=Math.floor(index/perCell),pieceIndex=index%perCell;if(cellIndex<0||cellIndex>=cells)throw appError_('Cloud-Block außerhalb des Bereichs.',400);const cell=String(sh.getRange(row,4+cellIndex).getDisplayValue()||''),start=pieceIndex*V265_TRANSPORT_CHUNK,chunk=cell.slice(start,start+V265_TRANSPORT_CHUNK),fm=v265FastMeta_(userId);return{ok:true,version:265,updatedAt,index,chunk,transportChunks:fm.transportChunks}}
function v265HandleBounce_(body){body=body&&typeof body==='object'?body:{};const action=normalizeAction_(body.bounceAction||'health');let user,result;switch(action){case'health':case'ping':return{ok:true,service:'studia-google-account-sync',version:265,transport:'form-bounce-v265',automatic:true,ui:'github'};case'register':result=register_(body.username,body.password);result.version=265;return result;case'login':result=login_(body.username,body.password);result.version=265;return result;case'recover':result=recover_(body.username,body.recoveryCode,body.newPassword);result.version=265;return result;case'logout':result=logout_(body.token);result.version=265;return result;case'me':user=requireUser_(body.token);return{ok:true,user:publicUser_(user),version:265};case'meta':{user=requireUser_(body.token);const m=v265FastMeta_(user.id),deviceCount=v249TouchDevice_(user.id,String(body.deviceId||''),String(body.deviceName||''));return{ok:true,version:265,updatedAt:m.updatedAt,deviceCount,cloudId:v249CloudId_(),account:publicUser_(user)}}case'sync_push':{user=requireUser_(body.token);const incoming=v249DecodeField_(body,'data','dataGzip'),base=v249DecodeField_(body,'base','baseGzip'),merged=syncStateV249_(user,incoming,base,String(body.deviceId||''),String(body.deviceName||'')),m=v265FastMeta_(user.id);return{ok:true,version:265,updatedAt:m.updatedAt,transportChunks:m.transportChunks,storageCells:m.storageCells,deviceCount:merged.deviceCount,cloudId:merged.cloudId,account:merged.account}}case'pull_meta':{user=requireUser_(body.token);const m=v265FastMeta_(user.id);return{ok:true,version:265,updatedAt:m.updatedAt,transportChunks:m.transportChunks,storageCells:m.storageCells,cloudId:v249CloudId_(),account:publicUser_(user)}}case'pull_chunk':user=requireUser_(body.token);return v265FastChunk_(user.id,Math.max(0,Number(body.index||0)),Number(body.expectedUpdatedAt||0));default:throw appError_('Unbekannte V265-Aktion: '+action,404)}}
