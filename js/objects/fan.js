// Fan: black 16" pedestal fan (off) standing by the left wall in front of the guitar.
// Heavy round base, telescopic pole with a lock collar, motor housing on a tilt joint, domed wire
// guards (fine radial spokes + a few rings) with a black rim, 5 broad smoky-charcoal blades and a
// round black centre badge. The head is turned a little away from the camera (oscillation position).
ROOM.register('fan', (ctx) => {
    const { THREE, L, group, mat, cylinder, roundedBox, canvasTexture, shadows } = ctx;
    const F = L.fan;

    // ---------- tunables ----------
    const GUARD_R = 0.214;          // outer radius of the wire guard / rim
    const HEAD_YAW = 0.56;          // head yaw relative to the fan's base orientation (oscillation)
    const HEAD_TILT = 0.10;         // head tilted up (radians)
    const LEAN = 0.035;             // slight lean of the pole (cheap telescopic poles wobble)
    const PIVOT_UP = 0.09;          // head centre above the tilt pivot
    const PIVOT_FWD = 0.12;         // head centre in front of the pole axis
    const NECK = 0.03;              // oscillation gearbox between pole top and tilt pivot

    // ---------- materials ----------
    const plastic = mat(0x0e0e0f, { roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide });
    const plasticMatte = mat(0x111112, { roughness: 0.62 });
    const baseMat = mat(0x0f0f10, { roughness: 0.36, metalness: 0.08, side: THREE.DoubleSide });
    const poleMat = mat(0x0d0d0e, { roughness: 0.32, metalness: 0.35 });
    const collarMat = mat(0x141415, { roughness: 0.6, metalness: 0.1 });
    const wireMat = mat(0x0c0c0c, { roughness: 0.38, metalness: 0.55 });
    const rubber = mat(0x080808, { roughness: 0.9 });
    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2d, roughness: 0.3, metalness: 0.0,
        transparent: true, opacity: 0.88, side: THREE.DoubleSide
    });

    const root = new THREE.Group();
    root.position.set(F.base.x, 0, F.base.z - 0.02);   // nudged 2 cm back to sit on the photo's base outline
    root.rotation.y = F.rotY;
    group.add(root);

    // ---------- base: heavy low domed disc ----------
    const baseProfile = [
        [0.0, 0.004], [0.200, 0.004], [0.214, 0.006], [0.223, 0.012], [0.226, 0.020],
        [0.224, 0.028], [0.216, 0.034], [0.196, 0.039], [0.150, 0.045], [0.100, 0.050],
        [0.060, 0.054], [0.040, 0.058], [0.033, 0.063], [0.030, 0.080], [0.026, 0.086], [0.0, 0.086]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const base = new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 64), baseMat);
    root.add(base);
    // rubber foot ring underneath (keeps the disc 4 mm off the floor)
    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.004, 6, 48), rubber);
    foot.rotation.x = Math.PI / 2;
    foot.position.y = 0.004;
    root.add(foot);
    // seam line around the edge of the disc
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.2262, 0.0012, 4, 72), collarMat);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.021;
    root.add(seam);

    // ---------- telescopic pole (slight lean towards the back wall / image right) ----------
    const leanWorld = new THREE.Vector3(0.46, 0, -0.888);                  // image-right direction at the fan
    const leanLocal = leanWorld.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -F.rotY);
    const pole = new THREE.Group();
    pole.position.y = 0.07;
    pole.quaternion.setFromAxisAngle(new THREE.Vector3(leanLocal.z, 0, -leanLocal.x).normalize(), LEAN);
    root.add(pole);

    const tiltRise = PIVOT_UP * Math.cos(HEAD_TILT) + PIVOT_FWD * Math.sin(HEAD_TILT);
    const poleTop = (F.headCenterY - 0.018 - NECK - tiltRise - 0.07) / Math.cos(LEAN);   // in pole space
    const collarY = 0.37;
    const lower = cylinder(0.0200, 0.0205, collarY, poleMat, 0, collarY / 2, 0, 20);
    pole.add(lower);
    // socket ring where the pole enters the base
    pole.add(cylinder(0.021, 0.025, 0.018, plastic, 0, 0.022, 0, 24));
    // height-lock collar with its thumb screw
    pole.add(cylinder(0.0250, 0.0250, 0.036, collarMat, 0, collarY + 0.006, 0, 24));
    pole.add(cylinder(0.0185, 0.0250, 0.008, collarMat, 0, collarY + 0.028, 0, 24));
    const screw = cylinder(0.006, 0.006, 0.022, plasticMatte, 0, collarY + 0.006, 0, 10);
    screw.rotation.x = Math.PI / 2;
    screw.position.z = -0.030;
    pole.add(screw);
    const screwHead = cylinder(0.011, 0.011, 0.008, plasticMatte, 0, collarY + 0.006, -0.042, 16);
    screwHead.rotation.x = Math.PI / 2;
    pole.add(screwHead);
    // upper (inner) tube
    const upperLen = poleTop - (collarY + 0.03);
    pole.add(cylinder(0.0135, 0.0135, upperLen, poleMat, 0, collarY + 0.03 + upperLen / 2, 0, 16));

    // ---------- head ----------
    const yawG = new THREE.Group();
    yawG.position.y = poleTop;
    yawG.rotation.y = HEAD_YAW;
    pole.add(yawG);
    // oscillation gearbox / neck on top of the pole
    yawG.add(cylinder(0.019, 0.021, NECK, plastic, 0, NECK / 2, 0, 20));

    const tiltG = new THREE.Group();
    tiltG.position.y = NECK;
    tiltG.rotation.x = -HEAD_TILT;
    yawG.add(tiltG);
    // tilt hinge (cross pin with a knob on one side)
    const hinge = cylinder(0.014, 0.014, 0.05, plastic, 0, 0.004, 0, 18);
    hinge.rotation.z = Math.PI / 2;
    tiltG.add(hinge);
    const tiltKnob = cylinder(0.017, 0.017, 0.012, plasticMatte, 0.031, 0.004, 0, 20);
    tiltKnob.rotation.z = Math.PI / 2;
    tiltG.add(tiltKnob);

    const head = new THREE.Group();          // origin = guard centre, faces +z
    head.position.set(0, PIVOT_UP, PIVOT_FWD);
    tiltG.add(head);

    // yoke block between hinge and motor housing
    head.add(roundedBox(0.042, 0.05, 0.07, 0.01, plastic, 0, -PIVOT_UP + 0.024, -PIVOT_FWD, 2));

    // motor housing (lathe around the z axis)
    const motorProfile = [
        [0.000, -0.222], [0.030, -0.219], [0.052, -0.210], [0.068, -0.196], [0.078, -0.178],
        [0.083, -0.155], [0.084, -0.120], [0.082, -0.090], [0.076, -0.072], [0.060, -0.062],
        [0.036, -0.056], [0.0, -0.056]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const motorGeo = new THREE.LatheGeometry(motorProfile, 40);
    motorGeo.rotateX(Math.PI / 2);
    const motor = new THREE.Mesh(motorGeo, plastic);
    head.add(motor);
    // vent grooves on the rear cap
    [0.03, 0.045, 0.06].forEach((r, i) => {
        const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0015, 4, 40), plasticMatte);
        g.position.z = -0.216 + i * 0.006 + (r > 0.05 ? 0.008 : 0);
        head.add(g);
    });
    // oscillation pull-knob on the rear cap
    const knobStem = cylinder(0.006, 0.006, 0.022, plasticMatte, 0, 0, -0.229, 12);
    knobStem.rotation.x = Math.PI / 2;
    head.add(knobStem);
    const knob = cylinder(0.012, 0.011, 0.012, plasticMatte, 0, 0, -0.243, 16);
    knob.rotation.x = Math.PI / 2;
    head.add(knob);
    // shaft
    const shaft = cylinder(0.006, 0.006, 0.04, wireMat, 0, 0, -0.045, 10);
    shaft.rotation.x = Math.PI / 2;
    head.add(shaft);

    // ---------- guards ----------
    const frontZ = r => 0.008 + 0.050 * Math.pow(Math.max(0, 1 - (r / GUARD_R) ** 2), 0.55);
    const rearZ = r => -0.008 - 0.056 * Math.pow(Math.max(0, 1 - (r / GUARD_R) ** 2), 0.55);

    function spokes(zOf, r0, count, radius, phase) {
        const pts = [];
        for (let k = 0; k <= 10; k++) {
            const r = r0 + (GUARD_R - r0) * (k / 10);
            pts.push(new THREE.Vector3(r, 0, zOf(r)));
        }
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, radius, 4, false);
        const inst = new THREE.InstancedMesh(geo, wireMat, count);
        const m = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
            m.makeRotationZ(phase + (i / count) * Math.PI * 2);
            inst.setMatrixAt(i, m);
        }
        inst.instanceMatrix.needsUpdate = true;
        head.add(inst);
    }
    function rings(zOf, radii, radius) {
        radii.forEach(r => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r, radius, 4, 96), wireMat);
            ring.position.z = zOf(r);
            head.add(ring);
        });
    }
    spokes(frontZ, 0.05, 68, 0.0008, 0);
    rings(frontZ, [0.052, 0.09, 0.14, 0.19], 0.0011);
    spokes(rearZ, 0.082, 60, 0.0007, 0.021);
    rings(rearZ, [0.084, 0.125, 0.165, 0.205], 0.0011);

    // rim band with rolled edges, and spring clips
    const band = new THREE.Mesh(new THREE.CylinderGeometry(GUARD_R + 0.002, GUARD_R + 0.002, 0.011, 96, 1, true), plastic);
    band.rotation.x = Math.PI / 2;
    head.add(band);
    [-0.0055, 0.0055].forEach(z => {
        const t = new THREE.Mesh(new THREE.TorusGeometry(GUARD_R + 0.002, 0.0028, 6, 96), plastic);
        t.position.z = z;
        head.add(t);
    });
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
        const clip = roundedBox(0.006, 0.018, 0.017, 0.0025, plastic, 0, 0, 0, 2);
        clip.position.set(Math.cos(a) * (GUARD_R + 0.0035), Math.sin(a) * (GUARD_R + 0.0035), 0);
        clip.rotation.z = a;
        head.add(clip);
    }
    // bottom mounting tab where the rear guard bolts to the motor
    const rearPlate = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.088, 40), plastic);
    rearPlate.position.z = rearZ(0.085) - 0.002;
    head.add(rearPlate);

    // ---------- centre badge on the front guard ----------
    const badgeTex = canvasTexture(256, 256, (c, w, h) => {
        c.fillStyle = '#0b0b0c'; c.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        // bezel ring
        let g = c.createRadialGradient(cx, cy, w * 0.40, cx, cy, w * 0.5);
        g.addColorStop(0, '#141416'); g.addColorStop(0.5, '#29292c'); g.addColorStop(1, '#101012');
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, w * 0.5, 0, Math.PI * 2); c.fill();
        // glossy black face
        g = c.createRadialGradient(cx - w * 0.08, cy - h * 0.1, 4, cx, cy, w * 0.42);
        g.addColorStop(0, '#2a2a2d'); g.addColorStop(0.6, '#0e0e10'); g.addColorStop(1, '#070708');
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, w * 0.41, 0, Math.PI * 2); c.fill();
        // small silver wordmark
        c.save();
        c.translate(cx, cy + 4); c.rotate(-0.05);
        c.fillStyle = '#f2f3f5';
        c.font = 'bold italic 36px Arial, Helvetica, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('BreezeLine', 0, 0);
        c.fillRect(-70, 20, 140, 2);
        c.restore();
    });
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.047, 48),
        new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.3, metalness: 0.15 }));
    badge.position.z = frontZ(0) + 0.006;
    head.add(badge);
    const badgeBack = cylinder(0.05, 0.05, 0.008, plastic, 0, 0, 0, 40);
    badgeBack.rotation.x = Math.PI / 2;
    badgeBack.position.z = frontZ(0) + 0.0015;
    head.add(badgeBack);

    // ---------- rotor: hub + 5 broad, twisted, cambered blades ----------
    const rotor = new THREE.Group();
    rotor.position.z = 0.004;
    rotor.rotation.z = -0.05;
    head.add(rotor);
    const hub = cylinder(0.044, 0.046, 0.04, plastic, 0, 0, 0, 32);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = -0.006;
    rotor.add(hub);
    const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.044, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), plastic);
    spinner.rotation.x = Math.PI / 2;
    spinner.scale.set(1, 0.45, 1);
    spinner.position.z = 0.014;
    rotor.add(spinner);

    function bladeGeometry() {
        const NU = 16, NV = 10;
        const r0 = 0.036, r1 = 0.199;
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= NU; i++) {
            const u = i / NU;
            const r = r0 + (r1 - r0) * u;
            // half width in metres: narrow root, broad paddle, rounded tip
            let hw = 0.022 + 0.084 * Math.sin(Math.min(1, u / 0.78) * Math.PI / 2);
            if (u > 0.8) hw *= Math.pow(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2), 0.42);
            hw = Math.max(hw, 0.0015);
            const centre = 0.30 * u * u;                 // swept forward
            const pitch = 0.46 - 0.22 * u;               // twisted: steeper at the root
            for (let j = 0; j <= NV; j++) {
                const v = (j / NV) * 2 - 1;
                const t = v * hw;
                const phi = centre + (t * Math.cos(pitch)) / r;
                const z = -t * Math.sin(pitch) + 0.010 * (1 - v * v) * (0.3 + u);
                pos.push(r * Math.cos(phi), r * Math.sin(phi), z);
                uv.push(u, (v + 1) / 2);
            }
        }
        for (let i = 0; i < NU; i++) {
            for (let j = 0; j < NV; j++) {
                const a = i * (NV + 1) + j, b = a + NV + 1;
                idx.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }
    const bladeGeo = bladeGeometry();
    for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.z = (i / 5) * Math.PI * 2;
        blade.renderOrder = 1;
        rotor.add(blade);
    }

    shadows(root);
});
