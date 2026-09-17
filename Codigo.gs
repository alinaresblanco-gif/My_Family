const SPREADSHEET_ID = '1i9Pk9QOTIPtcMnNm47zZ7CFGaYDm8YiyDivM3GfjOlo';
const DEFAULT_FAMILY_ID = 'family-my-family';
const TABLES = { familias:'familias', miembros:'miembros', eventos:'eventos', recetas:'recetas', documentos:'documentos', notificaciones:'notificaciones', notificaciones_lecturas:'notificaciones_lecturas', dispositivos_push:'dispositivos_push', envios_push:'envios_push', ajustes_familia:'ajustes_familia', sincronizaciones:'sincronizaciones' };
const IDS = { familias:'familyId', miembros:'memberId', eventos:'eventId', recetas:'recipeId', documentos:'documentId', notificaciones:'notificationId', notificaciones_lecturas:'notificationId', dispositivos_push:'deviceId', envios_push:'pushDeliveryId', ajustes_familia:'familyId', sincronizaciones:'syncId' };

function doGet(e) { return handle_(e && e.parameter ? e.parameter.action : 'bootstrap', e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (error) { return json_({ ok: false, data: null, error: 'JSON invalido' }); }
  return handle_(body.action || (e.parameter && e.parameter.action), body);
}

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function handle_(action, input) {
  try {
    var familyId = String(input.familyId || DEFAULT_FAMILY_ID);
    ensureSchema_();
    ensureFamily_(familyId);
    if (action === 'bootstrap') return json_({ ok: true, data: { family: rows_('familias', familyId)[0] || null, members: rows_('miembros', familyId), events: rows_('eventos', familyId), settings: rows_('ajustes_familia', familyId)[0] || null, recipes: rows_('recetas', familyId), documents: rows_('documentos', familyId), notifications: rows_('notificaciones', familyId) }, error: null });
    if (action === 'pushSubscribe') {
      var subscription = input.data || input;
      if (!subscription.deviceId || !subscription.fcmToken) throw new Error('Faltan deviceId o fcmToken');
      subscription.familyId = familyId;
      subscription.active = true;
      return json_({ ok: true, data: upsert_('dispositivos_push', subscription), error: null });
    }
    if (action === 'pushUnsubscribe') {
      var unsubscription = input.data || input;
      unsubscription.familyId = familyId;
      unsubscription.active = false;
      return json_({ ok: true, data: upsert_('dispositivos_push', unsubscription), error: null });
    }
    if (action === 'pushTest') {
      verifyPushApiKey_(input.apiKey);
      return json_({ ok: true, data: sendPushToFamily_(familyId, input.title || 'Prueba de My Family', input.message || 'Las notificaciones push funcionan correctamente.', input.url || './', 'system'), error: null });
    }
    var table = actionTable_(action);
    if (!table) throw new Error('Accion no soportada: ' + action);
    if (['events', 'recipes', 'documents', 'members', 'settings', 'notifications'].indexOf(action) >= 0) return json_({ ok: true, data: rows_(table, familyId), error: null });
    if (action === 'eventDelete' || action === 'documentDelete' || action === 'recipeDelete') {
      var deleteId = String(input.entityId || input.eventId || input.documentId || input.recipeId || '');
      deleteRow_(table, deleteId);
      return json_({ ok: true, data: { deleted: true, id: deleteId }, error: null });
    }
    if (action === 'notificationRead') return json_({ ok: true, data: upsert_('notificaciones_lecturas', input.data || input), error: null });
    if (action === 'settingsUpdate') table = 'ajustes_familia';
    var data = input.data || input;
    data.familyId = familyId;
    var wasExisting = exists_(table, data[IDS[table]]);
    if (action === 'documentCreate' && data.fileData) {
      var driveResult = saveFileToDrive_(data.name, data.mimeType, data.fileData);
      delete data.fileData;
      if (driveResult.error) {
        throw new Error('Error al guardar en Google Drive: ' + driveResult.error + '. Para solucionarlo, ejecuta testDrive() en el editor de Apps Script para autorizar el acceso.');
      }
      if (driveResult.driveUrl) {
        data.driveUrl = driveResult.driveUrl;
        data.driveFileId = driveResult.driveFileId;
      }
    }
    if (action === 'recipeUpsert' && data.imageData) {
      var imageMimeMatch = String(data.imageData).match(/^data:([^;]+);/);
      var imageMime = imageMimeMatch ? imageMimeMatch[1] : 'image/jpeg';
      var imageExtension = imageMime.split('/')[1] || 'jpg';
      var recipeDriveResult = saveFileToDrive_((data.name || 'receta') + '.' + imageExtension, imageMime, data.imageData);
      delete data.imageData;
      if (recipeDriveResult.error) throw new Error('Error al guardar la imagen de la receta en Google Drive: ' + recipeDriveResult.error);
      if (recipeDriveResult.driveUrl) {
        data.coverUrl = recipeDriveResult.driveUrl;
        data.coverFileId = recipeDriveResult.driveFileId;
      }
    }
    var saved = upsert_(table, data);
    if (action === 'eventUpsert') syncEventReminder_(saved);
    if (action === 'recipeUpsert' && !wasExisting) sendEntityPush_(saved, 'recipe');
    if (action === 'documentCreate') sendEntityPush_(saved, 'document');
    return json_({ ok: true, data: saved, error: null });
  } catch (error) {
    return json_({ ok: false, data: null, error: String(error.message || error) });
  }
}

function actionTable_(action) {
  var map = { events: 'eventos', eventUpsert: 'eventos', eventDelete: 'eventos', recipes: 'recetas', recipeUpsert: 'recetas', recipeDelete: 'recetas', documents: 'documentos', documentCreate: 'documentos', documentDelete: 'documentos', members: 'miembros', memberUpsert: 'miembros', settings: 'ajustes_familia', settingsUpdate: 'ajustes_familia', notifications: 'notificaciones' };
  return map[action] || null;
}

function sheet_(table) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TABLES[table]);
  if (!sheet) throw new Error('Hoja inexistente: ' + table);
  return sheet;
}

