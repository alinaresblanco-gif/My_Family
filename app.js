const FALLBACK_APP_VERSION = '2026.09.09.2';
let currentAppVersion = null;
const defaultEvents = [
  { id: 1, member: 'antonio', name: 'Revisión médica', time: '08:30', place: 'Centro de salud familiar', category: '🏥 Médico', done: false },
  { id: 2, member: 'y' + 'ayes', name: 'Clases de piano', time: '16:00', place: 'Aula 3 · Conservatorio', category: '🎵 Actividad', done: false },
  { id: 3, member: 'ramsses', name: 'Entrenamiento', time: '19:30', place: 'Pabellón municipal', category: '⚽ Ocio', done: false },
  { id: 4, member: 'rosa', name: 'Entregar proyecto', time: '20:00', place: 'Tarea del colegio', category: '🧾 Tareas', done: false },
  { id: 5, member: 'antonio', name: 'Comprar fruta', time: '20:30', place: 'Lista familiar', category: '🛒 Tareas', done: true }
];
const savedEvents = localStorage.getItem('my-family-events');
const events = savedEvents ? JSON.parse(savedEvents) : defaultEvents;
const today = new Date();
const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
events.forEach(event => { if (!event.date) event.date = todayKey; });
const memberNames = { antonio: 'Antonio', yayes: 'Yayes', ramsses: 'Ramssés', rosa: 'Rosa' };
const memberColorClasses = { antonio: 'papa', yayes: 'mama', ramsses: 'diego', rosa: 'lucia' };
const grid = document.querySelector('#sticky-grid');
const modal = document.querySelector('#event-modal');
const eventForm = document.querySelector('.event-form');
const notificationsModal = document.querySelector('#notifications-modal');
const notificationList = document.querySelector('#notification-list');
const updateModal = document.querySelector('#update-modal');
const defaultNotifications = [
  { id: 1, title: 'Revisión médica', message: 'La cita de Antonio es hoy a las 08:30.', read: false },
  { id: 2, title: 'Documento por caducar', message: 'El seguro del coche vence el 18 de octubre.', read: false }
];
const savedNotifications = localStorage.getItem('my-family-notifications');
const notifications = savedNotifications ? JSON.parse(savedNotifications) : defaultNotifications;
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
const defaultMembers = [
  { id: 1, name: 'Antonio', role: 'Antonio', color: '#8ec68f', initials: 'A', phone: '', birthDate: '', notes: '' },
  { id: 2, name: 'Yayes', role: 'Yayes', color: '#93c6d1', initials: 'Y', phone: '', birthDate: '', notes: '' },
  { id: 3, name: 'Ramssés', role: 'Ramssés', color: '#e98779', initials: 'R', phone: '', birthDate: '', notes: '' },
  { id: 4, name: 'Rosa', role: 'Rosa', color: '#f6cf68', initials: 'R', phone: '', birthDate: '', notes: '' }
];
const savedMembers = localStorage.getItem('my-family-members');
const members = savedMembers ? JSON.parse(savedMembers) : defaultMembers;
const builtInRecipes = [
  { name: 'Pasta de los viernes', category: 'Rápidos', time: '25 min', servings: '', ingredients: 'Pasta\nTomate\nQueso', steps: 'Cuece la pasta y mezcla con la salsa.', image: '', description: 'Una receta rápida para compartir en familia.' },
  { name: 'Tarta de manzana', category: 'Postres', time: '60 min', servings: '', ingredients: 'Manzanas\nHarina\nCanela', steps: 'Prepara la masa, añade la manzana y hornea.', image: '', description: 'Un postre casero para cualquier ocasión.' },
  { name: 'Ensalada fresca', category: 'Saludables', time: '15 min', servings: '', ingredients: 'Lechuga\nTomate\nAceite de oliva', steps: 'Lava, corta y mezcla todos los ingredientes.', image: '', description: 'Una opción ligera y llena de sabor.' }
];

