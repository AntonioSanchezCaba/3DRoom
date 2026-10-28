// Monitors: a 1800R curved ultrawide on a charcoal stand (neck behind the screen, wide flat base plate),
// plus a smaller ultrawide hanging above-left of it on a short arm from a dark grey wall-mounted post
// whose top sticks out above the screen. Pose, size and curvature were solved from the reference photo
// (corners and the traced top edge of the main screen, corners of the upper screen); the screen contents
// were drawn after rectified views of both screens taken from the photo.
ROOM.register('monitors', (ctx) => {
    const { THREE, L, group, ROOM, mat, roundedBoxGeometry, roundedRectShape, canvasTexture, rng, shadows } = ctx;
    const deskY = L.desk.topY;

    // ------------------------------------------------------------------ materials
    const mBezel = mat(0x1d1b1a, { roughness: 0.46 });                  // satin black front frame
    const mShell = mat(0x1a1918, { roughness: 0.74 });                  // matte black rear plastic
    const mLip = mat(0x3a3936, { roughness: 0.3, metalness: 0.3 });     // glossy lower lip of the chin
    const mStand = mat(0x262628, { roughness: 0.5, metalness: 0.3 });   // charcoal stand
    const mStandTop = mat(0x2c2c2e, { roughness: 0.44, metalness: 0.3 });
    const mPole = mat(0x45433f, { roughness: 0.4, metalness: 0.55 });   // powder-coated steel post
    const mPlastic = mat(0x1c1b1a, { roughness: 0.55 });
    const mLogo = new THREE.MeshBasicMaterial({ color: 0x6a6660 });
    const screenMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

    const add = (geo, m, castShadow = true) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };

    // ------------------------------------------------------------------ curved-geometry helpers
    // Geometry is authored flat: x = arc length across the screen, y = world height, z = 0 on the front
    // plane and negative behind it. bend() wraps it onto the 1800R cylinder whose axis is in front.
    function bend(geo, R, cx, cz) {
        const p = geo.attributes.position, n = geo.attributes.normal;
        for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            const phi = x / R, s = Math.sin(phi), c = Math.cos(phi), r = R - z;
            p.setXYZ(i, cx + r * s, y, cz + R - r * c);
            const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
            n.setXYZ(i, nx * c - nz * s, ny, nx * s + nz * c);
        }
        p.needsUpdate = true;
        n.needsUpdate = true;
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
    }
    // Side profile (shape x = depth behind the front plane, shape y = height) swept across x
    function sweepX(shape, width, steps) {
        const g = new THREE.ExtrudeGeometry(shape, { depth: width, steps, bevelEnabled: false, curveSegments: 8 });
        g.rotateY(Math.PI / 2);                 // shape x -> -z, extrusion -> +x
        g.translate(-width / 2, 0, 0);
        return g;
    }
    function profile(d0, d1, y0, y1, rBack, rFront) {
        const s = new THREE.Shape();
        s.moveTo(d0 + rFront, y0);
        s.lineTo(d1 - rBack, y0);
        s.quadraticCurveTo(d1, y0, d1, y0 + rBack);
        s.lineTo(d1, y1 - rBack);
        s.quadraticCurveTo(d1, y1, d1 - rBack, y1);
        s.lineTo(d0 + rFront, y1);
        s.quadraticCurveTo(d0, y1, d0, y1 - rFront);
        s.lineTo(d0, y0 + rFront);
        s.quadraticCurveTo(d0, y0, d0 + rFront, y0);
        return s;
    }
    // soft elliptical glow for the 2D canvas
    function glow(g, x, y, rx, ry, stops) {
        g.save();
        g.translate(x, y);
        g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        stops.forEach(([o, c]) => gr.addColorStop(o, c));
        g.fillStyle = gr;
        g.fillRect(-rx, -rx, 2 * rx, 2 * rx);
        g.restore();
    }
    const fade = (rgb, a) => [[0, `rgba(${rgb},${a})`], [0.5, `rgba(${rgb},${a * 0.45})`], [1, `rgba(${rgb},0)`]];

    // ================================================================== MAIN MONITOR (34", 1800R)
    const R = 1.8;
    const MX = -0.35, MZ = -1.35;          // centre of the front plane (solved from the photo)
    const Y0 = 0.867, Y1 = 1.373;          // bottom / top of the outer frame
    const CHORD = 0.84;
    const ARC = 2 * R * Math.asin(CHORD / 2 / R);
    const SB = { side: 0.0095, top: 0.0075, bottom: 0.011 };            // bezel widths
    const SY0 = Y0 + SB.bottom, SY1 = Y1 - SB.top, SW = ARC - 2 * SB.side;
    const PANEL_D = 0.016;

    // panel slab (frame + thin rear skin), rounded rear edges
    add(bend(sweepX(profile(0, PANEL_D, Y0, Y1, 0.006, 0.0015), ARC, 64), R, MX, MZ), mBezel);

    // rear housing: a pillow-shaped hump in the lower middle where the electronics and the stand mount sit
    {
        const hw = 0.62, s = new THREE.Shape();
        const d0 = 0.01, yb = 0.905, yt = 1.325;
        s.moveTo(d0, yb);
        s.bezierCurveTo(0.034, yb, 0.058, 0.935, 0.064, 0.985);
        s.lineTo(0.068, 1.16);
        s.bezierCurveTo(0.066, 1.25, 0.04, yt, d0, yt);
        s.lineTo(d0, yb);
        const g = sweepX(s, hw, 40);
        const p = g.attributes.position;
        const yc = 1.10;
        for (let i = 0; i < p.count; i++) {
            const t = Math.min(1, Math.abs(p.getX(i)) / (hw / 2));
            const f = t < 0.55 ? 1 : Math.cos((t - 0.55) / 0.45 * Math.PI / 2) * 0.85 + 0.15;
            const d = -p.getZ(i);
            p.setZ(i, -(d0 + (d - d0) * Math.max(0.12, f)));
            p.setY(i, yc + (p.getY(i) - yc) * (0.72 + 0.28 * f));
        }
        g.computeVertexNormals();
        add(bend(g, R, MX, MZ), mShell);
        // VESA / hinge block the neck clips into
        const hinge = new THREE.Mesh(roundedBoxGeometry(0.11, 0.12, 0.03, 0.008, 2), mStand);
        hinge.position.set(MX, 1.075, MZ - 0.078);
        group.add(shadows(hinge));
        // vent slits on the upper slope of the hump
        const ventGeo = new THREE.BoxGeometry(0.16, 0.003, 0.012);
        for (let k = 0; k < 5; k++) {
            const v = new THREE.Mesh(ventGeo, mPlastic);
            v.position.set(MX, 1.255 - k * 0.012, MZ - 0.052 - k * 0.003);
            v.rotation.x = -0.5;
            group.add(v);
        }
    }

    // glossy lower lip on the chin + small logo
    add(bend(new THREE.BoxGeometry(ARC - 0.01, 0.0035, 0.003, 48, 1, 1).translate(0, Y0 + 0.0022, 0.0006), R, MX, MZ), mLip, false);
    add(bend(new THREE.PlaneGeometry(0.032, 0.0042).translate(0, Y0 + 0.0062, 0.0011), R, MX, MZ), mLogo, false);

    // ---------- screen contents: neon night scene with a sports car (drawn in reference mm) ----------
    const mainTex = canvasTexture(1024, 612, (g, w, h) => {
        const sx = w / 818, sy = h / 488;
        g.setTransform(sx, 0, 0, sy, -10 * sx, -9 * sy);  // reference frame: screen spans x 10..828, y 9..497
        const r = rng(3417);
        // night background
        g.fillStyle = 'rgb(34,24,34)';
        g.fillRect(0, 0, 840, 510);
        g.globalCompositeOperation = 'lighter';
        // broad colour fields: magenta haze over the top half, reddish haze left, violet reflection band
        g.filter = 'blur(16px)';
        glow(g, 420, 150, 330, 190, fade('90,14,72', 0.75));
        glow(g, 720, 220, 150, 120, fade('34,8,26', 0.8));
        glow(g, 185, 290, 120, 70, fade('80,12,44', 0.8));
        glow(g, 430, 420, 270, 75, fade('16,0,60', 0.9));
        // light beams under the lamps (wide magenta columns, darker V between the two rows)
        const beam = (x, y, w0, w1, len, rgb, a) => {
            const gr = g.createLinearGradient(0, y, 0, y + len);
            gr.addColorStop(0, `rgba(${rgb},${a})`);
            gr.addColorStop(0.5, `rgba(${rgb},${a * 0.5})`);
            gr.addColorStop(1, `rgba(${rgb},0)`);
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(x - w0, y);
            g.lineTo(x + w0, y);
            g.lineTo(x + w1, y + len);
            g.lineTo(x - w1, y + len);
            g.closePath();
            g.fill();
        };
        beam(292, 14, 26, 80, 250, '170,26,140', 0.6);
        beam(540, 16, 26, 80, 250, '170,26,140', 0.6);
        beam(350, 100, 12, 34, 120, '150,24,120', 0.45);
        beam(500, 102, 12, 34, 120, '150,24,120', 0.45);
        beam(395, 140, 8, 22, 70, '150,24,120', 0.4);
        beam(484, 142, 8, 22, 70, '150,24,120', 0.4);
        g.filter = 'none';
        // lamps: two rows converging towards the vanishing point, plus a violet one on the right
        const lamps = [[291, 28, 1], [344, 103, 0.62], [379, 131, 0.5], [404, 150, 0.38], [418, 164, 0.28],
                       [538, 31, 1], [497, 106, 0.62], [488, 133, 0.5], [482, 150, 0.38], [474, 164, 0.28]];
        lamps.forEach(([x, y, s]) => {
            glow(g, x, y, 52 * s + 6, 52 * s + 6, [[0, 'rgba(255,110,225,0.9)'], [0.3, 'rgba(210,50,180,0.5)'], [1, 'rgba(120,20,100,0)']]);
            glow(g, x, y, 14 * s + 3, 14 * s + 3, [[0, 'rgba(255,230,255,1)'], [0.6, 'rgba(255,150,240,0.7)'], [1, 'rgba(255,120,230,0)']]);
        });
        glow(g, 559, 132, 36, 36, [[0, 'rgba(190,120,255,0.9)'], [0.3, 'rgba(120,60,230,0.45)'], [1, 'rgba(60,20,140,0)']]);
        glow(g, 559, 132, 7, 7, [[0, 'rgba(240,220,255,1)'], [1, 'rgba(200,160,255,0)']]);
        // specks of light (rain / bokeh)
        for (let i = 0; i < 90; i++) {
            const x = 400 + r() * 420, y = 50 + r() * 360, s = 1 + r() * 2.2, a = 0.25 + r() * 0.5;
            g.fillStyle = `rgba(${210 + r() * 45 | 0},${150 + r() * 90 | 0},255,${a})`;
            g.fillRect(x, y, s, s);
        }
        for (let i = 0; i < 30; i++) {
            const x = 30 + r() * 190, y = 110 + r() * 260;
            g.fillStyle = `rgba(230,110,190,${0.15 + r() * 0.3})`;
            g.fillRect(x, y, 1 + r() * 1.5, 1 + r());
        }
        // pink neon glyphs on the far left (city lights)
        g.filter = 'blur(1.4px)';
        [[36, 270], [54, 268], [72, 273], [91, 270], [108, 274]].forEach(([x, y], i) => {
            g.fillStyle = `rgba(235,80,150,${0.5 + 0.12 * (i % 2)})`;
            g.fillRect(x, y, 3, 26);
            g.fillRect(x + 8, y + 2, 3, 24);
            g.fillRect(x, y + 11, 11, 3);
        });
        g.filter = 'none';
        // ---- wet road reflection under the car
        g.filter = 'blur(8px)';
        glow(g, 300, 418, 120, 50, fade('90,14,170', 0.9));
        glow(g, 540, 395, 110, 45, fade('40,16,170', 0.9));
        glow(g, 262, 418, 22, 22, fade('255,130,235', 0.95));
        glow(g, 330, 456, 20, 18, fade('255,110,215', 0.85));
        glow(g, 226, 452, 22, 22, fade('255,80,130', 0.9));
        glow(g, 300, 470, 40, 14, fade('200,50,160', 0.5));
        g.fillStyle = 'rgba(130,110,255,0.6)';
        g.fillRect(470, 368, 120, 8);
        g.fillRect(500, 408, 100, 6);
        g.fillRect(430, 440, 90, 5);
        g.filter = 'none';
        g.globalCompositeOperation = 'source-over';

        // ---- the car (rear three-quarter view, heading right/away), slightly motion blurred
        g.filter = 'blur(2.4px)';
        const body = new Path2D();
        body.moveTo(203, 338);
        body.lineTo(201, 252);
        body.quadraticCurveTo(204, 216, 222, 204);
        body.lineTo(350, 195);
        body.quadraticCurveTo(390, 180, 440, 177);
        body.quadraticCurveTo(505, 175, 545, 186);
        body.quadraticCurveTo(568, 198, 585, 214);
        body.lineTo(628, 232);
        body.quadraticCurveTo(648, 248, 648, 292);
        body.lineTo(642, 332);
        body.quadraticCurveTo(560, 346, 430, 352);
        body.lineTo(300, 352);
        body.quadraticCurveTo(232, 352, 203, 338);
        g.fillStyle = '#130b38';
        g.fill(body);
        g.save();
        g.clip(body);
        g.globalCompositeOperation = 'lighter';
        glow(g, 570, 268, 120, 70, fade('46,18,205', 1.0));
        glow(g, 285, 248, 110, 60, fade('48,16,165', 0.95));
        glow(g, 470, 240, 90, 30, fade('30,12,120', 0.8));
        g.globalCompositeOperation = 'source-over';
        // dark wheel-arch / shadow mass in the middle and along the bottom
        glow(g, 448, 305, 42, 62, [[0, 'rgba(6,3,20,0.85)'], [1, 'rgba(6,3,20,0)']]);
        glow(g, 300, 345, 120, 30, [[0, 'rgba(6,3,20,0.7)'], [1, 'rgba(6,3,20,0)']]);
        g.restore();
        // glass house (dark) with a light roof edge
        g.fillStyle = 'rgba(10,6,26,0.92)';
        g.beginPath();
        g.moveTo(368, 196);
        g.quadraticCurveTo(408, 183, 450, 183);
        g.quadraticCurveTo(505, 183, 536, 193);
        g.quadraticCurveTo(553, 203, 568, 216);
        g.lineTo(398, 213);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(225,170,235,0.8)';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(425, 181);
        g.quadraticCurveTo(480, 175, 530, 185);
        g.stroke();
        // rear wing
        g.fillStyle = '#0e0824';
        g.fillRect(208, 191, 140, 7);
        g.fillRect(232, 197, 6, 12);
        g.fillRect(322, 195, 6, 10);
        g.strokeStyle = 'rgba(130,100,255,0.5)';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(210, 191); g.lineTo(346, 189); g.stroke();
        // lavender rim highlights along the shoulder line, blue light on the front
        g.strokeStyle = 'rgba(190,175,255,0.85)';
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(385, 215);
        g.quadraticCurveTo(480, 222, 566, 238);
        g.stroke();
        g.strokeStyle = 'rgba(80,60,255,0.75)';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(588, 222);
        g.quadraticCurveTo(640, 240, 642, 300);
        g.stroke();
        g.strokeStyle = 'rgba(160,140,255,0.6)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(500, 312); g.lineTo(565, 310); g.stroke();
        g.beginPath(); g.moveTo(515, 372); g.lineTo(585, 370); g.stroke();
        g.filter = 'none';
        g.globalCompositeOperation = 'lighter';
        // tail lights: a big glowing round one and a smaller one on the left
        glow(g, 330, 234, 46, 46, [[0, 'rgba(255,130,240,0.85)'], [0.4, 'rgba(200,60,200,0.35)'], [1, 'rgba(100,0,100,0)']]);
        glow(g, 330, 234, 20, 20, [[0, 'rgba(255,215,250,1)'], [0.75, 'rgba(255,140,240,0.9)'], [1, 'rgba(255,100,220,0)']]);
        glow(g, 226, 238, 30, 30, [[0, 'rgba(240,90,190,0.85)'], [1, 'rgba(160,30,130,0)']]);
        glow(g, 226, 238, 11, 13, [[0, 'rgba(255,160,225,0.9)'], [1, 'rgba(255,100,220,0)']]);
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = 'rgba(200,60,170,0.7)';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(322, 246); g.lineTo(340, 222); g.stroke();
        // license plate
        g.filter = 'blur(1.2px)';
        g.fillStyle = 'rgba(205,160,230,0.95)';
        g.fillRect(250, 279, 32, 21);
        g.filter = 'none';

        // ---- desktop UI
        // search pill near the top centre
        g.fillStyle = 'rgba(182,165,174,0.88)';
        g.beginPath();
        g.moveTo(368, 22); g.lineTo(482, 22); g.arc(482, 30.5, 8.5, -Math.PI / 2, Math.PI / 2);
        g.lineTo(368, 39); g.arc(368, 30.5, 8.5, Math.PI / 2, Math.PI * 1.5); g.closePath();
        g.fill();
        // column of desktop icons down the left edge (two columns at the top)
        g.filter = 'blur(0.6px)';
        const icon = (x, y, col) => {
            g.fillStyle = col;
            g.fillRect(x - 6.5, y - 8, 13, 13);
            g.fillStyle = 'rgba(225,225,232,0.6)';
            g.fillRect(x - 8, y + 7, 16, 2.4);
        };
        const icols = ['#ececf0', '#dcdee6', '#8fc4b4', '#e6e6e6', '#d2dcea', '#d8e8a0', '#ececee', '#e6d4c8',
                       '#dcdce4', '#eae6ea', '#ccd4e2', '#ec6c9c', '#eeeef2', '#d4d4dc'];
        icols.forEach((c, i) => icon(23, 27 + i * 32.6, c));
        icon(46, 27, '#e8e8ec');
        icon(46, 60, '#d4d8e0');
        icon(806, 30, '#dcdce0');
        g.filter = 'none';
        g.fillStyle = 'rgba(220,220,230,0.35)';
        g.fillRect(70, 48, 75, 1.5);
        // taskbar: translucent light strip along the bottom
        g.fillStyle = 'rgba(150,138,136,0.6)';
        g.fillRect(0, 476, 840, 24);
        g.fillStyle = 'rgba(205,195,190,0.4)';
        g.fillRect(0, 476, 840, 1.5);
        g.fillStyle = 'rgba(240,240,245,0.75)';
        [[18, 484], [36, 484]].forEach(([x, y]) => g.fillRect(x, y, 8, 8));
        for (let i = 0; i < 14; i++) g.fillRect(345 + i * 12 + r() * 3, 486, 6 + r() * 4, 2);
        g.fillRect(780, 482, 30, 2);
        g.fillRect(784, 488, 22, 2);
    });
    {
        const geo = new THREE.PlaneGeometry(SW, SY1 - SY0, 64, 1).translate(0, (SY0 + SY1) / 2, 0.0012);
        add(bend(geo, R, MX, MZ), screenMat(mainTex), false).receiveShadow = false;
    }

    // ---------- stand: wide flat base plate on the desk, round hub and a slanted neck behind the screen ----------
    const SX = -0.34;
    {
        const pw = 0.34, pd = 0.245, pz = -1.338, th = 0.009, bt = 0.003;
        const pg = new THREE.ExtrudeGeometry(roundedRectShape(pw, pd, 0.035), {
            depth: th, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.004, bevelSegments: 3, curveSegments: 10
        });
        pg.rotateX(-Math.PI / 2);
        pg.translate(SX, deskY + 0.0005 + bt, pz);
        add(pg, mStandTop);
        const plateTop = deskY + 0.0005 + th + 2 * bt;
        // hub where the neck meets the plate
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.012, 32), mStand);
        hub.position.set(SX, plateTop + 0.006, -1.405);
        group.add(shadows(hub));
        // neck: side profile swept across x, leaning back towards the hinge block
        const s = new THREE.Shape();
        s.moveTo(1.385, plateTop + 0.004);
        s.lineTo(1.432, plateTop + 0.004);
        s.quadraticCurveTo(1.47, 0.95, 1.488, 1.12);
        s.lineTo(1.452, 1.12);
        s.quadraticCurveTo(1.428, 0.95, 1.385, plateTop + 0.004);
        const ng = sweepX(s, 0.07, 1);
        ng.translate(SX, 0, 0);
        add(ng, mStand);
        // the neck's top joins the hinge block on the back of the hump
        const cap = new THREE.Mesh(roundedBoxGeometry(0.08, 0.05, 0.05, 0.01, 2), mStand);
        cap.position.set(SX, 1.105, -1.462);
        group.add(shadows(cap));
    }

    // ================================================================== UPPER MONITOR on the post
    // Its pose in the photo is not physically consistent; this one sits in front of the post, clear of
    // the main monitor and the bookshelf, turned towards the camera so its outline matches the photo.
    const UP = { x: -0.644, y: 1.573, z: -1.32, yaw: 0.68, w: 0.573, h: 0.30, d: 0.02 };
    const POST = { x: -0.822, z: -1.55, r: 0.017, top: 1.712, bottom: 1.4 };
    const up = new THREE.Group();
    up.position.set(UP.x, UP.y, UP.z);
    up.rotation.y = UP.yaw;
    group.add(up);
    {
        const frame = new THREE.Mesh(roundedBoxGeometry(UP.w, UP.h, UP.d, 0.004, 2), mBezel);
        frame.position.z = -UP.d / 2;
        up.add(shadows(frame));
        // rear housing + VESA boss
        const back = new THREE.Mesh(roundedBoxGeometry(0.4, 0.2, 0.03, 0.012, 3), mShell);
        back.position.set(0, -0.005, -UP.d - 0.012);
        up.add(shadows(back));
        const boss = new THREE.Mesh(roundedBoxGeometry(0.12, 0.12, 0.016, 0.006, 2), mPlastic);
        boss.position.set(0, -0.005, -UP.d - 0.032);
        up.add(shadows(boss));
        // logo and power LED on the chin
        const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.004), mLogo);
        logo.position.set(-UP.w / 2 + 0.022, -UP.h / 2 + 0.01, 0.0012);
        up.add(logo);
        const led = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.0025), new THREE.MeshBasicMaterial({ color: 0x9aa0a8 }));
        led.position.set(UP.w / 2 - 0.02, -UP.h / 2 + 0.006, 0.0012);
        up.add(led);
    }
    // screen: security-camera feed of a bedroom on the left, a black window with small text on the right
    const upTex = canvasTexture(1024, 494, (g, w, h) => {
        const sx = w / 550, sy = h / 265;
        g.setTransform(sx, 0, 0, sy, -28 * sx, -18 * sy);   // reference frame: screen spans x 28..578, y 18..283
        const r = rng(911);
        g.fillStyle = '#131314';
        g.fillRect(0, 0, 600, 320);
        // --- camera feed (x 28..258, y 18..253), slightly fish-eye
        g.save();
        g.beginPath();
        g.rect(28, 18, 230, 235);
        g.clip();
        g.filter = 'blur(1.3px)';
        const poly = (col, pts) => {
            g.fillStyle = col;
            g.beginPath();
            g.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
            g.closePath();
            g.fill();
        };
        const ell = (col, x, y, rx, ry, rot = 0) => {
            g.fillStyle = col;
            g.beginPath();
            g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
            g.fill();
        };
        // walls / ceiling
        let gr = g.createLinearGradient(28, 0, 258, 0);
        gr.addColorStop(0, '#c6bcc6');
        gr.addColorStop(0.5, '#cfcfdc');
        gr.addColorStop(1, '#c2c6d6');
        g.fillStyle = gr;
        g.fillRect(28, 18, 230, 235);
        poly('#dedde6', [28, 18, 258, 18, 258, 32, 28, 40]);
        // tall pale-pink wardrobe on the left, bending with the lens, grey side panel next to it
        poly('#d6c4cc', [30, 22, 64, 22, 82, 128, 44, 140]);
        poly('#8e8496', [64, 22, 74, 22, 96, 120, 82, 128]);
        poly('#b0a2b0', [34, 60, 64, 56, 70, 64, 38, 70]);
        g.fillStyle = '#5a5262';
        for (let i = 0; i < 5; i++) g.fillRect(40 + i * 5.5, 44 + (i % 2) * 2, 3.5, 9);
        // shelf with dark items at the top right, black dresser / TV and small dark things in the middle
        poly('#7e7a8c', [196, 26, 258, 24, 258, 50, 200, 52]);
        g.fillStyle = '#3c3846';
        g.fillRect(204, 32, 10, 14); g.fillRect(222, 30, 8, 16); g.fillRect(238, 34, 12, 12);
        poly('#26222e', [158, 66, 192, 64, 194, 126, 160, 128]);
        poly('#3a3644', [108, 52, 132, 52, 132, 66, 108, 66]);
        poly('#4a4654', [136, 78, 148, 78, 148, 106, 136, 106]);
        // armchair / second bed on the right with lavender-blue cushions and dark frame bars
        poly('#7c80c0', [192, 40, 256, 34, 258, 196, 222, 206, 190, 150]);
        poly('#a6a8dc', [200, 48, 236, 44, 240, 140, 206, 150]);
        poly('#b4b4e2', [238, 44, 256, 42, 258, 130, 242, 134]);
        g.fillStyle = '#3c3a66';
        g.fillRect(228, 40, 4, 120);
        g.fillRect(250, 36, 4, 120);
        // lavender duvet across the bed, dark carpet / bed side at the bottom left
        poly('#8c86c2', [28, 112, 90, 104, 150, 124, 150, 158, 100, 176, 28, 182]);
        poly('#5e566c', [28, 182, 96, 176, 140, 253, 28, 253]);
        poly('#76708c', [28, 150, 60, 146, 70, 170, 28, 176]);
        // pale cyan pillow and the lavender seat cushion
        ell('#d2dcec', 124, 124, 40, 18, -0.15);
        ell('#a8a4d2', 200, 150, 40, 26, 0.25);
        // the big pale mint/white duvet in the middle-bottom
        g.fillStyle = '#c4d6ea';
        g.beginPath();
        g.moveTo(82, 178);
        g.quadraticCurveTo(116, 150, 176, 152);
        g.quadraticCurveTo(222, 170, 226, 232);
        g.lineTo(156, 250);
        g.quadraticCurveTo(96, 228, 82, 178);
        g.closePath();
        g.fill();
        ell('rgba(236,244,250,0.85)', 160, 192, 34, 24, 0.35);
        ell('rgba(150,170,205,0.6)', 104, 196, 18, 28, -0.4);
        // bright floor at the bottom right and a dark object near the bottom
        poly('#dcdcea', [222, 206, 258, 196, 258, 253, 166, 253, 226, 232]);
        ell('#1c1a22', 168, 242, 9, 9);
        ell('#2e2a36', 178, 236, 5, 4);
        // fish-eye vignette + timestamp
        g.filter = 'none';
        gr = g.createRadialGradient(143, 136, 70, 143, 136, 175);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(1, 'rgba(24,22,34,0.45)');
        g.fillStyle = gr;
        g.fillRect(28, 18, 230, 235);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fillRect(34, 22, 40, 2.5);
        g.restore();
        // taskbar under the feed with small white icons
        g.fillStyle = '#26262c';
        g.fillRect(28, 253, 230, 30);
        g.fillStyle = 'rgba(232,232,238,0.9)';
        for (let i = 0; i < 7; i++) g.fillRect(36 + i * 18.5, 259, 8, 8);
        // divider + black window with tiny white text
        g.fillStyle = '#070708';
        g.fillRect(258, 18, 5, 265);
        g.fillStyle = '#141415';
        g.fillRect(263, 18, 315, 265);
        g.fillStyle = 'rgba(235,235,240,0.8)';
        g.fillRect(522, 41, 46, 2.4);
        g.fillRect(540, 47, 26, 2.4);
        g.fillStyle = 'rgba(225,225,230,0.85)';
        g.fillRect(398, 205, 36, 3.2);
        for (let i = 0; i < 6; i++) {
            g.fillStyle = `rgba(200,200,210,${0.06 + r() * 0.08})`;
            g.fillRect(270 + r() * 300, 25 + r() * 250, 10 + r() * 20, 1.2);
        }
    });
    {
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.265), screenMat(upTex));
        scr.position.set(0.0015, 0.0045, 0.0012);
        up.add(scr);
    }

    // ---------- wall-mounted post and the short arm ----------
    {
        const wallZ = L.room.minZ;
        // wall plate with two stand-off brackets
        const plate = new THREE.Mesh(roundedBoxGeometry(0.07, 0.2, 0.012, 0.004, 2), mPlastic);
        plate.position.set(POST.x, 1.5, wallZ + 0.0065);
        group.add(shadows(plate));
        [1.44, 1.56].forEach(y => {
            const z0 = wallZ + 0.012, z1 = POST.z;
            const br = new THREE.Mesh(roundedBoxGeometry(0.03, 0.03, z1 - z0, 0.004, 2), mPlastic);
            br.position.set(POST.x, y, (z0 + z1) / 2);
            group.add(shadows(br));
        });
        // post with plastic end caps
        const ph = POST.top - POST.bottom - 0.02;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(POST.r, POST.r, ph, 24), mPole);
        post.position.set(POST.x, POST.bottom + 0.01 + ph / 2, POST.z);
        group.add(shadows(post));
        [POST.top - 0.01, POST.bottom + 0.005].forEach(y => {
            const c = new THREE.Mesh(new THREE.CylinderGeometry(POST.r + 0.001, POST.r + 0.001, y > 1.6 ? 0.02 : 0.01, 24), mPlastic);
            c.position.set(POST.x, y, POST.z);
            group.add(shadows(c));
        });
        // ring collar a little below the top (visible above the upper screen in the photo)
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(POST.r + 0.002, POST.r + 0.002, 0.008, 24), mPlastic);
        ring.position.set(POST.x, POST.top - 0.045, POST.z);
        group.add(shadows(ring));
        // arm collar on the post and a short two-link arm to the VESA head on the back of the upper monitor
        const armY = UP.y - 0.005;
        const ac = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 24), mPlastic);
        ac.position.set(POST.x, armY, POST.z);
        group.add(shadows(ac));
        const nrm = new THREE.Vector3(Math.sin(UP.yaw), 0, Math.cos(UP.yaw));
        const head = new THREE.Vector3(UP.x, armY, UP.z).addScaledVector(nrm, -(UP.d + 0.05));
        const a0 = new THREE.Vector3(POST.x, armY, POST.z);
        const elbow = new THREE.Vector3().lerpVectors(a0, head, 0.5).add(new THREE.Vector3(0.04, 0, -0.015));
        const link = (a, b) => {
            const len = a.distanceTo(b);
            const m = new THREE.Mesh(roundedBoxGeometry(len + 0.03, 0.03, 0.03, 0.01, 2), mStand);
            m.position.copy(a).add(b).multiplyScalar(0.5);
            m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
            group.add(shadows(m));
        };
        link(a0, elbow);
        link(elbow, head);
        [elbow, head].forEach(p => {
            const j = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 16), mPlastic);
            j.position.copy(p);
            group.add(shadows(j));
        });
        // tilt head bridging to the VESA boss
        const th = new THREE.Mesh(roundedBoxGeometry(0.05, 0.06, 0.03, 0.008, 2), mStand);
        th.position.copy(new THREE.Vector3(UP.x, UP.y - 0.005, UP.z).addScaledVector(nrm, -(UP.d + 0.045)));
        th.rotation.y = UP.yaw;
        group.add(shadows(th));
    }

    // ------------------------------------------------------------------ screen glow on the desk / keyboard
    const glowLight = new THREE.PointLight(0xb048ff, 0.4, 1.7, 2);
    glowLight.position.set(MX, 1.06, MZ + 0.32);
    group.add(glowLight);
    ROOM.onTheme(isNight => { glowLight.intensity = isNight ? 0.4 : 0.1; });
});
