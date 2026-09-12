const FALLBACK_APP_VERSION = '2026.09.09.2';
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwGPK6njz5Y831B-ABIYpYbgyTiXgylXqa4aRvmS9Kw96vW0nB_mYtA3g4yvCPnxlLn/exec';
const FAMILY_ID = 'family-my-family';
let currentAppVersion = null;
const defaultEvents = [];
const savedEvents = localStorage.getItem('my-family-events');
const events = savedEvents ? JSON.parse(savedEvents) : defaultEvents;
const today = new Date();
const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
events.forEach(event => { if (!event.date) event.date = todayKey; });
const memberNames = { antonio: 'Antonio', yayes: 'Yayes', ramsses: 'Ramssés', rosa: 'Rosa' };
const memberColorClasses = { antonio: 'papa', yayes: 'mama', ramsses: 'diego', rosa: 'lucia' };
const grid = document.querySelector('#sticky-grid');
const modal = document.querySelector('#event-modal');
const nextEventButton = document.querySelector('#next-event-button');
const nextEventModal = document.querySelector('#next-event-modal');
const dayEventsModal = document.querySelector('#day-events-modal');
const dayEventsList = document.querySelector('#day-events-list');
let remoteSyncInProgress = false;
const eventForm = document.querySelector('.event-form');
const notificationsModal = document.querySelector('#notifications-modal');
const notificationList = document.querySelector('#notification-list');
const updateModal = document.querySelector('#update-modal');
const defaultNotifications = [];
const savedNotifications = localStorage.getItem('my-family-notifications');
const notifications = savedNotifications ? JSON.parse(savedNotifications) : defaultNotifications;
const savedSettings = JSON.parse(localStorage.getItem('my-family-settings') || '{}');
const settings = { notifications: savedSettings.notifications !== false, sync: savedSettings.sync !== false, eventReminders: savedSettings.eventReminders !== false, documentReminders: savedSettings.documentReminders !== false, defaultView: savedSettings.defaultView || 'month', timeFormat: savedSettings.timeFormat || '24', appearance: savedSettings.appearance || 'light', familyName: savedSettings.familyName || 'My Family', familyAvatar: savedSettings.familyAvatar || '🏡', pinEnabled: savedSettings.pinEnabled === true };
const recipeModal = document.querySelector('#recipe-modal');
const recipeForm = document.querySelector('#recipe-form');
const recipeImagePreview = document.querySelector('#recipe-image-preview');
const recipeImageInputs = document.querySelectorAll('#recipe-gallery, #recipe-camera');
const savedRecipes = localStorage.getItem('my-family-recipes');
const recipes = savedRecipes ? JSON.parse(savedRecipes) : [];
const documentModal = document.querySelector('#document-modal');
const documentForm = document.querySelector('#document-form');
const documentFile = document.querySelector('#document-file');
const savedDocuments = localStorage.getItem('my-family-documents');
const documents = savedDocuments ? JSON.parse(savedDocuments) : [];
const DOCUMENT_CAPACITY_BYTES = 100 * 1024 * 1024;
const defaultMembers = [];
const savedMembers = localStorage.getItem('my-family-members');
const members = savedMembers ? JSON.parse(savedMembers) : defaultMembers;
members.forEach(member => { if (!member.key) member.key = member.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'); });
const builtInRecipes = [];

function apiRequest(action, data = {}) {
  if (!settings.sync || !SHEETS_API_URL) return Promise.resolve(null);
  return fetch(SHEETS_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, familyId: FAMILY_ID, ...data }) })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);
}
function eventPayload(event) { return { eventId: String(event.id), familyId: FAMILY_ID, memberId: event.member || '', name: event.name || '', eventDate: event.date || todayKey, eventTime: event.time || '', place: event.place || '', category: event.category || '', description: event.description || '', status: event.done ? 'done' : 'pending', doneAt: event.done ? (event.doneAt || new Date().toISOString()) : '', reminderEnabled: event.reminderEnabled !== false, reminderMinutesBefore: event.reminderMinutesBefore || '', createdBy: event.createdBy || 'web', createdAt: event.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: '' }; }
function memberPayload(member) { return { memberId: String(member.id), familyId: FAMILY_ID, name: member.name || '', role: member.role || '', initials: member.initials || '', colorHex: member.color || '#8ec68f', phone: member.phone || '', email: member.email || '', birthDate: member.birthDate || '', notes: member.notes || '', active: member.active !== false, createdAt: member.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: '' }; }
function recipePayload(recipe) { return { recipeId: String(recipe.id || Date.now()), familyId: FAMILY_ID, createdByMemberId: recipe.createdByMemberId || '', name: recipe.name || '', category: recipe.category || 'Familiares', description: recipe.description || '', prepTimeMinutes: Number.parseInt(recipe.time, 10) || '', servings: recipe.servings || '', coverFileId: '', coverUrl: '', ingredientsText: recipe.ingredients || '', stepsText: recipe.steps || '', favorite: recipe.favorite === true, createdAt: recipe.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: '' }; }
function settingsPayload() { return { familyId: FAMILY_ID, notificationsEnabled: settings.notifications, eventRemindersEnabled: settings.eventReminders, documentRemindersEnabled: settings.documentReminders, syncEnabled: settings.sync, defaultCalendarView: settings.defaultView, timeFormat: settings.timeFormat, appearance: settings.appearance, familyName: settings.familyName, familyAvatar: settings.familyAvatar, pinEnabled: settings.pinEnabled, updatedAt: new Date().toISOString() }; }
function saveEvents() { localStorage.setItem('my-family-events', JSON.stringify(events)); return Promise.all(events.map(event => apiRequest('eventUpsert', { data: eventPayload(event) }))); }
function getActiveFilter() { return document.querySelector('.member-filter.selected')?.dataset.filter || 'todos'; }
function eventDateKey(event) { return String(event.date || '').slice(0, 10); }
function todayEvents() { return events.filter(event => eventDateKey(event) === todayKey); }
function getNextEvent(eventsForToday = todayEvents()) {
  return eventsForToday.filter(event => !event.done).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))[0] || null;
}
function formatCurrentDate() { return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today).toUpperCase(); }
function saveNotifications() { localStorage.setItem('my-family-notifications', JSON.stringify(notifications)); }
function saveSettings() { localStorage.setItem('my-family-settings', JSON.stringify(settings)); apiRequest('settingsUpdate', { data: settingsPayload() }); }
function renderSettings() {
  document.querySelector('#notifications-setting').checked = settings.notifications;
  document.querySelector('#sync-setting').checked = settings.sync;
  document.querySelector('#notifications-setting-status').textContent = settings.notifications ? 'Recibe avisos de eventos y documentos' : 'Avisos pausados en este dispositivo';
  document.querySelector('#sync-setting-status').textContent = settings.sync ? 'Preparado para conectar con Google Sheets' : 'Sincronización pausada';
  document.querySelector('#notifications-button').disabled = !settings.notifications;
  document.querySelector('#event-reminders-setting').checked = settings.eventReminders;
  document.querySelector('#document-reminders-setting').checked = settings.documentReminders;
  document.querySelector('#default-calendar-view').value = settings.defaultView;
  document.querySelector('#time-format').value = settings.timeFormat;
  document.querySelector('#appearance-setting').value = settings.appearance;
  document.querySelector('#pin-setting').checked = settings.pinEnabled;
  document.querySelector('#family-profile-status').textContent = `${settings.familyName} ${settings.familyAvatar}`;
  document.querySelector('#pin-setting-status').textContent = settings.pinEnabled ? 'PIN activado en este dispositivo' : 'Protege la app con un PIN local';
  document.querySelector('#app-info-status').textContent = `${settings.familyName} · Datos locales`;
  document.querySelector('#app-version-label').textContent = `v${currentAppVersion || FALLBACK_APP_VERSION}`;
  document.body.dataset.theme = settings.appearance === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.appearance;
}
function saveRecipes() { localStorage.setItem('my-family-recipes', JSON.stringify(recipes)); recipes.forEach(recipe => apiRequest('recipeUpsert', { data: recipePayload(recipe) })); }
function saveDocuments() { localStorage.setItem('my-family-documents', JSON.stringify(documents)); }
function saveMembers() { localStorage.setItem('my-family-members', JSON.stringify(members)); members.forEach(member => apiRequest('memberUpsert', { data: memberPayload(member) })); }
function applyRemoteData(data) {
  if (Array.isArray(data.events)) events.splice(0, events.length, ...data.events.map(event => ({ ...event, id: /^\d+$/.test(String(event.eventId)) ? Number(event.eventId) : event.eventId, member: event.memberId, date: String(event.eventDate || '').slice(0, 10), time: String(event.eventTime || '').match(/\d{2}:\d{2}/)?.[0] || event.eventTime, done: event.status === 'done' })));
  if (data.members?.length) members.splice(0, members.length, ...data.members.map(member => ({ ...member, id: /^\d+$/.test(String(member.memberId)) ? Number(member.memberId) : member.memberId, key: member.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'), color: member.colorHex })));
  if (data.recipes?.length) recipes.splice(0, recipes.length, ...data.recipes.map(recipe => ({ ...recipe, id: recipe.recipeId, time: recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : '', ingredients: recipe.ingredientsText, steps: recipe.stepsText, image: recipe.coverUrl || '' })));
  if (data.documents?.length) documents.splice(0, documents.length, ...data.documents.map(document => ({ ...document, id: document.documentId, type: document.mimeType, size: document.sizeBytes })));
  if (data.notifications?.length) notifications.splice(0, notifications.length, ...data.notifications.map(notification => ({ ...notification, id: notification.notificationId, read: false })));
  if (data.settings) Object.assign(settings, { notifications: data.settings.notificationsEnabled !== false, sync: data.settings.syncEnabled !== false, eventReminders: data.settings.eventRemindersEnabled !== false, documentReminders: data.settings.documentRemindersEnabled !== false, defaultView: data.settings.defaultCalendarView || settings.defaultView, timeFormat: data.settings.timeFormat || settings.timeFormat, appearance: data.settings.appearance || settings.appearance, familyName: data.settings.familyName || settings.familyName, familyAvatar: data.settings.familyAvatar || settings.familyAvatar, pinEnabled: data.settings.pinEnabled === true });
}
async function connectSheets() {
  if (!settings.sync) return;
  const response = await apiRequest('bootstrap');
  if (!response?.ok) return;
  const data = response.data || {};
  const hadLocalData = Boolean(savedEvents || savedMembers || savedRecipes || savedDocuments);
  const hadRemoteData = Boolean(data.events?.length || data.members?.length || data.recipes?.length || data.documents?.length);
  if (!hadRemoteData && hadLocalData) { saveEvents(); saveMembers(); saveRecipes(); }
  applyRemoteData(data);
  document.querySelector('.sync-status span').innerHTML = 'Sincronizado con Google Sheets<br><small>Datos locales disponibles sin conexión</small>';
}
async function refreshFromSheets() {
  if (!settings.sync || document.visibilityState === 'hidden' || remoteSyncInProgress) return;
  remoteSyncInProgress = true;
  try {
    const response = await apiRequest('bootstrap');
    if (!response?.ok) return;
    applyRemoteData(response.data || {});
    renderMemberFilters();
    renderEvents(getActiveFilter());
    renderMembers();
    buildCalendar();
  } finally {
    remoteSyncInProgress = false;
  }
}
function getMember(key) { return members.find(member => member.key === key) || { name: key, color: '#176b4d', initials: key.slice(0, 1).toUpperCase() }; }
function memberDot(memberKey, extra = '') { const member = getMember(memberKey); return `<i class="member-dot ${extra}" style="background:${member.color}" title="${member.name}"></i>`; }
function todayInputValue() { const date = new Date(); return dateKey(date); }
function closeDocumentModal() { documentModal.classList.remove('open'); documentModal.setAttribute('aria-hidden', 'true'); }
const memberModal = document.querySelector('#member-modal');
const memberForm = document.querySelector('#member-form');
function closeMemberModal() { memberModal.classList.remove('open'); memberModal.setAttribute('aria-hidden', 'true'); }
function openMemberModal(member) {
  memberForm.reset();
  memberForm.dataset.id = member ? member.id : '';
  document.querySelector('#member-modal-title').textContent = member ? 'Personalizar perfil' : 'Añadir miembro';
  document.querySelector('#member-form-error').textContent = '';
  if (member) Object.entries(member).forEach(([key, value]) => { if (memberForm.elements[key]) memberForm.elements[key].value = value; });
  memberModal.classList.add('open');
  memberModal.setAttribute('aria-hidden', 'false');
}
function renderMembers() {
  const familyGrid = document.querySelector('#family-grid');
  familyGrid.innerHTML = members.map(member => `<article class="person-card" style="--member-color:${member.color}" data-member-id="${member.id}"><div class="person-avatar">${member.initials || member.name.slice(0, 1).toUpperCase()}</div><h2>${member.name}</h2><span>${member.role}</span><p class="member-card-meta">Post-it y datos familiares</p><button class="customize-member" data-member-id="${member.id}">Personalizar perfil →</button></article>`).join('');
  familyGrid.querySelectorAll('.customize-member').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); openMemberModal(members.find(member => member.id === Number(button.dataset.memberId))); }));
}
function renderMemberFilters() {
  const filterBar = document.querySelector('#member-filters');
  const filterList = filterBar.querySelector('.member-filter-list');
  filterBar.hidden = members.length === 0;
  filterList.innerHTML = members.length ? [`<button class="member-filter selected" data-filter="todos"><span class="member-dot all">✦</span> Todos</button>`, ...members.map(member => `<button class="member-filter" data-filter="${member.key}">${memberDot(member.key)} ${member.name}</button>`)].join('') : '';
}
function openDocumentModal() { documentForm.reset(); documentForm.elements.uploadDate.value = todayInputValue(); document.querySelector('#document-file-name').textContent = 'Ningún archivo seleccionado'; document.querySelector('#document-form-error').textContent = ''; documentModal.classList.add('open'); documentModal.setAttribute('aria-hidden', 'false'); }
function documentExtension(name) { return name.split('.').pop().toUpperCase().slice(0, 4); }
function renderDocuments() {
  const counts = documents.reduce((result, document) => { result[document.category] = (result[document.category] || 0) + 1; return result; }, {});
  document.querySelectorAll('#folder-grid .folder').forEach(folder => { const category = folder.querySelector('strong').textContent; folder.querySelector('small').textContent = `${counts[category] || 0} documentos`; });
  const todayDate = new Date();
  const limitDate = new Date(todayDate);
  limitDate.setDate(limitDate.getDate() + 90);
  const upcoming = documents.filter(document => document.expiryDate && new Date(`${document.expiryDate}T23:59:59`) >= todayDate && new Date(`${document.expiryDate}T23:59:59`) <= limitDate).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  document.querySelector('#document-list').innerHTML = upcoming.length ? upcoming.map(document => `<div><span class="file-icon ${documentExtension(document.name).toLowerCase() === 'pdf' ? 'pdf' : 'jpg'}">${documentExtension(document.name)}</span><strong>${document.name}</strong><small>Vence el ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${document.expiryDate}T12:00:00`))}</small><b>›</b></div>`).join('') : '<p class="week-empty">No hay documentos próximos a vencer.</p>';
  const usedBytes = documents.reduce((total, document) => total + (document.size || 0), 0);
  const usedPercent = Math.min(100, (usedBytes / DOCUMENT_CAPACITY_BYTES) * 100);
  const formattedBytes = usedBytes >= 1024 * 1024 ? `${(usedBytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.ceil(usedBytes / 1024)} KB`;
  document.querySelector('#document-storage-text').textContent = `${documents.length} documentos · Google Sheets (pendiente de conexión) · ${formattedBytes} de 100 MB`;
  document.querySelector('#document-storage-bar').style.width = `${usedPercent}%`;
  document.querySelector('#document-storage-percent').textContent = `${usedPercent.toFixed(1)}%`;
}
function closeRecipeModal() { recipeModal.classList.remove('open'); recipeModal.setAttribute('aria-hidden', 'true'); }
function resetRecipeImage() { recipeForm.dataset.image = ''; recipeImagePreview.innerHTML = '🍲'; recipeImageInputs.forEach(input => { input.value = ''; }); }
function readRecipeImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => { recipeForm.dataset.image = reader.result; recipeImagePreview.innerHTML = `<img src="${reader.result}" alt="Vista previa de la receta">`; });
  reader.readAsDataURL(file);
}
function openRecipeModal() { recipeForm.reset(); recipeForm.dataset.image = ''; resetRecipeImage(); document.querySelector('#recipe-form-error').textContent = ''; recipeModal.classList.add('open'); recipeModal.setAttribute('aria-hidden', 'false'); }
function recipeIcon(category) { return { Postres: '🍰', Saludables: '🥗', Rápidos: '🍳', Favoritas: '⭐' }[category] || '🍲'; }
function hideRecipeResult(clearSearch = false) {
  document.querySelector('#recipe-search-result').hidden = true;
  if (clearSearch) document.querySelector('#recipe-search').value = '';
}
function showRecipeResult(match) {
  const resultPanel = document.querySelector('#recipe-search-result');
  document.querySelector('#recipe-result-name').textContent = match.name;
  document.querySelector('#recipe-result-description').textContent = match.description || `Receta familiar de la categoría ${match.category}.`;
  document.querySelector('#recipe-result-meta').innerHTML = `<span>◷ ${match.time || 'Sin tiempo'}</span><span>♨ ${match.category}</span>${match.servings ? `<span>♟ ${match.servings}</span>` : ''}`;
  document.querySelector('#recipe-result-ingredients').textContent = match.ingredients;
  document.querySelector('#recipe-result-steps').textContent = match.steps;
  const image = document.querySelector('#recipe-result-image');
  image.innerHTML = match.image ? `<img src="${match.image}" alt="${match.name}">` : recipeIcon(match.category);
  resultPanel.hidden = false;
}
function renderRecipeResult(search) {
  const query = search.trim().toLowerCase();
  if (!query) { hideRecipeResult(); return; }
  const match = [...recipes, ...builtInRecipes].find(recipe => `${recipe.name} ${recipe.ingredients} ${recipe.category}`.toLowerCase().includes(query));
  if (!match) { hideRecipeResult(); return; }
  showRecipeResult(match);
}
function renderRecipes(search = '') {
  const query = search.trim().toLowerCase();
  const visible = recipes.filter(recipe => `${recipe.name} ${recipe.ingredients} ${recipe.category}`.toLowerCase().includes(query));
  const gridElement = document.querySelector('#recipe-grid');
  gridElement.innerHTML = '';
  const groups = [...builtInRecipes, ...visible].reduce((grouped, recipe) => { (grouped[recipe.category] ||= []).push(recipe); return grouped; }, {});
  Object.entries(groups).forEach(([category, categoryRecipes]) => {
    const heading = document.createElement('h3');
    heading.className = 'recipe-category-heading';
    heading.textContent = category;
    gridElement.appendChild(heading);
    categoryRecipes.forEach(recipe => {
      const card = document.createElement('article');
      card.className = 'recipe-card';
      card.dataset.recipeId = recipe.id || '';
      card.dataset.recipeName = recipe.name;
      card.innerHTML = `${recipe.image ? `<div class="recipe-art"><img class="recipe-card-image" src="${recipe.image}" alt="${recipe.name}"></div>` : `<div class="recipe-art">${recipeIcon(recipe.category)}</div>`}<strong>${recipe.name}</strong><small>${recipe.category} · ${recipe.time}</small><small>🧂 ${recipe.ingredients.split(/\r?\n/).filter(Boolean).length} ingredientes</small>`;
      gridElement.appendChild(card);
    });
  });
  document.querySelector('#recipe-count').textContent = `${6 + recipes.length} recetas guardadas`;
  gridElement.querySelectorAll('.recipe-card').forEach(card => card.addEventListener('click', () => {
    const match = [...recipes, ...builtInRecipes].find(recipe => recipe.id === Number(card.dataset.recipeId) || recipe.name === card.dataset.recipeName);
    if (match) showRecipeResult(match);
  }));
}
function showUpdateModal() { updateModal.classList.add('open'); updateModal.setAttribute('aria-hidden', 'false'); }
function closeUpdateModal() { updateModal.classList.remove('open'); updateModal.setAttribute('aria-hidden', 'true'); localStorage.setItem('my-family-update-version', currentAppVersion); }
function checkForAppUpdate() { if (localStorage.getItem('my-family-update-version') !== currentAppVersion) showUpdateModal(); }
async function checkPublishedVersion() {
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const publishedVersion = (await response.json()).version;
    currentAppVersion = publishedVersion || FALLBACK_APP_VERSION;
    checkForAppUpdate();
  } catch (error) {
    currentAppVersion = FALLBACK_APP_VERSION;
    checkForAppUpdate();
  }
}
function renderNotifications() {
  const unreadCount = notifications.filter(notification => !notification.read).length;
  const count = document.querySelector('#notification-count');
  if (!settings.notifications) { count.hidden = true; return; }
  count.textContent = unreadCount;
  count.hidden = unreadCount === 0;
  notificationList.innerHTML = notifications.length ? notifications.map(notification => `<button class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification.id}"><i class="notification-dot"></i><span><strong>${notification.title}</strong><small>${notification.message}</small></span></button>`).join('') : '<p class="notification-empty">No tienes notificaciones.</p>';
  notificationList.querySelectorAll('[data-notification-id]').forEach(button => button.addEventListener('click', () => {
    const notification = notifications.find(item => item.id === Number(button.dataset.notificationId));
    notification.read = !notification.read;
    saveNotifications();
    renderNotifications();
  }));
}
function openNotificationsModal() { if (!settings.notifications) return; renderNotifications(); notificationsModal.classList.add('open'); notificationsModal.setAttribute('aria-hidden', 'false'); }
function closeNotificationsModal() { notificationsModal.classList.remove('open'); notificationsModal.setAttribute('aria-hidden', 'true'); }
async function enableDeviceNotifications() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') new Notification('Avisos activados', { body: 'Recibirás las nuevas notificaciones de My Family en este dispositivo.', icon: 'imagenes/logo-myfamily-trans-ok.png' });
}

