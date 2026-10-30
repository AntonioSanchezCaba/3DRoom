// Acoustic dreadnought guitar (natural amber spruce top, cream binding, black teardrop pickguard,
// rosewood fretboard, 3+3 chrome tuners) standing in a low black A-frame floor stand in front of the
// bookshelf, leaning back so its headstock rests just off the left wall. Real dimensions in metres
// (body 508 mm, lower bout 397 mm, scale 645 mm), scaled up 12% to match the photo silhouette.
ROOM.register('guitar', (ctx) => {
    const { THREE, L, group, mat, tube, curveTube, roundedBox, roundedBoxGeometry, canvasTexture, rng, shadows } = ctx;
    const G = L.guitar;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    // ---------------- pose (solved from photo landmarks: body bottom, nut, head top, sound hole) ----------------
    const S = 1.12;                       // instrument scale
    const YAW = 1.45;                     // soundboard faces +x, turned a little towards the camera
    const LEAN = 0.235;                   // leans back (rad): headstock almost touching the left wall
    const B = V3(G.base.x + 0.114, 0.155, G.base.z + 0.05);   // bottom of the body outline, soundboard plane
    const n0 = V3(Math.sin(YAW), 0, Math.cos(YAW));
    const UP = V3(0, 1, 0);
    const axisY = UP.clone().multiplyScalar(Math.cos(LEAN)).addScaledVector(n0, -Math.sin(LEAN));
    const axisZ = n0.clone().multiplyScalar(Math.cos(LEAN)).addScaledVector(UP, Math.sin(LEAN));
    const axisX = new THREE.Vector3().crossVectors(axisY, axisZ);

    // Instrument local frame: +y along the guitar (body bottom = 0), +z out of the soundboard (top at z = 0),
    // +x towards the treble / pickguard side.
    const inst = new THREE.Group();
    inst.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axisX, axisY, axisZ));
    inst.position.copy(B);
    inst.scale.setScalar(S);
    group.add(inst);

    // ---------------- dimensions ----------------
    const BODY_L = 0.508;
    const depthAt = y => 0.124 - 0.024 * Math.min(1, Math.max(0, y / BODY_L));   // tapered rib depth
    const SCALE_LEN = 0.645;
    const NUT_Y = 0.866;                                   // 14th fret sits at the body joint
    const fretY = n => NUT_Y - SCALE_LEN * (1 - Math.pow(2, -n / 12));
    const BOARD_END = fretY(20);
    const boardHalf = y => 0.0222 + 0.01564 * (NUT_Y - y);
    const SADDLE_Y = NUT_Y - SCALE_LEN;
    const HOLE_Y = 0.365, HOLE_R = 0.0508;
    const BOARD_T = 0.0058;

    // ---------------- body outline (dreadnought) ----------------
    const half = [[0, 0], [0.075, 0.006], [0.135, 0.028], [0.175, 0.068], [0.196, 0.125], [0.197, 0.175],
        [0.183, 0.232], [0.156, 0.282], [0.139, 0.318], [0.139, 0.352], [0.146, 0.395], [0.145, 0.432],
        [0.134, 0.468], [0.108, 0.494], [0.060, 0.506], [0, 0.508]];
    const ctrl = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
    const outlineCurve = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => V3(x * 0.975, y, 0)), true, 'centripetal');
    const NO = 220;
    const outline = outlineCurve.getSpacedPoints(NO).slice(0, NO).map(p => new THREE.Vector2(p.x, p.y));

    // ---------------- textures ----------------
    const TEX = 1024, U0 = -0.2, UW = 0.4, VH = 0.51;            // soundboard UV window (local metres)
    const toC = (x, y) => [(x - U0) / UW * TEX, (1 - y / VH) * TEX];
    const SX = TEX / UW, SY = TEX / VH;

    const topTex = canvasTexture(TEX, TEX, (c, w, h) => {
        c.fillStyle = '#5e2c03';
        c.fillRect(0, 0, w, h);
        // brighter towards the upper bout (nearer the ceiling light in the photo), deeper amber at the tail
        const lg = c.createLinearGradient(0, toC(0, 0)[1], 0, toC(0, 0.5)[1]);
        lg.addColorStop(0, 'rgba(36,10,0,0.42)');
        lg.addColorStop(0.45, 'rgba(120,60,8,0.10)');
        lg.addColorStop(1, 'rgba(170,96,22,0.34)');
        c.fillStyle = lg;
        c.fillRect(0, 0, w, h);
        // lighter, more golden centre (finish wear + light), darker amber towards the rim
        const [gx, gy] = toC(-0.02, 0.33);
        const g = c.createRadialGradient(gx, gy, 20, gx, gy, 640);
        g.addColorStop(0, 'rgba(160,88,16,0.36)');
        g.addColorStop(0.55, 'rgba(140,70,6,0.10)');
        g.addColorStop(0.9, 'rgba(70,22,0,0.06)');
        g.addColorStop(1, 'rgba(60,18,0,0.16)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        // spruce grain: fine, straight, slightly wavy lines along the length
        const R = rng(731);
        for (let x = 0; x < w; x += 1.5 + R() * 4.5) {
            const a = 0.02 + R() * 0.07, ph = R() * 6.28, amp = 0.5 + R() * 1.5;
            c.strokeStyle = `rgba(66,20,0,${a.toFixed(3)})`;
            c.lineWidth = 0.7 + R() * 1.6;
            c.beginPath();
            for (let y = 0; y <= h; y += 24) {
                const xx = x + Math.sin(y * 0.006 + ph) * amp;
                if (y === 0) c.moveTo(xx, y); else c.lineTo(xx, y);
            }
            c.stroke();
        }
        // faint cross-grain silk (medullary rays)
        for (let i = 0; i < 260; i++) {
            const x = R() * w, y = R() * h;
            c.fillStyle = `rgba(190,110,40,${(0.03 + R() * 0.05).toFixed(3)})`;
            c.fillRect(x, y, 6 + R() * 18, 1.2);
        }
        // rosette: dark herringbone-ish band framed by thin cream / black rings
        const [hx, hy] = toC(0, HOLE_Y);
        const ring = (r, lw, col) => {
            c.strokeStyle = col; c.lineWidth = lw * SX;
            c.beginPath(); c.ellipse(hx, hy, r * SX, r * SY, 0, 0, Math.PI * 2); c.stroke();
        };
        ring(0.0535, 0.0018, '#1a0e06');
        ring(0.0552, 0.0012, '#e9dcbc');
        ring(0.0598, 0.0076, '#2a170a');
        ring(0.0598, 0.0030, '#4a2a12');
        for (let k = 0; k < 140; k++) {                  // tiny checker marks in the band
            const t = k / 140 * Math.PI * 2;
            c.fillStyle = k % 2 ? 'rgba(200,150,90,0.35)' : 'rgba(10,5,2,0.4)';
            c.fillRect(hx + Math.cos(t) * 0.0598 * SX - 1.5, hy - Math.sin(t) * 0.0598 * SY - 1.5, 3, 3);
        }
        ring(0.0643, 0.0012, '#e9dcbc');
        ring(0.0660, 0.0018, '#1a0e06');
        // purfling + cream binding along the rim (the binding tube adds the rounded edge)
        c.beginPath();
        outline.forEach((p, i) => { const [px, py] = toC(p.x, p.y); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
        c.closePath();
        c.strokeStyle = '#2b1507'; c.lineWidth = 0.0105 * SX; c.stroke();
        c.strokeStyle = '#a88c60'; c.lineWidth = 0.0060 * SX; c.stroke();
        c.strokeStyle = '#1c0d05'; c.lineWidth = 0.0022 * SX;
        c.save(); c.clip(); c.lineWidth = 0.0118 * SX; c.globalAlpha = 0.25; c.stroke(); c.restore();
    });

    // generic wood grain (stripes along canvas y), used for sides/back and the neck
    const grain = (seed, base, line, lineAlpha) => canvasTexture(512, 512, (c, w, h) => {
        c.fillStyle = base; c.fillRect(0, 0, w, h);
        const R = rng(seed);
        for (let x = 0; x < w; x += 2 + R() * 6) {
            c.strokeStyle = line; c.globalAlpha = lineAlpha * (0.3 + R());
            c.lineWidth = 1 + R() * 3;
            c.beginPath();
            const ph = R() * 6.28, amp = 1 + R() * 4;
            for (let y = 0; y <= h; y += 16) {
                const xx = x + Math.sin(y * 0.02 + ph) * amp;
                if (y === 0) c.moveTo(xx, y); else c.lineTo(xx, y);
            }
            c.stroke();
        }
        c.globalAlpha = 1;
    }, { repeatX: 1, repeatY: 1 });

    const sideTex = grain(91, '#44261a', '#26100a', 0.35);
    sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping;
    const neckTex = grain(57, '#5a3018', '#2e1408', 0.22);
    neckTex.wrapS = neckTex.wrapT = THREE.RepeatWrapping;

    // ---------------- materials ----------------
    const topMat = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.45, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.38 });
    const sideMat = new THREE.MeshPhysicalMaterial({ map: sideTex, roughness: 0.45, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
    const neckMat = new THREE.MeshPhysicalMaterial({ map: neckTex, roughness: 0.48, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    const headMat = new THREE.MeshPhysicalMaterial({ map: neckTex, color: 0xf4e4d4, roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35 });
    const boardMat = mat(0x2c1a10, { roughness: 0.62 });
    const bridgeMat = mat(0x2b170b, { roughness: 0.5 });
    const bone = mat(0xf2ebd9, { roughness: 0.38 });
    const binding = mat(0x95805c, { roughness: 0.48 });
    const pickMat = new THREE.MeshPhysicalMaterial({ color: 0x060606, roughness: 0.22, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const chrome = mat(0xc4c4c4, { roughness: 0.25, metalness: 0.55 });
    const buttonMat = mat(0xf2dfc2, { roughness: 0.3, metalness: 0.1 });   // chrome buttons catching the warm light
    const fretMat = mat(0x8a8072, { roughness: 0.42, metalness: 0.5 });
    const pearl = mat(0xb0a898, { roughness: 0.4 });
    const bronze = mat(0xa88a5a, { roughness: 0.55, metalness: 0.3 });
    const steel = mat(0xb8b8b4, { roughness: 0.5, metalness: 0.35 });
    const holeDark = new THREE.MeshBasicMaterial({ color: 0x0a0503 });

    const add = (mesh, parent = inst) => { parent.add(mesh); return mesh; };

    // ---------------- body: ribs (tapered band), back plate, soundboard with sound hole ----------------
    {
        const pos = [], nor = [], uv = [], idx = [];
        for (let i = 0; i < NO; i++) {
            const p = outline[i], a = outline[(i + NO - 1) % NO], b = outline[(i + 1) % NO];
            const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty);
            const nx = ty / tl, ny = -tx / tl;            // outward for a CCW outline
            const d = depthAt(p.y);
            pos.push(p.x, p.y, 0, p.x, p.y, -d);
            nor.push(nx, ny, 0, nx, ny, 0);
            uv.push(i / NO * 10, 0, i / NO * 10, 0.25);
        }
        for (let i = 0; i < NO; i++) {
            const a = 2 * i, b = a + 1, c = 2 * ((i + 1) % NO), d = c + 1;
            idx.push(a, b, c, c, b, d);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        add(new THREE.Mesh(geo, sideMat));
    }
    const bodyShape = () => new THREE.Shape(outline.map(p => p.clone()));
    {
        const geo = new THREE.ShapeGeometry(bodyShape());
        const p = geo.attributes.position, u = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) {
            p.setZ(i, -depthAt(p.getY(i)));
            u.setXY(i, p.getX(i) * 2.2, p.getY(i) * 1.2);
        }
        const ix = geo.index.array;
        for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; }
        geo.computeVertexNormals();
        add(new THREE.Mesh(geo, sideMat));
    }
    {
        const shape = bodyShape();
        const hole = new THREE.Path();
        hole.absarc(0, HOLE_Y, HOLE_R, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ShapeGeometry(shape, 72);
        const p = geo.attributes.position, u = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) u.setXY(i, (p.getX(i) - U0) / UW, p.getY(i) / VH);
        add(new THREE.Mesh(geo, topMat));
        // sound-hole edge (top thickness) and the dark interior seen through it
        const edge = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R, 0.003, 56, 1, true),
            mat(0x8a5524, { roughness: 0.7, side: THREE.DoubleSide }));
        edge.rotation.x = Math.PI / 2;
        edge.position.set(0, HOLE_Y, -0.0015);
        add(edge);
        const dark = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), holeDark);
        dark.position.set(0, HOLE_Y, -depthAt(HOLE_Y) + 0.002);
        add(dark);
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.012, 0.012), mat(0x3a220f, { roughness: 0.8 }));
        brace.position.set(0, HOLE_Y + HOLE_R + 0.012, -0.008);        // upper transverse brace, glimpsed inside
        add(brace);
    }
    // rounded binding along the top and back edges
    {
        const ring = (zf) => new THREE.CatmullRomCurve3(outline.map(p => V3(p.x, p.y, zf(p.y))), true, 'centripetal');
        add(new THREE.Mesh(new THREE.TubeGeometry(ring(() => -0.0011), NO, 0.0018, 6, true), binding));
        add(new THREE.Mesh(new THREE.TubeGeometry(ring(y => -depthAt(y) + 0.0011), NO, 0.0019, 6, true), sideMat));
    }

    // ---------------- pickguard (black teardrop hugging the rosette, treble side) ----------------
    {
        const PR = 0.068, a1 = THREE.MathUtils.degToRad(64), a2 = THREE.MathUtils.degToRad(-72);
        const H = HOLE_Y;
        const pg = new THREE.Shape();
        pg.moveTo(PR * Math.cos(a1), H + PR * Math.sin(a1));
        pg.bezierCurveTo(0.062, H + 0.066, 0.098, H + 0.034, 0.110, H - 0.012);
        pg.bezierCurveTo(0.122, H - 0.060, 0.096, H - 0.097, 0.062, H - 0.095);
        pg.bezierCurveTo(0.042, H - 0.093, 0.029, H - 0.081, PR * Math.cos(a2), H + PR * Math.sin(a2));
        pg.absarc(0, H, PR, a2, a1, false);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(pg, 32), pickMat);
        m.position.z = 0.0007;
        add(m);
    }

    // ---------------- bridge, saddle, pins ----------------
    const BRIDGE_Y = SADDLE_Y - 0.0075;
    add(roundedBox(0.152, 0.031, 0.009, 0.0025, bridgeMat, 0, BRIDGE_Y, 0.0045));
    const saddle = add(roundedBox(0.074, 0.003, 0.0048, 0.0012, bone, 0, SADDLE_Y, 0.0103));
    saddle.rotation.z = 0.045;
    const sX = i => -0.027 + i * 0.0108;                 // string spacing at the saddle
    const nX = i => -0.0178 + i * 0.00712;               // at the nut
    const PIN_Y = BRIDGE_Y - 0.0085;
    {
        const pins = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0029, 12, 8), bone, 6);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < 6; i++) {
            m4.compose(V3(sX(i), PIN_Y, 0.0092), new THREE.Quaternion(), V3(1, 1, 0.55));
            pins.setMatrixAt(i, m4);
        }
        add(pins);
    }

    // ---------------- neck (lofted D profile + heel), fretboard, frets, dots, nut ----------------
    {
        const secs = [
            [0.503, 0.0238, 0.097], [0.515, 0.0252, 0.086], [0.528, 0.0266, 0.066], [0.542, 0.0274, 0.046],
            [0.556, 0.0278, 0.031], [0.572, 0.0278, 0.0222], [0.600, 0.0274, 0.0196], [0.700, 0.0258, 0.0182],
            [0.800, 0.0236, 0.0168], [NUT_Y, 0.0224, 0.0158], [0.876, 0.0224, 0.0166], [0.884, 0.0222, 0.0165]
        ];
        const segs = 16, pos = [], idx = [];
        secs.forEach(([y, hw, d]) => {
            for (let j = 0; j <= segs; j++) {
                const t = Math.PI * j / segs;
                pos.push(hw * Math.cos(t), y, -d * Math.pow(Math.sin(t), 0.85));
            }
        });
        for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < segs; j++) {
            const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const uv = [];
        secs.forEach(([y]) => { for (let j = 0; j <= segs; j++) uv.push(j / segs * 0.3, y * 0.6); });
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        add(new THREE.Mesh(geo, neckMat));
        // heel cap against the ribs
        const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 20, Math.PI, Math.PI), neckMat);
        cap.scale.set(0.0238, 0.097, 1);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(0, 0.503, 0);
        add(cap);
    }
    {
        const bs = new THREE.Shape();
        bs.moveTo(-boardHalf(NUT_Y), NUT_Y);
        bs.lineTo(-boardHalf(BOARD_END), BOARD_END);
        bs.lineTo(boardHalf(BOARD_END), BOARD_END);
        bs.lineTo(boardHalf(NUT_Y), NUT_Y);
        bs.closePath();
        add(new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: BOARD_T, bevelEnabled: false }), boardMat));

        const frets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.0022, 0.0013), fretMat, 20);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
        for (let n = 1; n <= 20; n++) {
            const y = fretY(n);
            m4.compose(V3(0, y, BOARD_T + 0.0005), q, V3((boardHalf(y) * 2 + 0.0004) / 0.05, 1, 1));
            frets.setMatrixAt(n - 1, m4);
        }
        add(frets);

        const dotPos = [];
        [3, 5, 7, 9, 12, 15, 17].forEach(n => {
            const y = (fretY(n - 1) + fretY(n)) / 2;
            (n === 12 ? [-0.0085, 0.0085] : [0]).forEach(x => dotPos.push([x, y]));
        });
        const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0025, 16), pearl, dotPos.length);
        dotPos.forEach(([x, y], i) => { m4.makeTranslation(x, y, BOARD_T + 0.0002); dots.setMatrixAt(i, m4); });
        add(dots);

        add(roundedBox(0.0448, 0.005, 0.0088, 0.0012, bone, 0, NUT_Y + 0.0025, 0.0044));
    }

    // ---------------- headstock (angled back 14 deg) with 3+3 side-mounted chrome tuners ----------------
    const HEAD_A = THREE.MathUtils.degToRad(14);
    const HEAD_Y0 = NUT_Y + 0.005;
    const head = new THREE.Group();
    head.position.set(0, HEAD_Y0, 0);
    head.rotation.x = -HEAD_A;
    inst.add(head);
    const headHalf = y => 0.0235 + (0.0425 - 0.0235) * Math.pow(Math.min(1, y / 0.176), 0.9);
    {
        const hs = new THREE.Shape();
        hs.moveTo(-0.0235, 0);
        hs.lineTo(0.0235, 0);
        hs.bezierCurveTo(0.030, 0.064, 0.040, 0.128, 0.0425, 0.176);
        hs.quadraticCurveTo(0.044, 0.199, 0.022, 0.2);
        hs.lineTo(-0.022, 0.2);
        hs.quadraticCurveTo(-0.044, 0.199, -0.0425, 0.176);
        hs.bezierCurveTo(-0.040, 0.128, -0.030, 0.064, -0.0235, 0);
        const geo = new THREE.ExtrudeGeometry(hs, { depth: 0.013, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 16 });
        geo.translate(0, 0, -0.014);
        const p = geo.attributes.position, u = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) * 3, p.getY(i) * 0.6);
        add(new THREE.Mesh(geo, headMat), head);
    }
    const postPts = [];                                    // [side, row] -> post position (head frame)
    {
        const N = 6, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V3(1, 1, 1);
        const bushG = new THREE.CylinderGeometry(0.0046, 0.0050, 0.0024, 16); bushG.rotateX(Math.PI / 2);
        const postG = new THREE.CylinderGeometry(0.0029, 0.0029, 0.0115, 12); postG.rotateX(Math.PI / 2);
        const shaftG = new THREE.CylinderGeometry(0.0017, 0.0017, 0.007, 8); shaftG.rotateZ(Math.PI / 2);
        const bush = new THREE.InstancedMesh(bushG, chrome, N);
        const post = new THREE.InstancedMesh(postG, chrome, N);
        const housing = new THREE.InstancedMesh(roundedBoxGeometry(0.017, 0.019, 0.011, 0.002, 2), chrome, N);
        const shaft = new THREE.InstancedMesh(shaftG, chrome, N);
        const button = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10).scale(0.0105, 0.0042, 0.0088), buttonMat, N);
        let k = 0;
        [-1, 1].forEach(side => {
            for (let row = 0; row < 3; row++, k++) {
                const y = 0.056 + row * 0.047, hw = headHalf(y);
                const px = side * (hw - 0.0125);
                postPts.push({ side, row, p: V3(px, y, 0.0068) });
                bush.setMatrixAt(k, m4.compose(V3(px, y, 0.0012), q, one));
                post.setMatrixAt(k, m4.compose(V3(px, y, 0.0057), q, one));
                housing.setMatrixAt(k, m4.compose(V3(px + side * 0.0035, y, -0.0195), q, one));
                const x0 = px + side * 0.012, x1 = side * (hw + 0.0065);
                shaft.setMatrixAt(k, m4.compose(V3((x0 + x1) / 2, y, -0.0195), q, one));
                button.setMatrixAt(k, m4.compose(V3(side * (hw + 0.0135), y, -0.0195), q, one));
            }
        });
        [bush, post, housing, shaft, button].forEach(m => add(m, head));
    }

    // ---------------- strings: pin -> saddle -> nut -> tuner post ----------------
    {
        const headToInst = (v) => V3(v.x, HEAD_Y0 + v.y * Math.cos(HEAD_A) + v.z * Math.sin(HEAD_A),
            -v.y * Math.sin(HEAD_A) + v.z * Math.cos(HEAD_A));
        const radii = [0.00068, 0.00054, 0.00042, 0.00032, 0.00021, 0.00016];
        const target = [[-1, 0], [-1, 1], [-1, 2], [1, 2], [1, 1], [1, 0]];
        const linePts = [];
        for (let i = 0; i < 6; i++) {
            const r = radii[i], m = i < 4 ? bronze : steel;
            const tp = postPts.find(o => o.side === target[i][0] && o.row === target[i][1]).p.clone();
            tp.x -= target[i][0] * 0.003;
            const pts = [V3(sX(i), PIN_Y, 0.0098), V3(sX(i) + 0.00016 * (i - 2.5), SADDLE_Y + 0.0002, 0.0127 + r),
                V3(nX(i), NUT_Y + 0.0025, 0.0083 + r), headToInst(tp)];
            for (let s = 0; s < 3; s++) {
                const t = tube(pts[s], pts[s + 1], r, m, 5);
                t.castShadow = false;
                add(t);
                linePts.push(pts[s], pts[s + 1]);
            }
        }
        // hairlines on top of the thin cylinders, so the strings read as continuous lines from afar
        const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts),
            new THREE.LineBasicMaterial({ color: 0x8a7458, transparent: true, opacity: 0.15, depthWrite: false }));
        add(lines);
    }
    shadows(inst, true, true);
    // instanced parts sit far from their mesh origin: r128 culls them by the base geometry's sphere
    inst.traverse(o => { if (o.isInstancedMesh) o.frustumCulled = false; });
    inst.traverse(o => { if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop < 0.001) o.castShadow = false; });

    // ---------------- stand: low black A-frame with foam cradle ----------------
    const stand = new THREE.Group();
    stand.position.set(B.x, 0, B.z);
    stand.rotation.y = YAW;
    group.add(stand);
    {
        const metal = mat(0x141414, { roughness: 0.5, metalness: 0.35 });
        const foam = mat(0x0c0c0c, { roughness: 0.92 });
        const rubber = mat(0x090909, { roughness: 0.85 });
        const TL = Math.tan(LEAN);
        const ZC = -0.065;                                   // cradle bar under the middle of the bottom rib
        const RF = 0.011;                                    // foam sleeve radius
        const YB = B.y + ZC * TL - RF - 0.0005;              // bar top touches the rib
        const HX = 0.10;                                     // cradle arms, just inside the lower bout
        const frontZ = h => -h * TL + RF + 0.0025;           // just clear of the (leaning) soundboard
        // foam-covered U cradle: crossbar under the body, arms curling up in front of the soundboard
        const u = [];
        [-1, 1].forEach(sd => {
            const arm = [V3(sd * HX, B.y + 0.052, frontZ(0.052)), V3(sd * HX, B.y + 0.03, frontZ(0.03) + 0.001),
                V3(sd * HX, B.y + 0.008, frontZ(0.008) + 0.003), V3(sd * (HX - 0.004), YB + 0.006, -0.012),
                V3(sd * (HX - 0.012), YB, ZC + 0.012)];
            if (sd > 0) arm.reverse();
            if (sd < 0) u.push(...arm, V3(-0.05, YB, ZC), V3(0, YB, ZC), V3(0.05, YB, ZC));
            else u.push(...arm);
        });
        stand.add(curveTube(u, RF, foam, 120, 12));
        [-1, 1].forEach(sd => {
            const capAt = V3(sd * HX, B.y + 0.052, frontZ(0.052));
            const cap = new THREE.Mesh(new THREE.SphereGeometry(RF + 0.0008, 12, 8), rubber);
            cap.position.copy(capAt);
            stand.add(cap);
            // front leg: from under the cradle corner down and forward to a rubber-tipped foot, splayed out
            const leg = [V3(sd * (HX - 0.01), YB - 0.004, -0.03), V3(sd * 0.115, YB - 0.05, -0.024),
                V3(sd * 0.145, 0.032, -0.006), V3(sd * 0.165, 0.0128, 0.02), V3(sd * 0.19, 0.0125, 0.07)];
            stand.add(curveTube(leg, 0.0092, metal, 40, 10));
            const dir = V3(sd * 0.025, 0, 0.05).normalize();
            stand.add(tube(V3(sd * 0.188, 0.0113, 0.066), V3(sd * 0.188, 0.0113, 0.066).addScaledVector(dir, 0.028), 0.0112, rubber, 14));
        });
        // hinge block and rear leg with a rubber T-foot
        stand.add(roundedBox(0.05, 0.028, 0.032, 0.006, metal, 0, YB - 0.008, ZC - 0.01));
        const rearFoot = V3(0, 0.011, -0.232);
        stand.add(curveTube([V3(0, YB - 0.012, ZC - 0.02), V3(0, YB - 0.05, ZC - 0.075), rearFoot], 0.0092, metal, 24, 10));
        stand.add(tube(V3(-0.075, 0.011, rearFoot.z), V3(0.075, 0.011, rearFoot.z), 0.0105, rubber, 14));
        shadows(stand, true, true);
    }
});
