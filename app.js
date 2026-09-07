const events = [
  { id: 1, member: 'mama', name: 'Revisión médica', time: '08:30', place: 'Centro de salud familiar', category: '🏥 Médico', done: false },
  { id: 2, member: 'lucia', name: 'Clases de piano', time: '16:00', place: 'Aula 3 · Conservatorio', category: '🎵 Actividad', done: false },
  { id: 3, member: 'papa', name: 'Entrenamiento', time: '19:30', place: 'Pabellón municipal', category: '⚽ Ocio', done: false },
  { id: 4, member: 'diego', name: 'Entregar proyecto', time: '20:00', place: 'Tarea del colegio', category: '🧾 Tareas', done: false },
  { id: 5, member: 'mama', name: 'Comprar fruta', time: '20:30', place: 'Lista familiar', category: '🛒 Tareas', done: true }
];
const memberNames = { mama: 'Mamá', papa: 'Papá', lucia: 'Lucía', diego: 'Diego' };
const grid = document.querySelector('#sticky-grid');
const modal = document.querySelector('#event-modal');

function renderEvents(filter = 'todos') {
  const visible = events.filter(event => filter === 'todos' || event.member === filter).sort((a, b) => a.time.localeCompare(b.time));
  grid.innerHTML = visible.map(event => `<article class="sticky ${event.member} ${event.done ? 'done' : ''}" data-id="${event.id}"><span class="sticky-time">${event.time}</span><h3>${event.name}</h3><p>${event.place}</p><div class="sticky-foot"><span class="category">${event.category}</span><button class="done-button" data-done="${event.id}">${event.done ? '✓ Hecho' : 'Marcar hecho'}</button></div></article>`).join('');
  document.querySelector('#pending-count').textContent = events.filter(event => !event.done).length;
  grid.querySelectorAll('.sticky').forEach(card => card.addEventListener('click', () => openModal(Number(card.dataset.id))));
  grid.querySelectorAll('[data-done]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); toggleDone(Number(button.dataset.done)); }));
}
function toggleDone(id) { const event = events.find(item => item.id === id); event.done = !event.done; renderEvents(document.querySelector('.member-filter.selected').dataset.filter); }
function openModal(id) { const event = events.find(item => item.id === id); document.querySelector('#modal-title').textContent = event.name; document.querySelector('.modal-category').textContent = event.category.toUpperCase(); document.querySelector('.modal-member').innerHTML = `<i class="member-dot ${event.member}"></i> ${memberNames[event.member]}`; document.querySelectorAll('.modal-detail')[0].textContent = `Hoy, lunes 7 de septiembre · ${event.time}`; document.querySelectorAll('.modal-detail')[1].textContent = event.place; modal.dataset.id = id; modal.classList.add('open'); }
function closeModal() { modal.classList.remove('open'); }
document.querySelectorAll('.member-filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.member-filter.selected').classList.remove('selected'); button.classList.add('selected'); renderEvents(button.dataset.filter); }));
document.querySelector('.modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.querySelector('.modal-done').addEventListener('click', () => { toggleDone(Number(modal.dataset.id)); closeModal(); });

function buildCalendar() {
  const calendar = document.querySelector('#calendar');
  const headings = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const days = Array.from({ length: 35 }, (_, index) => index - 0);
  calendar.innerHTML = headings.map(day => `<div class="cal-head">${day}</div>`).join('') + days.map(day => `<div class="cal-day ${day === 7 ? 'today' : ''}">${day + 1 <= 30 ? day + 1 : day - 29}<div class="dots">${day % 3 === 0 ? '<i class="member-dot mama"></i>' : ''}${day % 4 === 0 ? '<i class="member-dot lucia"></i>' : ''}${day % 5 === 0 ? '<i class="member-dot papa"></i>' : ''}</div></div>`).join('');
}
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); const view = link.dataset.view; document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view')); document.querySelector(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); document.querySelector('.sidebar').classList.remove('open'); }));
document.querySelectorAll('#add-event, #add-event-agenda').forEach(button => button.addEventListener('click', () => openModal(1)));
document.querySelector('.menu-button').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.querySelector('#prev-month').addEventListener('click', () => { document.querySelector('.calendar-toolbar h2').innerHTML = 'AGOSTO <span>2026</span>'; });
document.querySelector('#next-month').addEventListener('click', () => { document.querySelector('.calendar-toolbar h2').innerHTML = 'OCTUBRE <span>2026</span>'; });
renderEvents(); buildCalendar();