function renderEvents(filter = 'todos') {
  const currentEvents = todayEvents();
  const nextEvent = currentEvents.filter(event => !event.done).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))[0] || null;
  const visible = currentEvents.filter(event => filter === 'todos' || event.member === filter).sort((a, b) => a.time.localeCompare(b.time));
  grid.innerHTML = visible.length ? visible.map(event => `<article class="sticky ${memberColorClasses[event.member]} ${event.done ? 'done' : ''}" style="--member-color:${getMember(event.member).color}" data-id="${event.id}"><span class="sticky-time">${event.time}</span><h3>${event.name}</h3><p>${event.place}</p><div class="sticky-foot"><span class="category">${event.category}</span><button class="done-button" data-done="${event.id}">${event.done ? '✓ Hecho' : 'Marcar hecho'}</button></div></article>`).join('') : `<div class="empty-events"><i>◷</i><span>PARA ${formatCurrentDate()} NO EXISTEN EVENTOS NI ACTIVIDADES MARCADAS EN LA AGENDA.</span></div>`;
  document.querySelector('#pending-count').textContent = currentEvents.filter(event => !event.done).length;
  document.querySelector('#nav-pending-count').textContent = currentEvents.filter(event => !event.done).length;
  document.querySelector('#completed-count').textContent = currentEvents.filter(event => event.done).length;
  document.querySelector('#next-event-count').textContent = nextEvent ? '1' : '0';
  nextEventButton.disabled = !nextEvent;
  document.querySelector('#event-count').textContent = `${currentEvents.length} eventos`;
  grid.querySelectorAll('.sticky').forEach(card => card.addEventListener('click', () => openModal(Number(card.dataset.id))));
  grid.querySelectorAll('[data-done]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); toggleDone(Number(button.dataset.done)); }));
}
async function toggleDone(id) { const event = events.find(item => item.id === id); event.done = !event.done; await saveEvents(); await refreshFromSheets(); renderEvents(getActiveFilter()); }
function showForm(event) {
  modal.querySelector('.modal-detail-view').hidden = true;
  eventForm.hidden = false;
  eventForm.reset();
  document.querySelector('.form-error').textContent = '';
  document.querySelector('#form-kicker').textContent = event ? 'EDITAR POST-IT' : 'NUEVO POST-IT';
  document.querySelector('#form-title').textContent = event ? 'Editar Post-it' : 'Añadir Post-it';
  if (event) Object.entries(event).forEach(([key, value]) => { if (eventForm.elements[key]) eventForm.elements[key].value = value; }); else eventForm.elements.date.value = todayKey;
}
function openModal(id) { const event = events.find(item => item.id === id); document.querySelector('.modal-detail-view').hidden = false; eventForm.hidden = true; document.querySelector('#modal-title').textContent = event.name; document.querySelector('.modal-category').textContent = event.category.toUpperCase(); document.querySelector('.modal-member').innerHTML = `<i class="member-dot ${memberColorClasses[event.member]}\"></i> ${memberNames[event.member]}`; document.querySelectorAll('.modal-detail')[0].textContent = `Hoy, lunes 7 de septiembre · ${event.time}`; document.querySelectorAll('.modal-detail')[1].textContent = event.place; modal.dataset.id = id; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function openModal(id) { const event = events.find(item => item.id === id); const member = getMember(event.member); const eventDate = new Date(`${event.date}T12:00:00`); const memberName = member.name === event.member ? (memberNames[event.member] || member.name) : member.name; modal.querySelector('.modal-detail-view').hidden = false; eventForm.hidden = true; modal.querySelector('#modal-title').textContent = event.name; modal.querySelector('.modal-category').textContent = event.category.toUpperCase(); modal.querySelector('.modal-member').innerHTML = `${memberDot(event.member)} ${memberName}`; modal.querySelectorAll('.modal-detail')[0].textContent = `${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(eventDate)} · ${event.time}`; modal.querySelectorAll('.modal-detail')[1].textContent = event.place; modal.dataset.id = id; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function openCreateModal() { delete modal.dataset.id; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); showForm(); }
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
function openDayEventsModal(selectedDateKey) {
  const date = new Date(`${selectedDateKey}T12:00:00`);
  const dayEvents = events.filter(event => eventDateKey(event) === selectedDateKey).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  document.querySelector('#day-events-title').textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  dayEventsList.innerHTML = Array.from({ length: 24 }, (_, hour) => { const hourKey = `${String(hour).padStart(2, '0')}:`; const hourEvents = dayEvents.filter(event => String(event.time || '').startsWith(hourKey)); const eventMarkup = hourEvents.map(event => `<button class="day-event-button ${event.done ? 'done' : ''}" type="button" data-day-event-id="${event.id}"><strong>${event.name}</strong><small>${event.time || '--:--'} · ${getMember(event.member).name} · ${event.place || 'Sin lugar indicado'}</small></button>`).join(''); return `<div class="day-event-row"><span class="day-event-time">${String(hour).padStart(2, '0')}:00</span><div class="day-event-slot">${eventMarkup}</div></div>`; }).join('');
  dayEventsList.querySelectorAll('[data-day-event-id]').forEach(button => button.addEventListener('click', () => { closeDayEventsModal(); openModal(Number(button.dataset.dayEventId)); }));
  dayEventsModal.classList.add('open');
  dayEventsModal.setAttribute('aria-hidden', 'false');
}
function closeDayEventsModal() { dayEventsModal.classList.remove('open'); dayEventsModal.setAttribute('aria-hidden', 'true'); }
function openNextEventModal(event = getNextEvent()) {
  if (!event) return;
  const member = getMember(event.member);
  const memberName = member.name === event.member ? (memberNames[event.member] || member.name) : member.name;
  document.querySelector('#next-event-category').textContent = event.category || 'Post-it';
  document.querySelector('#next-event-member').innerHTML = `${memberDot(event.member)} ${memberName}`;
  document.querySelector('#next-event-modal-title').textContent = event.name;
  document.querySelector('#next-event-date-time').textContent = `${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${event.date}T12:00:00`))} · ${event.time || 'Sin hora'}`;
  document.querySelector('#next-event-place').textContent = event.place || 'Sin lugar indicado';
  document.querySelector('#next-event-description').textContent = event.description || 'Sin descripción';
  nextEventModal.classList.add('open');
  nextEventModal.setAttribute('aria-hidden', 'false');
}
function closeNextEventModal() { nextEventModal.classList.remove('open'); nextEventModal.setAttribute('aria-hidden', 'true'); }
document.querySelector('#member-filters').addEventListener('click', event => {
  const button = event.target.closest('.member-filter');
  if (!button) return;
  document.querySelector('.member-filter.selected')?.classList.remove('selected');
  button.classList.add('selected');
  renderEvents(button.dataset.filter);
});
renderMemberFilters();
document.querySelector('.modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.querySelector('.modal-done').addEventListener('click', () => { toggleDone(Number(modal.dataset.id)); closeModal(); });
document.querySelector('.modal-edit').addEventListener('click', () => showForm(events.find(item => item.id === Number(modal.dataset.id))));
document.querySelector('.modal-cancel').addEventListener('click', closeModal);
nextEventButton.addEventListener('click', openNextEventModal);
document.querySelector('#day-events-close').addEventListener('click', closeDayEventsModal);
document.querySelector('#next-event-modal-dismiss').addEventListener('click', closeNextEventModal);
nextEventModal.addEventListener('click', event => { if (event.target === nextEventModal) closeNextEventModal(); });
eventForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!eventForm.checkValidity()) { document.querySelector('.form-error').textContent = 'Completa los campos obligatorios.'; return; }
  const data = Object.fromEntries(new FormData(eventForm));
  const existing = events.find(item => item.id === Number(modal.dataset.id));
  if (existing) Object.assign(existing, data); else events.push({ ...data, id: Date.now(), done: false });
  await saveEvents(); await refreshFromSheets(); renderEvents(getActiveFilter()); closeModal();
});
document.querySelector('#add-recipe').addEventListener('click', openRecipeModal);
document.querySelectorAll('.recipe-modal-close').forEach(button => button.addEventListener('click', closeRecipeModal));
recipeModal.addEventListener('click', event => { if (event.target === recipeModal) closeRecipeModal(); });
recipeImageInputs.forEach(input => input.addEventListener('change', event => readRecipeImage(event.target.files[0])));
document.querySelector('#remove-recipe-image').addEventListener('click', resetRecipeImage);
recipeForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!recipeForm.checkValidity()) { document.querySelector('#recipe-form-error').textContent = 'Completa el nombre, los ingredientes y la elaboración.'; return; }
  const data = Object.fromEntries(new FormData(recipeForm));
  recipes.push({ ...data, id: Date.now(), image: recipeForm.dataset.image || '' });
  saveRecipes(); renderRecipes(document.querySelector('#recipe-search').value); closeRecipeModal();
});
document.querySelector('#recipe-search').addEventListener('input', event => { renderRecipes(event.target.value); renderRecipeResult(event.target.value); });
document.querySelector('#close-recipe-result').addEventListener('click', () => hideRecipeResult(true));
document.querySelector('#upload-document')?.addEventListener('click', openDocumentModal);
document.querySelectorAll('.document-modal-close').forEach(button => button.addEventListener('click', closeDocumentModal));
documentModal.addEventListener('click', event => { if (event.target === documentModal) closeDocumentModal(); });
documentFile.addEventListener('change', () => { document.querySelector('#document-file-name').textContent = documentFile.files[0]?.name || 'Ningún archivo seleccionado'; });
documentForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!documentForm.checkValidity()) { document.querySelector('#document-form-error').textContent = 'Selecciona un archivo y completa la fecha de subida.'; return; }
  const data = Object.fromEntries(new FormData(documentForm));
  const file = documentFile.files[0];
  const saveDocument = fileData => { documents.push({ ...data, id: Date.now(), name: file.name, type: file.type, size: file.size, data: fileData || '' }); saveDocuments(); renderDocuments(); closeDocumentModal(); };
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => saveDocument(reader.result));
  reader.readAsDataURL(file);
});
document.querySelector('#add-member').addEventListener('click', () => openMemberModal());
document.querySelectorAll('.member-modal-close').forEach(button => button.addEventListener('click', closeMemberModal));
memberModal.addEventListener('click', event => { if (event.target === memberModal) closeMemberModal(); });
memberForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!memberForm.checkValidity()) { document.querySelector('#member-form-error').textContent = 'Completa el nombre y el parentesco o rol.'; return; }
  const data = Object.fromEntries(new FormData(memberForm));
  const existing = members.find(member => member.id === Number(memberForm.dataset.id));
  if (existing) Object.assign(existing, data); else members.push({ ...data, key: data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'), id: Date.now() });
  saveMembers(); renderMembers(); renderMemberFilters(); renderEvents(getActiveFilter()); buildCalendar(); closeMemberModal();
});
document.querySelector('#notifications-button').addEventListener('click', openNotificationsModal);
document.querySelector('.notifications-close').addEventListener('click', closeNotificationsModal);
notificationsModal.addEventListener('click', event => { if (event.target === notificationsModal) closeNotificationsModal(); });
document.querySelector('#mark-all-read').addEventListener('click', () => { notifications.forEach(notification => { notification.read = true; }); saveNotifications(); renderNotifications(); });
document.querySelector('#enable-device-notifications').addEventListener('click', enableDeviceNotifications);
document.querySelector('#notifications-setting').addEventListener('change', event => { settings.notifications = event.target.checked; saveSettings(); renderSettings(); if (!settings.notifications) closeNotificationsModal(); });
document.querySelector('#sync-setting').addEventListener('change', event => { settings.sync = event.target.checked; saveSettings(); renderSettings(); });
document.querySelector('#event-reminders-setting').addEventListener('change', event => { settings.eventReminders = event.target.checked; saveSettings(); renderSettings(); });
document.querySelector('#document-reminders-setting').addEventListener('change', event => { settings.documentReminders = event.target.checked; saveSettings(); renderSettings(); });
document.querySelector('#default-calendar-view').addEventListener('change', event => { settings.defaultView = event.target.value; saveSettings(); });
document.querySelector('#time-format').addEventListener('change', event => { settings.timeFormat = event.target.value; saveSettings(); });
document.querySelector('#appearance-setting').addEventListener('change', event => { settings.appearance = event.target.value; saveSettings(); renderSettings(); });
const familyProfileModal = document.querySelector('#family-profile-modal');
const familyProfileForm = document.querySelector('#family-profile-form');
const pinModal = document.querySelector('#pin-modal');
const pinForm = document.querySelector('#pin-form');
const appLockModal = document.querySelector('#app-lock-modal');
const appLockForm = document.querySelector('#app-lock-form');
function closeFamilyProfile() { familyProfileModal.classList.remove('open'); familyProfileModal.setAttribute('aria-hidden', 'true'); }
function closePinModal() { pinModal.classList.remove('open'); pinModal.setAttribute('aria-hidden', 'true'); }
function checkPinLock() { if (settings.pinEnabled && localStorage.getItem('my-family-pin')) { appLockModal.classList.add('open'); appLockModal.setAttribute('aria-hidden', 'false'); } }
document.querySelector('#open-family-profile').addEventListener('click', () => { familyProfileForm.elements.name.value = settings.familyName; familyProfileForm.elements.avatar.value = settings.familyAvatar; familyProfileModal.classList.add('open'); familyProfileModal.setAttribute('aria-hidden', 'false'); });
document.querySelectorAll('.family-profile-close').forEach(button => button.addEventListener('click', closeFamilyProfile));
familyProfileModal.addEventListener('click', event => { if (event.target === familyProfileModal) closeFamilyProfile(); });
familyProfileForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(familyProfileForm)); settings.familyName = data.name; settings.familyAvatar = data.avatar || '🏡'; saveSettings(); renderSettings(); closeFamilyProfile(); });
document.querySelector('#pin-setting').addEventListener('change', event => { if (event.target.checked) { pinModal.classList.add('open'); pinModal.setAttribute('aria-hidden', 'false'); } else { settings.pinEnabled = false; localStorage.removeItem('my-family-pin'); saveSettings(); renderSettings(); } });
document.querySelectorAll('.pin-modal-close').forEach(button => button.addEventListener('click', () => { closePinModal(); if (!settings.pinEnabled) { document.querySelector('#pin-setting').checked = false; } }));
pinModal.addEventListener('click', event => { if (event.target === pinModal) closePinModal(); });
pinForm.addEventListener('submit', event => { event.preventDefault(); if (!pinForm.checkValidity()) { document.querySelector('#pin-form-error').textContent = 'El PIN debe tener 4 dígitos.'; return; } localStorage.setItem('my-family-pin', pinForm.elements.pin.value); settings.pinEnabled = true; saveSettings(); renderSettings(); closePinModal(); });
appLockForm.addEventListener('submit', event => { event.preventDefault(); if (appLockForm.elements.pin.value === localStorage.getItem('my-family-pin')) { appLockModal.classList.remove('open'); appLockModal.setAttribute('aria-hidden', 'true'); appLockForm.reset(); } else document.querySelector('#app-lock-error').textContent = 'PIN incorrecto.'; });
document.querySelector('#export-data').addEventListener('click', () => { const backup = { version: currentAppVersion || FALLBACK_APP_VERSION, exportedAt: new Date().toISOString(), events, notifications, recipes, documents, members, settings }; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })); link.download = 'my-family-backup.json'; link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#import-data').addEventListener('click', () => document.querySelector('#import-data-file').click());
document.querySelector('#import-data-file').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.addEventListener('load', () => { try { const backup = JSON.parse(reader.result); ['events', 'notifications', 'recipes', 'documents', 'members', 'settings'].forEach(key => { if (backup[key]) localStorage.setItem(`my-family-${key}`, JSON.stringify(backup[key])); }); location.reload(); } catch (error) { document.querySelector('#storage-setting-status').textContent = 'Archivo de copia no válido'; } }); reader.readAsText(file); });
document.querySelector('#update-later').addEventListener('click', closeUpdateModal);
document.querySelector('#update-app').addEventListener('click', async () => {
  localStorage.setItem('my-family-update-version', currentAppVersion);
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) await registration.update();
  }
  window.location.reload();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeModal(); closeDayEventsModal(); closeNextEventModal(); closeNotificationsModal(); closeRecipeModal(); closeDocumentModal(); closeMemberModal(); } });

let calendarDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let calendarMode = 'month';
function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
function dateKey(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function renderUpcoming() {
  const summary = document.querySelector('#agenda-upcoming');
  const summaryPeriod = document.querySelector('#summary-period');
  const weekStart = getWeekStart(calendarDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startKey = dateKey(weekStart);
  const endKey = dateKey(weekEnd);
  const upcoming = events.filter(event => eventDateKey(event) >= todayKey && eventDateKey(event) >= startKey && eventDateKey(event) <= endKey).sort((a, b) => `${eventDateKey(a)}T${a.time}`.localeCompare(`${eventDateKey(b)}T${b.time}`));
  summaryPeriod.textContent = `${weekStart.getDate()}-${weekEnd.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(weekEnd)}`;
  summary.innerHTML = upcoming.length ? upcoming.slice(0, 6).map(event => `<div class="mini-event ${event.done ? 'done' : ''}" data-upcoming-event-id="${event.id}" tabindex="0" role="button"><b>${event.time}</b>${memberDot(event.member)}<div><strong>${event.name}</strong><small>${getMember(event.member).name} · ${event.place}</small></div></div>`).join('') : '<p class="week-empty">No hay eventos esta semana.</p>';
  summary.querySelectorAll('[data-upcoming-event-id]').forEach(item => {
    const open = () => openNextEventModal(events.find(event => String(event.id) === item.dataset.upcomingEventId));
    item.addEventListener('click', open);
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}
function getWeekNumber(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}
function renderWeek(calendar) {
  const weekStart = getWeekStart(calendarDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long' });
  document.querySelector('.calendar-toolbar h2').innerHTML = `${formatter.format(weekStart).toUpperCase()} ${weekStart.getFullYear()} <span class="week-number">SEMANA ${getWeekNumber(weekStart)} DEL AÑO</span>`;
  calendar.classList.add('week-view');
  calendar.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    const key = dateKey(day);
    const dayEvents = events.filter(event => eventDateKey(event) === key).sort((a, b) => a.time.localeCompare(b.time));
    const eventMarkup = dayEvents.length ? dayEvents.map(event => `<button class="week-event ${event.done ? 'done' : ''}" type="button" data-week-event-id="${event.id}" style="--member-color:${getMember(event.member).color}" title="${event.name}"><span class="week-event-time">${event.time}</span><span class="week-event-name">${event.name}</span><small class="week-event-member">${getMember(event.member).name}</small></button>`).join('') : '<span class="week-empty">Sin eventos</span>';
    return `<div class="week-day ${key === todayKey ? 'today' : ''}"><div class="week-day-label">${new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day).toUpperCase()}</div><div class="week-day-number">${day.getDate()}</div>${eventMarkup}</div>`;
  }).join('');
  calendar.querySelectorAll('[data-week-event-id]').forEach(item => {
    const open = () => openModal(Number(item.dataset.weekEventId));
    item.addEventListener('click', event => { event.stopPropagation(); open(); });
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); } });
  });
}
function buildCalendar() {
  const calendar = document.querySelector('#calendar');
  renderUpcoming();
  if (calendarMode === 'week') { renderWeek(calendar); return; }
  calendar.classList.remove('week-view');
  const headings = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(calendarDate).toUpperCase();
  document.querySelector('.calendar-toolbar h2').innerHTML = `${monthLabel} <span>${year}</span>`;
  calendar.innerHTML = headings.map(day => `<div class="cal-head">${day}</div>`).join('') + Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstDay + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const displayedDay = dayNumber <= 0 ? previousMonthDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
    const cellDate = new Date(year, month, dayNumber);
    const cellDateKey = dateKey(cellDate);
    const dayEvents = events.filter(event => eventDateKey(event) === cellDateKey);
    const isToday = isCurrentMonth && cellDateKey === todayKey;
    const visibleEvents = dayEvents.slice(0, 3).map(event => `<span class="cal-event-pill ${event.done ? 'done' : ''}" style="--member-color:${getMember(event.member).color}" title="${event.name}">${event.time || ''} ${event.name}</span>`).join('');
    const moreEvents = dayEvents.length > 3 ? `<span class="cal-event-more">+${dayEvents.length - 3} más</span>` : '';
    return `<div class="cal-day ${isToday ? 'today' : ''} ${isCurrentMonth ? '' : 'outside-month'}" data-calendar-date="${cellDateKey}" tabindex="0" role="button"><span class="cal-day-number">${displayedDay}</span><div class="cal-day-events">${visibleEvents}${moreEvents}</div></div>`;
  }).join('');
  calendar.querySelectorAll('[data-calendar-date]').forEach(day => {
    const open = () => openDayEventsModal(day.dataset.calendarDate);
    day.addEventListener('click', open);
    day.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); const view = link.dataset.view; document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view')); document.querySelector(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); if (view === 'agenda') { calendarMode = settings.defaultView; calendarDate = new Date(today); document.querySelectorAll('[data-calendar-view]').forEach(item => item.classList.toggle('active', item.dataset.calendarView === calendarMode)); buildCalendar(); } document.querySelector('.sidebar').classList.remove('open'); }));
document.querySelectorAll('#add-event, #add-event-agenda').forEach(button => button.addEventListener('click', openCreateModal));
document.querySelector('.menu-button').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.querySelector('#prev-month').addEventListener('click', () => { calendarDate.setDate(calendarDate.getDate() + (calendarMode === 'week' ? -7 : 0)); if (calendarMode === 'month') calendarDate.setMonth(calendarDate.getMonth() - 1); buildCalendar(); });
document.querySelector('#next-month').addEventListener('click', () => { calendarDate.setDate(calendarDate.getDate() + (calendarMode === 'week' ? 7 : 0)); if (calendarMode === 'month') calendarDate.setMonth(calendarDate.getMonth() + 1); buildCalendar(); });
document.querySelectorAll('[data-calendar-view]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.calendarView === 'week' && calendarMode === 'month') calendarDate = new Date(today);
  calendarMode = button.dataset.calendarView;
  document.querySelectorAll('[data-calendar-view]').forEach(item => item.classList.toggle('active', item === button));
  buildCalendar();
}));
document.querySelectorAll('.agenda-summary .member-dot').forEach((dot, index) => { dot.className = `member-dot ${['papa', 'mama', 'diego'][index]}`; });
document.querySelector('#current-date-label').textContent = formatCurrentDate();
async function startApp() {
  await connectSheets();
  renderMemberFilters(); renderEvents(); renderNotifications(); renderRecipes(); renderDocuments(); renderMembers(); renderSettings(); buildCalendar(); checkPublishedVersion(); checkPinLock();
}
startApp();
setInterval(checkPublishedVersion, 60000);
setInterval(refreshFromSheets, 2000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshFromSheets(); });
window.addEventListener('focus', refreshFromSheets);
setTimeout(() => window.location.reload(), new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime() - Date.now() + 1000);