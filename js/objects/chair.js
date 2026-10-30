// Office task chair: warm-grey fabric padded seat (waterfall front) and curved mid-back backrest,
// black satin loop armrests, black 5-star nylon base with twin-wheel casters, gas lift with a
// telescopic shroud. Chair-local frame of the upper part: +x = sitter's right, +y up, +z = towards the
// backrest (the seat faces local -z).
ROOM.register('chair', (ctx) => {
    const { THREE, L, group, mat, cylinder, roundedBox, roundedBoxGeometry, roundedRectShape,
            canvasTexture, rng } = ctx;
    const C = L.chair;
    const clamp01 = v => Math.min(1, Math.max(0, v));
    const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---------- placement (fitted to the photo: caster positions and seat/armrest landmarks) ----------
    const BASE_X = C.base.x - 0.01, BASE_Z = C.base.z + 0.02;
    // In the photo the seat points almost straight at the keyboard (we see the backrest from behind-right).
    const FACING = { x: 0.174, z: -0.985 };
    const LEG_ANGLE0 = THREE.MathUtils.degToRad(10);          // world angle of the first base leg

    const root = new THREE.Group();
    root.name = 'chair';
    root.position.set(BASE_X, 0, BASE_Z);
    group.add(root);

    const upper = new THREE.Group();                            // seat, back, arms (swivels with the seat)
    upper.rotation.y = Math.atan2(-FACING.x, -FACING.z);
    root.add(upper);

    // ---------- helpers ----------
    const meshOf = (geo, material) => {
        const m = new THREE.Mesh(geo, material);
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
    };

    // Smooth normals for non-indexed geometry (ExtrudeGeometry is flat-shaded by default)
    const smoothNormals = (geo) => {
        if (geo.index) geo = geo.toNonIndexed();
        const pos = geo.attributes.position, n = pos.count;
        const acc = new Map(), keys = new Array(n);
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
        const keyOf = i => Math.round(pos.getX(i) * 2e4) + ',' + Math.round(pos.getY(i) * 2e4) + ',' + Math.round(pos.getZ(i) * 2e4);
        for (let i = 0; i < n; i++) keys[i] = keyOf(i);
        for (let i = 0; i < n; i += 3) {
            a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
            e1.subVectors(c, b); e2.subVectors(a, b); e1.cross(e2);
            for (let k = 0; k < 3; k++) {
                const key = keys[i + k];
                let v = acc.get(key);
                if (!v) { v = [0, 0, 0]; acc.set(key, v); }
                v[0] += e1.x; v[1] += e1.y; v[2] += e1.z;
            }
        }
        const nor = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const v = acc.get(keys[i]);
            const l = Math.hypot(v[0], v[1], v[2]) || 1;
            nor[i * 3] = v[0] / l; nor[i * 3 + 1] = v[1] / l; nor[i * 3 + 2] = v[2] / l;
        }
        geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        return geo;
    };

    // Bake the photo's lighting balance into vertex colours: warm overhead light on the tops,
    // cooler / dimmer sides (the scene key light is lower and more frontal than the real ceiling light).
    const bakeShade = (geo, fn) => {
        const nrm = geo.attributes.normal, pos = geo.attributes.position, col = new Float32Array(nrm.count * 3);
        const n = new THREE.Vector3(), p = new THREE.Vector3();
        for (let i = 0; i < nrm.count; i++) {
            n.fromBufferAttribute(nrm, i); p.fromBufferAttribute(pos, i);
            const c = fn(n, p);
            col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return geo;
    };
    const mix3 = (ws, cs) => {
        let r = 0, g = 0, b = 0, t = 0;
        ws.forEach((w, k) => { r += w * cs[k][0]; g += w * cs[k][1]; b += w * cs[k][2]; t += w; });
        return t > 0 ? [r / t, g / t, b / t] : cs[0];
    };

    const deform = (geo, fn) => {
        const p = geo.attributes.position, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            fn(v);
            p.setXYZ(i, v.x, v.y, v.z);
        }
        p.needsUpdate = true;
        return geo;
    };

    // Sweep a rounded-rectangle (superellipse) profile along a curve lying in a plane x = const.
    // halfSize(point, t) -> [lateral half-width (along x), in-plane half-thickness]
    const sweep = (points, halfSize, segments = 96, radial = 16, power = 3.2) => {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
        const K = radial, verts = [], idx = [];
        const X = new THREE.Vector3(1, 0, 0), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
        const P = new THREE.Vector3();
        const sp = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / power);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            curve.getPointAt(t, P);
            curve.getTangentAt(t, T);
            N.crossVectors(X, T).normalize();
            B.crossVectors(T, N).normalize();
            const [a, b] = halfSize(P, t);
            for (let j = 0; j < K; j++) {
                const th = (j / K) * Math.PI * 2;
                const cx = sp(Math.cos(th)) * a, cy = sp(Math.sin(th)) * b;
                verts.push(P.x + B.x * cx + N.x * cy, P.y + B.y * cx + N.y * cy, P.z + B.z * cx + N.z * cy);
            }
        }
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < K; j++) {
                const a = i * K + j, b = (i + 1) * K + j, c = i * K + (j + 1) % K, d = (i + 1) * K + (j + 1) % K;
                idx.push(a, b, c, b, d, c);
            }
        }
        // end caps
        const capStart = verts.length / 3;
        curve.getPointAt(0, P); verts.push(P.x, P.y, P.z);
        const capEnd = capStart + 1;
        curve.getPointAt(1, P); verts.push(P.x, P.y, P.z);
        for (let j = 0; j < K; j++) {
            idx.push(capStart, j, (j + 1) % K);
            idx.push(capEnd, segments * K + (j + 1) % K, segments * K + j);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    };

    // ---------- materials ----------
    const fabricTex = canvasTexture(512, 512, (g, w, h) => {
        const R = rng(7341);
        g.fillStyle = '#b4b4b4';
        g.fillRect(0, 0, w, h);
        const cell = 4;
        const rowTone = [], colTone = [];
        for (let k = 0; k < w / cell; k++) { rowTone.push(R() * 26 - 13); colTone.push(R() * 26 - 13); }
        for (let j = 0; j < h / cell; j++) {
            for (let i = 0; i < w / cell; i++) {
                const over = (i + j) % 2 === 0;                 // plain weave: warp / weft alternate
                const v = Math.round(176 + (over ? rowTone[j] : colTone[i]) + R() * 18 - 9);
                g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
                if (over) g.fillRect(i * cell, j * cell + 0.6, cell, cell - 1.2);
                else g.fillRect(i * cell + 0.6, j * cell, cell - 1.2, cell);
            }
        }
        // heathered fibres
        for (let k = 0; k < 5000; k++) {
            const v = R() < 0.5 ? 120 : 225;
            g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)';
            g.fillRect(R() * w, R() * h, 1 + R() * 2, 1);
        }
    }, { repeatX: 8, repeatY: 8 });               // extrude UVs are in metres -> 12.5 cm tile, ~1 mm threads

    const fabric = new THREE.MeshStandardMaterial({
        color: 0x4b4642, map: fabricTex, bumpMap: fabricTex, bumpScale: 0.0015, vertexColors: true,
        roughness: 0.93, metalness: 0
    });
    const blackSatin = mat(0x2b2925, { roughness: 0.17 });          // armrests
    const nylon = mat(0x141414, { roughness: 0.48 });               // base, shroud
    const blackMatte = mat(0x101010, { roughness: 0.7 });           // seat pan, mechanism
    const wheelMat = mat(0x0c0c0c, { roughness: 0.42 });
    const steel = mat(0x2a2a2a, { roughness: 0.3, metalness: 0.6 });

    // ---------- dimensions ----------
    const SEAT_Z = -0.095;                // seat centre relative to the column (seat sits slightly forward)
    const SEAT_BOTTOM = 0.443;            // underside of the cushion
    const SEAT_W = 0.43, SEAT_D = 0.43, SEAT_BEVEL = 0.022, SEAT_CORE = 0.05;
    const SEAT_T = SEAT_CORE + 2 * SEAT_BEVEL; // 0.094
    const halfW = SEAT_W / 2 + SEAT_BEVEL, halfD = SEAT_D / 2 + SEAT_BEVEL;

    // ---------- seat cushion ----------
    {
        let geo = new THREE.ExtrudeGeometry(roundedRectShape(SEAT_W, SEAT_D, 0.08), {
            depth: SEAT_CORE, bevelEnabled: true, bevelThickness: SEAT_BEVEL, bevelSize: SEAT_BEVEL,
            bevelSegments: 6, curveSegments: 10
        });
        geo.rotateX(-Math.PI / 2);                 // extrusion axis -> +y
        geo.translate(0, SEAT_BEVEL, 0);           // y in [0, SEAT_T]
        deform(geo, v => {
            const u = v.x / halfW, w = v.z / halfD, top = smooth(0.03, SEAT_T, v.y);
            // soft pillow crown
            v.y += 0.013 * top * Math.max(0, 1 - u * u) * Math.max(0, 1 - Math.pow(Math.abs(w), 2.5));
            // waterfall front: the front edge rolls down
            const front = smooth(-0.08, -halfD, v.z);
            v.y -= 0.02 * front * (v.y / SEAT_T);
            // slightly fuller sides at mid-height (upholstery bulge)
            const mid = 1 - Math.pow((v.y / SEAT_T) * 2 - 1, 2);
            v.x *= 1 + 0.012 * mid;
            v.z *= 1 + 0.012 * mid;
        });
        geo = smoothNormals(geo);
        bakeShade(geo, (n) => {
            const top = smooth(0.25, 0.9, n.y), under = smooth(-0.2, -0.8, n.y);
            return mix3([top, Math.max(0, 1 - top - under), under],
                [[1.0, 0.985, 0.875], [0.5, 0.52, 0.6], [0.36, 0.36, 0.38]]);
        });
        const seat = meshOf(geo, fabric);
        seat.receiveShadow = false;      // the photo's diffuse ceiling light leaves no hard backrest shadow on it
        seat.position.set(0, SEAT_BOTTOM, SEAT_Z);
        upper.add(seat);

        // black seat pan under the cushion
        const pan = roundedBox(0.41, 0.02, 0.41, 0.008, blackMatte, 0, SEAT_BOTTOM - 0.008, SEAT_Z);
        upper.add(pan);
    }

    // ---------- mechanism, lever, gas lift ----------
    {
        upper.add(roundedBox(0.19, 0.06, 0.23, 0.01, blackMatte, 0, 0.393, -0.02));
        upper.add(roundedBox(0.09, 0.03, 0.05, 0.008, blackMatte, 0, 0.408, -0.15));
        // tilt-tension knob under the front
        const knob = meshOf(new THREE.CylinderGeometry(0.026, 0.028, 0.045, 20), blackMatte);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0, 0.398, -0.195);
        upper.add(knob);
        // height lever on the right
        const lever = meshOf(new THREE.CylinderGeometry(0.0055, 0.0055, 0.17, 8), steel);
        lever.rotation.z = Math.PI / 2 + 0.08;
        lever.position.set(0.17, 0.39, 0.03);
        upper.add(lever);
        upper.add(roundedBox(0.055, 0.014, 0.028, 0.006, blackMatte, 0.27, 0.397, 0.03));
    }
    {
        // column (chrome-free black), telescopic shroud sections, hub
        root.add(cylinder(0.025, 0.025, 0.25, nylon, 0, 0.26, 0, 20));
        const shroud = [[0.0355, 0.115, 0.205], [0.0335, 0.205, 0.265], [0.0315, 0.265, 0.315]];
        shroud.forEach(([r, y0, y1]) => {
            root.add(cylinder(r, r, y1 - y0, nylon, 0, (y0 + y1) / 2, 0, 24));
            root.add(cylinder(r + 0.0015, r + 0.0015, 0.006, nylon, 0, y1 - 0.003, 0, 24));   // lip
        });
    }

    // ---------- 5-star base ----------
    {
        const hub = cylinder(0.05, 0.06, 0.085, nylon, 0, 0.1025, 0, 28);
        root.add(hub);
        root.add(cylinder(0.04, 0.05, 0.012, nylon, 0, 0.151, 0, 28));

        const LEN = 0.30, X0 = 0.035;
        const legGeo = roundedBoxGeometry(LEN, 0.048, 0.056, 0.016, 3);
        deform(legGeo, v => {
            const t = clamp01((v.x + LEN / 2) / LEN);
            v.z *= 1 - 0.33 * t;                                   // tapers in width
            const yc = lerp(0.118, 0.089, t);                       // slopes down to the tip
            const top = v.y > 0 ? 1 : 0;
            v.y = v.y * (1 - 0.3 * t) + yc + top * 0.004 * Math.sin(Math.PI * t); // slightly arched top
            v.x += X0 + LEN / 2;
        });
        legGeo.computeVertexNormals();

        const R = rng(913);
        const casterR = 0.32;
        const wheelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.015, 22);
        const capGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.0165, 14);
        const hoodGeo = new THREE.CylinderGeometry(0.0315, 0.0315, 0.026, 20, 1, false, 0, Math.PI);
        for (let k = 0; k < 5; k++) {
            const phi = LEG_ANGLE0 + k * Math.PI * 2 / 5;
            const leg = meshOf(legGeo, nylon);
            leg.rotation.y = -phi;
            root.add(leg);

            // twin-wheel caster
            const cx = Math.cos(phi) * casterR, cz = Math.sin(phi) * casterR;
            const cg = new THREE.Group();
            cg.position.set(cx, 0, cz);
            cg.rotation.y = R() * Math.PI * 2;
            root.add(cg);
            cg.add(cylinder(0.012, 0.012, 0.016, nylon, 0, 0.072, 0, 14));        // swivel stem collar
            cg.add(roundedBox(0.03, 0.022, 0.032, 0.008, nylon, 0, 0.058, 0.01));   // neck
            [-1, 1].forEach(s => {
                const wheel = meshOf(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(s * 0.019, 0.028, 0.022);
                cg.add(wheel);
                const cap = meshOf(capGeo, steel);
                cap.rotation.z = Math.PI / 2;
                cap.position.set(s * 0.019, 0.028, 0.022);
                cg.add(cap);
            });
            const hood = meshOf(hoodGeo, nylon);
            hood.rotation.z = Math.PI / 2;
            hood.position.set(0, 0.028, 0.022);
            cg.add(hood);
        }
    }

    // ---------- backrest ----------
    const BACK_Y = 0.555, BACK_Z = 0.19, BACK_TILT = 0.06;
    {
        const hb = 0.198, ht = 0.215, H = 0.525, rb = 0.06, rt = 0.11;
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.lineTo(hb - rb, 0);
        s.quadraticCurveTo(hb, 0, hb + (ht - hb) * rb / H, rb);
        s.lineTo(ht, H - rt);
        s.quadraticCurveTo(ht, H, ht - rt, H);
        s.quadraticCurveTo(0, H + 0.03, -(ht - rt), H);
        s.quadraticCurveTo(-ht, H, -ht, H - rt);
        s.lineTo(-(hb + (ht - hb) * rb / H), rb);
        s.quadraticCurveTo(-hb, 0, -(hb - rb), 0);
        s.lineTo(0, 0);
        const DEPTH = 0.03, BT = 0.03;
        let geo = new THREE.ExtrudeGeometry(s, {
            depth: DEPTH, bevelEnabled: true, bevelThickness: BT, bevelSize: 0.024,
            bevelSegments: 6, curveSegments: 12
        });
        geo.translate(0, 0, -DEPTH / 2);
        deform(geo, v => {
            const u = v.x / 0.245;
            v.z -= 0.035 * u * u;                                    // wraps around the sitter
            v.z -= 0.014 * Math.exp(-Math.pow((v.y - 0.14) / 0.12, 2)); // lumbar
            // a little fuller in the middle of the back face
            if (v.z > 0) v.z += (v.z / (DEPTH / 2 + BT)) * 0.016 * Math.max(0, 1 - u * u) * smooth(-0.02, 0.16, v.y) * (1 - smooth(0.36, 0.56, v.y));
        });
        geo = smoothNormals(geo);
        bakeShade(geo, (n, p) => {
            const hi = smooth(0.28, 0.5, p.y);                         // upper back face reads darker in the photo
            const backFace = [lerp(0.8, 0.62, hi), lerp(0.76, 0.59, hi), lerp(0.7, 0.55, hi)];
            return mix3([Math.max(0, n.z) ** 2, Math.max(0, -n.z) ** 2, Math.max(0, n.y) ** 2, n.x * n.x + 1e-4],
                [backFace, [0.82, 0.8, 0.76], [0.74, 0.72, 0.66], [0.68, 0.7, 0.78]]);
        });
        const back = new THREE.Group();
        back.position.set(0, BACK_Y, BACK_Z);
        back.rotation.x = BACK_TILT;
        back.add(meshOf(geo, fabric));
        upper.add(back);
    }

    // ---------- back support bracket (black spine from the mechanism up behind the backrest) ----------
    {
        // runs back under the seat, then up into the bottom edge of the backrest padding (hidden)
        const zb = (y) => BACK_Z + (y - BACK_Y) * Math.tan(BACK_TILT);
        const pts = [
            [0, 0.405, -0.02], [0, 0.405, 0.08], [0, 0.415, zb(0.43) - 0.035], [0, 0.46, zb(0.46) - 0.004],
            [0, 0.53, zb(0.53)], [0, 0.60, zb(0.60)]
        ];
        upper.add(meshOf(sweep(pts, () => [0.032, 0.008], 48, 12), blackMatte));
    }

    // ---------- loop armrests ----------
    {
        const XA = 0.255;
        const path = (x) => [
            [x * 0.886, 0.700, 0.170], [x * 0.941, 0.705, 0.125], [x * 0.988, 0.708, 0.070],
            [x, 0.709, 0.000], [x, 0.706, -0.090], [x, 0.698, -0.175], [x, 0.672, -0.236],
            [x, 0.615, -0.256], [x, 0.540, -0.236], [x, 0.480, -0.204], [x, 0.448, -0.178],
            [x * 0.985, 0.428, -0.148], [x * 0.9, 0.426, -0.118]
        ];
        const halfSize = (p) => {
            const pad = smooth(0.62, 0.69, p.y);
            return [lerp(0.0145, 0.029, pad), lerp(0.0125, 0.0128, pad)];
        };
        [-1, 1].forEach(side => {
            upper.add(meshOf(sweep(path(side * XA), halfSize, 120, 16), blackSatin));
            // mounting plates under the seat pan
            [-0.145].forEach(z => {
                upper.add(roundedBox(0.15, 0.012, 0.045, 0.004, blackMatte, side * 0.18, 0.421, z));
            });
        });
    }

    // ---------- soft contact shadow on the floor (ambient occlusion under base and casters) ----------
    {
        const SIZE = 0.9;
        const tex = canvasTexture(512, 512, (g, w, h) => {
            const s = w / SIZE, cxp = w / 2, cyp = h / 2;
            const blob = (x, y, r, a) => {
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, 'rgba(255,255,255,' + a + ')');
                gr.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = gr;
                g.fillRect(x - r, y - r, 2 * r, 2 * r);
            };
            g.fillStyle = '#000';                 // alphaMap reads the green channel: black = no shadow
            g.fillRect(0, 0, w, h);
            blob(cxp, cyp, 0.38 * s, 0.32);
            blob(cxp, cyp, 0.12 * s, 0.35);
            for (let k = 0; k < 5; k++) {
                const phi = LEG_ANGLE0 + k * Math.PI * 2 / 5;
                const x = cxp + Math.cos(phi) * 0.32 * s, y = cyp + Math.sin(phi) * 0.32 * s;
                blob(x, y, 0.06 * s, 0.55);
                for (let t = 0.15; t < 0.9; t += 0.15) {
                    blob(cxp + Math.cos(phi) * 0.32 * s * t, cyp + Math.sin(phi) * 0.32 * s * t, 0.05 * s, 0.10);
                }
            }
        });
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE),
            new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: 0.75, depthWrite: false }));
        decal.rotation.x = -Math.PI / 2;
        decal.position.y = 0.0015;
        decal.renderOrder = 1;
        root.add(decal);
    }
});
