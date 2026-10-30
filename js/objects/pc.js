// PC: cube-style gaming case standing on the right end of the desk. Matte black steel shell with
// rounded edges, a dark tinted tempered-glass side facing the room (+z), a fine hex-mesh top over a
// 2x2 grid of ARGB fans, a glass front panel (+x) with three stacked ARGB fans, and a dimly visible
// interior: motherboard, AIO pump with a small LCD, RAM, GPU, PSU shroud, cables, rear exhaust fan.
// The case size and position were measured from the reference photo (corners of the top, the near
// vertical edges, the four top fans): 0.40 m (x) x 0.33 m (z) x 0.53 m (y) including the feet.
ROOM.register('pc', (ctx) => {
    const { THREE, L, group, ROOM, mat, roundedBoxGeometry, roundedRectShape, canvasTexture, rng, shadows } = ctx;

    // ------------------------------------------------------------------ footprint
    // Photo-fitted box. L.pc is used instead if it is updated to (about) this size.
    const FIT = { minX: 0.195, maxX: 0.595, minZ: -1.43, maxZ: -1.10 };
    const LP = L.pc || {};
    const layoutFits = Math.abs((LP.maxX - LP.minX) - 0.40) < 0.04 && Math.abs((LP.maxZ - LP.minZ) - 0.33) < 0.04;
    const F = layoutFits ? LP : FIT;
    const W = F.maxX - F.minX, D = F.maxZ - F.minZ;
    const hx = W / 2, hz = D / 2;
    const FOOT = 0.015;            // rubber feet
    const H = 0.525;               // steel body height
    const TOP_T = 0.024;           // top panel thickness
    const FRONT = 0.05;            // depth of the front fan chamber (solid side return on the glass side)

    const pc = new THREE.Group();
    pc.position.set((F.minX + F.maxX) / 2, L.desk.topY + FOOT, (F.minZ + F.maxZ) / 2);
    group.add(pc);

    const add = (geo, m, x = 0, y = 0, z = 0, cast = true, parent = pc) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.castShadow = cast;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const boxAt = (w, h, d, m, x, y, z, cast = true, parent = pc) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, cast, parent);
    const rbox = (w, h, d, r, m, x, y, z, cast = true, parent = pc) => add(roundedBoxGeometry(w, h, d, r, 2), m, x, y, z, cast, parent);

    // ------------------------------------------------------------------ materials
    const mSteel = mat(0x19181a, { roughness: 0.55, metalness: 0.25 });     // matte black powder coat
    const mSteelTop = mat(0x3c3833, { roughness: 0.6, metalness: 0.15 });
    const mInner = mat(0x0d0d0f, { roughness: 0.8 });                       // interior steel
    const mFrit = mat(0x050506, { roughness: 0.3 });                        // black print behind the glass
    const mPlastic = mat(0x0e0e10, { roughness: 0.6 });
    const mFanFrame = mat(0x0b0b0c, { roughness: 0.55 });
    const mRubber = mat(0x111111, { roughness: 0.95 });
    const mHeat = mat(0x2a2a2e, { roughness: 0.45, metalness: 0.6 });       // dark aluminium heatsinks
    const mGpu = mat(0x0c0c0d, { roughness: 0.6, metalness: 0.3 });
    const mSlot = mat(0x303034, { roughness: 0.45, metalness: 0.5 });
    const mGpuAccent = mat(0x2a2a2e, { roughness: 0.4, metalness: 0.6 });
    const mCable = mat(0x0a0a0a, { roughness: 0.75 });
    const mSilver = mat(0x8a8a8e, { roughness: 0.35, metalness: 0.8 });

    const glassMat = (opacity) => new THREE.MeshPhysicalMaterial({
        color: 0x0b0806, roughness: 0.06, metalness: 0, transparent: true, opacity,
        clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false
    });

    // ------------------------------------------------------------------ textures
    // Fan face: translucent blades lit by the hub LEDs (grey, tinted by the material colour).
    const fanTex = canvasTexture(256, 256, (g, w) => {
        const c = w / 2, R = w / 2;
        g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
        const gr = g.createRadialGradient(c, c, R * 0.18, c, c, R);
        gr.addColorStop(0, 'rgb(210,210,210)');
        gr.addColorStop(0.35, 'rgb(175,175,175)');
        gr.addColorStop(0.7, 'rgb(130,130,130)');
        gr.addColorStop(0.9, 'rgb(75,75,75)');
        gr.addColorStop(1, 'rgb(25,25,25)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
        // 9 swept blades: darker leading edges give the fan its structure
        g.strokeStyle = 'rgba(0,0,0,0.42)'; g.lineWidth = 5;
        for (let i = 0; i < 9; i++) {
            const a0 = i * Math.PI * 2 / 9;
            g.beginPath();
            for (let t = 0; t <= 1.001; t += 0.1) {
                const r = R * (0.2 + 0.77 * t), a = a0 + 0.85 * t;
                const x = c + r * Math.cos(a), y = c + r * Math.sin(a);
                if (t === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
        }
        // dark hub with a thin rim
        g.fillStyle = '#070707';
        g.beginPath(); g.arc(c, c, R * 0.19, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(60,60,60,1)'; g.lineWidth = 2;
        g.beginPath(); g.arc(c, c, R * 0.12, 0, Math.PI * 2); g.stroke();
    });
    // Bright LED ring around the hub (added on top of the face, almost white)
    const ringTex = canvasTexture(128, 128, (g, w) => {
        const c = w / 2;
        g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
        const gr = g.createRadialGradient(c, c, 0, c, c, c);
        gr.addColorStop(0.0, 'rgba(0,0,0,1)');
        gr.addColorStop(0.44, 'rgba(0,0,0,1)');
        gr.addColorStop(0.5, 'rgb(150,150,150)');
        gr.addColorStop(0.6, 'rgb(255,255,255)');
        gr.addColorStop(0.8, 'rgb(225,225,225)');
        gr.addColorStop(0.92, 'rgb(60,60,60)');
        gr.addColorStop(1.0, 'rgb(0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    // Hex-perforated steel (alpha map: white = steel, black = hole); one tile = 2 hole rows
    const meshTex = canvasTexture(64, 64, (g) => {
        g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#000';
        const holes = [[0, 0], [32, 0], [64, 0], [16, 32], [48, 32], [0, 64], [32, 64], [64, 64]];
        for (const [x, y] of holes) { g.beginPath(); g.arc(x, y, 12.5, 0, Math.PI * 2); g.fill(); }
    }, { repeatX: 2, repeatY: 2 });

    // ------------------------------------------------------------------ fans
    const FAN = 0.12, FAN_T = 0.025, FAN_R = 0.0575;
    const fanFrameGeo = (() => {
        const s = roundedRectShape(FAN, FAN, 0.009);
        const hole = new THREE.Path();
        hole.absarc(0, 0, FAN_R + 0.0005, 0, Math.PI * 2, true);
        s.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(s, { depth: FAN_T, bevelEnabled: false, curveSegments: 20 });
        g.translate(0, 0, -FAN_T / 2);
        return g;
    })();
    const fanFaceGeo = new THREE.CircleGeometry(FAN_R, 40);
    const fanRingGeo = new THREE.CircleGeometry(FAN_R * 0.52, 32);
    const fanHubGeo = new THREE.CylinderGeometry(0.0105, 0.0105, FAN_T * 0.7, 20);
    const fans = [];
    let haloMat = null;
    // per-group LED look: saturation, glow strength, ring strength, how much the ring takes the tint
    const FAN_LOOK = {
        top: { sat: 0.6, glow: 2.0, ring: 1.5, ringTint: 0.15 },
        rear: { sat: 0.72, glow: 2.3, ring: 0.85, ringTint: 0.4 },
        front: { sat: 0.65, glow: 1.2, ring: 0.4, ringTint: 0.5 }
    };
    // A fan with its axis along local +z; kind: 'top' (violet) | 'pink'
    function makeFan(kind, phase, parent, x, y, z, rx, ry) {
        const f = new THREE.Group();
        f.position.set(x, y, z);
        f.rotation.set(rx || 0, ry || 0, 0);
        parent.add(f);
        add(fanFrameGeo, mFanFrame, 0, 0, 0, true, f);
        const glow = new THREE.MeshBasicMaterial({ map: fanTex, side: THREE.DoubleSide, transparent: kind !== 'top' });
        const ring = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const face = add(fanFaceGeo, glow, 0, 0, 0, false, f);
        if (kind !== 'top') face.renderOrder = 5;
        // fans behind the side glass draw their LED ring after the glass so it keeps its brightness
        const ro = kind !== 'top' ? 6 : 2;
        const r1 = add(fanRingGeo, ring, 0, 0, 0.0035, false, f); r1.renderOrder = ro;
        const r2 = add(fanRingGeo, ring, 0, 0, -0.0035, false, f); r2.renderOrder = ro;
        const hub = add(fanHubGeo, mFanFrame, 0, 0, 0, false, f);
        hub.rotation.x = Math.PI / 2;
        hub.scale.y = 0.18;            // thin hub cap, stays between the two LED-ring planes
        fans.push({ kind, phase, glow, ring });
        return f;
    }

    // ------------------------------------------------------------------ shell
    // Bottom plate and rubber feet
    rbox(W, 0.02, D, 0.005, mSteel, 0, 0.01, 0);
    const footGeo = new THREE.CylinderGeometry(0.019, 0.021, FOOT, 20);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(footGeo, mRubber, sx * (hx - 0.05), -FOOT / 2, sz * (hz - 0.04));

    // Corner pillars
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbox(0.017, H - 0.02, 0.017, 0.004, mSteel, sx * (hx - 0.0095), H / 2, sz * (hz - 0.0095));

    // Top panel: rounded slab with an opening for the mesh; solid strip at the front (+x) with the I/O
    const holeX0 = -hx + 0.022, holeX1 = hx - 0.095, holeZ0 = -hz + 0.022, holeZ1 = hz - 0.022;
    {
        const s = roundedRectShape(W - 0.008, D - 0.008, 0.008);
        const r = 0.006, hw = (holeX1 - holeX0) / 2, hd = (holeZ1 - holeZ0) / 2, cx = (holeX0 + holeX1) / 2;
        const p = new THREE.Path();
        p.moveTo(cx - hw + r, -hd);
        p.lineTo(cx + hw - r, -hd); p.quadraticCurveTo(cx + hw, -hd, cx + hw, -hd + r);
        p.lineTo(cx + hw, hd - r); p.quadraticCurveTo(cx + hw, hd, cx + hw - r, hd);
        p.lineTo(cx - hw + r, hd); p.quadraticCurveTo(cx - hw, hd, cx - hw, hd - r);
        p.lineTo(cx - hw, -hd + r); p.quadraticCurveTo(cx - hw, -hd, cx - hw + r, -hd);
        s.holes.push(p);
        const g = new THREE.ExtrudeGeometry(s, { depth: TOP_T - 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 6 });
        const top = add(g, mSteelTop, 0, H - TOP_T + 0.004, 0);
        top.rotation.x = -Math.PI / 2;
    }
    const topFanXs = [-0.122, 0.006].map(v => v * W / 0.40), topFanZs = [0.05, -0.08];
    const meshHaloPos = [];
    for (const fx of topFanXs) for (const fz of topFanZs) meshHaloPos.push([fx, fz]);
    let meshHalo = null;
    // Hex mesh insert (lets the fan glow through)
    {
        const mw = holeX1 - holeX0 - 0.004, md = holeZ1 - holeZ0 - 0.004;
        const t = meshTex.clone();
        t.needsUpdate = true;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(mw / 0.008, md / (0.008 * 0.866));
        const m = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.62, metalness: 0.15, alphaMap: t, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        const mesh = add(new THREE.PlaneGeometry(mw, md), m, (holeX0 + holeX1) / 2, H - 0.012, 0, true);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 3;
        // light from the fans scattering in the mesh: soft additive halos over each fan
        const hTex = canvasTexture(256, 256, (g, w) => {
            const rg = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            rg.addColorStop(0, 'rgb(255,255,255)'); rg.addColorStop(0.35, 'rgb(190,190,190)'); rg.addColorStop(0.6, 'rgb(90,90,90)'); rg.addColorStop(1, 'rgb(0,0,0)');
            g.fillStyle = rg; g.fillRect(0, 0, w, w);
        });
        meshHalo = new THREE.MeshBasicMaterial({ map: hTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        meshHaloPos.forEach(([x, z]) => {
            const hm = add(new THREE.PlaneGeometry(0.15, 0.15), meshHalo, x, H - 0.0105, z, false);
            hm.rotation.x = -Math.PI / 2;
            hm.renderOrder = 4;
        });
    }
    // 2x2 top fans (exhaust), under the mesh
    const topFanY = H - TOP_T - FAN_T / 2 - 0.002;
    let fi = 0;
    for (const fx of topFanXs) for (const fz of topFanZs) makeFan('top', 0.6 * fi++, pc, fx, topFanY, fz, -Math.PI / 2, 0);
    // Front I/O on the solid strip of the top: power button with LED ring, reset, USB, audio
    {
        const ioTex = canvasTexture(128, 512, (g, w, h) => {
            g.clearRect(0, 0, w, h);
            const port = (y, ph, pw, c) => { g.fillStyle = '#2a2a2c'; g.fillRect(w / 2 - pw / 2 - 3, y - 3, pw + 6, ph + 6); g.fillStyle = c; g.fillRect(w / 2 - pw / 2, y, pw, ph); };
            port(160, 40, 18, '#050505'); port(215, 40, 18, '#050505');        // USB-A
            g.fillStyle = '#2a2a2c'; g.beginPath(); g.ellipse(w / 2, 290, 9, 20, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#050505'; g.beginPath(); g.ellipse(w / 2, 290, 5, 15, 0, 0, Math.PI * 2); g.fill(); // USB-C
            g.fillStyle = '#2a2a2c'; g.beginPath(); g.arc(w / 2, 345, 10, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#050505'; g.beginPath(); g.arc(w / 2, 345, 6, 0, Math.PI * 2); g.fill();     // audio
            g.fillStyle = '#2a2a2c'; g.beginPath(); g.arc(w / 2, 395, 7, 0, Math.PI * 2); g.fill();     // reset
        });
        const io = add(new THREE.PlaneGeometry(0.03, 0.12), new THREE.MeshStandardMaterial({ map: ioTex, transparent: true, roughness: 0.5 }), hx - 0.048, H + 0.0006, -0.005, false);
        io.rotation.set(-Math.PI / 2, 0, 0);
        add(new THREE.CylinderGeometry(0.0085, 0.0085, 0.003, 28), mPlastic, hx - 0.048, H + 0.0015, 0.09);
        const led = add(new THREE.TorusGeometry(0.0092, 0.0011, 6, 32), new THREE.MeshBasicMaterial({ color: 0xd8d8ff }), hx - 0.048, H + 0.0015, 0.09, false);
        led.rotation.x = Math.PI / 2;
    }

    // Far side panel (solid steel) and rear panel
    rbox(W - 0.004, H - 0.044, 0.006, 0.002, mSteel, 0, 0.02 + (H - 0.044) / 2, -hz + 0.003);
    boxAt(0.005, H - 0.046, D - 0.03, mInner, -hx + 0.0045, H / 2 - 0.002, 0);
    // inside of the rear wall: expansion slot covers and a perforated vent column near the glass
    for (let i = 0; i < 7; i++) boxAt(0.002, 0.017, 0.15, mSlot, -hx + 0.008, 0.1365 + i * 0.0203, -0.06, false);
    {
        const vTex = canvasTexture(64, 256, (g, w, h) => {
            g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#060607';
            for (let y = 8; y < h - 6; y += 12) for (let x = 8; x < w - 6; x += 12) g.fillRect(x + ((y / 12) & 1) * 4, y, 6, 7);
        });
        const v = add(new THREE.PlaneGeometry(0.03, 0.2), new THREE.MeshStandardMaterial({ map: vTex, roughness: 0.5, metalness: 0.4 }), -hx + 0.0072, 0.24, 0.13, false);
        v.rotation.y = Math.PI / 2;
    }

    // Rear face detail: I/O shield, exhaust grille, slot covers, PSU (one decal, u = far side -> glass side)
    {
        const pw = D - 0.012, ph = H - 0.05, y0 = 0.022;
        const TW = 512, TH = Math.round(512 * ph / pw);
        const sx = TW / pw, sy = TH / ph;
        const U = zf => (zf - 0.006) * sx, V = y => TH - (y - y0) * sy;     // zf = distance from the far side
        const rearTex = canvasTexture(TW, TH, (g) => {
            const R = rng(77);
            g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, TW, TH);
            for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},0.03)`; g.fillRect(R() * TW, R() * TH, 2, 2); }
            const rect = (z0, z1, ya, yb, c) => { g.fillStyle = c; g.fillRect(U(z0), V(yb), U(z1) - U(z0), V(ya) - V(yb)); };
            // motherboard I/O shield
            rect(0.032, 0.082, 0.285, 0.44, '#3b3c41');
            const ports = [[0.25, 0.30, '#111'], [0.31, 0.33, '#1d3a8a'], [0.34, 0.36, '#1d3a8a'], [0.37, 0.395, '#111'], [0.40, 0.425, '#222']];
            for (const [a, b, c] of ports) { rect(0.04, 0.056, a + 0.005, b, c); rect(0.06, 0.074, a + 0.005, b, c); }
            for (let i = 0; i < 5; i++) { g.fillStyle = ['#3fae49', '#e9e9e9', '#e85fa3', '#2f8de0', '#f0a030'][i]; g.beginPath(); g.arc(U(0.045 + (i % 3) * 0.012), V(0.295 - Math.floor(i / 3) * 0.012), 5, 0, Math.PI * 2); g.fill(); }
            // exhaust fan grille: hex holes inside a circle, 4 screws
            const fc = [0.2, 0.37], fr = 0.057;
            g.save(); g.beginPath(); g.arc(U(fc[0]), V(fc[1]), fr * sx, 0, Math.PI * 2); g.clip();
            g.fillStyle = '#070708';
            const hs = 9;
            for (let yy = -fr * sy; yy < fr * sy; yy += hs * 0.87) for (let xx = -fr * sx; xx < fr * sx; xx += hs) {
                const off = (Math.round(yy / (hs * 0.87)) & 1) ? hs / 2 : 0;
                g.beginPath(); g.arc(U(fc[0]) + xx + off, V(fc[1]) + yy, hs * 0.36, 0, Math.PI * 2); g.fill();
            }
            g.restore();
            g.fillStyle = '#0a0a0a';
            for (const a of [-1, 1]) for (const b of [-1, 1]) { g.beginPath(); g.arc(U(fc[0] + a * 0.0525), V(fc[1] + b * 0.0525), 4, 0, Math.PI * 2); g.fill(); }
            // 7 expansion slot covers with vent slots; the GPU bracket fills two of them
            for (let i = 0; i < 7; i++) {
                const ya = 0.128 + i * 0.0203, yb = ya + 0.017;
                rect(0.03, 0.14, ya, yb, '#232326');
                for (let k = 0; k < 9; k++) rect(0.04 + k * 0.011, 0.046 + k * 0.011, ya + 0.004, yb - 0.004, '#0a0a0b');
                g.fillStyle = '#4a4a4e'; g.beginPath(); g.arc(U(0.147), V((ya + yb) / 2), 3, 0, Math.PI * 2); g.fill();
            }
            rect(0.03, 0.14, 0.189, 0.246, '#151518');
            for (const [a, b] of [[0.04, 0.056], [0.062, 0.078], [0.084, 0.1], [0.106, 0.12]]) rect(a, b, 0.2, 0.208, '#050505');
            for (let k = 0; k < 10; k++) rect(0.04 + k * 0.009, 0.044 + k * 0.009, 0.218, 0.238, '#08080a');
            // vent column next to the slots
            for (let k = 0; k < 14; k++) rect(0.152, 0.175, 0.13 + k * 0.01, 0.136 + k * 0.01, '#0b0b0c');
            // power supply: honeycomb fan grille, IEC socket and switch
            rect(0.012, 0.165, 0.026, 0.11, '#141416');
            g.save(); g.beginPath(); g.arc(U(0.06), V(0.068), 0.036 * sx, 0, Math.PI * 2); g.clip();
            g.fillStyle = '#050505';
            for (let yy = -60; yy < 60; yy += 7) for (let xx = -60; xx < 60; xx += 8) { g.beginPath(); g.arc(U(0.06) + xx + ((yy / 7) & 1 ? 4 : 0), V(0.068) + yy, 2.6, 0, Math.PI * 2); g.fill(); }
            g.restore();
            rect(0.118, 0.148, 0.05, 0.072, '#050505');
            g.fillStyle = '#777'; for (const zz of [0.126, 0.133, 0.14]) g.fillRect(U(zz) - 1, V(0.066), 3, 8);
            rect(0.122, 0.142, 0.08, 0.095, '#0a0a0a'); rect(0.124, 0.132, 0.082, 0.093, '#a01818');
        });
        const rear = add(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.6, metalness: 0.2 }), -hx - 0.0008, y0 + ph / 2, 0, false);
        rear.rotation.y = -Math.PI / 2;
    }

    // Glass side (+z): tinted pane over a black printed border; solid side return over the front chamber
    const gx0 = -hx + 0.003, gx1 = hx - FRONT - 0.002, gy0 = 0.004, gy1 = H - TOP_T - 0.002;
    {
        const gw = gx1 - gx0, gh = gy1 - gy0, gcx = (gx0 + gx1) / 2, gcy = (gy0 + gy1) / 2, z = hz - 0.0025;
        boxAt(gw, 0.012, 0.002, mFrit, gcx, gy1 - 0.006, z, false);
        boxAt(gw, 0.024, 0.002, mFrit, gcx, gy0 + 0.012, z, false);
        boxAt(0.012, gh, 0.002, mFrit, gx0 + 0.006, gcy, z, false);
        boxAt(0.008, gh, 0.002, mFrit, gx1 - 0.004, gcy, z, false);
        const glass = add(new THREE.PlaneGeometry(gw, gh), glassMat(0.66), gcx, gcy, hz + 0.0012, false);
        glass.renderOrder = 4;
        // faint smudgy room reflections on the glass
        const reflTex = canvasTexture(512, 512, (g, w, h) => {
            const R = rng(31);
            g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
            const lg = g.createLinearGradient(0, 0, w, h * 0.6);
            lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.55, 'rgba(40,28,15,0.4)'); lg.addColorStop(1, 'rgba(70,50,28,0.5)');
            g.fillStyle = lg; g.fillRect(0, 0, w, h);
            for (let i = 0; i < 160; i++) {
                const x = w * (0.25 + 0.75 * R()), y = h * (0.1 + 0.8 * R()), r = 10 + 40 * R(), a = 0.06 + 0.16 * R();
                const rg = g.createRadialGradient(x, y, 0, x, y, r);
                rg.addColorStop(0, `rgba(105,80,50,${a})`); rg.addColorStop(1, 'rgba(105,80,50,0)');
                g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
            }
        });
        const refl = add(new THREE.PlaneGeometry(gw, gh), new THREE.MeshBasicMaterial({ map: reflTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }), gcx, gcy, hz + 0.0018, false);
        refl.renderOrder = 5;
        // side return of the front panel
        boxAt(FRONT, H - TOP_T - 0.018, 0.006, mSteel, hx - FRONT / 2, 0.02 + (H - TOP_T - 0.018) / 2, hz - 0.0025);
    }

    // Front panel (+x): steel border around a tinted glass window, three ARGB fans behind it
    {
        const fz0 = -hz + 0.012, fz1 = hz - 0.012, fy0 = 0.024, fy1 = H - TOP_T - 0.004;
        const x = hx - 0.0015, fh = H - TOP_T - 0.02;
        boxAt(0.004, fh, 0.012, mSteel, x, 0.02 + fh / 2, -hz + 0.007);
        boxAt(0.004, 0.006, D - 0.012, mSteel, x, 0.023, 0);
        boxAt(0.004, 0.006, D - 0.012, mSteel, x, fy1 + 0.003, 0);
        const fg = add(new THREE.PlaneGeometry(fz1 - fz0, fy1 - fy0), glassMat(0.45), hx + 0.0012, (fy0 + fy1) / 2, (fz0 + fz1) / 2, false);
        fg.rotation.y = Math.PI / 2;
        fg.renderOrder = 4;
        // fan mounting rail behind the fans
        boxAt(0.004, H - TOP_T - 0.03, D - 0.03, mInner, hx - FRONT + 0.002, (H - TOP_T) / 2, 0);
        const ys = [0.16, 0.295, 0.43];
        ys.forEach((y, i) => makeFan('front', 1.4 + 0.5 * i, pc, hx - 0.026, y, 0, 0, Math.PI / 2));
    }

    // ------------------------------------------------------------------ interior
    const zBoard = -hz + 0.028;                       // motherboard surface
    boxAt(W - 0.03, H - 0.06, 0.004, mInner, -0.01, H / 2, -hz + 0.012);   // motherboard tray
    // PSU shroud
    const shroudTop = 0.135;
    {
        const sx0 = -hx + 0.007, sx1 = hx - FRONT - 0.004;
        const shroudTex = canvasTexture(512, 128, (g, w, h) => {
            g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#060607';
            for (let r = 0; r < 6; r++) for (let c = 0; c < 22; c++) g.fillRect(300 + c * 9 + (r & 1) * 4, 26 + r * 13, 5, 7);
            g.fillStyle = '#2a2a2e'; g.fillRect(40, 54, 120, 3);
        });
        const sh = new THREE.MeshStandardMaterial({ map: shroudTex, roughness: 0.7, metalness: 0.2 });
        const m = [mInner, mInner, mInner, mInner, sh, mInner];
        add(new THREE.BoxGeometry(sx1 - sx0, shroudTop - 0.02, D - 0.03), m, (sx0 + sx1) / 2, (shroudTop + 0.02) / 2, -0.002);
        boxAt(sx1 - sx0, 0.003, 0.004, mSlot, (sx0 + sx1) / 2, shroudTop - 0.0015, hz - 0.019, false);   // folded top edge
    }
    // Motherboard
    const bx0 = -hx + 0.03, bx1 = bx0 + 0.244, by1 = H - 0.072, by0 = by1 - 0.305;
    {
        const pcbTex = canvasTexture(512, 640, (g, w, h) => {
            const R = rng(5);
            g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, w, h);
            g.strokeStyle = 'rgba(70,72,80,0.18)'; g.lineWidth = 1;
            for (let i = 0; i < 90; i++) { g.beginPath(); const x = R() * w, y = R() * h; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 140, y); g.lineTo(x + (R() - 0.5) * 140, y + (R() - 0.5) * 140); g.stroke(); }
            const hs = (x, y, ww, hh) => { g.fillStyle = '#2b2c31'; g.fillRect(x, y, ww, hh); g.fillStyle = '#18181b'; for (let k = x + 6; k < x + ww - 4; k += 9) g.fillRect(k, y + 4, 4, hh - 8); };
            hs(70, 18, 290, 64); hs(12, 70, 58, 250);                     // VRM heatsinks
            g.fillStyle = '#17171a'; g.fillRect(150, 120, 150, 150);       // socket area
            for (let i = 0; i < 4; i++) { g.fillStyle = '#1e1e22'; g.fillRect(372 + i * 22, 60, 10, 300); }   // DIMM slots
            g.fillStyle = '#151517'; g.fillRect(476, 150, 26, 120);         // 24-pin
            g.fillStyle = '#2f3036'; g.fillRect(20, 392, 330, 16); g.fillStyle = '#5a5b62'; g.fillRect(20, 392, 330, 3); // x16 slot
            g.fillStyle = '#1a1a1e'; g.fillRect(20, 488, 330, 12); g.fillRect(20, 568, 330, 12);
            hs(40, 430, 250, 36);                                           // M.2 cover
            hs(330, 470, 150, 110);                                         // chipset
            g.fillStyle = '#3a3b42'; g.beginPath(); g.moveTo(405, 500); g.lineTo(430, 545); g.lineTo(380, 545); g.closePath(); g.fill();
            g.fillStyle = '#9a9aa0'; for (const [x, y] of [[20, 20], [490, 20], [20, 330], [490, 330], [20, 620], [490, 620]]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
            g.fillStyle = 'rgba(150,150,160,0.5)'; g.font = 'bold 18px sans-serif'; g.fillText('GAMING', 110, 380);
        });
        const board = add(new THREE.PlaneGeometry(bx1 - bx0, by1 - by0), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.75, metalness: 0.1 }), (bx0 + bx1) / 2, (by0 + by1) / 2, zBoard - 0.012, false);
        board.receiveShadow = true;
        boxAt(bx1 - bx0, by1 - by0, 0.002, mInner, (bx0 + bx1) / 2, (by0 + by1) / 2, zBoard - 0.0135, false);
        // rear I/O cover and VRM heatsink blocks (3D)
        rbox(0.035, 0.13, 0.04, 0.004, mHeat, bx0 + 0.02, by1 - 0.09, zBoard + 0.008);
        rbox(0.14, 0.03, 0.03, 0.004, mHeat, bx0 + 0.13, by1 - 0.02, zBoard + 0.003);
    }
    // RAM sticks with a faint ARGB top strip
    const ramGlow = new THREE.MeshBasicMaterial({ color: 0x8a3cff });
    for (let i = 0; i < 2; i++) {
        const x = bx0 + 0.18 + i * 0.022;
        rbox(0.007, 0.135, 0.034, 0.002, mGpu, x, by1 - 0.09, zBoard + 0.005);
        boxAt(0.0075, 0.13, 0.004, ramGlow, x, by1 - 0.09, zBoard + 0.0235, false);
    }
    // AIO pump head with a small LCD (sensor read-out) facing the glass
    // (it sits close to the glass so the LCD shows just under the top frame, as in the photo)
    const pumpX = bx0 + 0.086, pumpY = 0.325, lcdZ = -0.045, pz0 = zBoard - 0.006;
    {
        rbox(0.066, 0.078, lcdZ - pz0 - 0.001, 0.012, mPlastic, pumpX, pumpY, (pz0 + lcdZ - 0.001) / 2);
        rbox(0.09, 0.09, 0.006, 0.004, mHeat, pumpX, pumpY, pz0 + 0.003);       // mounting bracket
        // portrait sensor read-out: cyan -> pink frame, cyan/pink values, yellow POWER gauge
        const lcdTex = canvasTexture(256, 320, (g, w, h) => {
            g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
            const lg = g.createLinearGradient(0, 0, w, h);
            lg.addColorStop(0, '#2ef0ff'); lg.addColorStop(0.45, '#5a8cff'); lg.addColorStop(0.7, '#c050ff'); lg.addColorStop(1, '#ff3fb4');
            g.strokeStyle = lg; g.lineWidth = 12;
            const r = 18, a = 14, b = w - 14, c = 14, d = h - 14;
            g.beginPath(); g.moveTo(a + r, c); g.lineTo(b - r, c); g.quadraticCurveTo(b, c, b, c + r); g.lineTo(b, d - r); g.quadraticCurveTo(b, d, b - r, d);
            g.lineTo(a + r, d); g.quadraticCurveTo(a, d, a, d - r); g.lineTo(a, c + r); g.quadraticCurveTo(a, c, a + r, c); g.stroke();
            g.fillStyle = '#3ae6ff'; g.font = 'bold 34px sans-serif';
            g.fillText('CPU', 34, 70); g.fillText('GPU', 34, 124);
            g.fillStyle = '#ff4fc8'; g.fillText('47°', 140, 70); g.fillText('52°', 140, 124);
            g.fillStyle = '#ff4fc8'; g.fillRect(34, 146, 188, 8);
            g.fillStyle = '#ffd23a'; g.font = 'bold 54px sans-serif'; g.fillText('POW', 40, 216); g.fillText('ER', 40, 272);
            g.fillStyle = '#ffd23a'; g.fillRect(150, 236, 70, 36);
        });
        // drawn after the tinted glass (transparent, high renderOrder) so it keeps its glow behind it
        const lcd = add(new THREE.PlaneGeometry(0.062, 0.076), new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false, transparent: true, opacity: 0.8, depthWrite: false }), pumpX, pumpY, lcdZ, false);
        lcd.renderOrder = 6;
        // AIO tubes from the pump to the front radiator
        const tubeA = (dz) => new THREE.CatmullRomCurve3([
            new THREE.Vector3(pumpX + 0.033, pumpY + 0.015 + dz * 0.4, zBoard + 0.03),
            new THREE.Vector3(pumpX + 0.075, pumpY + 0.04 + dz, zBoard + 0.04 + dz),
            new THREE.Vector3(hx - FRONT - 0.03, H - 0.09 + dz, zBoard + 0.06 + dz),
            new THREE.Vector3(hx - FRONT - 0.008, H - 0.075 + dz, zBoard + 0.09 + dz)
        ]);
        for (const dz of [0, -0.022]) add(new THREE.TubeGeometry(tubeA(dz), 28, 0.0055, 8, false), mCable, 0, 0, 0, true);
    }
    // GPU: horizontal card in the top x16 slot
    {
        const gx0 = -hx + 0.012, gx1 = gx0 + 0.285, gy = by0 + 0.085, gz0 = zBoard + 0.004, gz1 = gz0 + 0.128;
        const gw = gx1 - gx0, gd = gz1 - gz0, gcx = (gx0 + gx1) / 2, gcz = (gz0 + gz1) / 2;
        rbox(gw, 0.05, gd, 0.006, mGpu, gcx, gy, gcz);
        boxAt(gw - 0.01, 0.004, gd - 0.008, mGpuAccent, gcx, gy + 0.027, gcz - 0.002);          // backplate
        boxAt(gw * 0.62, 0.006, 0.002, mGpuAccent, gcx + 0.02, gy - 0.004, gz1 + 0.0005, false); // edge accent
        const logo = canvasTexture(256, 32, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d6aa8'; g.font = 'bold 22px sans-serif'; g.fillText('GAMING  X', 40, 24); });
        add(new THREE.PlaneGeometry(0.09, 0.011), new THREE.MeshBasicMaterial({ map: logo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), gx0 + 0.07, gy + 0.012, gz1 + 0.0012, false);
        // PCIe power cables
        for (const dy of [0, 0.012]) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
            new THREE.Vector3(gx1 - 0.04 - dy, gy + 0.026, gz0 + 0.07), new THREE.Vector3(gx1 - 0.03 - dy, gy + 0.06, gz0 + 0.08),
            new THREE.Vector3(gx1 + 0.02, gy + 0.03, gz0 + 0.05), new THREE.Vector3(gx1 + 0.03, shroudTop + 0.005, gz0 + 0.02)
        ]), 20, 0.005, 6, false), mCable, 0, 0, 0, true);
    }
    // 24-pin and CPU power cables
    {
        const c24 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(bx1 - 0.002, by1 - 0.13, zBoard + 0.01), new THREE.Vector3(bx1 + 0.02, by1 - 0.13, zBoard + 0.02),
            new THREE.Vector3(bx1 + 0.03, by0 + 0.08, zBoard + 0.03), new THREE.Vector3(bx1 + 0.03, shroudTop + 0.003, zBoard + 0.03)
        ]);
        add(new THREE.TubeGeometry(c24, 24, 0.011, 8, false), mCable, 0, 0, 0, true);
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
            new THREE.Vector3(bx0 + 0.02, by1 - 0.004, zBoard + 0.01), new THREE.Vector3(bx0 + 0.01, H - TOP_T - 0.03, zBoard + 0.012),
            new THREE.Vector3(-hx + 0.012, H - TOP_T - 0.03, zBoard + 0.004)
        ]), 16, 0.0045, 6, false), mCable, 0, 0, 0, true);
        // rubber grommets in the tray
        for (const y of [by1 - 0.13, by0 + 0.08]) rbox(0.008, 0.04, 0.006, 0.002, mRubber, bx1 + 0.03, y, -hz + 0.016, false);
    }
    // Rear exhaust fan (on the inside of the rear panel), seen through the glass at the top-left
    // (140 mm, close to the glass; a soft violet halo lights the rear wall around it)
    makeFan('rear', 0.2, pc, -hx + 0.021, 0.385, 0.075, 0, Math.PI / 2).scale.setScalar(1.17);
    {
        const haloTex = canvasTexture(128, 128, (g, w) => {
            const rg = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.45, 'rgba(120,120,120,1)'); rg.addColorStop(1, 'rgba(0,0,0,1)');
            g.fillStyle = rg; g.fillRect(0, 0, w, w);
        });
        haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        const halo = add(new THREE.PlaneGeometry(0.2, 0.2), haloMat, -hx + 0.0075, 0.385, 0.06, false);
        halo.rotation.y = Math.PI / 2;
        halo.renderOrder = 6;
    }

    // ------------------------------------------------------------------ RGB glow lights
    const inLight = new THREE.PointLight(0xa040ff, 0.45, 0.45, 2);
    inLight.position.set(-0.06, 0.3, 0.1);
    pc.add(inLight);
    const frontLight = new THREE.PointLight(0xff3cc8, 0.35, 0.55, 2);
    frontLight.position.set(hx + 0.07, 0.25, 0.04);
    pc.add(frontLight);
    let glowLevel = 1;
    ROOM.onTheme(isNight => {
        glowLevel = isNight ? 1 : 0.45;
        inLight.intensity = 0.45 * glowLevel;
        frontLight.intensity = 0.35 * glowLevel;
    });

    // ------------------------------------------------------------------ RGB animation
    // Slow drift through violet/pink; roughly every 90 s one rainbow sweep, then back.
    const tint = new THREE.Color(), white = new THREE.Color(1, 1, 1), tmp = new THREE.Color();
    const hueAt = (kind, phase, t) => {
        const base = kind === 'top' ? 0.68 : kind === 'rear' ? 0.845 : 0.875;
        let h = base + 0.045 * Math.sin(t * 0.21 + phase) + 0.025 * Math.sin(t * 0.083 + phase * 0.5);
        const cyc = t % 90;
        if (cyc > 78) h += THREE.MathUtils.smoothstep(cyc, 78, 90);
        return ((h % 1) + 1) % 1;
    };
    function updateRGB(t) {
        for (const f of fans) {
            const h = hueAt(f.kind, f.phase, t);
            const k = FAN_LOOK[f.kind];
            tint.setHSL(h, k.sat, 0.55);
            f.glow.color.copy(tint).multiplyScalar(k.glow);
            f.ring.color.copy(white).lerp(tint, k.ringTint).multiplyScalar(k.ring);
        }
        tmp.setHSL(hueAt('top', 0, t), 0.9, 0.55); inLight.color.copy(tmp);
        tmp.setHSL(hueAt('front', 1.9, t), 0.9, 0.55); frontLight.color.copy(tmp);
        haloMat.color.setHSL(hueAt('rear', 0.2, t), 0.8, 0.5).multiplyScalar(0.16);
        meshHalo.color.setHSL(hueAt('top', 0.9, t), 0.55, 0.5).multiplyScalar(0.2);
        ramGlow.color.setHSL(hueAt('top', 2.5, t), 0.85, 0.5).multiplyScalar(0.22);
    }
    updateRGB(0);
    ROOM.onFrame((t) => updateRGB(t));

    // soft contact shadow on the desk around the feet
    {
        const sTex = canvasTexture(256, 256, (g, w, h) => {
            g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
            g.shadowColor = '#fff'; g.shadowBlur = 40; g.fillStyle = '#fff';
            g.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
        });
        const cs = add(new THREE.PlaneGeometry(W + 0.12, D + 0.12), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: sTex, transparent: true, opacity: 0.5, depthWrite: false }), 0, -FOOT + 0.0012, 0, false);
        cs.rotation.x = -Math.PI / 2;
        cs.receiveShadow = false;
    }

    shadows(pc, true, true);
    // emissive parts and thin overlays never cast shadows
    pc.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
});
