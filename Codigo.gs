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
    var table = actionTable_(action);
    if (!table) throw new Error('Accion no soportada: ' + action);
    if (['events', 'recipes', 'documents', 'members', 'settings', 'notifications'].indexOf(action) >= 0) return json_({ ok: true, data: rows_(table, familyId), error: null });
    if (action === 'eventDelete' || action === 'documentDelete') {
      var deleteId = String(input.entityId || input.eventId || input.documentId || '');
      return json_({ ok: true, data: upsert_(table, { [IDS[table]]: deleteId, familyId: familyId, deletedAt: now_(), updatedAt: now_() }), error: null });
    }
    if (action === 'notificationRead') return json_({ ok: true, data: upsert_('notificaciones_lecturas', input.data || input), error: null });
    if (action === 'settingsUpdate') table = 'ajustes_familia';
    var data = input.data || input;
    data.familyId = familyId;
    return json_({ ok: true, data: upsert_(table, data), error: null });
  } catch (error) {
    return json_({ ok: false, data: null, error: String(error.message || error) });
  }
}

function actionTable_(action) {
  var map = { events: 'eventos', eventUpsert: 'eventos', eventDelete: 'eventos', recipes: 'recetas', recipeUpsert: 'recetas', documents: 'documentos', documentCreate: 'documentos', documentDelete: 'documentos', members: 'miembros', memberUpsert: 'miembros', settings: 'ajustes_familia', settingsUpdate: 'ajustes_familia', notifications: 'notificaciones', pushSubscribe: 'dispositivos_push', pushUnsubscribe: 'dispositivos_push', pushTest: 'notificaciones' };
  return map[action] || null;
}

function sheet_(table) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TABLES[table]);
  if (!sheet) throw new Error('Hoja inexistente: ' + table);
  return sheet;
}

function headers_(sheet) { return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); }

function rows_(table, familyId) {
  var sheet = sheet_(table);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values.shift().map(String);
  return values.filter(function(row) {
    return !familyId || String(row[headers.indexOf('familyId')]) === String(familyId);
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
    eventos: ['reminderEnabled', 'reminderMinutesBefore', 'repeatFrequency']
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
  return 'Esquema actualizado';
}

function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm:ssXXX"); }

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
