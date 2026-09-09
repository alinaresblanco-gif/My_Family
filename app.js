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
const defaultNotifications = [
  { id: 1, title: 'Revisión médica', message: 'La cita de Antonio es hoy a las 08:30.', read: false },
  { id: 2, title: 'Documento por caducar', message: 'El seguro del coche vence el 18 de octubre.', read: false }
];
const savedNotifications = localStorage.getItem('my-family-notifications');
const notifications = savedNotifications ? JSON.parse(savedNotifications) : defaultNotifications;

function saveEvents() { localStorage.setItem('my-family-events', JSON.stringify(events)); }
function getActiveFilter() { return document.querySelector('.member-filter.selected').dataset.filter; }
function todayEvents() { return events.filter(event => event.date === todayKey); }
function formatCurrentDate() { return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today).toUpperCase(); }
function saveNotifications() { localStorage.setItem('my-family-notifications', JSON.stringify(notifications)); }
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
  if (permission === 'granted') new Notification('Avisos activados', { body: 'Recibirás las nuevas notificaciones de My Family en este dispositivo.', icon: 'imagenes/logo-myfamily.png' });
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
document.querySelector('#notifications-button').addEventListener('click', openNotificationsModal);
document.querySelector('.notifications-close').addEventListener('click', closeNotificationsModal);
notificationsModal.addEventListener('click', event => { if (event.target === notificationsModal) closeNotificationsModal(); });
document.querySelector('#mark-all-read').addEventListener('click', () => { notifications.forEach(notification => { notification.read = true; }); saveNotifications(); renderNotifications(); });
document.querySelector('#enable-device-notifications').addEventListener('click', enableDeviceNotifications);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeModal(); closeNotificationsModal(); } });

function buildCalendar() {
  const calendar = document.querySelector('#calendar');
  const headings = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const days = Array.from({ length: 35 }, (_, index) => index - 0);
  calendar.innerHTML = headings.map(day => `<div class="cal-head">${day}</div>`).join('') + days.map(day => `<div class="cal-day ${day === 7 ? 'today' : ''}">${day + 1 <= 30 ? day + 1 : day - 29}<div class="dots">${day % 3 === 0 ? '<i class="member-dot papa"></i>' : ''}${day % 4 === 0 ? '<i class="member-dot mama"></i>' : ''}${day % 5 === 0 ? '<i class="member-dot diego"></i>' : ''}</div></div>`).join('');
}
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); const view = link.dataset.view; document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view')); document.querySelector(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); document.querySelector('.sidebar').classList.remove('open'); }));
document.querySelectorAll('#add-event, #add-event-agenda').forEach(button => button.addEventListener('click', openCreateModal));
document.querySelector('.menu-button').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.querySelector('#prev-month').addEventListener('click', () => { document.querySelector('.calendar-toolbar h2').innerHTML = 'AGOSTO <span>2026</span>'; });
document.querySelector('#next-month').addEventListener('click', () => { document.querySelector('.calendar-toolbar h2').innerHTML = 'OCTUBRE <span>2026</span>'; });
document.querySelector('.member-filter[data-filter*="ayes"]').dataset.filter = 'y' + 'ayes';
document.querySelectorAll('.agenda-summary .member-dot').forEach((dot, index) => { dot.className = `member-dot ${['papa', 'mama', 'diego'][index]}`; });
document.querySelector('#current-date-label').textContent = formatCurrentDate();
saveEvents(); renderEvents(); renderNotifications(); buildCalendar();
setTimeout(() => window.location.reload(), new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime() - Date.now() + 1000);