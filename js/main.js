// UI: loading screen, HUD, view dock, hover/click on objects, info cards, shortcuts.
(function () {
    const $ = (sel) => document.querySelector(sel);
    const params = ROOM.params;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    const VIEWS = [
        { id: 'photo', label: 'Foto', icon: 'camera' },
        { id: 'overview', label: 'General', icon: 'home' },
        { id: 'desk', label: 'Escritorio', icon: 'monitor' },
        { id: 'shelf', label: 'Librero', icon: 'book' },
        { id: 'corner', label: 'Rincón', icon: 'music' },
        { id: 'pc', label: 'PC', icon: 'cpu' },
        { id: 'top', label: 'Planta', icon: 'layers' }
    ];

    const OBJECTS = {
        monitors:    { name: 'Monitores', color: '#ff2bd6', kicker: 'Setup',
                       desc: 'Ultrawide curvo de 34" con el fondo del auto neón, y encima un ultrawide de 29" en brazo con la cámara del cuarto.',
                       tags: ['34" curvo', '29" ultrawide', 'Brazo con poste'] },
        pc:          { name: 'PC Gamer', color: '#8b5cf6', kicker: 'Setup',
                       desc: 'Torre tipo cubo con cristal templado, ventiladores RGB morados arriba y rosados al frente, y pantalla de sensores.',
                       tags: ['RGB', 'Cristal templado', '7 ventiladores'] },
        peripherals: { name: 'Teclado y mouse', color: '#b07cff', kicker: 'Setup',
                       desc: 'Teclado mecánico con luz morada, mouse negro y mousepad con triángulos verde lima.',
                       tags: ['RGB morado', 'Full size', 'Mousepad low-poly'] },
        desk:        { name: 'Escritorio', color: '#3d6fd1', kicker: 'Mueble',
                       desc: 'Escritorio azul rey de 1,79 × 0,80 m con paneles laterales; debajo guardo las pesas.',
                       tags: ['1,79 m', 'Laminado azul'] },
        lamp:        { name: 'Lámpara', color: '#d8dde6', kicker: 'Setup',
                       desc: 'Lámpara plateada de brazo articulado, tipo arquitecto.',
                       tags: ['Brazo articulado', 'Plateada'] },
        bookshelf:   { name: 'Librero', color: '#e0553c', kicker: 'Mueble',
                       desc: 'Librero de 5 niveles lleno de libros, con cajas encima y cosas pequeñas en las repisas.',
                       tags: ['5 niveles', '1,88 m'] },
        guitar:      { name: 'Guitarra', color: '#f0a040', kicker: 'Música',
                       desc: 'Guitarra acústica tipo dreadnought en su soporte, junto al librero.',
                       tags: ['Acústica', 'Dreadnought'] },
        fan:         { name: 'Abanico', color: '#9aa3b5', kicker: 'Clima',
                       desc: 'Abanico de pedestal negro de 16" con 5 aspas.',
                       tags: ['16"', 'Pedestal'] },
        chair:       { name: 'Silla', color: '#a39a90', kicker: 'Mueble',
                       desc: 'Silla de oficina gris con apoyabrazos negros y base de 5 ruedas.',
                       tags: ['Tela gris', 'Giratoria'] },
        dumbbells:   { name: 'Pesas', color: '#ff3b3b', kicker: 'Gym',
                       desc: 'Mancuernas ajustables con discos negros y seguros rojos, guardadas bajo el escritorio.',
                       tags: ['Ajustables', 'Spinlock'] }
    };

    const LOADING_NAMES = {
        surfaces: 'paredes y piso', desk: 'escritorio', monitors: 'monitores', pc: 'PC gamer',
        peripherals: 'teclado y mouse', lamp: 'lámpara', bookshelf: 'librero', guitar: 'guitarra',
        fan: 'abanico', chair: 'silla', dumbbells: 'pesas'
    };

    const icon = (name) => `<svg class="icon"><use href="#i-${name}"/></svg>`;

    // ---------- toast ----------
    let toastTimer = null;
    function toast(text) {
        const t = $('#toast');
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }

    // ---------- loading ----------
    function onProgress(done, total, name) {
        const pct = Math.round((done / Math.max(1, total)) * 100);
        $('#loaderFill').style.width = pct + '%';
        $('#loaderPct').textContent = pct + '%';
        $('#loaderLabel').textContent = name ? `Construyendo ${LOADING_NAMES[name] || name}…` : 'Listo';
    }

    // ---------- views ----------
    let currentView = params.get('view') || 'photo';
    let returnView = currentView;

    function markView(id) {
        currentView = id;
        document.querySelectorAll('#viewButtons .dock-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === id);
        });
    }

    function goView(id) {
        closeCard();
        markView(id);
        returnView = id;
        if (reduceMotion) ROOM.setView(id);
        else ROOM.goToView(id, { duration: 1.5 });
    }

    function buildDock() {
        const wrap = $('#viewButtons');
        VIEWS.forEach((v, i) => {
            const b = document.createElement('button');
            b.className = 'dock-btn';
            b.dataset.view = v.id;
            b.title = `${v.label} (${i + 1})`;
            b.setAttribute('aria-label', `Vista ${v.label}`);
            b.innerHTML = `${icon(v.icon)}<span>${v.label}</span>`;
            b.addEventListener('click', () => goView(v.id));
            wrap.appendChild(b);
        });
        markView(currentView);
        // Dragging the camera leaves the preset
        ROOM.controls.addEventListener('start', () => markView(null));
    }

    // ---------- objects panel ----------
    function buildObjectList() {
        const list = $('#objectList');
        Object.entries(OBJECTS).forEach(([id, o]) => {
            if (!ROOM.groups[id]) return;
            const li = document.createElement('li');
            li.innerHTML = `<button class="object-item" data-object="${id}"><i class="swatch" style="color:${o.color};background:${o.color}"></i>${o.name}</button>`;
            li.firstChild.addEventListener('click', () => {
                openCard(id);
                if (window.innerWidth <= 720) togglePanel(false);
            });
            list.appendChild(li);
        });
    }

    function togglePanel(force) {
        const panel = $('#objectsPanel');
        const open = force === undefined ? !panel.classList.contains('open') : force;
        panel.classList.toggle('open', open);
        $('#objectsBtn').setAttribute('aria-pressed', String(open));
    }

    // ---------- info card ----------
    let cardObject = null;
    function openCard(id) {
        const o = OBJECTS[id];
        if (!o) return;
        cardObject = id;
        $('#cardKicker').textContent = o.kicker;
        $('#cardTitle').textContent = o.name;
        $('#cardDesc').textContent = o.desc;
        $('#cardTags').innerHTML = o.tags.map(t => `<span class="tag">${t}</span>`).join('');
        $('#infoCard').classList.add('open');
        document.querySelectorAll('.object-item').forEach(b => b.classList.toggle('active', b.dataset.object === id));
        hideHint();
        markView(null);
        ROOM.focusObject(id, { duration: reduceMotion ? 0.01 : 1.3 });
    }

    function closeCard() {
        cardObject = null;
        $('#infoCard').classList.remove('open');
        document.querySelectorAll('.object-item.active').forEach(b => b.classList.remove('active'));
    }

    // ---------- hover + click picking ----------
    const canvas = ROOM.renderer.domElement;
    const tooltip = $('#tooltip');
    let hoverName = null;
    let pendingMove = null;
    let down = null;

    function setHover(name, x, y) {
        if (name && OBJECTS[name]) {
            const o = OBJECTS[name];
            if (hoverName !== name) {
                tooltip.innerHTML = `<i class="swatch" style="color:${o.color};background:${o.color}"></i>${o.name}<small>${isTouch ? '' : 'clic'}</small>`;
            }
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
            tooltip.classList.add('show');
            canvas.classList.add('pointer');
        } else {
            tooltip.classList.remove('show');
            canvas.classList.remove('pointer');
        }
        hoverName = name;
    }

    canvas.addEventListener('pointermove', (e) => {
        if (isTouch || e.buttons) { if (hoverName) setHover(null); return; }
        if (!pendingMove) {
            requestAnimationFrame(() => {
                const ev = pendingMove;
                pendingMove = null;
                const hit = ROOM.pick(ev.clientX, ev.clientY);
                setHover(hit && hit.name, ev.clientX, ev.clientY);
            });
        }
        pendingMove = e;
    });
    canvas.addEventListener('pointerleave', () => setHover(null));
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const quick = performance.now() - down.t < 450;
        down = null;
        if (moved > 6 || !quick) return;
        const hit = ROOM.pick(e.clientX, e.clientY);
        if (hit && OBJECTS[hit.name]) openCard(hit.name);
        else closeCard();
    });

    // ---------- tools ----------
    function setTheme(night) {
        ROOM.setNight(night);
        document.body.classList.toggle('theme-day', !night);
        const btn = $('#themeBtn');
        btn.innerHTML = night ? `${icon('sun')}<span>Día</span>` : `${icon('moon')}<span>Noche</span>`;
        btn.setAttribute('aria-label', night ? 'Cambiar a modo día' : 'Cambiar a modo noche');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', night ? '#07060d' : '#cfe8ff');
    }

    let rotating = false;
    function toggleRotate() {
        rotating = !rotating;
        ROOM.setAutoRotate(rotating);
        $('#rotateBtn').setAttribute('aria-pressed', String(rotating));
        toast(rotating ? 'Rotación automática activada' : 'Rotación automática desactivada');
    }

    function screenshot() {
        try {
            const url = ROOM.renderer.domElement.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mi-cuarto-3d.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast('📸 Captura guardada');
        } catch (e) {
            toast('No se pudo guardar la captura');
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => toast('Pantalla completa no disponible'));
        else document.exitFullscreen();
    }

    function toggleUi(force) {
        const hidden = force === undefined ? !document.body.classList.contains('ui-hidden') : force;
        document.body.classList.toggle('ui-hidden', hidden);
        if (hidden) setHover(null);
    }

    function toggleHelp(force) {
        const h = $('#help');
        h.classList.toggle('open', force === undefined ? !h.classList.contains('open') : force);
    }

    // ---------- hint ----------
    function showHint() {
        const h = $('#hint');
        h.innerHTML = isTouch
            ? '<span><b>Arrastra</b> para girar · <b>Pellizca</b> para acercar</span><span><b>Toca</b> un objeto para verlo</span>'
            : '<span><b>Arrastra</b> para girar · <b>Rueda</b> para acercar · <b>Clic derecho</b> para mover</span><span><b>Clic</b> en un objeto para verlo · <b>?</b> atajos</span>';
        setTimeout(hideHint, 9000);
    }
    function hideHint() { $('#hint').classList.add('gone'); }

    // ---------- HUD chips ----------
    function startClock() {
        const el = $('#clock');
        const tick = () => {
            el.textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        };
        tick();
        setInterval(tick, 15000);
    }

    function startFps() {
        const el = $('#fps');
        let frames = 0, acc = 0;
        ROOM.onFrame((t, dt) => {
            frames++;
            acc += dt;
            if (acc >= 0.5) {
                el.textContent = `${Math.round(frames / acc)} FPS`;
                frames = 0;
                acc = 0;
            }
        });
    }

    // ---------- wiring ----------
    function wire() {
        $('#themeBtn').addEventListener('click', () => setTheme(!ROOM.isNight));
        $('#rotateBtn').addEventListener('click', toggleRotate);
        $('#objectsBtn').addEventListener('click', () => togglePanel());
        $('#objectsClose').addEventListener('click', () => togglePanel(false));
        $('#shotBtn').addEventListener('click', screenshot);
        $('#hideBtn').addEventListener('click', () => toggleUi(true));
        $('#showUi').addEventListener('click', () => toggleUi(false));
        $('#helpBtn').addEventListener('click', () => toggleHelp());
        $('#help').addEventListener('click', (e) => { if (e.target.id === 'help') toggleHelp(false); });
        $('#cardClose').addEventListener('click', closeCard);
        $('#cardBack').addEventListener('click', () => goView(returnView || 'photo'));
        if (document.fullscreenEnabled) $('#fullBtn').addEventListener('click', toggleFullscreen);
        else $('#fullBtn').remove();
        ROOM.renderer.domElement.addEventListener('pointerdown', hideHint, { once: true });

        window.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key.toLowerCase();
            const n = parseInt(k, 10);
            if (n >= 1 && n <= VIEWS.length) goView(VIEWS[n - 1].id);
            else if (k === 't') setTheme(!ROOM.isNight);
            else if (k === 'r') toggleRotate();
            else if (k === 'o') togglePanel();
            else if (k === 'p') screenshot();
            else if (k === 'f' && document.fullscreenEnabled) toggleFullscreen();
            else if (k === 'h') toggleUi();
            else if (k === '?' || k === '/') toggleHelp();
            else if (k === 'escape') { closeCard(); togglePanel(false); toggleHelp(false); }
        });
    }

    // ---------- start ----------
    ROOM.start(onProgress).then(() => {
        buildDock();
        buildObjectList();
        wire();
        startClock();
        startFps();
        setTimeout(() => $('#loading').classList.add('hidden'), 250);

        // Cinematic fly-in to the photo viewpoint
        if (!params.has('view') && !params.has('nointro') && !reduceMotion) {
            const v = ROOM.layout.views.photo;
            ROOM.camera.position.set(v.position[0] + 3.2, v.position[1] + 1.6, v.position[2] + 3.6);
            ROOM.controls.target.set(...v.target);
            ROOM.controls.update();
            setTimeout(() => ROOM.goToView('photo', { duration: 2.8, lift: 0 }), 350);
        }
        showHint();
    });
})();