function headers_(sheet) { return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); }

function exists_(table, id) {
  if (!id) return false;
  var sheet = sheet_(table);
  var headers = headers_(sheet);
  var values = sheet.getDataRange().getValues();
  var idIndex = headers.indexOf(IDS[table]);
  for (var i = 1; i < values.length; i++) if (String(values[i][idIndex]) === String(id)) return true;
  return false;
}

function deleteRow_(table, id) {
  if (!id) return false;
  var sheet = sheet_(table);
  var headers = headers_(sheet);
  var idField = IDS[table];
  var values = sheet.getDataRange().getValues();
  var idIndex = headers.indexOf(idField);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      var driveFileIdIndex = headers.indexOf('driveFileId');
      if (driveFileIdIndex >= 0 && values[i][driveFileIdIndex]) {
        try {
          var driveFileId = String(values[i][driveFileIdIndex]);
          if (driveFileId) DriveApp.getFileById(driveFileId).setTrashed(true);
        } catch (e) {}
      }
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function cleanDeletedRows() {
  Object.keys(TABLES).forEach(function(tableKey) {
    var table = TABLES[tableKey];
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(table);
    if (!sheet) return;
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return;
    var headers = values[0].map(String);
    var deletedIndex = headers.indexOf('deletedAt');
    var driveFileIdIndex = headers.indexOf('driveFileId');
    if (deletedIndex < 0) return;
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][deletedIndex]) {
        if (driveFileIdIndex >= 0 && values[i][driveFileIdIndex]) {
          try {
            DriveApp.getFileById(String(values[i][driveFileIdIndex])).setTrashed(true);
          } catch (e) {}
        }
        sheet.deleteRow(i + 1);
      }
    }
  });
  return 'Filas eliminadas limpiadas';
}

function rows_(table, familyId) {
  var sheet = sheet_(table);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values.shift().map(String);
  var familyIndex = headers.indexOf('familyId');
  var deletedIndex = headers.indexOf('deletedAt');
  return values.filter(function(row) {
    var matchFamily = !familyId || String(row[familyIndex]) === String(familyId);
    var notDeleted = deletedIndex < 0 || !row[deletedIndex];
    return matchFamily && notDeleted;
  }).map(function(row) {
    var item = {};
    headers.forEach(function(header, index) { item[header] = format_(header, row[index]); });
    return item;
  });
}

