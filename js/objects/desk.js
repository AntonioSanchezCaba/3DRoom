// Desk: simple panel desk in royal-blue satin laminate. A 35 mm top with rounded PVC edge banding
// (back edge against the wall), two end panels - the left one standing 12 cm in from the left end, the
// right one near the right end - that stop short of the wall, a modesty panel tying their back ends
// together (hidden in the shadow under the top in the photo) and small plastic glides under the panels.
// Under-desk occlusion is baked (vertex colours on the panels, a texture on the top, dark decals on the
// floor and wall below the top) so the inside of the desk reads dark from any angle.
ROOM.register('desk', (ctx) => {
    const { THREE, L, group, roundedBoxGeometry, canvasTexture, rng, shadows } = ctx;
    const D = L.desk;
    const wallZ = L.room.minZ;
    const topY = D.topY, T = D.topThickness, underY = topY - T;
    const backZ = Math.max(D.minZ, wallZ) + 0.001;            // 1 mm off the wall
    const frontZ = D.maxZ;
    const W = D.maxX - D.minX, depth = frontZ - backZ, cx = (D.minX + D.maxX) / 2;

    const PANEL_T = 0.025;                 // end panel thickness
    const GLIDE_H = 0.006;                 // plastic glides under the panels
    // Measured from the photo: the left panel stands 12 cm in from the left end of the top (its floor line
    // runs along x = -0.80) with its front nearly flush; the right panel is close to the right end and set
    // back a few cm. Both stop short of the wall (the photo shows the left one ending ~18 cm from it),
    // where a modesty panel ties them together.
    const LEFT_SETBACK = 0.0, RIGHT_SETBACK = 0.045, PANEL_BACKGAP = 0.18;
    const leftOuterX = D.minX + 0.12, rightOuterX = D.maxX - 0.004;
    const OUTER_TINT = [1.1, 0.94, 1.02];   // cool RGB spill on the right end panel
    const SHADE_FLOOR = 0.77, SHADE_WALL = 0.7;   // contact-shadow strengths under the desk

    const clamp01 = v => Math.min(1, Math.max(0, v));
    const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

    // ---------- subtle laminate texture (very fine mottling, no visible pattern) ----------
    const grain = canvasTexture(512, 512, (g, w, h) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        const r = rng(4242);
        for (let i = 0; i < 9000; i++) {
            const v = 236 + Math.floor(r() * 20);
            g.fillStyle = `rgba(${v},${v},${v},0.35)`;
            g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
        }
        // faint long streaks along x, like a matte laminate's surface texture
        for (let i = 0; i < 160; i++) {
            const y = r() * h, v = 238 + Math.floor(r() * 14);
            g.fillStyle = `rgba(${v},${v},${v},0.18)`;
            g.fillRect(0, y, w, 0.6 + r());
        }
    }, { repeatX: 1, repeatY: 1 });
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;

    // ---------- materials ----------
    const BLUE = 0x203350;          // lit laminate (tuned against the photo through ACES)
    const TOP_BLUE = 0x233451;      // the lit top reads a touch warmer than the panels
    const EDGE = 0x202432;          // PVC edge banding reads a touch greyer than the faces
    const laminate = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({
        color, roughness: 0.42, metalness: 0.0, map: grain, vertexColors: true
    }, extra));
    const mEdge = laminate(EDGE, { roughness: 0.38 });
    const mUnder = laminate(BLUE, { roughness: 0.7 });
    const mPanel = laminate(BLUE, { roughness: 0.48 });
    const mPanelEdge = laminate(EDGE, { roughness: 0.4 });
    const mGlide = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7 });

    // Planar UVs (metres) so the texture is not stretched on rounded geometry
    function planarUV(geo, scale) {
        const pos = geo.attributes.position, nor = geo.attributes.normal;
        const uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
            let u, v;
            if (ay >= ax && ay >= az) { u = pos.getX(i); v = pos.getZ(i); }
            else if (ax >= az) { u = pos.getZ(i); v = pos.getY(i); }
            else { u = pos.getX(i); v = pos.getY(i); }
            uv.setXY(i, u * scale, v * scale);
        }
        uv.needsUpdate = true;
    }

    // Bake a per-vertex occlusion factor (grey vertex colour) from world position + normal
    function bakeAO(geo, ox, oy, oz, fn) {
        const pos = geo.attributes.position, nor = geo.attributes.normal;
        const col = new Float32Array(pos.count * 3);
        const p = new THREE.Vector3(), n = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            p.set(pos.getX(i) + ox, pos.getY(i) + oy, pos.getZ(i) + oz);
            n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
            const a = fn(p, n);
            const k = typeof a === 'number' ? [a, a, a] : a;
            col[i * 3] = k[0]; col[i * 3 + 1] = k[1]; col[i * 3 + 2] = k[2];
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }

    // Occlusion of the space under the top: 0 deep inside, 1 out in the open
    function underOpenness(p) {
        const fromFront = smooth(-1.45, frontZ - 0.02, p.z);         // the open front lets light in
        const belowTop = smooth(0.0, 0.32, underY - p.y);             // right under the top is darkest
        const nearFloor = smooth(0.0, 0.10, p.y);
        return (0.45 + 0.21 * fromFront) * (0.8 + 0.2 * belowTop) * (0.85 + 0.15 * nearFloor);
    }

    // Light that reaches inside the blue box under the top has bounced off blue panels: deep shade
    // reads darker and more saturated (navy) in the photo, not grey
    const bounce = v => { const q = Math.pow(v, 1.8); return [q * 1.12, q * 1.08, q * 1.12]; };

    function meshAt(geo, material, x, y, z) {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        shadows(m, true, true);
        group.add(m);
        return m;
    }

    // ---------- top ----------
    // Occlusion over the top surface: darker towards the wall corner and next to the tall bookshelf
    function topAO(x, z) {
        const dw = z - backZ, dl = x - D.minX;
        const wall = 0.74 + 0.26 * smooth(0.0, 0.75, dw);
        const shelf = 1 - 0.16 * (1 - smooth(0.0, 0.45, dl)) * (1 - 0.6 * smooth(0.3, 0.8, dw));
        return wall * shelf;
    }
    // The top gets its own texture (u: left -> right, v: wall -> front edge): laminate grain x baked AO
    const topMap = canvasTexture(1024, 512, (g, w, h) => {
        const img = g.createImageData(w, h), d = img.data, r = rng(9157);
        const streak = new Float32Array(h);
        for (let j = 0; j < h; j++) streak[j] = r() < 0.08 ? 0.004 + r() * 0.008 : 0;
        for (let j = 0; j < h; j++) {
            const z = backZ + (j + 0.5) / h * depth;
            for (let i = 0; i < w; i++) {
                const x = D.minX + (i + 0.5) / w * W;
                const v = topAO(x, z) * (1 - 0.03 * r() - streak[j]);
                const k = (j * w + i) * 4, c = Math.round(255 * clamp01(v));
                d[k] = c; d[k + 1] = c; d[k + 2] = c; d[k + 3] = 255;
            }
        }
        g.putImageData(img, 0, 0);
    });
    const mTopFace = new THREE.MeshStandardMaterial({ color: TOP_BLUE, roughness: 0.42, metalness: 0, map: topMap });
    {
        const geo = roundedBoxGeometry(W, T, depth, 0.004, 3);
        const y = topY - T / 2, z = (backZ + frontZ) / 2;
        planarUV(geo, 1.2);
        // BoxGeometry builds its faces in order +x, -x, +y, -y, +z, -z with equal vertex counts
        const perFace = geo.attributes.position.count / 6, pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 2 * perFace; i < 3 * perFace; i++) {
            uv.setXY(i, (pos.getX(i) + W / 2) / W, 1 - (pos.getZ(i) + depth / 2) / depth);
        }
        bakeAO(geo, cx, y, z, (p, n) => {
            if (n.y > 0.5) return 1.0;                                     // top: AO lives in topMap
            if (n.y < -0.5) return bounce(0.55);                          // underside
            if (n.z < -0.5) return 0.3;                                   // against the wall
            return 1.0;
        });
        meshAt(geo, [mEdge, mEdge, mTopFace, mUnder, mEdge, mUnder], cx, y, z);
    }

    // ---------- end panels ----------
    function endPanel(outerX, side, setback) {
        const backGap = PANEL_BACKGAP;
        // side = -1 for the left panel (inner face points +x), +1 for the right panel
        const h = underY - GLIDE_H;
        const pz0 = backZ + backGap, pz1 = frontZ - setback;
        const pd = pz1 - pz0;
        const x = outerX - side * PANEL_T / 2, y = GLIDE_H + h / 2, z = (pz0 + pz1) / 2;
        const geo = new THREE.BoxGeometry(PANEL_T, h, pd, 1, 10, 14);
        planarUV(geo, 1.2);
        bakeAO(geo, x, y, z, (p, n) => {
            const nearFloor = smooth(0.0, 0.08, p.y);
            const nearWall = smooth(0.0, 0.18, p.z - wallZ);
            const nearTop = smooth(0.0, 0.05, underY - p.y);
            if (n.x * side < -0.5) return bounce(underOpenness(p));             // inner face
            if (n.z > 0.5) return (0.75 + 0.25 * nearFloor) * (0.7 + 0.3 * nearTop);  // front edge
            const o = (0.72 + 0.28 * nearFloor) * (0.75 + 0.25 * nearWall) * (0.8 + 0.2 * nearTop); // outer
            // the right end sits under the PC's RGB front panel, whose glow tints it a cooler blue
            return side > 0 ? [o * OUTER_TINT[0], o * OUTER_TINT[1], o * OUTER_TINT[2]] : o;
        });
        meshAt(geo, [mPanel, mPanel, mPanel, mPanel, mPanelEdge, mPanel], x, y, z);
        // glides: dark plastic pads front and back
        [pz0 + 0.04, pz1 - 0.04].forEach(gz => {
            const g = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, GLIDE_H, 16), mGlide);
            g.position.set(x, GLIDE_H / 2, gz);
            shadows(g, false, true);
            group.add(g);
        });
        return { x, pz0, pz1 };
    }
    const left = endPanel(leftOuterX, -1, LEFT_SETBACK);
    const right = endPanel(rightOuterX, +1, RIGHT_SETBACK);

    // ---------- modesty panel near the wall (hidden in the dark under the top in the photo) ----------
    {
        const x0 = left.x + PANEL_T / 2, x1 = right.x - PANEL_T / 2;
        const mw = x1 - x0, mh = 0.34, mt = 0.018;
        const y = underY - 0.06 - mh / 2, z = left.pz0 + mt / 2;
        const geo = new THREE.BoxGeometry(mw, mh, mt, 12, 4, 1);
        planarUV(geo, 1.2);
        bakeAO(geo, (x0 + x1) / 2, y, z, (p, n) => {
            const ends = smooth(0.0, 0.25, Math.min(p.x - x0, x1 - p.x));
            return bounce((0.42 + 0.12 * ends) * (n.z > 0.5 ? 1.0 : 0.75));
        });
        meshAt(geo, mPanel, (x0 + x1) / 2, y, z);
    }

    // ---------- contact shadow: the floor and wall under the top are in deep shade in the photo ----------
    // (multiplicative dark decals 1.5 mm off the surfaces; they never receive or cast shadows)
    function shadeDecal(w, h, drawAlpha) {
        const tex = canvasTexture(256, 256, (g, cw, ch) => {
            const img = g.createImageData(cw, ch);
            for (let j = 0; j < ch; j++) {
                for (let i = 0; i < cw; i++) {
                    const a = clamp01(drawAlpha((i + 0.5) / cw, (j + 0.5) / ch));
                    const k = (j * cw + i) * 4;
                    img.data[k] = 0; img.data[k + 1] = 0; img.data[k + 2] = 0;
                    img.data[k + 3] = Math.round(a * 255);
                }
            }
            g.putImageData(img, 0, 0);
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
            map: tex, transparent: true, depthWrite: false, toneMapped: false,
            polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
        }));
        m.renderOrder = 1;
        group.add(m);
        return m;
    }
    {
        // floor: u runs along x (left -> right), v from the wall (0) to past the front edge (1)
        const fx0 = D.minX - 0.08, fx1 = D.maxX + 0.08;
        const fz0 = wallZ + 0.001, fz1 = frontZ + 0.14;
        const fw = fx1 - fx0, fd = fz1 - fz0;
        const lxIn = left.x + PANEL_T / 2, rxIn = right.x - PANEL_T / 2;
        const floorShade = shadeDecal(fw, fd, (u, v) => {
            const x = fx0 + u * fw, z = fz0 + v * fd;
            // depth under the top: none in front of the edge, deep shade from ~35 cm inside it
            const depthIn = smooth(frontZ + 0.06, frontZ - 0.26, z);
            // the end panels block side light; under the open left overhang the shade is lighter,
            // and it dies out just past the ends of the top
            const l = 0.45 * smooth(D.minX - 0.06, D.minX + 0.06, x) + 0.55 * smooth(lxIn - 0.04, lxIn + 0.12, x);
            const r = 0.4 * smooth(D.maxX + 0.06, D.maxX - 0.02, x) + 0.6 * smooth(rxIn + 0.03, rxIn - 0.12, x);
            return SHADE_FLOOR * depthIn * Math.min(l, r);
        });
        floorShade.rotation.x = -Math.PI / 2;
        floorShade.position.set((fx0 + fx1) / 2, 0.0015, (fz0 + fz1) / 2);

        // back wall below the top
        const wy1 = underY;
        const wx0 = D.minX - 0.04, wx1 = D.maxX + 0.04;
        const wallShade = shadeDecal(wx1 - wx0, wy1, (u, v) => {
            const y = (1 - v) * wy1;   // canvas v = 0 at the top of the plane
            const x = wx0 + u * (wx1 - wx0);
            const sides = smooth(0, 0.16, Math.min(x - wx0, wx1 - x));
            return SHADE_WALL * (0.75 + 0.25 * smooth(0, 0.3, y)) * sides;
        });
        wallShade.position.set((wx0 + wx1) / 2, wy1 / 2, wallZ + 0.0015);
    }
});
