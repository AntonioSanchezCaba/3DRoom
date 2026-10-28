// Floor and walls: polished terrazzo floor, vinyl-covered back wall with panel joints, painted left
// wall with a baseboard, duplex outlet with two plugged-in cables, and a plain poster board.
ROOM.register('surfaces', (ctx) => {
    const { THREE, L, group, mat, box, curveTube, roundedBox, canvasTexture, rng, shadows } = ctx;
    const R = L.room, t = R.wallThickness, H = R.height;
    const W = R.maxX - R.minX, D = R.maxZ - R.minZ;
    const cx = (R.minX + R.maxX) / 2, cz = (R.minZ + R.maxZ) / 2;
    const SLAB = 0.04;                       // floor slab thickness (visible edge from the overview)

    // ---------- procedural helpers ----------

    // Tileable value noise on a px x py lattice; sample with (u, v) in tile units (wraps every 1)
    const noise2 = (px, py, seed) => {
        const r = rng(seed), g = new Float32Array(px * py);
        for (let i = 0; i < g.length; i++) g[i] = r();
        return (u, v) => {
            const x = u * px, y = v * py;
            const ix = Math.floor(x), iy = Math.floor(y);
            let fx = x - ix, fy = y - iy;
            fx = fx * fx * (3 - 2 * fx);
            fy = fy * fy * (3 - 2 * fy);
            const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px;
            const y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
            const a = g[y0 * px + x0], b = g[y0 * px + x1], c = g[y1 * px + x0], d = g[y1 * px + x1];
            return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
        };
    };

    // Soft light falloff from the ceiling fixture behind the photographer (the photo's walls are
    // brighter near it); baked gently into vertex colours since the global lights have no falloff.
    const LAMP = new THREE.Vector3(1.2, 3.6, 0.8);
    const falloff = (p, ref, power, lo, hi) =>
        THREE.MathUtils.clamp(Math.pow(ref.distanceTo(LAMP) / p.distanceTo(LAMP), power), lo, hi);

    // Large-scale, non-repeating brightness/hue variation baked into vertex colours (hides tiling).
    // toWorld(localX, localY) -> Vector3 for the falloff term (1 at the surface's reference point `ref`).
    // ao(world) -> extra multiplier for the soft contact shadow in corners and along the floor.
    const macroColors = (geo, sizeU, sizeV, amp, hueAmp, seed, toWorld, ref, power = 0, lo = 1, hi = 1, ao = null) => {
        const nA = noise2(23, 23, seed), nB = noise2(61, 61, seed + 1), nH = noise2(17, 17, seed + 2);
        const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
            // position in metres -> lattice space (period 9.2 m / 6.1 m, far bigger than the room)
            const u = (pos.getX(i) + sizeU) / 9.2, v = (pos.getY(i) + sizeV) / 9.2;
            const n = 0.65 * (nA(u, v) - 0.5) + 0.35 * (nB(u * 0.66, v * 0.66) - 0.5);
            const hShift = (nH(u, v) - 0.5) * hueAmp;
            const wp = toWorld(pos.getX(i), pos.getY(i));
            const k = (1 + n * amp) * (power ? falloff(wp, ref, power, lo, hi) : 1) * (ao ? ao(wp) : 1);
            cols[i * 3] = k * (1 + hShift);
            cols[i * 3 + 1] = k;
            cols[i * 3 + 2] = k * (1 - hShift * 1.6);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        return geo;
    };

    // soft contact darkening in the inside corner and where the walls meet the floor
    const cornerAO = (useX, useZ, useY) => (p) => {
        let k = 1;
        if (useX) k *= 1 - 0.1 * Math.exp(-(p.x - R.minX) / 0.2);
        if (useZ) k *= 1 - 0.1 * Math.exp(-(p.z - R.minZ) / 0.2);
        if (useY) k *= 1 - 0.08 * Math.exp(-p.y / 0.12);
        return k;
    };

    // ---------- terrazzo floor ----------

    const TILE = 1.6;                // metres covered by one texture tile
    const FT = 2048;                 // texture size -> 0.78 mm per texel
    const PXM = FT / TILE;           // texels per metre
    const floorTex = canvasTexture(FT, FT, (g, w, h) => {
        const r = rng(4242);
        // grey-tan cement matrix with soft mottling (drawn small, then upscaled smoothly)
        const NS = 512;
        const nc = document.createElement('canvas');
        nc.width = nc.height = NS;
        const ng = nc.getContext('2d'), img = ng.createImageData(NS, NS), d = img.data;
        const m1 = noise2(10, 10, 31), m2 = noise2(28, 28, 32), m3 = noise2(80, 80, 33), m4 = noise2(200, 200, 34);
        for (let y = 0; y < NS; y++) {
            for (let x = 0; x < NS; x++) {
                const u = x / NS, v = y / NS;
                const n = 0.3 * m1(u, v) + 0.3 * m2(u, v) + 0.25 * m3(u, v) + 0.15 * m4(u, v) - 0.5;
                const k = 1 + n * 0.3;
                const i = (y * NS + x) * 4;
                d[i] = 160 * k; d[i + 1] = 149 * k; d[i + 2] = 118 * k * (1 - n * 0.15); d[i + 3] = 255;
            }
        }
        ng.putImageData(img, 0, 0);
        g.imageSmoothingEnabled = true;
        g.drawImage(nc, 0, 0, w, h);

        // one angular chip, drawn at every wrapped offset so the tile repeats seamlessly
        const chip = (x, y, rad, color, alpha) => {
            const sides = 4 + Math.floor(r() * 4);
            const rot = r() * Math.PI * 2, el = 0.65 + r() * 0.7;
            const cr = Math.cos(rot), sr = Math.sin(rot);
            const pts = [];
            for (let k = 0; k < sides; k++) {
                const a = (k / sides) * Math.PI * 2 + (r() - 0.5) * (Math.PI * 2 / sides) * 0.8;
                const rr = rad * (0.5 + r() * 0.5);
                const lx = Math.cos(a) * rr * el, ly = Math.sin(a) * rr / el;
                pts.push([lx * cr - ly * sr, lx * sr + ly * cr]);
            }
            g.globalAlpha = alpha;
            g.fillStyle = color;
            for (const ox of [-w, 0, w]) {
                if (x + ox + rad < 0 || x + ox - rad > w) continue;
                for (const oy of [-h, 0, h]) {
                    if (y + oy + rad < 0 || y + oy - rad > h) continue;
                    g.beginPath();
                    pts.forEach((p, k) => k ? g.lineTo(x + ox + p[0], y + oy + p[1]) : g.moveTo(x + ox + p[0], y + oy + p[1]));
                    g.closePath();
                    g.fill();
                }
            }
        };
        const rgb = (c, j) => {        // colour with a little per-chip jitter
            const f = 1 + (r() - 0.5) * j;
            return `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`;
        };
        const pick = (list) => list[Math.floor(r() * list.length)];
        const mm = PXM / 1000;          // texels per millimetre
        const area = TILE * TILE;       // m^2 per tile

        // pale marble aggregate, packed densely: the cream "base" seen in the photo
        const pale = [[200, 188, 156], [210, 199, 170], [192, 179, 147], [218, 209, 186], [182, 173, 150], [202, 189, 154], [176, 166, 140], [222, 216, 200], [212, 206, 190]];
        for (let i = 0; i < 5200 * area; i++) {
            const rad = (4 + Math.pow(r(), 1.5) * 11) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(pale), 0.1), 0.6 + r() * 0.4);
        }
        for (let i = 0; i < 6000 * area; i++) {
            const rad = (1.2 + r() * 2.8) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(pale), 0.12), 0.7 + r() * 0.3);
        }
        // greyish-brown 'ghost' chips (semi-dark, partly translucent like the photo's olive patches)
        const ghost = [[128, 114, 88], [112, 100, 78], [140, 124, 96]];
        for (let i = 0; i < 900 * area; i++) {
            const rad = (2 + Math.pow(r(), 1.6) * 6) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(ghost), 0.1), 0.45 + r() * 0.35);
        }
        // tan / honey chips
        const tan = [[166, 136, 96], [150, 121, 85], [180, 151, 108], [140, 116, 84]];
        for (let i = 0; i < 1500 * area; i++) {
            const rad = (1.5 + Math.pow(r(), 1.8) * 6) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(tan), 0.12), 0.9 + r() * 0.1);
        }
        // medium brown chips
        const brown = [[108, 78, 52], [92, 66, 45], [124, 92, 62]];
        for (let i = 0; i < 500 * area; i++) {
            const rad = (2 + Math.pow(r(), 2) * 6) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(brown), 0.12), 1);
        }
        // dark brown / near-black chips: the speckle that dominates the look
        const dark = [[30, 22, 17], [22, 17, 14], [40, 28, 20], [48, 34, 24], [16, 13, 11]];
        for (let i = 0; i < 1450 * area; i++) {
            const big = r() < 0.07;
            const rad = (big ? 8 + r() * 4 : 2.6 + Math.pow(r(), 1.7) * 5.6) * mm;
            chip(r() * w, r() * h, rad, rgb(pick(dark), 0.2), 1);
        }
        // fine dark grit
        for (let i = 0; i < 2000 * area; i++) {
            chip(r() * w, r() * h, (0.8 + r() * 1.6) * mm, rgb(pick(dark), 0.25), 0.9);
        }
        // a few white marble chips
        for (let i = 0; i < 150 * area; i++) {
            chip(r() * w, r() * h, (2.5 + r() * 5) * mm, rgb([236, 229, 212], 0.05), 1);
        }
        g.globalAlpha = 1;
    }, { repeatX: W / TILE, repeatY: D / TILE });

    // subtle polish variation (shares the map's tiling)
    const floorRough = canvasTexture(256, 256, (g, w, h) => {
        const img = g.createImageData(w, h), d = img.data, n1 = noise2(6, 6, 51), n2 = noise2(19, 19, 52);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const v = 0.6 * n1(x / w, y / h) + 0.4 * n2(x / w, y / h);
            const c = (0.34 + v * 0.2) * 255, i = (y * w + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
    }, { repeatX: W / TILE, repeatY: D / TILE });

    const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.745, 0.675, 0.575), map: floorTex, roughnessMap: floorRough, roughness: 1, metalness: 0,
        vertexColors: true
    });
    const floorGeo = macroColors(new THREE.PlaneGeometry(W, D, 76, 64), W / 2, D / 2, 0.11, 0.04, 61,
        (x, y) => new THREE.Vector3(cx + x, 0, cz - y), new THREE.Vector3(0, 0, -0.4), 0.8, 0.86, 1.1, cornerAO(true, true, false));
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    group.add(floor);

    // slab under the floor so the open edges look solid from the overview
    const slabMat = mat(0xb9a47e, { roughness: 0.7 });
    // (kept 2 mm inside the wall bodies so no faces are coplanar)
    const slab = box(W + t - 0.004, SLAB - 0.0015, D + t - 0.004, slabMat, cx - t / 2 + 0.002, -SLAB / 2 - 0.0003, cz - t / 2 + 0.002);
    slab.castShadow = false;
    group.add(slab);

    // ---------- back wall: cream vinyl wallcovering on panels ----------

    const backTex = canvasTexture(1024, 1024, (g, w, h) => {
        const r = rng(77);
        // soft cloudy base (slightly vertical, like a fabric-backed vinyl) with a fine grain,
        // computed at half resolution and upscaled smoothly
        const BS = w / 2, bc = document.createElement('canvas');
        bc.width = bc.height = BS;
        const bg = bc.getContext('2d'), img = bg.createImageData(BS, BS), d = img.data;
        const n1 = noise2(30, 15, 71), n4 = noise2(7, 5, 74), n5 = noise2(160, 90, 75);
        for (let y = 0; y < BS; y++) {
            for (let x = 0; x < BS; x++) {
                const u = x / BS, v = y / BS;
                const s = 0.45 * (n1(u, v) - 0.5) + 0.25 * (n4(u, v) - 0.5) + 0.2 * (n5(u, v) - 0.5) + 0.1 * (r() - 0.5);
                const k = 1 + s * 0.3, i = (y * BS + x) * 4;
                d[i] = 224 * k; d[i + 1] = 210 * k; d[i + 2] = 178 * k; d[i + 3] = 255;
            }
        }
        bg.putImageData(img, 0, 0);
        g.imageSmoothingEnabled = true;
        g.drawImage(bc, 0, 0, w, h);
        // stipple: thousands of small flecks (1 texel = 1 mm), mostly elongated vertically
        const fleck = (x, y, rx, ry, rot, col, a) => {
            g.globalAlpha = a;
            g.fillStyle = col;
            const ext = Math.max(rx, ry) + 1;
            for (const ox of [-w, 0, w]) {
                if (x + ox + ext < 0 || x + ox - ext > w) continue;
                for (const oy of [-h, 0, h]) {
                    if (y + oy + ext < 0 || y + oy - ext > h) continue;
                    g.beginPath();
                    g.ellipse(x + ox, y + oy, rx, ry, rot, 0, Math.PI * 2);
                    g.fill();
                }
            }
        };
        const lights = ['#f3ebd6', '#f7f1e2', '#ebe0c6', '#fbf7ee'];
        const darks = ['#c2b28c', '#cbbd9b', '#b8a883', '#d2c5a6'];
        for (let i = 0; i < 36000; i++) {
            const light = r() < 0.56;
            const rx = 0.8 + r() * 1.9, ry = rx * (1.2 + r() * 1.4);
            const col = light ? lights[Math.floor(r() * 4)] : darks[Math.floor(r() * 4)];
            fleck(r() * w, r() * h, rx, ry, (r() - 0.5) * 0.7, col, light ? 0.5 + r() * 0.45 : 0.4 + r() * 0.4);
        }
        for (let i = 0; i < 7000; i++) {       // tiny darker grains
            fleck(r() * w, r() * h, 0.5 + r() * 0.7, 0.6 + r() * 1.2, 0, '#ad9d78', 0.3 + r() * 0.3);
        }
        g.globalAlpha = 1;
    }, { repeatX: W / 1.0, repeatY: H / 1.0 });

    const backWallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(1.14, 1.03, 0.79), map: backTex, bumpMap: backTex, bumpScale: 0.003,
        roughness: 0.88, metalness: 0, vertexColors: true
    });
    const backGeo = macroColors(new THREE.PlaneGeometry(W, H, 76, 54), W / 2, H / 2, 0.05, 0.02, 81,
        (x, y) => new THREE.Vector3(cx + x, H / 2 + y, R.minZ), new THREE.Vector3(-0.3, 1.9, R.minZ), 2.6, 0.7, 1.55, cornerAO(true, false, true));
    const backFace = new THREE.Mesh(backGeo, backWallMat);
    backFace.position.set(cx, H / 2, R.minZ);
    backFace.receiveShadow = true;
    group.add(backFace);

    const wallBodyBack = mat(0xe3d6b8, { roughness: 0.9 });
    const backBody = box(W + t + 0.002, H + SLAB, t - 0.001, wallBodyBack, cx - t / 2 + 0.001, (H - SLAB) / 2, R.minZ - t / 2 - 0.0005);
    backBody.castShadow = false;
    group.add(backBody);

    // vertical joints between wall panels (measured from the photo: 0.5 m pitch through x = 0.165)
    const seamMat = mat(0xc2b292, { roughness: 0.9 });
    const B = L.bookshelf, DK = L.desk;
    const seams = [];
    for (let x = 0.165; x > R.minX + 0.05; x -= 0.5) seams.push(x);
    for (let x = 0.665; x < R.maxX - 0.05; x += 0.5) seams.push(x);
    seams.forEach((x) => {
        let y0 = 0;
        if (x > B.minX - 0.01 && x < B.maxX + 0.01) y0 = B.height + 0.002;
        else if (x > DK.minX - 0.01 && x < DK.maxX + 0.01) y0 = DK.topY + 0.002;
        const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.0026, H - y0), seamMat);
        seam.position.set(x, (H + y0) / 2, R.minZ + 0.0012);
        seam.receiveShadow = true;
        group.add(seam);
    });

    // ---------- left wall: smooth painted drywall ----------

    const leftTex = canvasTexture(512, 512, (g, w, h) => {
        const img = g.createImageData(w, h), d = img.data, r = rng(91);
        const n1 = noise2(9, 9, 92), n2 = noise2(48, 48, 93);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const s = 0.5 * n1(x / w, y / h) + 0.35 * n2(x / w, y / h) + 0.15 * r() - 0.5;
            const k = 1 + s * 0.05, i = (y * w + x) * 4;
            d[i] = 215 * k; d[i + 1] = 197 * k; d[i + 2] = 152 * k; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
    }, { repeatX: D / 0.6, repeatY: H / 0.6 });
    const leftWallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(1.1, 1.04, 0.86), map: leftTex, bumpMap: leftTex, bumpScale: 0.0015,
        roughness: 0.85, metalness: 0, vertexColors: true
    });
    const leftGeo = macroColors(new THREE.PlaneGeometry(D, H, 64, 54), D / 2, H / 2, 0.04, 0.015, 101,
        (x, y) => new THREE.Vector3(R.minX, H / 2 + y, cz - x), new THREE.Vector3(R.minX, 1.6, -0.3), 0.4, 0.88, 1.1, cornerAO(false, true, true));
    const leftFace = new THREE.Mesh(leftGeo, leftWallMat);
    leftFace.rotation.y = Math.PI / 2;
    leftFace.position.set(R.minX, H / 2, cz);
    leftFace.receiveShadow = true;
    group.add(leftFace);

    const wallBodyLeft = mat(0xd9c69c, { roughness: 0.9 });
    // starts just in front of the back wall body (which owns the corner) and ends 2 mm past the slab
    const lz0 = R.minZ - 0.0008, lz1 = R.maxZ + 0.002;
    const leftBody = box(t - 0.001, H + SLAB - 0.0004, lz1 - lz0, wallBodyLeft, R.minX - t / 2 - 0.0005, (H - SLAB) / 2 - 0.0002, (lz0 + lz1) / 2);
    leftBody.castShadow = false;
    group.add(leftBody);

    // baseboard along the left wall: ~9 cm tall, 12 mm thick, eased top edge, semi-gloss cream paint
    const bbShape = new THREE.Shape();
    bbShape.moveTo(0, 0);
    bbShape.lineTo(0.012, 0);
    bbShape.lineTo(0.012, 0.074);
    bbShape.quadraticCurveTo(0.012, 0.084, 0.006, 0.088);
    bbShape.lineTo(0.002, 0.091);
    bbShape.lineTo(0, 0.091);
    bbShape.closePath();
    const bbGeo = new THREE.ExtrudeGeometry(bbShape, { depth: D, bevelEnabled: false, curveSegments: 6 });
    const baseboard = new THREE.Mesh(bbGeo, mat(0xdccca6, { roughness: 0.5 }));
    baseboard.position.set(R.minX, 0, R.minZ);
    shadows(baseboard, true, true);
    group.add(baseboard);

    // ---------- poster board (thin card) ----------

    // (the photo puts the card ~1.5 cm right of the layout box; shifted within its footprint)
    const BD = { minX: R.board.minX + 0.015, maxX: R.board.maxX + 0.015, minY: R.board.minY + 0.004, maxY: R.board.maxY + 0.004 };
    const boardTex = canvasTexture(256, 256, (g, w, h) => {
        const img = g.createImageData(w, h), d = img.data, r = rng(111), n1 = noise2(5, 5, 112);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const k = 1 + (n1(x / w, y / h) - 0.5) * 0.04 + (r() - 0.5) * 0.02, i = (y * w + x) * 4;
            d[i] = 231 * k; d[i + 1] = 211 * k; d[i + 2] = 156 * k; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
    });
    const boardMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.08, 0.97, 0.62), map: boardTex, roughness: 0.8 });
    const boardEdge = mat(0xe2d3ae, { roughness: 0.85 });
    const bw = BD.maxX - BD.minX, bh = BD.maxY - BD.minY;
    const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.0022),
        [boardEdge, boardEdge, boardEdge, boardEdge, boardMat, boardEdge]);
    board.position.set((BD.minX + BD.maxX) / 2, (BD.minY + BD.maxY) / 2, R.minZ + 0.0016 + 0.0011);
    shadows(board, true, true);
    group.add(board);

    // ---------- duplex outlet with two black plugs and their cables ----------

    const O = R.outlet, wz = R.minZ;
    const almond = mat(0xad9460, { roughness: 0.6 });
    const plateT = 0.005, plateW = 0.076, plateH = 0.125;
    // plate: slightly domed look from a rounded box, sitting 0.4 mm off the wall covering
    group.add(roundedBox(plateW, plateH, plateT, 0.0024, almond, O.x, O.y, wz + plateT / 2 + 0.0004));
    // the two receptacle faces (mostly hidden by the plugs)
    const recMat = mat(0xa88f5c, { roughness: 0.55 });
    [0.021, -0.021].forEach((dy) => {
        group.add(roundedBox(0.035, 0.029, 0.004, 0.005, recMat, O.x, O.y + dy, wz + plateT + 0.0012));
    });
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.0016, 14), mat(0xc2ad80, { roughness: 0.35, metalness: 0.35 }));
    screw.rotation.x = Math.PI / 2;
    screw.position.set(O.x, O.y, wz + plateT + 0.0012);
    group.add(screw);

    const plugMat = mat(0x151515, { roughness: 0.45 });
    const cableMat = mat(0x171717, { roughness: 0.5 });
    const faceZ = wz + plateT + 0.0032;            // front of the receptacle faces
    const plugD = 0.024;
    // upper plug: squarish body, cord leaves from its left side
    group.add(roundedBox(0.034, 0.026, plugD, 0.0065, plugMat, O.x - 0.001, O.y + 0.021, faceZ + plugD / 2));
    // lower plug: rounder body, cord leaves from the bottom-left
    group.add(roundedBox(0.03, 0.03, plugD, 0.01, plugMat, O.x + 0.001, O.y - 0.021, faceZ + plugD / 2));
    const zc = faceZ + plugD * 0.55;               // cord exit depth
    // moulded strain reliefs
    group.add(curveTube([[O.x - 0.014, O.y + 0.021, zc], [O.x - 0.025, O.y + 0.0205, zc], [O.x - 0.033, O.y + 0.015, zc - 0.001]], 0.0046, plugMat, 12, 10));
    group.add(curveTube([[O.x - 0.002, O.y - 0.03, zc], [O.x - 0.006, O.y - 0.039, zc - 0.001], [O.x - 0.01, O.y - 0.046, zc - 0.002]], 0.0044, plugMat, 12, 10));

    const top = DK.topY;
    const cableR = 0.0028;
    const zw = wz + 0.011;                          // hanging cables sit ~1 cm off the wall
    // cable from the upper plug (left one in the photo): path measured from the photo
    group.add(curveTube([
        [O.x - 0.03, O.y + 0.017, zc - 0.001],
        [O.x - 0.041, O.y + 0.003, zc - 0.003],
        [O.x - 0.05, 1.676, zw + 0.006],
        [O.x - 0.056, 1.564, zw + 0.002],
        [O.x - 0.058, 1.41, zw],
        [O.x - 0.063, 1.287, zw],
        [O.x - 0.066, 1.1, zw],
        [O.x - 0.068, top + 0.06, zw],
        [O.x - 0.072, top + cableR + 0.003, wz + 0.024],
        [O.x - 0.1, top + cableR, wz + 0.038],
        [O.x - 0.17, top + cableR, wz + 0.044]
    ], cableR, cableMat, 160, 8));
    // cable from the lower plug (right one)
    group.add(curveTube([
        [O.x - 0.009, O.y - 0.043, zc - 0.002],
        [O.x - 0.019, 1.646, zw + 0.005],
        [O.x - 0.029, 1.532, zw + 0.001],
        [O.x - 0.04, 1.374, zw],
        [O.x - 0.05, 1.29, zw],
        [O.x - 0.055, 1.1, zw],
        [O.x - 0.058, top + 0.07, zw],
        [O.x - 0.062, top + cableR + 0.003, wz + 0.03],
        [O.x - 0.09, top + cableR, wz + 0.058],
        [O.x - 0.15, top + cableR, wz + 0.068]
    ], cableR, cableMat, 160, 8));
    // round off the open tube ends where the cords run on behind the monitor
    [[O.x - 0.17, top + cableR, wz + 0.044], [O.x - 0.15, top + cableR, wz + 0.068]].forEach((p) => {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(cableR, 10, 8), cableMat);
        cap.position.set(p[0], p[1], p[2]);
        shadows(cap, true, true);
        group.add(cap);
    });
});