function format_(header, value) {
  if (!(value instanceof Date)) return value;
  var zone = Session.getScriptTimeZone() || 'Europe/Madrid';
  if (/Date$/.test(header)) return Utilities.formatDate(value, zone, 'yyyy-MM-dd');
  if (header === 'eventTime') return Utilities.formatDate(value, zone, 'HH:mm');
  return Utilities.formatDate(value, zone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function upsert_(table, data) {
  var sheet = sheet_(table);
  var headers = headers_(sheet);
  var idField = IDS[table];
  var id = String(data[idField] || Utilities.getUuid());
  var values = sheet.getDataRange().getValues();
  var idIndex = headers.indexOf(idField);
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) if (String(values[i][idIndex]) === id) { rowIndex = i + 1; break; }
  var row = rowIndex > 0 ? values[rowIndex - 1] : headers.map(function() { return ''; });
  data[idField] = id;
  if (headers.indexOf('createdAt') >= 0 && !data.createdAt) data.createdAt = now_();
  if (headers.indexOf('updatedAt') >= 0) data.updatedAt = now_();
  headers.forEach(function(header, index) { if (Object.prototype.hasOwnProperty.call(data, header)) row[index] = data[header]; });
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  else sheet.appendRow(row);
  return data;
}

function ensureSchema_() {
  var requiredColumns = {
    eventos: ['endDate', 'reminderEnabled', 'reminderMinutesBefore', 'repeatFrequency'],
    miembros: ['email', 'calendarEnabled'],
    dispositivos_push: ['fcmToken']
  };
  Object.keys(requiredColumns).forEach(function(table) {
    var sheet = sheet_(table);
    var headers = headers_(sheet);
    requiredColumns[table].forEach(function(column) {
      if (headers.indexOf(column) < 0) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(column);
    });
  });
}

function migrateSchema() {
  ensureSchema_();
  cleanDeletedRows();
  return 'Esquema actualizado y filas eliminadas limpiadas';
}

function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm:ssXXX"); }

function verifyPushApiKey_(apiKey) {
  var expected = PropertiesService.getScriptProperties().getProperty('PUSH_API_KEY');
  if (!expected || String(apiKey || '') !== expected) throw new Error('No autorizado para enviar notificaciones');
}

function base64Url_(value) {
  var bytes = typeof value === 'string' ? Utilities.newBlob(value).getBytes() : value;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function getFirebaseAccessToken_() {
  var cache = CacheService.getScriptCache();
  var cachedToken = cache.get('firebase-access-token');
  if (cachedToken) return cachedToken;
  var properties = PropertiesService.getScriptProperties();
  var clientEmail = properties.getProperty('FIREBASE_CLIENT_EMAIL');
  var privateKey = properties.getProperty('FIREBASE_PRIVATE_KEY');
  if (!clientEmail || !privateKey) throw new Error('Faltan FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en Script Properties');
  privateKey = privateKey.replace(/\\n/g, '\n');
  var issuedAt = Math.floor(Date.now() / 1000);
  var header = base64Url_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claim = base64Url_(JSON.stringify({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: issuedAt, exp: issuedAt + 3600 }));
  var unsignedJwt = header + '.' + claim;
  var signature = base64Url_(Utilities.computeRsaSha256Signature(unsignedJwt, privateKey));
  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsignedJwt + '.' + signature },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Firebase OAuth: ' + response.getContentText());
  var accessToken = JSON.parse(response.getContentText()).access_token;
  cache.put('firebase-access-token', accessToken, 3300);
  return accessToken;
}

function sendFcm_(token, notification) {
  var projectId = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  if (!projectId) throw new Error('Falta FIREBASE_PROJECT_ID en Script Properties');
  var response = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/messages:send', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirebaseAccessToken_() },
    payload: JSON.stringify({ message: { token: token, data: { title: String(notification.title), body: String(notification.message), url: String(notification.url || './'), notificationId: String(notification.notificationId), icon: './imagenes/logo-myfamily-trans-ok.png' }, webpush: { headers: { Urgency: 'high' } } } }),
    muteHttpExceptions: true
  });
  return { code: response.getResponseCode(), body: response.getContentText() };
}

