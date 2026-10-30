// Peripherals on the desk: a full-size black gaming keyboard with purple backlight (InstancedMesh keycaps,
// glowing deck and key skirts, legend overlay), a charcoal mouse pad with a lime low-poly print, a black
// wireless mouse, an upright off-white WiFi box beside the main monitor and a black bookshelf speaker behind it.
// Sizes and poses were measured from the reference photo (desk-plane unprojection of the outlines).
ROOM.register('peripherals', (ctx) => {
    const { THREE, L, group, mat, roundedBoxGeometry, roundedRectShape, canvasTexture, rng, shadows } = ctx;
    const P = L.peripherals;
    const deskY = L.desk.topY;

    const add = (parent, geo, m, x = 0, y = 0, z = 0, cast = true) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.castShadow = cast;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const glow = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

    // ======================================================================================= KEYBOARD
    {
        const U = 0.0210;                       // key pitch
        const NU = 23.75;                       // key field width in units: macro column + main + nav + numpad
        const KW = NU * U, KD = 6.5 * U;
        const W = KW + 0.024, D = KD + 0.009 + 0.037;   // slim side/back frame, short wrist lip at the front
        const HB = 0.028, HF = 0.017;           // case height at the back / at the front of the wrist lip
        const BACK = 0.009;                     // frame border behind the function row
        const slope = (HB - HF) / D;
        const hAt = z => HF + (HB - HF) * (D / 2 - z) / D;   // local z: -D/2 back .. +D/2 front

        const mCase = mat(0x141416, { roughness: 0.55 });
        const mRim = mat(0x18181b, { roughness: 0.38 });
        const mCap = mat(0x111113, { roughness: 0.4, emissive: 0x0b0316, emissiveIntensity: 1 });
        const mFeet = mat(0x080808, { roughness: 0.9 });

        const kb = new THREE.Group();
        kb.position.set(-0.387, deskY, -1.021);
        kb.rotation.y = -0.03;
        group.add(kb);

        // --- case: rounded slab whose height falls linearly from the back to the wrist edge
        {
            const g = roundedBoxGeometry(W, HB, D, 0.0075, 3);
            const p = g.attributes.position, n = g.attributes.normal;
            const b = -(HB - HF) / D / HB;                    // d(k)/dz with k(z) = hAt(z) / HB
            for (let i = 0; i < p.count; i++) {
                const y = p.getY(i) + HB / 2, z = p.getZ(i), k = hAt(z) / HB;
                p.setY(i, y * k + 0.0015);
                const nx = n.getX(i), ny = n.getY(i) / k, nz = n.getZ(i) - y * b * n.getY(i) / k;
                const l = Math.hypot(nx, ny, nz);
                n.setXYZ(i, nx / l, ny / l, nz / l);
            }
            p.needsUpdate = n.needsUpdate = true;
            g.computeBoundingBox(); g.computeBoundingSphere();
            add(kb, g, mCase);
            // rubber feet
            const fg = new THREE.CylinderGeometry(0.006, 0.006, 0.0015, 16);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
                add(kb, fg, mFeet, sx * (W / 2 - 0.025), 0.00075, sz * (D / 2 - 0.02), false));
        }

        // --- deck: a group lying on the sloped top surface over the key field
        const deckZ = -D / 2 + BACK + KD / 2;
        const deck = new THREE.Group();
        deck.position.set(0, hAt(deckZ) + 0.0015, deckZ);
        deck.rotation.x = Math.atan(slope);
        kb.add(deck);

        // raised slim frame around the key field
        {
            // shape y = -z: the front margin (shape y < 0) is wider so a strip of glow shows below the bottom row
            const s = roundedRectShape(KW + 0.013, KD + 0.018, 0.005);
            const hole = new THREE.Path();
            const hw = (KW + 0.003) / 2, hb = KD / 2 + 0.0015, hf = -(KD / 2 + 0.0065);
            hole.moveTo(-hw, hf); hole.lineTo(-hw, hb); hole.lineTo(hw, hb); hole.lineTo(hw, hf); hole.lineTo(-hw, hf);
            s.holes.push(hole);
            const g = new THREE.ExtrudeGeometry(s, { depth: 0.0028, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 6 });
            g.rotateX(-Math.PI / 2);
            add(deck, g, mRim, 0, -0.0006, 0);
        }

        // glowing deck under the keys (the light that leaks between the keycaps)
        {
            const tex = canvasTexture(512, 160, (g, w, h) => {
                g.fillStyle = '#220a3a'; g.fillRect(0, 0, w, h);
                const gr = g.createLinearGradient(0, 0, 0, h);
                gr.addColorStop(0, 'rgba(20,5,45,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(150,50,190,0.25)'); gr.addColorStop(1, 'rgba(200,90,230,0.5)');
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
                const side = g.createLinearGradient(0, 0, w, 0);          // dimmer at the far left/right ends
                side.addColorStop(0, 'rgba(15,3,30,0.6)'); side.addColorStop(0.04, 'rgba(0,0,0,0)');
                side.addColorStop(0.96, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(15,3,30,0.4)');
                g.fillStyle = side; g.fillRect(0, 0, w, h);
            });
            const g = new THREE.PlaneGeometry(KW + 0.003, KD + 0.008);
            g.rotateX(-Math.PI / 2);
            add(deck, g, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0.001, 0.0025, false);
        }

        // key list in key units: x/y = left/back edge, w/h = size
        const keys = [];
        const K = (x, y, w, h, label) => keys.push({ x: x + 1.25, y, w, h, label });
        [0, 1.5, 2.5, 3.5, 4.5, 5.5].forEach((y, i) => K(-1.25, y, 1, 1, 'G' + (i + 1)));   // macro column
        const row = (y, x0, spec) => { let x = x0; spec.forEach(s => { const [l, w = 1] = Array.isArray(s) ? s : [s]; K(x, y, w, 1, l); x += w; }); };
        K(0, 0, 1, 1, 'Esc');
        ['F1', 'F2', 'F3', 'F4'].forEach((l, i) => K(2 + i, 0, 1, 1, l));
        ['F5', 'F6', 'F7', 'F8'].forEach((l, i) => K(6.5 + i, 0, 1, 1, l));
        ['F9', 'F10', 'F11', 'F12'].forEach((l, i) => K(11 + i, 0, 1, 1, l));
        ['PrtSc', 'ScrLk', 'Pause'].forEach((l, i) => K(15.25 + i, 0, 1, 1, l));
        row(1.5, 0, ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['Back', 2]]);
        row(2.5, 0, [['Tab', 1.5], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', ['\\', 1.5]]);
        row(3.5, 0, [['Caps', 1.75], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", ['Enter', 2.25]]);
        row(4.5, 0, [['Shift', 2.25], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', ['Shift', 2.75]]);
        row(5.5, 0, [['Ctrl', 1.25], ['Win', 1.25], ['Alt', 1.25], ['', 6.25], ['Alt', 1.25], ['Fn', 1.25], ['Menu', 1.25], ['Ctrl', 1.25]]);
        row(1.5, 15.25, ['Ins', 'Home', 'PgUp']);
        row(2.5, 15.25, ['Del', 'End', 'PgDn']);
        K(16.25, 4.5, 1, 1, '↑');
        row(5.5, 15.25, ['←', '↓', '→']);
        row(1.5, 18.5, ['Num', '/', '*', '-']);
        row(2.5, 18.5, ['7', '8', '9']);
        row(3.5, 18.5, ['4', '5', '6']);
        row(4.5, 18.5, ['1', '2', '3']);
        K(21.5, 2.5, 1, 2, '+');
        K(21.5, 4.5, 1, 2, 'Ent');
        K(18.5, 5.5, 2, 1, '0');
        K(20.5, 5.5, 1, 1, '.');

        const GAP = 0.0013, TAPER = 0.0024, KH = 0.0082, KY = 0.0016;   // cap gap, side taper, height, lift
        const keyX = k => -KW / 2 + (k.x + k.w / 2) * U;
        const keyZ = k => -KD / 2 + (k.y + k.h / 2) * U;

        // tapered keycap geometry for one size
        const capGeo = (w, h) => {
            const bw = w * U - GAP, bd = h * U - GAP;
            const g = roundedBoxGeometry(bw, KH, bd, 0.0012, 2);
            const p = g.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const t = (p.getY(i) + KH / 2) / KH;
                p.setX(i, p.getX(i) * (1 - (2 * TAPER / bw) * t));
                p.setZ(i, p.getZ(i) * (1 - (2 * TAPER / bd) * t) + 0.0005 * t);
                p.setY(i, p.getY(i) + KH / 2);
            }
            g.computeVertexNormals();
            return g;
        };
        const bySize = {};
        keys.forEach(k => { const id = k.w + 'x' + k.h; (bySize[id] = bySize[id] || []).push(k); });
        const m4 = new THREE.Matrix4();
        const fieldBox = new THREE.Box3(new THREE.Vector3(-KW / 2, 0, -KD / 2), new THREE.Vector3(KW / 2, KY + KH, KD / 2));
        const fitField = (geo) => { geo.boundingBox = fieldBox.clone(); geo.boundingSphere = fieldBox.getBoundingSphere(new THREE.Sphere()); return geo; };
        Object.keys(bySize).forEach(id => {
            const list = bySize[id];
            const im = new THREE.InstancedMesh(fitField(capGeo(list[0].w, list[0].h)), mCap, list.length);
            list.forEach((k, i) => { m4.makeTranslation(keyX(k), KY, keyZ(k)); im.setMatrixAt(i, m4); });
            im.instanceMatrix.needsUpdate = true;
            im.castShadow = true; im.receiveShadow = true;
            deck.add(im);
        });
        // glowing skirts: the backlight spilling out around the base of every keycap
        {
            // brighter towards the front rows, as in the photo
            const im = new THREE.InstancedMesh(fitField(new THREE.BoxGeometry(1, 1, 1)), glow(0xffffff), keys.length);
            const base = new THREE.Color(0xb03ccc), col = new THREE.Color();
            const sc = new THREE.Vector3(), q = new THREE.Quaternion(), ps = new THREE.Vector3();
            keys.forEach((k, i) => {
                sc.set(k.w * U - GAP + 0.0007, 0.0024, k.h * U - GAP + 0.0007);
                ps.set(keyX(k), 0.0011 + 0.0012, keyZ(k));
                m4.compose(ps, q, sc);
                im.setMatrixAt(i, m4);
                const f = 0.3 + 0.7 * Math.pow((k.y + k.h) / 6.5, 1.8) + (k.x > 16 ? 0.12 : 0);
                im.setColorAt(i, col.copy(base).multiplyScalar(Math.min(1.05, f)));
            });
            im.instanceMatrix.needsUpdate = true;
            im.instanceColor.needsUpdate = true;
            deck.add(im);
        }
        // legends: transparent overlay just above the cap tops
        {
            const CW = 2048, CH = Math.round(2048 * KD / KW);  // canvas spans the key field
            const tex = canvasTexture(CW, CH, (g, w, h) => {
                const px = w / NU;
                g.clearRect(0, 0, w, h);
                g.textAlign = 'center'; g.textBaseline = 'middle';
                g.shadowColor = 'rgba(255,228,236,0.9)'; g.shadowBlur = 6;
                g.fillStyle = '#fff4e6';
                keys.forEach(k => {
                    if (!k.label) return;
                    const cx = (k.x + k.w / 2) * px, cy = (k.y + k.h / 2) * px;
                    const big = k.label.length === 1;
                    g.font = `bold ${Math.round(px * (big ? 0.58 : 0.3))}px Arial, sans-serif`;
                    const ox = big ? -px * 0.12 : 0, oy = big ? -px * 0.1 : -px * 0.05;
                    g.fillText(k.label, cx + ox, cy + oy);
                });
            });
            const g = new THREE.PlaneGeometry(KW, KD);
            g.rotateX(-Math.PI / 2);
            const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false });
            const lg = add(deck, g, m, 0, KY + KH + 0.0007, 0.00025, false);
            lg.receiveShadow = false;
        }
        // indicator LEDs and a small logo plate in the empty corner above the numpad
        {
            const ledG = new THREE.PlaneGeometry(0.0055, 0.0022);
            ledG.rotateX(-Math.PI / 2);
            const mLed = glow(0xfff8f0), mOff = mat(0x2a2a2e, { roughness: 0.4 });
            [0, 1, 2].forEach(i => add(deck, ledG, i < 2 ? mLed : mOff, -KW / 2 + (21.3 + i * 0.8) * U, 0.0012, -KD / 2 + 0.55 * U, false));
            const logo = canvasTexture(128, 48, (g, w, h) => {
                g.clearRect(0, 0, w, h);
                g.fillStyle = '#e8e4f0'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText('G', w / 2, h / 2 + 1);
            });
            const lg = new THREE.PlaneGeometry(0.012, 0.0045);
            lg.rotateX(-Math.PI / 2);
            add(deck, lg, new THREE.MeshBasicMaterial({ map: logo, transparent: true, toneMapped: false, depthWrite: false }),
                -KW / 2 + 20.2 * U, 0.0012, -KD / 2 + 0.55 * U, false);
        }
    }

    // ===================================================================================== MOUSE PAD
    const PAD = { x: 0.027, z: -1.021, w: 0.278, d: 0.345, rot: 0.02, t: 0.0028 };
    const padTop = deskY + PAD.t + 0.0015;
    {
        const tex = canvasTexture(832, 1024, (g, w, h) => {
            g.fillStyle = '#25261f'; g.fillRect(0, 0, w, h);
            const r = rng(4242);
            // jittered grid of points -> random-diagonal triangles (low-poly print)
            const NX = 8, NY = 10, pts = [];
            for (let j = 0; j <= NY; j++) {
                pts.push([]);
                for (let i = 0; i <= NX; i++) {
                    const edge = i === 0 || j === 0 || i === NX || j === NY;
                    const jx = edge ? 0 : (r() - 0.5) * 0.8, jy = edge ? 0 : (r() - 0.5) * 0.8;
                    pts[j].push([(i + jx) / NX * w, (j + jy) / NY * h]);
                }
            }
            const cx = 0.17 * w, cy = 0.56 * h;
            const tri = (a, b, c) => {
                const mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3;
                const d = Math.hypot((mx - cx) / w * 0.95, (my - cy) / h * 1.2);
                let k = Math.max(0, 1 - d / 0.5);                   // 1 at the centre, 0 at the rim
                k = Math.min(1, Math.pow(k * k * (3 - 2 * k), 0.7) * 1.25);
                const v = 0.5 + r() * 0.5;
                const lit = Math.min(1, k * v * 1.1);
                // dark olive -> deep green -> saturated lime
                const R = 35 + lit * (112 - 35) + lit * lit * 28 + (r() - 0.5) * 6;
                const G = 38 + lit * (212 - 38) + (r() - 0.5) * 8;
                const B = 31 - lit * 8 + (r() - 0.5) * 4;
                g.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
                g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill();
                g.strokeStyle = `rgba(${R | 0},${G | 0},${B | 0},1)`; g.lineWidth = 1.5; g.stroke();
                g.strokeStyle = `rgba(230,255,170,${0.05 + 0.12 * k})`; g.lineWidth = 1; g.stroke();
            };
            for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
                const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
                if (r() < 0.5) { tri(a, b, c); tri(a, c, d); } else { tri(a, b, d); tri(b, c, d); }
            }
            // soft vignette towards the rim + stitched dark edge
            const vg = g.createRadialGradient(cx, cy, 0.18 * h, cx, cy, 0.75 * h);
            vg.addColorStop(0, 'rgba(24,25,21,0)'); vg.addColorStop(1, 'rgba(24,25,21,0.6)');
            g.fillStyle = vg; g.fillRect(0, 0, w, h);
            g.strokeStyle = '#121310'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
            g.strokeStyle = 'rgba(70,72,64,0.6)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(11, 11, w - 22, h - 22);
        });
        const s = roundedRectShape(PAD.w, PAD.d, 0.014);
        const g = new THREE.ExtrudeGeometry(s, { depth: PAD.t, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 8 });
        g.rotateX(-Math.PI / 2);          // extrusion -> +y, shape y -> -z
        const p = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PAD.w / 2) / PAD.w, (-p.getZ(i) + PAD.d / 2) / PAD.d);
        uv.needsUpdate = true;
        const m = mat(0xffffff, { map: tex, roughness: 0.92, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 });
        const pad = add(group, g, m, PAD.x, deskY + 0.0009, PAD.z);
        pad.rotation.y = PAD.rot;
    }

    // ========================================================================================= MOUSE
    {
        const ML = 0.128, MW = 0.075, MH = 0.031;
        // shell: a sphere reshaped into an egg-shaped mouse (front = -z, palm hump towards the back)
        const shellAt = (sx, sy, sz) => {
            const t = sz;                                        // -1 front .. +1 back
            const half = MW / 2 * (0.9 + 0.1 * t) * (1 - 0.12 * Math.pow(t, 4));
            const prof = Math.max(0.12, 1 - 0.55 * (t - 0.22) * (t - 0.22));
            const y = sy >= 0 ? sy * MH * prof : sy * 0.005;
            return [sx * half, y, sz * ML / 2];
        };
        const g = new THREE.SphereGeometry(1, 48, 32);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const [x, y, z] = shellAt(p.getX(i), p.getY(i), p.getZ(i));
            p.setXYZ(i, x, y + 0.005, z);
        }
        g.computeVertexNormals();
        const mouse = new THREE.Group();
        mouse.position.set(0.006, padTop + 0.0008, -1.0);
        mouse.rotation.y = 0.03;
        group.add(mouse);
        const mShell = new THREE.MeshPhysicalMaterial({ color: 0x18181a, roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 });
        add(mouse, g, mShell);
        const mSeam = mat(0x030303, { roughness: 0.9 });
        // the shell is a squashed sphere: on the centre line y = MH*prof*sqrt(1 - t^2)
        const cl = t => new THREE.Vector3(0, 0.005 + MH * Math.max(0.12, 1 - 0.55 * (t - 0.22) * (t - 0.22)) * Math.sqrt(Math.max(0, 1 - t * t)) + 0.0003, t * ML / 2);
        const s1 = [], s2 = [];
        for (let t = -0.97; t <= -0.68; t += 0.03) s1.push(cl(t));
        for (let t = -0.38; t <= -0.12; t += 0.03) s2.push(cl(t));
        [s1, s2].forEach(pts => add(mouse, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.00045, 5), mSeam, 0, 0, 0, false));
        // scroll wheel in the gap between the buttons
        const tw = -0.53, wc = cl(tw);
        const wheel = add(mouse, new THREE.CylinderGeometry(0.0085, 0.0085, 0.0065, 24), mat(0x222224, { roughness: 0.7 }), 0, wc.y - 0.0068, wc.z);
        wheel.rotation.z = Math.PI / 2;
        const slot = add(mouse, new THREE.BoxGeometry(0.0095, 0.004, 0.024), mat(0x050505, { roughness: 0.9 }), 0, wc.y - 0.0016, wc.z);
        slot.rotation.x = -0.25;
    }

    // ================================================================================ WHITE WIFI BOX
    {
        const BW = 0.099, BH = 0.256, BT = 0.031;
        const box = new THREE.Group();
        box.position.set(-0.836, deskY, -1.332);
        box.rotation.y = 0.13;
        group.add(box);
        const face = canvasTexture(256, 640, (g, w, h) => {
            g.fillStyle = '#ebe6da'; g.fillRect(0, 0, w, h);
            const gr = g.createLinearGradient(0, 0, w, 0);
            gr.addColorStop(0, 'rgba(0,0,0,0.05)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0.06)');
            g.fillStyle = gr; g.fillRect(0, 0, w, h);
            // faint moulded seam lines
            g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(14, 380); g.lineTo(w - 14, 380); g.stroke();
            // printed status icons next to the LED
            g.fillStyle = 'rgba(90,90,90,0.7)';
            g.font = 'bold 18px Arial, sans-serif'; g.textAlign = 'center';
            g.fillText('WPS', w / 2, 300);
            // product sticker near the bottom
            g.fillStyle = '#d6d3cc'; g.fillRect(58, 440, 140, 150);
            g.strokeStyle = 'rgba(80,80,80,0.5)'; g.lineWidth = 2; g.strokeRect(58, 440, 140, 150);
            g.fillStyle = '#3a4a6a'; g.fillRect(96, 456, 64, 44);
            g.fillStyle = '#e8e8e8'; g.beginPath(); g.arc(128, 478, 13, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#333';
            for (let i = 0; i < 5; i++) g.fillRect(70, 512 + i * 14, 70 + ((i * 37) % 46), 6);
            for (let i = 0; i < 8; i++) g.fillRect(150 + (i % 4) * 9, 520 + Math.floor(i / 4) * 30, 5, 22);
        });
        const mBody = mat(0xe8e3d6, { roughness: 0.42 });
        add(box, roundedBoxGeometry(BW, BH, BT, 0.0045, 3), mBody, 0, BH / 2 + 0.0015, 0);
        // printed front face
        const fg = new THREE.PlaneGeometry(BW - 0.008, BH - 0.008);
        add(box, fg, mat(0xffffff, { map: face, roughness: 0.42 }), 0, BH / 2 + 0.0015, BT / 2 + 0.001, false);
        // round power/WPS button with a light ring, and a small reset hole below it
        const by = 0.0015 + BH * 0.74;
        add(box, new THREE.CylinderGeometry(0.0062, 0.0066, 0.002, 28).rotateX(Math.PI / 2), mat(0xdedad0, { roughness: 0.35 }), 0, by, BT / 2 + 0.001);
        add(box, new THREE.TorusGeometry(0.0074, 0.0012, 8, 32), mat(0x8c8474, { roughness: 0.5 }), 0, by, BT / 2 + 0.0012, false);
        add(box, new THREE.CircleGeometry(0.0022, 16), mat(0x1a1a1a, { roughness: 0.9 }), -0.004, 0.0015 + BH * 0.52, BT / 2 + 0.0012, false);
        add(box, new THREE.CircleGeometry(0.0012, 12), glow(0x9fdcff), 0.011, 0.0015 + BH * 0.52, BT / 2 + 0.0012, false);
        // small rubber feet
        const ft = new THREE.BoxGeometry(0.02, 0.0015, 0.02);
        [-1, 1].forEach(sx => add(box, ft, mat(0x2a2a2a, { roughness: 0.9 }), sx * (BW / 2 - 0.016), 0.00075, 0, false));
    }

    // ============================================================================ BOOKSHELF SPEAKER
    {
        const SW = 0.165, SH = 0.385, SD = 0.185;
        const spk = new THREE.Group();
        spk.position.set(-0.905, deskY, -1.595 + SD / 2);
        group.add(spk);
        const mCab = mat(0x161616, { roughness: 0.62 });
        const mBaffle = mat(0x1d1d1f, { roughness: 0.38 });
        add(spk, roundedBoxGeometry(SW, SH, SD, 0.008, 3), mCab, 0, SH / 2 + 0.002, 0);
        // slightly glossier front baffle
        add(spk, roundedBoxGeometry(SW - 0.006, SH - 0.006, 0.004, 0.003, 2), mBaffle, 0, SH / 2 + 0.002, SD / 2 - 0.0005);
        const fz = SD / 2 + 0.0015;                         // front plane of the baffle
        const mTrim = mat(0x2a2a2c, { roughness: 0.3, metalness: 0.4 });
        const disc = (r, z, m) => add(spk, new THREE.CircleGeometry(r, 32), m, 0, 0, z, false);
        // woofer: trim ring, rubber surround, shallow cone and dust cap, all standing proud of the baffle
        {
            const cy = 0.272, R = 0.062;
            add(spk, new THREE.TorusGeometry(R + 0.004, 0.0035, 10, 48), mTrim, 0, cy, fz + 0.0015);
            add(spk, new THREE.TorusGeometry(R - 0.003, 0.0045, 10, 48), mat(0x0c0c0c, { roughness: 0.8 }), 0, cy, fz + 0.002);
            const pts = [];
            for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.004 + t * (R - 0.007), -0.006 * (1 - t) * (1 - t * 0.3))); }
            const cone = add(spk, new THREE.LatheGeometry(pts, 48), mat(0x2c2b29, { roughness: 0.75, side: THREE.DoubleSide }), 0, cy, fz + 0.0075);
            cone.rotation.x = Math.PI / 2;
            disc(0.0045, 0, mat(0x2c2b29, { roughness: 0.75 })).position.set(0, cy, fz + 0.0016);
            const cap = add(spk, new THREE.SphereGeometry(R * 0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1a1a1c, { roughness: 0.45 }), 0, cy, fz + 0.0018);
            cap.rotation.x = Math.PI / 2;
            cap.scale.set(1, 0.45, 1);
        }
        // tweeter
        add(spk, new THREE.TorusGeometry(0.019, 0.003, 10, 36), mTrim, 0, 0.16, fz + 0.001);
        const dome = add(spk, new THREE.SphereGeometry(0.012, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1c1c1c, { roughness: 0.3, metalness: 0.2 }), 0, 0.16, fz + 0.0005);
        dome.rotation.x = Math.PI / 2;
        dome.scale.set(1, 0.55, 1);
        // bass port (a black disc reads as the opening) with a flared ring
        disc(0.016, 0, mat(0x020202, { roughness: 1 })).position.set(0, 0.07, fz + 0.0012);
        add(spk, new THREE.TorusGeometry(0.0168, 0.0022, 8, 32), mat(0x222222, { roughness: 0.5 }), 0, 0.07, fz + 0.0012);
        // power LED
        add(spk, new THREE.CircleGeometry(0.0018, 12), glow(0x5aa8ff), 0.055, 0.04, fz + 0.0002, false);
    }
});
