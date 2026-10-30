// Dumbbells: a loose pile of adjustable spin-lock dumbbells on the floor under the right half of the desk.
// Four lie on the floor with their bars running front-to-back (plate faces towards the room), two more
// rest on top of the outer ones of that row, and one lies crosswise at the back under the modesty panel.
// Each one: a threaded steel bar, a red ribbed sleeve between two red fixed collars, black textured cast
// plates (raised rim and hub around a recessed face) and bright red spin-lock nuts on the ends.
// Every part type is a single InstancedMesh to stay light. The shade under the desk is baked: per-instance
// colours (how deep under the top a part sits) and vertex colours (contact shade at the plate bottoms),
// plus a soft contact-shadow decal on the floor.
ROOM.register('dumbbells', (ctx) => {
    const { THREE, L, group, canvasTexture, rng } = ctx;
    const desk = L.desk;

    // ---------- dimensions (m) ----------
    const PLATE = {
        P: { R: 0.100, t: 0.024 },     // big plate
        Q: { R: 0.092, t: 0.022 },     // a size down
        S: { R: 0.084, t: 0.020 }
    };
    const GRIP_HALF = 0.06, GRIP_R = 0.0165;     // red ribbed sleeve
    const FIX_T = 0.012, FIX_R = 0.024;          // fixed inner collars
    const SPIN_T = 0.02, SPIN_R = 0.026;        // spin-lock nuts
    const BAR_R = 0.0125, TIP = 0.012;           // threaded bar, protruding past the nuts

    // ---------- the pile ----------
    // x, z: centre of the handle; yaw (deg) turns the bar axis (sin yaw, 0, cos yaw) from +z towards +x;
    // plates per side listed from the handle outwards; `on` = rests on top of that dumbbell.
    const SPEC = [
        { id: 'B', x: 0.186, z: -1.040, yaw: -9, plates: 'PPQS' },
        { id: 'C', x: 0.376, z: -1.115, yaw: -6, plates: 'PPQS' },
        { id: 'E', x: 0.566, z: -1.020, yaw: -4, plates: 'PPQS' },
        { id: 'F', x: 0.705, z: -1.120, yaw: -4, plates: 'PPQS' },
        { id: 'A', x: 0.200, z: -1.117, yaw: -9, plates: 'PPQS', on: 'B' },
        { id: 'D', x: 0.570, z: -1.104, yaw: -4, plates: 'PPQS', on: 'E' },
        { id: 'G', x: 0.450, z: -1.480, yaw: 90, plates: 'PPQ' }
    ];

    const clamp01 = v => Math.min(1, Math.max(0, v));
    const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    const DEG = Math.PI / 180;

    // ---------- derived layout: plate stations along the bar, axis height ----------
    const byId = {};
    SPEC.forEach(s => {
        const plates = [];
        let a = GRIP_HALF + FIX_T;
        for (const k of s.plates) {
            const p = PLATE[k];
            plates.push({ k, R: p.R, t: p.t, s: a + p.t / 2 });
            a += p.t;
        }
        s.plateList = plates;
        s.nutS = a + SPIN_T / 2;
        s.half = a + SPIN_T + TIP;
        s.R = Math.max(...plates.map(p => p.R));
        s.ax = [Math.sin(s.yaw * DEG), 0, Math.cos(s.yaw * DEG)];
        byId[s.id] = s;
    });
    SPEC.forEach(s => {
        if (!s.on) { s.y = s.R; return; }
        // resting on another dumbbell: lift until every pair of plates that overlap along the bar clears
        const b = byId[s.on];
        const dx = s.x - b.x, dz = s.z - b.z;
        const along = dx * b.ax[0] + dz * b.ax[2];
        const across = dx * b.ax[2] - dz * b.ax[0];
        let lift = 0;
        for (const sd of [-1, 1]) for (const p of s.plateList) {
            const pa = along + sd * p.s;
            for (const sb of [-1, 1]) for (const q of b.plateList) {
                if (Math.abs(pa - sb * q.s) < (p.t + q.t) / 2) {
                    const rr = p.R + q.R;
                    lift = Math.max(lift, Math.sqrt(Math.max(0, rr * rr - across * across)));
                }
            }
        }
        s.y = b.y + lift + 0.0004;
    });

    // ---------- shade baked per part: depth under the desk top ----------
    // (the desk blocks the key light through the shadow map, but not the hemisphere fill)
    function shadeAt(x, y, z) {
        const under = smooth(desk.maxZ + 0.04, desk.maxZ - 0.42, z);    // 0 in front of the edge -> 1 deep
        const low = 1 - 0.25 * smooth(0.35, 0.0, y) * under;
        return (1 - 0.55 * under) * low;
    }

    // ---------- textures ----------
    // cast/painted plate surface: fine sandy speckle
    const speckle = canvasTexture(256, 256, (g, w, h) => {
        g.fillStyle = '#d8d8d8';
        g.fillRect(0, 0, w, h);
        const r = rng(7311);
        for (let i = 0; i < 7000; i++) {
            const v = 150 + Math.floor(r() * 105);
            g.fillStyle = `rgb(${v},${v},${v})`;
            const s = 1 + r() * 1.6;
            g.fillRect(r() * w, r() * h, s, s);
        }
        for (let i = 0; i < 500; i++) {
            const v = 70 + Math.floor(r() * 60);
            g.fillStyle = `rgb(${v},${v},${v})`;
            g.fillRect(r() * w, r() * h, 1.2, 1.2);
        }
    }, { repeatX: 10, repeatY: 2 });

    // ---------- materials ----------
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0x2a2622, roughness: 0.58, metalness: 0.15, map: speckle,
        bumpMap: speckle, bumpScale: 0.0012, vertexColors: true
    });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x420c16, roughness: 0.5, metalness: 0.0 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x440a0e, roughness: 0.55, metalness: 0.05 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x46474a, roughness: 0.38, metalness: 0.75 });

    // ---------- geometries (bar axis = local z) ----------
    // lathe from an (r, y) loop; sharp points are doubled so flat faces shade flat
    function lathe(pts, segs) {
        const out = [];
        pts.forEach((p, i) => {
            const v = new THREE.Vector2(p[0], p[1]);
            out.push(v);
            if (p[2] && i > 0 && i < pts.length - 1) out.push(v.clone());
        });
        const geo = new THREE.LatheGeometry(out, segs);
        geo.rotateX(Math.PI / 2);     // lathe axis y -> bar axis z
        return geo;
    }

    function plateGeometry(R, t) {
        const h = t / 2, hole = BAR_R + 0.0012;
        const hub = 0.036, rim = R - 0.014, d = Math.min(0.0035, t * 0.16), b = 0.003;
        const geo = lathe([
            [hole, -h + 0.0008, 1], [hole + 0.0012, -h, 0], [hub - b, -h, 1], [hub, -h + d, 1],
            [rim, -h + d, 1], [rim + b, -h, 1],
            [R - 0.004, -h, 0], [R - 0.0012, -h + 0.0012, 0], [R, -h + 0.004, 1],
            [R, h - 0.004, 1], [R - 0.0012, h - 0.0012, 0], [R - 0.004, h, 1],
            [rim + b, h, 1], [rim, h - d, 1], [hub, h - d, 1], [hub - b, h, 1],
            [hole + 0.0012, h, 0], [hole, h - 0.0008, 1], [hole, -h + 0.0008, 0]
        ], 40);
        // contact shade towards the bottom of the plate, a little in the recess next to the rim
        const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const r = Math.hypot(x, y);
            let c = 0.45 + 0.55 * smooth(-R, 0.3 * R, y);
            if (Math.abs(z) < h - d * 0.5 && r > hub && r < rim) c *= 0.85 + 0.15 * smooth(rim, rim - 0.012, r);
            // the groove where neighbouring plates meet is in shadow
            if (r > R - 0.006) c *= 0.55 + 0.45 * smooth(h, h - 0.007, Math.abs(z));
            col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = c;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return geo;
    }

    function gripGeometry() {
        const pts = [], n = 9, len = 2 * GRIP_HALF, rIn = GRIP_R - 0.0018;
        pts.push([BAR_R, -GRIP_HALF, 1]);
        for (let i = 0; i < n; i++) {
            const y0 = -GRIP_HALF + (i / n) * len, y1 = -GRIP_HALF + ((i + 1) / n) * len;
            const g0 = y0 + 0.0012, g1 = y1 - 0.0012;
            pts.push([rIn, y0, 0], [GRIP_R, g0 + 0.001, 0], [GRIP_R, g1 - 0.001, 0], [rIn, y1, 0]);
        }
        pts.push([BAR_R, GRIP_HALF, 1]);
        return lathe(pts, 20);
    }

    function fixedCollarGeometry() {
        const h = FIX_T / 2, c = 0.0018;
        return lathe([
            [BAR_R, -h, 1], [FIX_R - c, -h, 0], [FIX_R, -h + c, 0], [FIX_R, h - c, 0], [FIX_R - c, h, 1], [BAR_R, h, 1]
        ], 28);
    }

    // spin-lock nut: round red collar with shallow grip grooves; its outer face (+z) is chamfered
    // around a short boss the threaded bar end pokes out of
    function nutGeometry() {
        const h = SPIN_T / 2, R = SPIN_R, g = 0.0009;
        const pts = [[BAR_R, -h, 1], [R - 0.0015, -h, 0], [R, -h + 0.0015, 1]];
        const grooves = [-0.0035, 0.0015];
        grooves.forEach(z => { pts.push([R, z - 0.0011, 1], [R - g, z - 0.0005, 0], [R - g, z + 0.0005, 0], [R, z + 0.0011, 1]); });
        pts.push([R, h - 0.004, 1], [R - 0.0035, h, 1], [0.0175, h, 1], [0.0165, h + 0.0015, 1],
            [BAR_R + 0.0008, h + 0.0015, 1], [BAR_R, h + 0.0005, 1]);
        return lathe(pts, 32);
    }

    const barGeo = new THREE.CylinderGeometry(BAR_R, BAR_R, 1, 16, 1);
    barGeo.rotateX(Math.PI / 2);

    // ---------- collect instances ----------
    const parts = {};
    function addPart(key, geo, material, m, shade) {
        if (!parts[key]) parts[key] = { geo, material, items: [] };
        parts[key].items.push({ m, shade });
    }
    const plateGeos = {};
    Object.keys(PLATE).forEach(k => { plateGeos[k] = plateGeometry(PLATE[k].R, PLATE[k].t); });
    const gripGeo = gripGeometry(), fixGeo = fixedCollarGeometry(), nutGeo = nutGeometry();

    const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    SPEC.forEach(s => {
        const base = new THREE.Matrix4().compose(
            new THREE.Vector3(s.x, s.y, s.z),
            tmpQ.setFromEuler(tmpE.set(0, s.yaw * DEG, 0)),
            one);
        const local = (zPos, rot = 0, sz = 1, flip = false) => {
            const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, zPos),
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, flip ? Math.PI : 0, rot)), new THREE.Vector3(1, 1, sz));
            return base.clone().multiply(m);
        };
        const world = zPos => new THREE.Vector3(0, 0, zPos).applyMatrix4(base);
        // the handle and the inner plates sit inside the pile, hidden from most of the light
        const inner = zPos => 0.72 + 0.28 * smooth(0.075, 0.15, Math.abs(zPos));
        const shadeOf = (zPos, k = 1) => { const p = world(zPos); return shadeAt(p.x, p.y, p.z) * k; };

        addPart('bar', barGeo, steelMat, local(0, 0, 2 * s.half), shadeOf(0));
        addPart('grip', gripGeo, gripMat, local(0), shadeOf(0, 0.3));
        for (const sd of [-1, 1]) {
            addPart('fix', fixGeo, redMat, local(sd * (GRIP_HALF + FIX_T / 2)), shadeOf(sd * GRIP_HALF, 0.4));
            s.plateList.forEach(p => addPart('plate' + p.k, plateGeos[p.k], plateMat, local(sd * p.s), shadeOf(sd * p.s, inner(p.s))));
            addPart('nut', nutGeo, redMat, local(sd * s.nutS, 0, 1, sd < 0), shadeOf(sd * s.nutS));
        }
    });

    const color = new THREE.Color();
    Object.keys(parts).forEach(key => {
        const { geo, material, items } = parts[key];
        const im = new THREE.InstancedMesh(geo, material, items.length);
        items.forEach((it, i) => {
            im.setMatrixAt(i, it.m);
            im.setColorAt(i, color.setScalar(it.shade));
        });
        im.instanceMatrix.needsUpdate = true;
        im.instanceColor.needsUpdate = true;
        im.castShadow = true;
        im.receiveShadow = true;
        // bounds that cover every instance, so culling and framing see the real extent
        if (!geo.boundingBox) geo.computeBoundingBox();
        const gb = geo.boundingBox.clone(), all = new THREE.Box3();
        items.forEach(it => all.union(gb.clone().applyMatrix4(it.m)));
        geo.boundingBox = all;
        geo.boundingSphere = all.getBoundingSphere(new THREE.Sphere());
        group.add(im);
    });

    // ---------- soft contact shadows on the floor ----------
    {
        const x0 = 0.0, x1 = Math.min(0.81, desk.maxX - 0.03), z0 = L.room.minZ + 0.002, z1 = -0.72;
        const w = x1 - x0, d = z1 - z0, S = 512;
        const tex = canvasTexture(S, S, (g) => {
            const blob = (x, z, ang, lenA, lenB, a) => {
                g.save();
                g.translate((x - x0) / w * S, (z - z0) / d * S);
                g.rotate(ang);
                g.scale(lenA / w * S, lenB / d * S);
                const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
                gr.addColorStop(0, `rgba(0,0,0,${a})`);
                gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
                gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr;
                g.beginPath();
                g.arc(0, 0, 1, 0, Math.PI * 2);
                g.fill();
                g.restore();
            };
            // the whole pile shades the floor between and around its dumbbells
            const floorOnes = SPEC.filter(s => !s.on && Math.abs(s.yaw) < 45);
            const px = floorOnes.reduce((a, s) => a + s.x, 0) / floorOnes.length;
            const pz = floorOnes.reduce((a, s) => a + s.z, 0) / floorOnes.length;
            blob(px, pz + 0.03, 0, 0.42, 0.3, 0.35);
            SPEC.forEach(s => {
                if (s.on) return;
                // canvas: +u = +x, +v = +z, so the bar direction (ax.x, ax.z) has angle atan2(ax.z, ax.x)
                const ang = Math.atan2(s.ax[2], s.ax[0]);
                blob(s.x, s.z, ang, s.half + 0.1, 0.2, 0.5);
                for (const sd of [-1, 1]) {
                    const mid = sd * (s.plateList[0].s + s.nutS) / 2;
                    blob(s.x + s.ax[0] * mid, s.z + s.ax[2] * mid, ang, 0.08, 0.06, 0.75);
                }
            });
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
            map: tex, transparent: true, depthWrite: false, toneMapped: false,
            polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
        }));
        m.rotation.x = -Math.PI / 2;
        m.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2);
        m.renderOrder = 2;
        group.add(m);
    }
});