function sendNotification_(notification) {
  var devices = rows_('dispositivos_push', notification.familyId).filter(function(device) { return (device.active === true || String(device.active).toUpperCase() === 'TRUE') && device.fcmToken; });
  var result = { notificationId: notification.notificationId, devices: devices.length, sent: 0, failed: 0 };
  devices.forEach(function(device) {
    var delivery = { notificationId: notification.notificationId, deviceId: device.deviceId, status: 'queued', attempts: 1, queuedAt: now_(), updatedAt: now_() };
    try {
      var response = sendFcm_(device.fcmToken, notification);
      if (response.code >= 200 && response.code < 300) {
        delivery.status = 'sent';
        delivery.sentAt = now_();
        result.sent++;
      } else {
        delivery.status = /UNREGISTERED|registration-token-not-registered/.test(response.body) ? 'invalid_subscription' : 'failed';
        delivery.lastError = response.body.slice(0, 500);
        result.failed++;
        if (delivery.status === 'invalid_subscription') upsert_('dispositivos_push', { deviceId: device.deviceId, familyId: device.familyId, active: false, updatedAt: now_() });
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.lastError = String(error.message || error).slice(0, 500);
      result.failed++;
    }
    upsert_('envios_push', delivery);
  });
  if (result.sent > 0) upsert_('notificaciones', { notificationId: notification.notificationId, familyId: notification.familyId, sentAt: now_(), updatedAt: now_() });
  return result;
}

function testDrive() {
  var folderName = 'My_Family_Documentos';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  return 'Permiso de Google Drive OK. ID de carpeta: ' + folder.getId();
}

function saveFileToDrive_(fileName, mimeType, base64Content) {
  try {
    if (!base64Content) return { driveFileId: '', driveUrl: '', error: 'Sin contenido de archivo' };
    var folderName = 'My_Family_Documentos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    var base64Data = String(base64Content);
    if (base64Data.indexOf(',') >= 0) {
      base64Data = base64Data.split(',')[1];
    }
    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName || 'documento');
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    var fileId = file.getId();
    var fileUrl = file.getUrl();

    return {
      driveFileId: fileId,
      driveUrl: fileUrl,
      error: null
    };
  } catch (error) {
    return { driveFileId: '', driveUrl: '', error: String(error.message || error) };
  }
}

function sendPushToFamily_(familyId, title, message, url, type) {
  var notification = upsert_('notificaciones', { familyId: familyId, type: type || 'system', title: title, message: message, scheduledAt: now_(), createdAt: now_(), updatedAt: now_() });
  notification.url = url || './';
  return sendNotification_(notification);
}

function entityNotification_(entity, entityType) {
  var isRecipe = entityType === 'recipe';
  var idField = isRecipe ? 'recipeId' : 'documentId';
  var notificationId = entityType + '-created-' + entity[idField];
  var title = isRecipe ? '🍲 Nueva receta: ' + entity.name : '📄 Nuevo documento: ' + entity.name;
  var detail = isRecipe ? (entity.category || 'Receta familiar') : (entity.category || 'Documento familiar');
  return { notificationId: notificationId, title: title, message: detail, idField: idField };
}

function sendEntityPush_(entity, entityType) {
  var data = entityNotification_(entity, entityType);
  var existing = rows_('notificaciones', entity.familyId).filter(function(notification) { return String(notification.notificationId) === data.notificationId; })[0];
  if (existing && existing.sentAt) return existing;
  var notification = upsert_('notificaciones', { notificationId: data.notificationId, familyId: entity.familyId, type: entityType, title: data.title, message: data.message, entityType: entityType, entityId: entity[data.idField], scheduledAt: now_(), createdAt: now_(), updatedAt: now_() });
  notification.url = entity.driveUrl || './';
  return sendNotification_(notification);
}

