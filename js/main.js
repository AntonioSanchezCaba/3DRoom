// Builds every registered object, then starts rendering.
ROOM.start();
setTimeout(() => document.getElementById('loading').classList.add('hidden'), 600);

// UI buttons
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    ROOM.setNight(!ROOM.isNight);
    themeToggle.textContent = ROOM.isNight ? '☀️ Modo Día' : '🌙 Modo Noche';
});

let currentView = ROOM.params.get('view') || 'photo';
const viewToggle = document.getElementById('viewToggle');
function updateViewLabel() {
    viewToggle.textContent = currentView === 'photo' ? '🏠 Vista general' : '📷 Vista foto';
}
viewToggle.addEventListener('click', () => {
    currentView = currentView === 'photo' ? 'overview' : 'photo';
    ROOM.setView(currentView);
    updateViewLabel();
});
updateViewLabel();