function saveEvents() { localStorage.setItem('my-family-events', JSON.stringify(events)); }
function getActiveFilter() { return document.querySelector('.member-filter.selected').dataset.filter; }
function todayEvents() { return events.filter(event => event.date === todayKey); }
function formatCurrentDate() { return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today).toUpperCase(); }
function saveNotifications() { localStorage.setItem('my-family-notifications', JSON.stringify(notifications)); }
function saveRecipes() { localStorage.setItem('my-family-recipes', JSON.stringify(recipes)); }
function saveDocuments() { localStorage.setItem('my-family-documents', JSON.stringify(documents)); }
function saveMembers() { localStorage.setItem('my-family-members', JSON.stringify(members)); }
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
function openNotificationsModal() { renderNotifications(); notificationsModal.classList.add('open'); notificationsModal.setAttribute('aria-hidden', 'false'); }
function closeNotificationsModal() { notificationsModal.classList.remove('open'); notificationsModal.setAttribute('aria-hidden', 'true'); }
async function enableDeviceNotifications() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') new Notification('Avisos activados', { body: 'Recibirás las nuevas notificaciones de My Family en este dispositivo.', icon: 'imagenes/logo-myfamily-trans-ok.png' });
}

function renderEvents(filter = 'todos') {
  const currentEvents = todayEvents();
  const visible = currentEvents.filter(event => filter === 'todos' || event.member === filter).sort((a, b) => a.time.localeCompare(b.time));
  grid.innerHTML = visible.length ? visible.map(event => `<article class="sticky ${memberColorClasses[event.member]} ${event.done ? 'done' : ''}" data-id="${event.id}"><span class="sticky-time">${event.time}</span><h3>${event.name}</h3><p>${event.place}</p><div class="sticky-foot"><span class="category">${event.category}</span><button class="done-button" data-done="${event.id}">${event.done ? '✓ Hecho' : 'Marcar hecho'}</button></div></article>`).join('') : `<div class="empty-events"><i>◷</i><span>PARA ${formatCurrentDate()} NO EXISTEN EVENTOS NI ACTIVIDADES MARCADAS EN LA AGENDA.</span></div>`;
  document.querySelector('#pending-count').textContent = currentEvents.filter(event => !event.done).length;
  document.querySelector('#nav-pending-count').textContent = currentEvents.filter(event => !event.done).length;
  document.querySelector('#completed-count').textContent = currentEvents.filter(event => event.done).length;
  document.querySelector('#event-count').textContent = `${currentEvents.length} eventos`;
  grid.querySelectorAll('.sticky').forEach(card => card.addEventListener('click', () => openModal(Number(card.dataset.id))));
  grid.querySelectorAll('[data-done]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); toggleDone(Number(button.dataset.done)); }));
}
function toggleDone(id) { const event = events.find(item => item.id === id); event.done = !event.done; saveEvents(); renderEvents(getActiveFilter()); }
function showForm(event) {
  document.querySelector('.modal-detail-view').hidden = true;
  eventForm.hidden = false;
  eventForm.reset();
  document.querySelector('.form-error').textContent = '';
  document.querySelector('#form-kicker').textContent = event ? 'EDITAR POST-IT' : 'NUEVO POST-IT';
  document.querySelector('#form-title').textContent = event ? 'Editar Post-it' : 'Añadir Post-it';
  if (event) Object.entries(event).forEach(([key, value]) => { if (eventForm.elements[key]) eventForm.elements[key].value = value; }); else eventForm.elements.date.value = todayKey;
}
function openModal(id) { const event = events.find(item => item.id === id); document.querySelector('.modal-detail-view').hidden = false; eventForm.hidden = true; document.querySelector('#modal-title').textContent = event.name; document.querySelector('.modal-category').textContent = event.category.toUpperCase(); document.querySelector('.modal-member').innerHTML = `<i class="member-dot ${memberColorClasses[event.member]}\"></i> ${memberNames[event.member]}`; document.querySelectorAll('.modal-detail')[0].textContent = `Hoy, lunes 7 de septiembre · ${event.time}`; document.querySelectorAll('.modal-detail')[1].textContent = event.place; modal.dataset.id = id; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function openCreateModal() { delete modal.dataset.id; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); showForm(); }
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
document.querySelectorAll('.member-filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.member-filter.selected').classList.remove('selected'); button.classList.add('selected'); renderEvents(button.dataset.filter); }));
document.querySelector('.modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.querySelector('.modal-done').addEventListener('click', () => { toggleDone(Number(modal.dataset.id)); closeModal(); });
document.querySelector('.modal-edit').addEventListener('click', () => showForm(events.find(item => item.id === Number(modal.dataset.id))));
document.querySelector('.modal-cancel').addEventListener('click', closeModal);
eventForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!eventForm.checkValidity()) { document.querySelector('.form-error').textContent = 'Completa los campos obligatorios.'; return; }
  const data = Object.fromEntries(new FormData(eventForm));
  const existing = events.find(item => item.id === Number(modal.dataset.id));
  if (existing) Object.assign(existing, data); else events.push({ ...data, id: Date.now(), done: false });
  saveEvents(); renderEvents(getActiveFilter()); closeModal();
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
  if (existing) Object.assign(existing, data); else members.push({ ...data, id: Date.now() });
  saveMembers(); renderMembers(); closeMemberModal();
});
document.querySelector('#notifications-button').addEventListener('click', openNotificationsModal);
document.querySelector('.notifications-close').addEventListener('click', closeNotificationsModal);
notificationsModal.addEventListener('click', event => { if (event.target === notificationsModal) closeNotificationsModal(); });
document.querySelector('#mark-all-read').addEventListener('click', () => { notifications.forEach(notification => { notification.read = true; }); saveNotifications(); renderNotifications(); });
document.querySelector('#enable-device-notifications').addEventListener('click', enableDeviceNotifications);
document.querySelector('#update-later').addEventListener('click', closeUpdateModal);
document.querySelector('#update-app').addEventListener('click', async () => {
  localStorage.setItem('my-family-update-version', currentAppVersion);
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) await registration.update();
  }
  window.location.reload();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeModal(); closeNotificationsModal(); closeRecipeModal(); closeDocumentModal(); closeMemberModal(); } });

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
  const upcoming = events.filter(event => event.date >= startKey && event.date <= endKey).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  summaryPeriod.textContent = `${weekStart.getDate()}-${weekEnd.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(weekEnd)}`;
  summary.innerHTML = upcoming.length ? upcoming.slice(0, 6).map(event => `<div class="mini-event ${event.done ? 'done' : ''}"><b>${event.time}</b><span class="member-dot ${memberColorClasses[event.member]}"></span><div><strong>${event.name}</strong><small>${memberNames[event.member]} · ${event.place}</small></div></div>`).join('') : '<p class="week-empty">No hay eventos esta semana.</p>';
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
    const dayEvents = events.filter(event => event.date === key).sort((a, b) => a.time.localeCompare(b.time));
    const eventMarkup = dayEvents.length ? dayEvents.map(event => `<div class="week-event ${event.done ? 'done' : ''}"><span class="week-event-time">${event.time}</span><span class="week-event-name">${event.name}</span></div>`).join('') : '<span class="week-empty">Sin eventos</span>';
    return `<div class="week-day ${key === todayKey ? 'today' : ''}"><div class="week-day-label">${new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day).toUpperCase()}</div><div class="week-day-number">${day.getDate()}</div>${eventMarkup}</div>`;
  }).join('');
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
    const dayEvents = events.filter(event => event.date === cellDateKey);
    const isToday = isCurrentMonth && cellDateKey === todayKey;
    const dots = dayEvents.map(event => `<i class="member-dot ${memberColorClasses[event.member]}" title="${event.name}"></i>`).join('');
    return `<div class="cal-day ${isToday ? 'today' : ''} ${isCurrentMonth ? '' : 'outside-month'}">${displayedDay}<div class="dots">${dots}</div></div>`;
  }).join('');
}
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); const view = link.dataset.view; document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view')); document.querySelector(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); document.querySelector('.sidebar').classList.remove('open'); }));
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
document.querySelector('.member-filter[data-filter*="ayes"]').dataset.filter = 'y' + 'ayes';
document.querySelectorAll('.agenda-summary .member-dot').forEach((dot, index) => { dot.className = `member-dot ${['papa', 'mama', 'diego'][index]}`; });
document.querySelector('#current-date-label').textContent = formatCurrentDate();
saveEvents(); renderEvents(); renderNotifications(); renderRecipes(); renderDocuments(); renderMembers(); buildCalendar(); checkPublishedVersion();
setInterval(checkPublishedVersion, 60000);
setTimeout(() => window.location.reload(), new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime() - Date.now() + 1000);