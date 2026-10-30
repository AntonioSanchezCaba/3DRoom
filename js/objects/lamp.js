// Silver swing-arm architect desk lamp (switched off, as in the photo).
// Round weighted base with an off-centre mounting boss, a twin-rod lower arm rising from a short
// post, an elbow knuckle, a twin-rod upper arm with a tension spring, a triangular head bracket and a
// bell shade with a ribbed/vented cap and a switch knob. All arm parts lie in one vertical plane
// (the plane the lamp swivels in), solved so the joints line up with the photo.
ROOM.register('lamp', (ctx) => {
    const { THREE, L, group, mat, cylinder, tube, curveTube, canvasTexture, shadows } = ctx;
    const A = L.lamp, top = L.desk.topY;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const B = V(A.base.x, top, A.base.z);                 // base centre on the desk

    // ---------- materials ----------
    // Tiny fake environment (warm room, blue desk below, dark PC/monitors behind) so the metal
    // reads as polished silver even though the scene has no environment map.
    const face = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d'), 64); return c; };
    const vgrad = (g, s, stops) => { const gr = g.createLinearGradient(0, 0, 0, s); stops.forEach(([t, col]) => gr.addColorStop(t, col)); g.fillStyle = gr; g.fillRect(0, 0, s, s); };
    const blob = (g, x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); };
    const wall = (lit, dark) => (g, s) => vgrad(g, s, [[0, lit], [0.55, lit], [0.75, dark], [1, dark]]);
    const env = new THREE.CubeTexture([
        face((g, s) => { wall('#a88c68', '#3a3a40')(g, s); blob(g, 30, 18, 26, 'rgba(255,232,200,0.5)'); blob(g, 20, 46, 12, 'rgba(225,220,235,0.55)'); }),     // +x: lit right wall
        face((g, s) => { wall('#7a6040', '#2a2a30')(g, s); blob(g, 20, 40, 18, 'rgba(110,80,50,0.6)'); }),       // -x: bookshelf side
        face((g, s) => { g.fillStyle = '#6e5c44'; g.fillRect(0, 0, s, s); blob(g, 34, 46, 20, 'rgba(255,238,205,1)'); }), // +y: ceiling + light
        face((g, s) => { g.fillStyle = '#2c3446'; g.fillRect(0, 0, s, s); blob(g, 32, 32, 30, 'rgba(70,80,100,0.7)'); }),  // -y: blue desk
        face((g, s) => { vgrad(g, s, [[0, '#c4ac88'], [0.5, '#a8957a'], [0.8, '#56504a'], [1, '#34363e']]); blob(g, 26, 8, 22, 'rgba(255,240,222,0.8)'); blob(g, 46, 44, 14, 'rgba(235,228,240,0.6)'); }), // +z: room / photographer side
        face((g, s) => { g.fillStyle = '#1c1a20'; g.fillRect(0, 0, s, s); blob(g, 44, 26, 14, 'rgba(140,80,180,0.45)'); blob(g, 18, 22, 16, 'rgba(70,80,150,0.35)'); }) // -z: PC + monitors
    ]);
    env.needsUpdate = true;

    const silver = mat(0xdcd0ba, { metalness: 0.78, roughness: 0.25, envMap: env, envMapIntensity: 1.0 });
    const satin = mat(0xc8b89e, { metalness: 0.8, roughness: 0.4, envMap: env, envMapIntensity: 0.95 });  // base
    const rodMat = mat(0xd4cab8, { metalness: 0.75, roughness: 0.34, envMap: env, envMapIntensity: 1.0 });
    const steel = mat(0xa09888, { metalness: 0.8, roughness: 0.38, envMap: env, envMapIntensity: 0.9 });   // pins, spring
    const shadeIn = mat(0xe8e0d0, { metalness: 0.35, roughness: 0.45, envMap: env, envMapIntensity: 0.6 });
    const felt = mat(0x1a1a1a, { roughness: 0.95 });
    const cableMat = mat(0x1b1b1d, { roughness: 0.55 });
    const bulbMat = mat(0xf1efe8, { roughness: 0.25, transparent: true, opacity: 0.92 });

    // Vented cap: vertical slots
    const ventTex = canvasTexture(256, 64, (g, w, h) => {
        g.fillStyle = '#b8ae9c'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 18; i++) {
            const x = (i + 0.5) * w / 18;
            g.fillStyle = '#7a7064'; g.fillRect(x - 2, h * 0.28, 4, h * 0.6);
            g.fillStyle = 'rgba(255,250,240,0.4)'; g.fillRect(x + 2, h * 0.3, 2, h * 0.56);
        }
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h * 0.9, w, h * 0.1);
    });
    const capMat = mat(0xffffff, { map: ventTex, bumpMap: ventTex, bumpScale: 0.002, metalness: 0.7, roughness: 0.34, envMap: env, envMapIntensity: 0.9 });

    // ---------- base ----------
    const R = 0.09, BH = 0.027;
    const prof = [];
    prof.push(new THREE.Vector2(0.0, 0.0));
    prof.push(new THREE.Vector2(R - 0.006, 0.0));
    prof.push(new THREE.Vector2(R - 0.002, 0.002));
    for (let i = 0; i <= 8; i++) {                         // rounded side
        const a = -Math.PI / 2 + Math.PI * i / 8;
        prof.push(new THREE.Vector2(R - 0.009 + 0.009 * Math.cos(a) * 0.95, BH / 2 + (BH / 2 - 0.001) * Math.sin(a)));
    }
    prof.push(new THREE.Vector2(R - 0.016, BH + 0.0005));
    prof.push(new THREE.Vector2(R - 0.024, BH + 0.0012));
    prof.push(new THREE.Vector2(0.0, BH + 0.0016));
    const baseMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), satin);
    baseMesh.position.set(B.x, top + 0.0015, B.z);
    group.add(baseMesh);
    group.add(cylinder(R - 0.008, R - 0.008, 0.0015, felt, B.x, top + 0.00075, B.z, 48));   // felt pad
    const baseTop = top + 0.0015 + BH + 0.0012;

    // ---------- arm plane ----------
    const S = V(B.x + 0.045, top + 0.103, B.z - 0.036);          // shoulder pivot on top of the post
    const E3 = V(0.593, 1.218, -0.96);                     // elbow (photo pixel ~(720,626))
    const H3 = V(0.192, 1.206, -1.059);                    // head pivot (photo pixel ~(584,549))
    E3.x += B.x - 0.47; E3.z += B.z + 0.94; H3.x += B.x - 0.47; H3.z += B.z + 0.94;
    const u = V(H3.x - S.x, 0, H3.z - S.z).normalize();   // horizontal direction towards the head
    const up = V(0, 1, 0);
    E3.addScaledVector(u, -0.015);                         // knuckle a little further out (photo)
    S.addScaledVector(u, 0.008);                           // shoulder sits slightly towards the head side of the post
    const n = new THREE.Vector3().crossVectors(u, up);   // plane normal (u, up, n right-handed)
    const P = (a, b, o = 0) => S.clone().addScaledVector(u, a).addScaledVector(up, b).addScaledVector(n, o);
    const E2 = [E3.clone().sub(S).dot(u), E3.y - S.y];
    const H2 = [H3.clone().sub(S).dot(u), H3.y - S.y];
    const add2 = (p, d, s = 1) => [p[0] + d[0] * s, p[1] + d[1] * s];
    const norm2 = (d) => { const l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; };
    const basis = new THREE.Matrix4().makeBasis(u, up, n);

    // flat plate in the arm plane from a 2D outline (arm-plane coordinates), centred at normal offset o
    const plate = (pts, o, thick, material, bevel = 0.0012) => {
        const sh = new THREE.Shape();
        pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
        sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: thick - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
        g.translate(0, 0, o - (thick - 2 * bevel) / 2);
        const m = new THREE.Mesh(g, material);
        m.applyMatrix4(new THREE.Matrix4().copy(basis).setPosition(S));
        group.add(m);
        return m;
    };
    // rounded-end plate outline around a set of hole centres (convex hull approx via circles)
    const lobePlate = (centres, r, o, thick, material) => {
        const pts = [];
        const cx = centres.reduce((s, c) => s + c[0], 0) / centres.length, cy = centres.reduce((s, c) => s + c[1], 0) / centres.length;
        for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2, d = [Math.cos(a), Math.sin(a)];
            let best = -1e9;
            centres.forEach(c => { best = Math.max(best, (c[0] - cx) * d[0] + (c[1] - cy) * d[1] + r); });
            pts.push([cx + d[0] * best, cy + d[1] * best]);
        }
        return plate(pts, o, thick, material, 0.0008);
    };
    const pin = (p2, len = 0.024, r = 0.0026) => {
        group.add(tube(P(p2[0], p2[1], -len / 2), P(p2[0], p2[1], len / 2), r, steel, 10));
        [-1, 1].forEach(s => group.add(tube(P(p2[0], p2[1], s * (len / 2 - 0.0015)), P(p2[0], p2[1], s * (len / 2 + 0.001)), r * 1.9, steel, 6)));
    };
    const rod = (a2, b2, o = 0, r = 0.0037, material = rodMat) => {
        const m = tube(P(a2[0], a2[1], o), P(b2[0], b2[1], o), r, material, 12);
        group.add(m);
        [a2, b2].forEach(p => {                                   // flattened rod ends round the pins
            const e = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), material);
            e.position.copy(P(p[0], p[1], o)); group.add(e);
        });
        return m;
    };

    // ---------- post and mounting boss on the base ----------
    const foot = V(S.x, baseTop, S.z);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.024, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), satin);
    boss.scale.set(1, 0.42, 1); boss.position.copy(foot).y -= 0.001; group.add(boss);
    group.add(cylinder(0.011, 0.013, 0.012, satin, foot.x, baseTop + 0.012, foot.z, 20));    // swivel collar
    group.add(cylinder(0.0075, 0.0075, S.y - 0.012 - baseTop - 0.012, rodMat, foot.x, (baseTop + 0.018 + S.y - 0.012) / 2, foot.z, 16));
    const sb = -0.016;                                          // fork plates (shoulder)
    [-1, 1].forEach(s => lobePlate([[0, sb], [0, 0.0], [0.024, 0.004]], 0.0085, s * 0.0068, 0.0028, rodMat));

    // ---------- lower arm: two parallel rods ----------
    const dL = norm2([E2[0], E2[1]]);
    const pL = [dL[1], -dL[0]];                                  // in-plane perpendicular, towards the head side
    const offL = 0.024;
    const L1a = [0, 0], L1b = E2;
    const L2a = add2(L1a, pL, 0.019), L2b = add2(L1b, pL, offL);
    rod(L1a, L1b, 0);
    rod(L2a, L2b, 0, 0.0034);
    pin(L1a, 0.022); pin(L2a, 0.022);
    // small cross link half way up (the pin visible in the photo)
    const Lm1 = [E2[0] * 0.5, E2[1] * 0.5], Lm2 = add2(Lm1, pL, (offL + 0.019) / 2);
    group.add(tube(P(Lm1[0], Lm1[1]), P(Lm2[0], Lm2[1]), 0.0022, steel, 8));
    pin(Lm1, 0.014, 0.002); pin(Lm2, 0.014, 0.002);

    // ---------- upper arm: two rods converging on the elbow knuckle ----------
    const dU = norm2([H2[0] - E2[0], H2[1] - E2[1]]);
    const pU = [-dU[1], dU[0]];                                  // in-plane perpendicular (upwards)
    const U1a = E2, U1b = H2;
    const U2a = add2(add2(E2, dU, 0.02), pU, -0.014), U2b = add2(H2, pU, -0.034);
    rod(U1a, U1b, 0, 0.0042);
    rod(U2a, U2b, 0, 0.0038);

    // elbow knuckle plates (sandwich the rod ends)
    [-1, 1].forEach(s => lobePlate([E2, L2b, U2a], 0.0075, s * 0.0068, 0.0028, rodMat));
    pin(E2); pin(L2b); pin(U2a);

    // head bracket: triangular plates with the neck rod from the apex
    const Hapex = add2(add2(H2, dU, 0.034), pU, -0.012);
    [-1, 1].forEach(s => lobePlate([H2, U2b, Hapex], 0.0055, s * 0.0068, 0.0028, rodMat));
    pin(H2); pin(U2b); pin(Hapex, 0.02);

    // mid collar on the lower upper-arm rod + tension spring towards the elbow
    const Mid = [U2b[0] + (U2a[0] - U2b[0]) * 0.5, U2b[1] + (U2a[1] - U2b[1]) * 0.5];
    group.add(tube(P(Mid[0], Mid[1], -0.007), P(Mid[0], Mid[1], 0.007), 0.0055, steel, 12));
    {
        const sA = P(Mid[0] - 0.012 * dU[0], Mid[1] - 0.012 * dU[1] + 0.009, 0.0045);
        const eNear = add2(E2, dU, -0.0);
        const sB = P(eNear[0] + 0.045 * dU[0], eNear[1] + 0.045 * dU[1] - 0.0083, 0.0045);
        const axis = sB.clone().sub(sA), len = axis.length(); axis.normalize();
        // closed-coil tension spring: a cylinder with a fine coil texture (cheap, reads right at any distance)
        const coil = canvasTexture(16, 64, (g, w, h) => {
            g.fillStyle = '#e2d8c6'; g.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 8) {
                const gr = g.createLinearGradient(0, y, 0, y + 8);
                gr.addColorStop(0, '#3a342c'); gr.addColorStop(0.3, '#d8cebc'); gr.addColorStop(0.6, '#f4ecdc'); gr.addColorStop(1, '#3a342c');
                g.fillStyle = gr; g.fillRect(0, y, w, 8);
            }
        });
        coil.wrapS = coil.wrapT = THREE.RepeatWrapping;
        coil.repeat.set(1, Math.round(len / (0.0019 * 8)));
        const springMat = mat(0xffffff, { map: coil, bumpMap: coil, bumpScale: 0.0006, metalness: 0.7, roughness: 0.35, envMap: env, envMapIntensity: 0.9 });
        group.add(tube(sA, sB, 0.0033, springMat, 12));
        [sA, sB].forEach(p => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.0033, 10, 8), springMat); k.position.copy(p); group.add(k); });
        // hooks at both ends
        group.add(tube(sA, P(Mid[0], Mid[1] + 0.004, 0.0045), 0.0009, steel, 5));
        group.add(tube(sB, P(E2[0] + 0.03 * dU[0], E2[1] - 0.007, 0.0045), 0.0009, steel, 5));
    }

    // ---------- head: cap + bell shade ----------
    const D = V(-0.3, -0.94, -0.05).normalize();            // shade axis, out of the mouth (down-left)
    const neckLen = 0.04, capR = 0.035, capLen = 0.085;
    const neckDir = norm2(add2(dU, pU, 0.22));
    const neckEnd = P(Hapex[0] + neckDir[0] * neckLen, Hapex[1] + neckDir[1] * neckLen);
    group.add(tube(P(Hapex[0], Hapex[1]), neckEnd, 0.0042, rodMat, 12));
    // cap centre: neck rod meets the cap side
    const C = neckEnd.clone().addScaledVector(u, capR * 0.9);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), D);
    const head = new THREE.Group();
    head.position.copy(C); head.quaternion.copy(q);
    group.add(head);
    // local frame of head: -y = out of the mouth, origin = cap centre
    const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.94, capR, capLen, 40, 1, true), capMat);
    head.add(capMesh);
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(capR * 0.94, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), silver);
    capTop.scale.set(1, 0.4, 1); capTop.position.y = capLen / 2; head.add(capTop);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(capR * 0.95, 0.0018, 6, 40), silver);
    lip.rotation.x = Math.PI / 2; lip.position.y = capLen / 2; head.add(lip);
    // switch knob on top
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0034, 0.02, 10), cableMat);
    knob.position.set(0, capLen / 2 + 0.016, 0); head.add(knob);
    const knobTop = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 8), cableMat);
    knobTop.position.set(0, capLen / 2 + 0.026, 0); head.add(knobTop);

    // bell: smooth dome flaring to a rolled rim
    const mouthR = 0.093, bellD = 0.11, y0 = -capLen / 2 + 0.003;
    const outer = [];
    for (let i = 0; i <= 24; i++) {
        const th = (i / 24) * Math.PI / 2, s = Math.sin(th), c = Math.cos(th);
        const r = capR * 0.97 + (mouthR - capR * 0.97) * (0.82 * s + 0.18 * (1 - c));
        outer.push(new THREE.Vector2(r, y0 - bellD * (1 - Math.pow(c, 1.15))));
    }
    // outer profile ordered from mouth (bottom) to top so the faces point outwards
    const outerProf = outer.slice().reverse();
    const bellOut = new THREE.Mesh(new THREE.LatheGeometry(outerProf, 56), silver);
    head.add(bellOut);
    const inner = outer.map(p => new THREE.Vector2(p.x - 0.0012, p.y + 0.0006));
    const bellIn = new THREE.Mesh(new THREE.LatheGeometry(inner, 56), shadeIn);
    head.add(bellIn);
    const rimY = outer[outer.length - 1].y;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(mouthR - 0.0006, 0.0021, 8, 64), silver);
    rim.rotation.x = Math.PI / 2; rim.position.y = rimY; head.add(rim);
    // bulb + socket (lamp is off)
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 16), mat(0x2a2a2a, { roughness: 0.5 }));
    socket.position.y = -capLen / 2 - 0.002; head.add(socket);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.029, 20, 14), bulbMat);
    bulb.position.y = -capLen / 2 - 0.045; head.add(bulb);
    const bulbNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.02, 16), bulbMat);
    bulbNeck.position.y = -capLen / 2 - 0.022; head.add(bulbNeck);

    // ---------- power cable: short loop from the cap into the hollow upper rod ----------
    const capBack = C.clone().addScaledVector(D, -capLen * 0.3).addScaledVector(u, -capR - 0.001).addScaledVector(n, -0.006);
    group.add(curveTube([
        capBack,
        capBack.clone().addScaledVector(u, -0.012).add(V(0, 0.016, 0)),
        P(Hapex[0] + 0.006, Hapex[1] + 0.03, -0.006),
        P(H2[0] + 0.004, H2[1] + 0.016, -0.004),
        P(H2[0] - 0.012, H2[1] + 0.003, -0.0)
    ], 0.0021, cableMat, 40, 6));

    shadows(group, true, true);
});
