// Bookshelf: tall espresso laminate bookcase (6 open compartments) against the back wall, left corner.
// Books are merged into one geometry per shelf and share a single canvas spine atlas.
ROOM.register('bookshelf', (ctx) => {
    const { THREE, L, group, mat, canvasTexture, roundedBoxGeometry, rng, shadows } = ctx;
    const B = L.bookshelf;

    // ---------------------------------------------------------------- carcass dimensions
    // in the photo both front edges sit ~6-10 px inside the layout's footprint, so the carcass is 5 cm narrower
    const X0 = B.minX + 0.025, X1 = B.maxX - 0.015, ZW = B.minZ, ZF = B.maxZ, H = B.height;
    const T = 0.018;                       // panel thickness
    const ZBP = ZW + 0.002;                // back panel rear face (2 mm off the wall)
    const ZB = ZBP + 0.005;                // back panel front face = rear of the compartments
    const IX0 = X0 + T, IX1 = X1 - T;      // inner faces of the side panels
    const TOP_Y = H - T;                   // underside of the top panel
    // top surfaces of the boards, bottom -> top (measured from the photo)
    const SHELF = [0.065, 0.347, 0.677, 1.0, 1.305, 1.60];

    // ---------------------------------------------------------------- materials
    const grain = (vertical, seed) => canvasTexture(512, 512, (g, w, h) => {
        const r = rng(seed);
        g.fillStyle = '#d2d2d2';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 300; i++) {
            const p = r() * (vertical ? w : h), wid = 0.4 + r() * 2.2;
            const lum = r() < 0.55 ? 255 : 150;
            g.fillStyle = `rgba(${lum},${lum},${lum},${0.015 + r() * 0.035})`;
            if (vertical) g.fillRect(p, 0, wid, h); else g.fillRect(0, p, w, wid);
        }
        for (let i = 0; i < 2500; i++) {
            const lum = r() < 0.5 ? 255 : 90;
            g.fillStyle = `rgba(${lum},${lum},${lum},0.03)`;
            if (vertical) g.fillRect(r() * w, r() * h, 1, 4 + r() * 16);
            else g.fillRect(r() * w, r() * h, 4 + r() * 16, 1);
        }
    });
    const WOOD = 0x28261e;
    const grainH = grain(false, 12);
    const woodV = mat(WOOD, { roughness: 0.38, map: grain(true, 11), vertexColors: true });
    const woodH = mat(WOOD, { roughness: 0.38, map: grainH, vertexColors: true });
    // the top surface catches the ceiling light with a soft sheen in the photo
    const woodTop = mat(0x3a352b, { roughness: 0.3, map: grainH, vertexColors: true });
    const backMat = mat(0x070605, { roughness: 0.9, vertexColors: true });

    // vertex-colour "ambient occlusion": darken the inside of the compartments towards the back
    function shade(geo, fn) {
        const p = geo.attributes.position, n = geo.attributes.normal;
        const c = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
            const v = fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
            c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
        return geo;
    }
    const depthK = z => THREE.MathUtils.clamp((z - ZB) / (ZF - ZB), 0, 1);

    function panel(x0, x1, y0, y1, z0, z1, material, fn) {
        const geo = roundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 0.0015, 1);
        geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        shade(geo, fn || (() => 1));
        const m = new THREE.Mesh(geo, material);
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        return m;
    }

    // side panels (inner faces darkened towards the back)
    const sideAO = (innerSign) => (x, y, z, nx) => (nx * innerSign > 0.5 ? 0.12 + 0.88 * depthK(z) : 1);
    panel(X0, X0 + T, 0, TOP_Y, ZB, ZF, woodV, sideAO(1));
    panel(X1 - T, X1, 0, TOP_Y, ZB, ZF, woodV, sideAO(-1));
    // top panel (full width, covers the sides and the back panel)
    panel(X0, X1, TOP_Y, H, ZBP, ZF, woodTop, (x, y, z, nx, ny) => (ny < -0.5 ? 0.08 + 0.4 * depthK(z) : 1));
    // thin back panel
    panel(X0 + 0.002, X1 - 0.002, 0.004, TOP_Y, ZBP, ZB, backMat, (x, y) => (y < 0.07 ? 0.6 : 1));
    // boards
    SHELF.forEach((top, i) => {
        panel(IX0, IX1, top - T, top, ZB, ZF - 0.002, woodH, (x, y, z, nx, ny) => {
            if (ny > 0.5) return 0.1 + 0.9 * Math.pow(depthK(z), 1.5);
            if (ny < -0.5) return i === 0 ? 0.4 : 0.08 + 0.4 * depthK(z);
            return 1;
        });
    });
    // kick plate under the bottom board
    panel(IX0, IX1, 0.004, SHELF[0] - T, ZF - 0.022, ZF - 0.004, woodH, () => 0.8);

    // ---------------------------------------------------------------- book specs
    // [colour, thickness cm, height cm, style, accent, ink]
    const S1 = [
        ['#e2d8c2', 8.5, 25.4, 'worn', '#b8ae98', '#8a806c'],
        ['#bc3a26', 6.4, 25.6, 'plain', '#f2e6d0', '#f2e6d0'],
        ['#141414', 4.4, 24.2, 'graphic', '#ece6dc', '#d23a2a'],
        ['#1d2a4c', 2.0, 23.6, 'band', '#c9b27a', '#c9b27a'],
        ['#2a58a4', 2.4, 23.2, 'plain', '#ffffff', '#f4f4f4'],
        ['#1c1e24', 1.7, 22.6, 'stripe', '#3a78d0', '#d8d8d8'],
        ['#ebe6da', 3.4, 23.0, 'plain', '#2a2a2a', '#2a2a2a'],
        ['#c8ab7e', 2.4, 21.6, 'band', '#5a3a20', '#3a2614'],
        ['#5c2e22', 3.0, 22.2, 'pattern', '#e0a878', '#f0d0a0'],
        ['#2a2420', 2.0, 21.4, 'plain', '#c8a050', '#c8a050'],
        ['#dce6cc', 6.0, 20.6, 'pattern', '#3e7a3a', '#2a4a24'],
        ['#d6c29a', 4.4, 22.0, 'plain', '#5a4630', '#4a3a28'],
        ['#cfc2a6', 3.0, 21.4, 'label', '#303030', '#e8e8e0'],
        ['#1a1a1a', 2.0, 20.2, 'band', '#b03020', '#d8d8d8'],
        ['#7a2e24', 2.8, 21.6, 'plain', '#e8d8b0', '#e8d8b0'],
        ['#1e1816', 3.0, 20.6, 'graphic', '#d0601e', '#e8c080'],
        ['#3a2a2a', 2.0, 20.0, 'plain', '#d0b080', '#d0b080'],
        ['#d8cfc0', 2.6, 20.4, 'stripe', '#c03030', '#303030'],
        ['#b86a5a', 3.4, 20.0, 'plain', '#3a2a28', '#3a2a28'],
        ['#2b2b30', 2.0, 21.0, 'plain', '#dddddd', '#dddddd']
    ];
    const S2 = [
        ['#1f2a22', 2.6, 24.6, 'pattern', '#c8d0b0', '#e0e0c8'],
        ['#101412', 2.4, 24.0, 'stripe', '#6aa040', '#d0d0d0'],
        ['#ecebe4', 2.4, 24.0, 'plain', '#333333', '#333333'],
        ['#7a9a40', 3.8, 23.6, 'pattern', '#c0d070', '#1e3a10'],
        ['#efebe2', 8.6, 25.2, 'logo', '#c8302a', '#7a7a7a'],
        ['#e6d9b0', 2.4, 22.0, 'plain', '#7a5a2a', '#7a5a2a'],
        ['#d6a632', 3.8, 22.6, 'band', '#7a3a10', '#5a2a08'],
        ['#2b7f9a', 3.0, 21.6, 'plain', '#f0f0f0', '#f0f0f0'],
        ['#1c2f5a', 2.0, 21.2, 'band', '#d0b060', '#d0b060'],
        ['#1f4f86', 2.8, 21.0, 'plain', '#e0c060', '#e8e8e8'],
        ['#8a3a2a', 2.4, 20.6, 'plain', '#f0d8a0', '#f0d8a0'],
        ['#e09a2a', 3.8, 20.0, 'label', '#7a2a10', '#f8e8c8'],
        ['#2a2220', 2.0, 20.4, 'plain', '#c0a070', '#c0a070'],
        ['#c8321e', 3.4, 19.6, 'plain', '#f8e8c0', '#f8e8c0'],
        ['#d8402a', 3.4, 19.0, 'band', '#f0d050', '#f8f0d0'],
        ['#e8b040', 3.0, 19.4, 'plain', '#5a2a10', '#5a2a10'],
        ['#c9a868', 3.6, 18.2, 'graphic', '#5a3a20', '#3a2414'],
        ['#ebe8e0', 3.2, 18.6, 'plain', '#333333', '#333333']
    ];
    const S3 = [
        ['#3a3f8a', 5.5, 25.6, 'pattern', '#d070a0', '#f0d0e0'],
        ['#ecebe6', 2.4, 24.6, 'plain', '#334455', '#334455'],
        ['#d8502a', 3.4, 24.0, 'band', '#f8e0b0', '#f8e0b0'],
        ['#e87a2a', 3.0, 23.6, 'plain', '#ffffff', '#ffffff'],
        ['#b8302a', 2.0, 23.0, 'plain', '#f0d080', '#f0d080'],
        ['#c9b48a', 2.4, 21.0, 'band', '#5a4030', '#3a2a20'],
        ['#efe9da', 2.6, 22.6, 'plain', '#444444', '#444444'],
        ['#f2f0ea', 3.0, 23.0, 'stripe', '#2a6ab0', '#2a2a2a'],
        ['#2a62b8', 4.0, 22.6, 'plain', '#ffffff', '#ffffff'],
        ['#5ab8e0', 3.4, 22.0, 'label', '#103050', '#e8f4ff'],
        ['#141414', 3.0, 21.6, 'plain', '#f0f0f0', '#f0f0f0'],
        ['#2a2a2e', 2.4, 21.0, 'band', '#c0a060', '#c0a060'],
        ['#ece6d6', 3.4, 21.0, 'plain', '#7a3020', '#7a3020'],
        ['#c8b088', 2.0, 20.0, 'plain', '#333333', '#333333'],
        ['#2a8a8a', 2.0, 20.6, 'stripe', '#e0e0e0', '#e0e0e0'],
        ['#efe6cf', 2.0, 20.0, 'plain', '#555555', '#555555'],
        ['#e0a028', 2.4, 19.6, 'band', '#6a2a10', '#4a1a08'],
        ['#c42a22', 2.4, 19.6, 'plain', '#f0e0b0', '#f0e0b0'],
        ['#8a1e1e', 2.0, 19.0, 'plain', '#d8b060', '#d8b060'],
        ['#e8e4dc', 2.0, 19.6, 'plain', '#c03020', '#c03020'],
        ['#c8402a', 2.6, 18.6, 'band', '#2a2a2a', '#f8f0e0'],
        ['#20406a', 2.2, 19.0, 'plain', '#e0e0e0', '#e0e0e0'],
        ['#efe8d8', 2.6, 18.4, 'plain', '#a02020', '#a02020'],
        ['#d06a30', 2.4, 18.0, 'band', '#f0e0c0', '#f0e0c0']
    ];
    // books lying flat (stack in front of shelf 2 + odd ones), defined later

    const SHELF_LIGHT = { 5: 0.8, 4: 0.57, 3: 0.45 };
    const books = [];          // every book: {color, accent, ink, style, t, h, d, pages, cell, aux, geo params}
    const shelfGeos = {};      // shelf index -> list of transformed geometries
    const PAGE_COLS = ['#efe6cf', '#f3efe4', '#e6d6ae', '#ece2c8'];

    function addBook(shelfKey, spec, place) {
        const b = {
            color: spec.color, accent: spec.accent, ink: spec.ink, style: spec.style,
            t: spec.t, h: spec.h, d: spec.d, pages: spec.pages || PAGE_COLS[books.length % PAGE_COLS.length],
            hard: spec.hard, place, shelfKey, seed: 100 + books.length * 7,
            vary: 0.9 + ((books.length * 37) % 13) / 13 * 0.16
        };
        b.index = books.length;
        books.push(b);
        return b;
    }

    // Row of upright books filling a compartment from left to right
    function fillRow(shelfKey, list, y, seed, opts = {}) {
        const r = rng(seed);
        const x0 = opts.x0 !== undefined ? opts.x0 : IX0 + 0.002;
        const x1 = opts.x1 !== undefined ? opts.x1 : IX1 - 0.002;
        const gaps = list.map(() => 0.0006 + r() * 0.0018);
        let sum = 0, extra = 0;
        list.forEach((s, i) => {
            sum += s[1] / 100 + gaps[i];
            const ln = opts.lean && opts.lean[i];
            if (ln) extra += s[2] / 100 * Math.sin(ln);
        });
        const k = THREE.MathUtils.clamp((x1 - x0 - extra) / sum, 0.8, 1.3);
        let cx = x0;
        list.forEach((s, i) => {
            const t = s[1] / 100 * k, h = s[2] / 100;
            const d = opts.depth ? opts.depth(i, h, r) : THREE.MathUtils.clamp(h * 0.66 + r() * 0.012, 0.13, 0.2);
            const lean = opts.lean && opts.lean[i] ? opts.lean[i] : 0;
            // books are pulled forward to the shelf edge (as in the photo); inset = spine distance from the front
            const inset = (opts.inset ? opts.inset(i) : 0.014) + r() * 0.008;
            const zFront = Math.max(ZF - inset, ZB + d + 0.001);
            let px = cx, adv;
            if (lean > 0) { px = cx + h * Math.sin(lean); adv = px + t * Math.cos(lean) - cx; } else adv = t;
            if (cx + adv > x1 + 0.0005) return;          // never poke through the side panel
            addBook(shelfKey, { color: s[0], t, h, d, style: s[3], accent: s[4], ink: s[5], hard: t > 0.04 || r() < 0.3 },
                { type: 'up', x: px, y: y + 0.0004, z: zFront - d / 2, lean });
            cx += adv + gaps[i];
        });
    }

    fillRow(5, S1, SHELF[5], 21, {
        depth: (i, h, r) => 0.15 + r() * 0.03 + (i < 3 ? 0.02 : 0),
        inset: i => (i < 10 ? 0.012 : 0.052)
    });
    fillRow(4, S2, SHELF[4], 22, {
        depth: (i, h, r) => (i >= 7 ? 0.124 + r() * 0.012 : 0.15 + r() * 0.03),
        inset: i => (i < 4 ? 0.014 : i < 7 ? 0.075 : 0.152)
    });
    fillRow(3, S3, SHELF[3], 23, { lean: { 21: 0.05, 22: 0.07 }, inset: i => 0.014 + (i > 12 ? 0.012 : 0) });

    // stack of books lying flat at the front right of shelf 2
    const stackSpecs = [
        { color: '#e8e2d2', t: 0.03, h: 0.17, d: 0.112, style: 'plain', accent: '#555', ink: '#555', dx: 0.0, rot: 0.02 },
        { color: '#d9cfb2', t: 0.024, h: 0.165, d: 0.108, style: 'band', accent: '#8a5a30', ink: '#5a3a20', dx: 0.005, rot: -0.05 },
        { color: '#e4dccb', t: 0.02, h: 0.16, d: 0.105, style: 'plain', accent: '#a03020', ink: '#a03020', dx: -0.003, rot: 0.03 },
        { color: '#3a7a68', t: 0.024, h: 0.155, d: 0.104, style: 'label', accent: '#f0f0e8', ink: '#204a40', dx: -0.006, rot: 0.08, pages: '#f3efe4' }
    ];
    let sy = SHELF[4] + 0.0004;
    stackSpecs.forEach(s => {
        addBook(4, s, { type: 'flat', x: -1.345 + s.dx, y: sy, z: ZF - 0.014 - s.d / 2, rot: s.rot });
        sy += s.t + 0.0006;
    });

    // ---------------------------------------------------------------- spine atlas
    const AW = 2048, CW = 48, CH = 448, COLS = 42, AUXW = 32, AUXH = 64, AUX_Y = 4 * CH, AUX_COLS = 64;
    books.forEach(b => {
        b.cell = { x: (b.index % COLS) * CW + 4, y: Math.floor(b.index / COLS) * CH };
        b.aux = { x: (b.index % AUX_COLS) * AUXW, y: AUX_Y + Math.floor(b.index / AUX_COLS) * AUXH };
    });

    const WORDS = ['THE', 'OF', 'NIGHT', 'HOUSE', 'LAST', 'STAR', 'WIND', 'RIVER', 'GARDEN', 'SHADOW', 'TIME',
        'KING', 'SEA', 'LOVE', 'WAR', 'CITY', 'STONE', 'LIGHT', 'FIRE', 'BLUE', 'SECRET', 'WINTER', 'GOLD',
        'IRON', 'DREAM', 'ROAD', 'MOON', 'LOST', 'WILD', 'HEART', 'EMPIRE', 'GLASS', 'SILENT', 'NORTH', 'ORIGIN',
        'ATLAS', 'CODEX', 'LA', 'EL', 'DE', 'SOMBRA', 'VIENTO', 'MAR', 'NOCHE', 'TIERRA', 'CASA', 'HISTORIA'];
    const NAMES = ['GARCIA', 'MARTIN', 'HUXLEY', 'ORWELL', 'LOPEZ', 'KING', 'ROWAN', 'MORALES', 'HESSE', 'NOVAK',
        'REYES', 'BRONTE', 'VERNE', 'SAGAN', 'ASIMOV', 'PEREZ', 'DUMAS', 'TOLKEN'];

    function drawBook(g, b) {
        const r = rng(b.seed);
        const { x, y } = b.cell;
        const w = b.t * 1000, h = b.h * 1000;    // spine size in mm
        // ---- spine
        g.save();
        g.beginPath(); g.rect(x - 4, y, CW, CH); g.clip();
        g.fillStyle = b.color; g.fillRect(x - 4, y, CW, CH);
        g.translate(x - 4 + 2, y + 2);
        g.scale((CW - 4) / w, (CH - 4) / h);
        const A = b.accent, ink = b.ink;
        let ty0 = h * 0.1, ty1 = h * 0.62;           // title span along the spine
        switch (b.style) {
            case 'band':
                g.fillStyle = A;
                g.fillRect(0, h * 0.045, w, h * 0.06); g.fillRect(0, h * 0.84, w, h * 0.075);
                g.fillRect(0, h * 0.122, w, h * 0.008); g.fillRect(0, h * 0.82, w, h * 0.008);
                ty0 = h * 0.16; ty1 = h * 0.6;
                break;
            case 'label':
                g.fillStyle = A; g.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.48);
                g.fillStyle = ink; g.fillRect(w * 0.1, h * 0.6, w * 0.8, h * 0.006);
                ty0 = h * 0.13; ty1 = h * 0.55;
                break;
            case 'stripe':
                g.fillStyle = A; g.fillRect(w * 0.64, 0, w * 0.22, h);
                break;
            case 'pattern':
                g.fillStyle = A;
                for (let i = 0; i < 46; i++) {
                    g.globalAlpha = 0.35 + r() * 0.5;
                    g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 2.4, 0, Math.PI * 2); g.fill();
                }
                for (let i = 0; i < 10; i++) {
                    g.globalAlpha = 0.5;
                    g.beginPath(); g.moveTo(r() * w, r() * h);
                    g.quadraticCurveTo(r() * w, r() * h, r() * w, r() * h);
                    g.lineWidth = 0.6; g.strokeStyle = A; g.stroke();
                }
                g.globalAlpha = 1;
                g.fillStyle = b.color; g.globalAlpha = 0.8; g.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.42); g.globalAlpha = 1;
                break;
            case 'graphic': {
                g.fillStyle = A;
                g.beginPath(); g.ellipse(w * 0.5, h * 0.36, w * 0.3, w * 0.36, 0, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.moveTo(w * 0.08, h * 0.7);
                g.quadraticCurveTo(w * 0.05, h * 0.44, w * 0.5, h * 0.43);
                g.quadraticCurveTo(w * 0.98, h * 0.45, w * 0.9, h * 0.7); g.closePath(); g.fill();
                g.fillStyle = b.color;
                g.beginPath(); g.ellipse(w * 0.38, h * 0.35, w * 0.06, w * 0.05, 0, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.ellipse(w * 0.62, h * 0.35, w * 0.06, w * 0.05, 0, 0, Math.PI * 2); g.fill();
                ty0 = h * 0.04; ty1 = h * 0.26;
                break;
            }
            case 'logo':
                g.fillStyle = A;
                g.beginPath(); g.ellipse(w * 0.5, h * 0.07, Math.min(w * 0.22, 9), Math.min(w * 0.22, 9), 0, 0, Math.PI * 2); g.fill();
                ty0 = h * 0.2; ty1 = h * 0.5;
                break;
            case 'worn':
                g.fillStyle = A;
                for (let i = 0; i < 30; i++) { g.globalAlpha = 0.25; g.fillRect(r() * w, r() * h, 0.5 + r() * 3, 2 + r() * 12); }
                g.globalAlpha = 1;
                break;
            default: break;
        }
        // title along the spine (reads top to bottom), author, publisher mark
        const words = [];
        const nw = 1 + Math.floor(r() * 3);
        for (let i = 0; i < nw; i++) words.push(WORDS[Math.floor(r() * WORDS.length)]);
        const title = words.join(' ');
        const fs = Math.min(w * 0.46, 8.5);
        g.fillStyle = ink;
        g.textBaseline = 'middle';
        g.font = `${r() < 0.5 ? 'bold ' : ''}${fs.toFixed(2)}px ${r() < 0.5 ? 'serif' : 'sans-serif'}`;
        g.save(); g.translate(w * 0.5, ty0); g.rotate(Math.PI / 2);
        g.fillText(title, 0, 0, ty1 - ty0);
        g.restore();
        if (b.style !== 'graphic') {
            g.font = `${(fs * 0.7).toFixed(2)}px sans-serif`;
            g.save(); g.translate(w * 0.5, h * 0.66); g.rotate(Math.PI / 2);
            g.fillText(NAMES[Math.floor(r() * NAMES.length)], 0, 0, h * 0.16);
            g.restore();
        }
        g.fillStyle = b.style === 'band' ? b.color : ink;
        const pm = Math.min(w * 0.3, 5);
        if (r() < 0.5) g.fillRect(w * 0.5 - pm / 2, h * 0.88, pm, pm * 0.9);
        else { g.beginPath(); g.arc(w * 0.5, h * 0.9, pm * 0.5, 0, Math.PI * 2); g.fill(); }
        g.restore();

        // px-space overlays: rounded-spine shading, cloth/paper grain, worn edges
        g.save();
        g.beginPath(); g.rect(x - 4, y, CW, CH); g.clip();
        const grd = g.createLinearGradient(x - 2, 0, x + CW - 6, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0.42)');
        grd.addColorStop(0.12, 'rgba(0,0,0,0.08)');
        grd.addColorStop(0.45, 'rgba(255,255,255,0.07)');
        grd.addColorStop(0.88, 'rgba(0,0,0,0.08)');
        grd.addColorStop(1, 'rgba(0,0,0,0.42)');
        g.fillStyle = grd; g.fillRect(x - 4, y, CW, CH);
        for (let i = 0; i < 260; i++) {
            const lum = r() < 0.5 ? 255 : 0;
            g.fillStyle = `rgba(${lum},${lum},${lum},${0.04 + r() * 0.06})`;
            g.fillRect(x - 2 + r() * (CW - 4), y + r() * CH, 1, 1 + r() * 3);
        }
        for (let yy = 0; yy < CH; yy += 2) { g.fillStyle = 'rgba(0,0,0,0.025)'; g.fillRect(x - 4, y + yy, CW, 1); }
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 4, y, CW, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 4, y + CH - 3, CW, 3);
        g.restore();

        // ---- aux cell: left half = cover colour, right half = page block seen from the top
        const ax = b.aux.x, ay = b.aux.y;
        g.fillStyle = b.color; g.fillRect(ax, ay, AUXW / 2, AUXH);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(ax, ay, AUXW / 2, AUXH);
        g.fillStyle = b.pages; g.fillRect(ax + 16, ay, 16, AUXH);
        for (let k = 0; k < 16; k += 1) {
            g.fillStyle = `rgba(110,90,60,${0.05 + r() * 0.12})`;
            g.fillRect(ax + 16 + k, ay, 1, AUXH);
        }
        const bw = b.hard ? 2 : 1;
        g.fillStyle = b.color;
        g.fillRect(ax + 16, ay, bw, AUXH); g.fillRect(ax + 32 - bw, ay, bw, AUXH);
        g.fillRect(ax + 16, ay + AUXH - 2 - bw, 16, 2 + bw);
    }

    const atlas = canvasTexture(AW, AW, (g) => {
        g.fillStyle = '#808080'; g.fillRect(0, 0, AW, AW);
        books.forEach(b => drawBook(g, b));
    });
    const bookMat = mat(0xf2dcc0, { map: atlas, roughness: 0.72, vertexColors: true });

    // ---------------------------------------------------------------- book geometry
    function remap(uv, face, u0, v0, u1, v1) {
        for (let i = face * 4; i < face * 4 + 4; i++) {
            uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
        }
    }
    const M = THREE.Matrix4;
    function bookGeometry(b) {
        const geo = new THREE.BoxGeometry(b.t, b.h, b.d);
        const uv = geo.attributes.uv;
        const U = px => px / AW, V = py => 1 - py / AW;
        const { x, y } = b.cell, ax = b.aux.x, ay = b.aux.y;
        // faces: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z (spine), 5 -z
        remap(uv, 0, U(ax + 2), V(ay + AUXH - 2), U(ax + 14), V(ay + 2));
        remap(uv, 1, U(ax + 2), V(ay + AUXH - 2), U(ax + 14), V(ay + 2));
        remap(uv, 2, U(ax + 16), V(ay + AUXH), U(ax + 32), V(ay));
        remap(uv, 3, U(ax + 16), V(ay + AUXH), U(ax + 32), V(ay));
        remap(uv, 4, U(x - 2), V(y + CH - 1), U(x + CW - 6), V(y + 1));
        remap(uv, 5, U(ax + 2), V(ay + AUXH - 2), U(ax + 14), V(ay + 2));
        const p = b.place;
        let m;
        if (p.type === 'up') {
            // pivot on the bottom-left corner; lean > 0 tips the top to the left onto the previous book
            m = new M().makeTranslation(p.x, p.y, p.z)
                .multiply(new M().makeRotationZ(p.lean))
                .multiply(new M().makeTranslation(b.t / 2, b.h / 2, 0));
        } else {
            // lying flat, front cover up, spine towards the room
            m = new M().makeTranslation(p.x, p.y + b.t / 2, p.z)
                .multiply(new M().makeRotationY(p.rot || 0))
                .multiply(new M().makeRotationZ(Math.PI / 2));
        }
        // per-vertex brightness: the photo's lower shelves receive much less light; tops of the spines
        // sit in the shadow of the board above
        const pa = geo.attributes.position, col = new Float32Array(pa.count * 3);
        const base = (SHELF_LIGHT[b.shelfKey] || 0.7) * b.vary;
        for (let i = 0; i < pa.count; i++) {
            const yy = p.type === 'up' ? (pa.getY(i) + b.h / 2) / b.h : 0;
            const v = base * (1 - 0.16 * yy);
            col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.applyMatrix4(m);
        return geo;
    }
    function merge(list) {
        let nv = 0, ni = 0;
        list.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2), cols = new Float32Array(nv * 3);
        const idx = new Uint32Array(ni);
        let vo = 0, io = 0;
        list.forEach(g => {
            pos.set(g.attributes.position.array, vo * 3);
            nor.set(g.attributes.normal.array, vo * 3);
            uvs.set(g.attributes.uv.array, vo * 2);
            cols.set(g.attributes.color.array, vo * 3);
            const a = g.index.array;
            for (let k = 0; k < a.length; k++) idx[io + k] = a[k] + vo;
            io += a.length; vo += g.attributes.position.count;
            g.dispose();
        });
        const m = new THREE.BufferGeometry();
        m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        m.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        m.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        m.setIndex(new THREE.BufferAttribute(idx, 1));
        m.computeBoundingBox(); m.computeBoundingSphere();
        return m;
    }
    books.forEach(b => {
        (shelfGeos[b.shelfKey] = shelfGeos[b.shelfKey] || []).push(bookGeometry(b));
    });
    Object.keys(shelfGeos).forEach(k => {
        const mesh = new THREE.Mesh(merge(shelfGeos[k]), bookMat);
        mesh.name = 'books_' + k;
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
    });

    // ---------------------------------------------------------------- small helpers for props
    function add(mesh, x, y, z, ry) {
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        shadows(mesh);
        group.add(mesh);
        return mesh;
    }
    function boxAt(w, h, d, material, x, yBottom, z, ry) {
        return add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, yBottom + h / 2, z, ry);
    }
    function lathe(profile, material, segs = 28) {
        return new THREE.Mesh(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), segs), material);
    }
    const printTex = (w, h, draw) => canvasTexture(w, h, draw);
    // the photo's compartments are dim and warm: scale the colours of everything added since `from`
    function dimFrom(from, k, tint = [1, 0.92, 0.8]) {
        const seen = new Set();
        group.children.slice(from).forEach(o => o.traverse(m => {
            if (!m.isMesh) return;
            (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => {
                if (seen.has(mt)) return;
                seen.add(mt);
                mt.color.setRGB(mt.color.r * k * tint[0], mt.color.g * k * tint[1], mt.color.b * k * tint[2]);
            });
        }));
    }

    // ---------------------------------------------------------------- shelf 1 (top compartment) trinkets
    {
        const from = group.children.length;
        const y = SHELF[5];
        const cream = mat(0xe6dcc4, { roughness: 0.35 });
        add(lathe([[0, 0], [0.016, 0], [0.02, 0.004], [0.022, 0.03], [0.019, 0.03], [0.017, 0.006], [0, 0.006]], cream), -1.395, y, -1.338);
        // small dark potted plant
        const pot = mat(0x2a2622, { roughness: 0.5 });
        add(lathe([[0, 0], [0.014, 0], [0.018, 0.028], [0, 0.028]], pot), -1.33, y, -1.345);
        const leaf = mat(0x23301c, { roughness: 0.8 });
        const lr = rng(31);
        for (let i = 0; i < 7; i++) {
            const s = new THREE.Mesh(new THREE.SphereGeometry(0.011 + lr() * 0.006, 8, 6), leaf);
            s.scale.set(1, 0.7, 1);
            add(s, -1.33 + (lr() - 0.5) * 0.03, y + 0.034 + lr() * 0.02, -1.345 + (lr() - 0.5) * 0.02);
        }
        // pink artificial flowers in a little white pot
        add(lathe([[0, 0], [0.016, 0], [0.018, 0.022], [0, 0.022]], mat(0xe8e2d8, { roughness: 0.4 })), -1.25, y, -1.35);
        const pink = mat(0xd88a9a, { roughness: 0.7 }), pink2 = mat(0xeec0c8, { roughness: 0.7 });
        const stem = mat(0x3c5a2a, { roughness: 0.8 });
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2 + lr(), rr = 0.006 + lr() * 0.022;
            const px = -1.25 + Math.cos(a) * rr, pz = -1.35 + Math.sin(a) * rr * 0.6, py = y + 0.035 + lr() * 0.03;
            add(new THREE.Mesh(new THREE.SphereGeometry(0.007 + lr() * 0.004, 8, 6), i % 3 ? pink : pink2), px, py, pz);
            if (i % 3 === 0) add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), stem), px * 0.6 + (-1.25) * 0.4, py - 0.01, pz);
        }
        // white egg-shaped figurine and a dark round ornament
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), mat(0xeeeae2, { roughness: 0.3 }));
        egg.scale.set(1, 1.45, 1);
        add(egg, -1.163, y + 0.023, -1.345);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.027, 18, 14), mat(0x2c2c2e, { roughness: 0.35, metalness: 0.2 }));
        orb.scale.set(1, 1.25, 1);
        add(orb, -1.112, y + 0.034, -1.35);
        dimFrom(from, 0.85);
    }

    // ---------------------------------------------------------------- shelf 2 props
    {
        const from = group.children.length;
        const y = SHELF[4];
        // small pink box lying on the shelf front-left
        const pinkTop = printTex(128, 128, (g, w, h) => {
            g.fillStyle = '#a84a4e'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#d08a8a'; g.fillRect(10, 10, w - 20, h - 20);
            g.fillStyle = '#b03a44'; g.fillRect(24, 40, w - 48, 30);
        });
        boxAt(0.075, 0.022, 0.052, [mat(0x9a3a40), mat(0x9a3a40), mat(0xffffff, { map: pinkTop }), mat(0x9a3a40), mat(0xa8464c), mat(0x9a3a40)],
            -1.51, y, -1.345, 0.18);
        const pinkBox2 = boxAt(0.064, 0.014, 0.044, mat(0xc08080), -1.51, y + 0.022, -1.345, 0.1);
        pinkBox2.rotation.y = 0.1;
        // red ball in front of the stack
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 20, 14), mat(0xc4141a, { roughness: 0.3 }));
        add(ball, -1.222, y + 0.025, -1.342);
        // tiny terracotta pot on top of the first books
        add(lathe([[0, 0], [0.012, 0], [0.015, 0.02], [0, 0.02]], mat(0xb8743c, { roughness: 0.7 })), -1.735, y + 0.247, -1.42);
        dimFrom(from, 0.75);
    }

    // ---------------------------------------------------------------- shelf 4 (objects: jar, figurines, game cases)
    {
        const from = group.children.length;
        const y = SHELF[2];
        // white flat box lying down
        const flatTop = printTex(256, 160, (g, w, h) => {
            g.fillStyle = '#ecebe6'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#9aa0a0'; g.fillRect(20, 24, 120, 70);
            g.fillStyle = '#6a7a80'; g.fillRect(150, 30, 80, 10); g.fillRect(150, 50, 60, 8);
            g.fillStyle = '#c8b060'; g.fillRect(28, 32, 50, 40);
            g.fillStyle = '#707070'; g.font = 'bold 18px sans-serif'; g.fillText('PURE', 150, 110);
        });
        const wm = mat(0xd8d2c4, { roughness: 0.5 });
        boxAt(0.17, 0.036, 0.108, [wm, wm, mat(0xffffff, { map: flatTop, roughness: 0.5 }), wm, wm, wm], -1.665, y, -1.375, 0.2);
        // black jar with a white label
        const label = printTex(256, 64, (g, w, h) => {
            g.fillStyle = '#f0ede6'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#2a2a2a'; g.font = 'bold 15px sans-serif';
            for (let i = 0; i < 4; i++) g.fillText('PROTEIN', 8 + i * 64, 28);
            g.fillStyle = '#9a3a2a'; g.fillRect(0, 40, w, 5);
        });
        // tall black tub: black lower body, white label band, black screw lid
        const jarBlack = mat(0x141414, { roughness: 0.3 });
        const JX = -1.575, JZ = -1.43;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.037, 0.112, 30), jarBlack), JX, y + 0.056, JZ);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.0385, 0.0385, 0.058, 30, 1, true), mat(0xffffff, { map: label, roughness: 0.45 })), JX, y + 0.05, JZ);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.036, 0.032, 30), mat(0x1c1c1c, { roughness: 0.45 })), JX, y + 0.127, JZ);
        // dark statue (standing robed figure) behind, a small painted figurine on a white base to its right
        const dark = mat(0x2a2420, { roughness: 0.45 });
        const SX = -1.56, SZ = -1.52;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.016, 18), dark), SX, y + 0.008, SZ);
        add(lathe([[0, 0], [0.022, 0], [0.02, 0.04], [0.015, 0.08], [0.017, 0.1], [0.011, 0.118], [0, 0.12]], dark), SX, y + 0.016, SZ);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), dark), SX, y + 0.148, SZ);
        const FX = -1.49, FZ = -1.54;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.014, 22), mat(0xeeeae4, { roughness: 0.3 })), FX, y + 0.007, FZ);
        add(lathe([[0, 0], [0.021, 0], [0.015, 0.04], [0.01, 0.07], [0.012, 0.082], [0, 0.086]], mat(0x8a3a3a, { roughness: 0.4 })), FX, y + 0.014, FZ);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), mat(0xd8b8a0, { roughness: 0.4 })), FX, y + 0.108, FZ);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.0115, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3a2418)), FX, y + 0.11, FZ);
        // stacked game/DVD cases lying flat
        const caseMat = mat(0x18181a, { roughness: 0.35 });
        const caseSpine = printTex(256, 32, (g, w, h) => {
            g.fillStyle = '#1a1a1c'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#8a8a90'; g.fillRect(20, 10, 90, 12);
            g.fillStyle = '#4a6aa0'; g.fillRect(200, 8, 30, 16);
        });
        const caseFront = mat(0xffffff, { map: caseSpine, roughness: 0.35 });
        [[-1.3, -1.43, 0.05], [-1.305, -1.435, -0.04], [-1.29, -1.43, 0.09], [-1.31, -1.428, 0.0]].forEach((c, i) => {
            boxAt(0.19, 0.0145, 0.135, [caseMat, caseMat, caseMat, caseMat, caseFront, caseMat], c[0], y + i * 0.0148, c[1], c[2]);
        });
        // a couple of cases standing at the back right
        boxAt(0.0145, 0.19, 0.135, caseMat, IX1 - 0.026, y, ZB + 0.07, 0);
        boxAt(0.0145, 0.19, 0.135, caseMat, IX1 - 0.009, y, ZB + 0.07, 0);
        // small white egg at the front right
        const egg2 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), mat(0xf0ece6, { roughness: 0.3 }));
        egg2.scale.set(1, 1.3, 1);
        add(egg2, -1.11, y + 0.0234, -1.35);
        dimFrom(from, 0.68);
    }

    // ---------------------------------------------------------------- shelf 5 (card games, tissue box, red cup)
    {
        const from = group.children.length;
        const y = SHELF[1];
        const deck = (base, frame, txt) => printTex(256, 160, (g, w, h) => {
            g.fillStyle = base; g.fillRect(0, 0, w, h);
            g.strokeStyle = frame; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
            g.fillStyle = frame; g.font = 'bold 44px serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, h / 2 + 15);
        });
        const tan = mat(0xc9a46a, { roughness: 0.6 }), cream = mat(0xe4d8b8, { roughness: 0.6 }), navy = mat(0x1e2438, { roughness: 0.5 });
        boxAt(0.15, 0.03, 0.1, [tan, tan, mat(0xffffff, { map: deck('#c9a46a', '#7a4a20', 'CARDS') }), tan, tan, tan], -1.628, y, -1.37, -0.22);
        boxAt(0.14, 0.024, 0.094, cream, -1.625, y + 0.03, -1.372, -0.18);
        boxAt(0.125, 0.03, 0.09, [navy, navy, mat(0xffffff, { map: deck('#1e2438', '#e8a040', 'UNO') }), navy, navy, navy], -1.621, y + 0.054, -1.375, -0.26);
        // tissue box with orange print and a tissue poking out of the top
        const tissue = printTex(256, 256, (g, w, h) => {
            g.fillStyle = '#ece0c6'; g.fillRect(0, 0, w, h);
            const tr = rng(77);
            for (let i = 0; i < 34; i++) {
                g.fillStyle = ['#d0702a', '#b8481e', '#e0a050', '#9a3a20'][i % 4];
                g.globalAlpha = 0.85;
                g.beginPath(); g.ellipse(tr() * w, 60 + tr() * (h - 60), 10 + tr() * 22, 6 + tr() * 14, tr() * 3, 0, Math.PI * 2); g.fill();
            }
            g.globalAlpha = 1;
        });
        const tm = mat(0xffffff, { map: tissue, roughness: 0.6 }), white = mat(0xf2eee6, { roughness: 0.6 });
        boxAt(0.105, 0.135, 0.105, [tm, tm, white, white, tm, tm], -1.5, y, -1.425, 0.12);
        const tis = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.06, 7), mat(0xf6f3ee, { roughness: 0.9, side: THREE.DoubleSide }));
        tis.scale.set(1, 1, 0.35);
        add(tis, -1.5, y + 0.135 + 0.03, -1.425, 0.5);
        // red cup at the back
        const red = mat(0x8a1010, { roughness: 0.35, side: THREE.DoubleSide });
        add(lathe([[0, 0], [0.03, 0], [0.034, 0.004], [0.038, 0.085], [0.036, 0.085], [0.032, 0.006], [0, 0.006]], red), -1.415, y, -1.5);
        dimFrom(from, 0.62, [1, 0.88, 0.72]);
    }

    // ---------------------------------------------------------------- bottom compartment
    {
        const from = group.children.length;
        const y = SHELF[0];
        const kraft = mat(0xb39a6a, { roughness: 0.85 });
        boxAt(0.085, 0.2, 0.07, kraft, -1.67, y, -1.44, 0.1);
        const fold = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.04), kraft);
        fold.rotation.x = -0.4;
        add(fold, -1.67, y + 0.21, -1.435, 0.1);
        boxAt(0.022, 0.235, 0.2, mat(0xe6e4de, { roughness: 0.6 }), -1.575, y, ZB + 0.11, 0);
        boxAt(0.03, 0.22, 0.18, mat(0x2a2a2e, { roughness: 0.6 }), -1.4, y, ZB + 0.1, 0);
        boxAt(0.035, 0.2, 0.17, mat(0x3a2e26, { roughness: 0.6 }), -1.25, y, ZB + 0.095, 0);
        dimFrom(from, 0.6);
    }

    // ---------------------------------------------------------------- items on the top surface
    {
        const y = H;
        // white cardboard box, turned slightly towards the room, with two black cases standing in front
        const side = printTex(512, 512, (g, w, h) => {
            g.fillStyle = '#f4e8d0'; g.fillRect(0, 0, w, h);
            g.fillStyle = 'rgba(120,120,120,0.55)';
            g.font = '30px sans-serif'; g.textAlign = 'center';
            g.fillText('SAMSUNG', w / 2, h * 0.44);
            g.font = '22px sans-serif'; g.fillText('MONITOR  SERIES', w / 2, h * 0.5);
            g.fillStyle = 'rgba(0,0,0,0.04)';
            for (let i = 0; i < 30; i++) g.fillRect(0, i * 17, w, 1);
        });
        const wb = mat(0xf2ecdc, { roughness: 0.75 });
        const sideMat = mat(0xffffff, { map: side, roughness: 0.75 });
        const top = new THREE.Group();
        top.position.set(-1.471, y, -1.479);
        top.rotation.y = 0.0;
        group.add(top);
        const bw = 0.238, bh = 0.31, bd = 0.222;
        const wbox = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [sideMat, wb, wb, wb, wb, wb]);
        wbox.position.set(0, bh / 2, -0.004);
        top.add(wbox);
        const blackMat = mat(0x221e18, { roughness: 0.45 });
        const silver = mat(0xe8e8ec, { roughness: 0.2, metalness: 0.1 });
        for (let i = 0; i < 2; i++) {
            const sw = bw / 2 - 0.005;
            const slab = new THREE.Mesh(roundedBoxGeometry(sw, bh - 0.004, 0.008, 0.0015, 1), blackMat);
            const sx = (i === 0 ? -1 : 1) * (sw / 2 + 0.0015);
            slab.position.set(sx + 0.003, (bh - 0.004) / 2, bd / 2 - 0.004 + 0.0045);
            top.add(slab);
            const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.004, 14), silver);
            dot.rotation.x = Math.PI / 2;
            dot.position.set(sx + 0.003 - sw * 0.15, 0.022, bd / 2 - 0.004 + 0.0095);
            top.add(dot);
        }
        shadows(top);
        // flat white + grey items at the front left corner (router / thin books)
        const flat = new THREE.Group();
        flat.position.set(-1.695, y, -1.41);
        flat.rotation.y = 0.12;
        group.add(flat);
        const lw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.16), mat(0xe2ddd0, { roughness: 0.5 }));
        lw.position.y = 0.011; flat.add(lw);
        const lg = new THREE.Mesh(roundedBoxGeometry(0.115, 0.014, 0.155, 0.003, 2), mat(0x8a8a8a, { roughness: 0.4, metalness: 0.3 }));
        lg.position.set(0.002, 0.022 + 0.007, -0.002); flat.add(lg);
        shadows(flat);
    }
});