function sendMissingDocumentNotifications() {
  return rows_('documentos').filter(function(document) {
    var data = entityNotification_(document, 'document');
    return !rows_('notificaciones', document.familyId).some(function(notification) { return String(notification.notificationId) === data.notificationId; });
  }).map(function(document) { return sendEntityPush_(document, 'document'); });
}

function sendTestPush() {
  return sendPushToFamily_(DEFAULT_FAMILY_ID, 'Prueba de My Family', 'Las notificaciones push funcionan correctamente.', './', 'system');
}

function parseEventDate_(value) {
  var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  match = String(value || '').match(/^(\d{2})-(\d{2})-(\d{4})/);
  return match ? { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) } : null;
}

function parseEventTime_(value) {
  var text = String(value || '');
  var match = text.match(/T(\d{2}):(\d{2})/) || text.match(/^(\d{1,2}):(\d{2})/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

function dateKey_(date, zone) { return Utilities.formatDate(date, zone, 'yyyy-MM-dd'); }

function eventOccursOn_(event, candidate, zone) {
  var startParts = parseEventDate_(event.eventDate);
  if (!startParts) return false;
  var start = Utilities.parseDate(startParts.year + '-' + ('0' + startParts.month).slice(-2) + '-' + ('0' + startParts.day).slice(-2) + ' 12:00', zone, 'yyyy-MM-dd HH:mm');
  if (candidate.getTime() < start.getTime()) return false;
  var frequency = String(event.repeatFrequency || 'none');
  var days = Math.round((candidate.getTime() - start.getTime()) / 86400000);
  if (frequency === 'daily') return true;
  if (frequency === 'weekly') return days % 7 === 0;
  if (frequency === 'monthly') {
    var lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    return candidate.getDate() === Math.min(startParts.day, lastDay);
  }
  if (frequency === 'yearly') return candidate.getMonth() + 1 === startParts.month && candidate.getDate() === startParts.day;
  return days === 0;
}

function nextEventOccurrence_(event, currentTime) {
  var zone = Session.getScriptTimeZone() || 'Europe/Madrid';
  var time = parseEventTime_(event.eventTime);
  if (!time) return null;
  var todayText = Utilities.formatDate(currentTime, zone, 'yyyy-MM-dd');
  var today = Utilities.parseDate(todayText + ' 12:00', zone, 'yyyy-MM-dd HH:mm');
  for (var offset = 0; offset <= 370; offset++) {
    var candidate = new Date(today.getTime() + offset * 86400000);
    if (!eventOccursOn_(event, candidate, zone)) continue;
    var occurrenceDate = dateKey_(candidate, zone);
    var eventAt = Utilities.parseDate(occurrenceDate + ' ' + ('0' + time.hour).slice(-2) + ':' + ('0' + time.minute).slice(-2), zone, 'yyyy-MM-dd HH:mm');
    if (eventAt.getTime() >= currentTime.getTime()) return { date: occurrenceDate, eventAt: eventAt };
  }
  return null;
}

function expirePendingEventReminders_(event, keepNotificationId) {
  rows_('notificaciones', event.familyId).filter(function(notification) {
    return notification.entityType === 'event' && String(notification.entityId) === String(event.eventId) && !notification.sentAt && notification.notificationId !== keepNotificationId;
  }).forEach(function(notification) {
    upsert_('notificaciones', { notificationId: notification.notificationId, familyId: event.familyId, expiresAt: now_(), updatedAt: now_() });
  });
}

function slug_(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function eventMemberName_(event) {
  var memberId = String(event.memberId || '');
  if (!memberId) return '';
  var members = rows_('miembros', event.familyId);
  var member = members.filter(function(item) {
    return String(item.memberId) === memberId || slug_(item.name) === slug_(memberId);
  })[0];
  return member ? String(member.name || '').trim() : memberId;
}

function eventCategoryLabel_(category) {
  return String(category || 'Evento').replace(/^\s+|\s+$/g, '');
}

function reminderWhenLabel_(eventAt, referenceTime, zone) {
  var eventDate = Utilities.formatDate(eventAt, zone, 'yyyy-MM-dd');
  var today = Utilities.formatDate(referenceTime, zone, 'yyyy-MM-dd');
  var tomorrowDate = new Date(referenceTime.getTime() + 86400000);
  var tomorrow = Utilities.formatDate(tomorrowDate, zone, 'yyyy-MM-dd');
  var time = Utilities.formatDate(eventAt, zone, 'HH:mm');
  if (eventDate === today) return 'Hoy a las ' + time;
  if (eventDate === tomorrow) return 'Mañana a las ' + time;
  return 'El ' + Utilities.formatDate(eventAt, zone, 'dd-MM-yyyy') + ' a las ' + time;
}

function eventReminderText_(event, occurrence, currentTime) {
  var zone = Session.getScriptTimeZone() || 'Europe/Madrid';
  var details = [reminderWhenLabel_(occurrence.eventAt, currentTime, zone)];
  if (event.place) details.push(String(event.place).trim());
  var memberName = eventMemberName_(event);
  if (memberName) details.push('Para ' + memberName);
  return {
    title: eventCategoryLabel_(event.category) + ': ' + event.name,
    message: details.join(' · ')
  };
}

function syncEventReminder_(event, currentTime) {
  currentTime = currentTime || new Date();
  var enabled = event.reminderEnabled === true || String(event.reminderEnabled).toUpperCase() === 'TRUE';
  if (!enabled || String(event.status) !== 'pending' || event.deletedAt) {
    expirePendingEventReminders_(event, '');
    return null;
  }
  var occurrence = nextEventOccurrence_(event, currentTime);
  if (!occurrence) {
    expirePendingEventReminders_(event, '');
    return null;
  }
  var notificationId = 'event-reminder-' + event.eventId + '-' + occurrence.date;
  expirePendingEventReminders_(event, notificationId);
  var existing = rows_('notificaciones', event.familyId).filter(function(notification) { return String(notification.notificationId) === notificationId; })[0];
  if (existing && existing.sentAt) return existing;
  var minutesBefore = Math.max(0, Number(event.reminderMinutesBefore) || 0);
  var scheduledAt = new Date(occurrence.eventAt.getTime() - minutesBefore * 60000);
  var reminderText = eventReminderText_(event, occurrence, currentTime);
  return upsert_('notificaciones', {
    notificationId: notificationId,
    familyId: event.familyId,
    memberId: event.memberId || '',
    type: 'event',
    title: reminderText.title,
    message: reminderText.message,
    entityType: 'event',
    entityId: event.eventId,
    scheduledAt: Utilities.formatDate(scheduledAt, Session.getScriptTimeZone() || 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    sentAt: '',
    updatedAt: now_()
  });
}

function syncEventReminders_() {
  var currentTime = new Date();
  return rows_('eventos').map(function(event) { return syncEventReminder_(event, currentTime); }).filter(Boolean);
}

function processScheduledNotifications() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return [];
  try {
    syncEventReminders_();
    return sendDueNotifications_();
  } finally {
    lock.releaseLock();
  }
}

function sendDueNotifications_() {
  var currentTime = Date.now();
  return rows_('notificaciones').filter(function(notification) {
    var active = !notification.expiresAt || new Date(notification.expiresAt).getTime() > currentTime;
    return active && notification.scheduledAt && !notification.sentAt && new Date(notification.scheduledAt).getTime() <= currentTime;
  }).map(sendNotification_);
}

function installNotificationTrigger() {
  ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === 'processScheduledNotifications';
  }).forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('processScheduledNotifications').timeBased().everyMinutes(1).create();
  return 'Activador de notificaciones instalado cada minuto';
}

function ensureFamily_(familyId) {
  var existing = rows_('familias', familyId);
  if (existing.length) return;
  upsert_('familias', { familyId: familyId, name: 'My Family', avatar: '🏡', timezone: 'Europe/Madrid', locale: 'es-ES', storageCapacityBytes: 104857600, storageUsedBytes: 0, syncEnabled: true });
}

function testApi() { return handle_('bootstrap', { familyId: DEFAULT_FAMILY_ID }); }

function clearDataNow() {
  Object.keys(TABLES).forEach(function(table) {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TABLES[table]);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  });
}
