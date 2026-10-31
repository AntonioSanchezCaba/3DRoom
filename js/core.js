// Core: renderer, camera, controls, shared helpers, object registry, lighting, theme and render loop.
// Units are metres. Room axes: +x to the right along the back wall, +y up, +z out of the back wall
// towards the open side of the room. The left wall is the plane x = layout.room.minX,
// the back wall is the plane z = layout.room.minZ.
(function () {
    const params = new URLSearchParams(window.location.search);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.03, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.6;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.49;

    const room = new THREE.Group();
    room.name = 'room';
    scene.add(room);

    // ---------- helpers shared by every object file ----------

    function mat(color, opts = {}) {
        return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, opts));
    }

    function shadows(object, cast = true, receive = true) {
        object.traverse(o => {
            if (o.isMesh) {
                o.castShadow = cast;
                o.receiveShadow = receive;
            }
        });
        return object;
    }

    function place(mesh, x = 0, y = 0, z = 0) {
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // Axis-aligned box centred on (x, y, z)
    function box(w, h, d, material, x = 0, y = 0, z = 0) {
        return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z);
    }

    // Vertical cylinder centred on (x, y, z)
    function cylinder(rTop, rBottom, height, material, x = 0, y = 0, z = 0, segments = 24) {
        return place(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material), x, y, z);
    }

    function toVec(p) {
        return p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]);
    }

    // Cylinder running from point a to point b (arrays or Vector3)
    function tube(a, b, radius, material, segments = 10) {
        const va = toVec(a), vb = toVec(b);
        const dir = new THREE.Vector3().subVectors(vb, va);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), segments), material);
        mesh.position.copy(va).add(vb).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // Smooth tube through a list of points (cables, bent rods)
    function curveTube(points, radius, material, tubularSegments = 48, radialSegments = 8) {
        const curve = new THREE.CatmullRomCurve3(points.map(toVec));
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false), material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    function roundedRectShape(w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        const s = new THREE.Shape();
        const x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y);
        s.lineTo(x + w - r, y);
        s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r);
        s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h);
        s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r);
        s.quadraticCurveTo(x, y, x + r, y);
        return s;
    }

    // Box geometry with every edge rounded by `radius` (same technique as three.js RoundedBoxGeometry)
    function roundedBoxGeometry(w, h, d, radius, segments = 3) {
        const segs = segments * 2 + 1;
        const r = Math.min(radius, w / 2, h / 2, d / 2);
        const geo = new THREE.BoxGeometry(1, 1, 1, segs, segs, segs);
        const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
        const pos = geo.attributes.position.array;
        const nor = geo.attributes.normal.array;
        const half = 0.5 / segs;
        const p = new THREE.Vector3(), n = new THREE.Vector3();
        for (let i = 0; i < pos.length; i += 3) {
            p.fromArray(pos, i);
            n.set(p.x - Math.sign(p.x) * half, p.y - Math.sign(p.y) * half, p.z - Math.sign(p.z) * half).normalize();
            pos[i] = inner.x * Math.sign(p.x) + n.x * r;
            pos[i + 1] = inner.y * Math.sign(p.y) + n.y * r;
            pos[i + 2] = inner.z * Math.sign(p.z) + n.z * r;
            nor[i] = n.x; nor[i + 1] = n.y; nor[i + 2] = n.z;
        }
        geo.attributes.position.needsUpdate = true;
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
    }

    // Box with all edges rounded by `radius`, centred on (x, y, z)
    function roundedBox(w, h, d, radius, material, x = 0, y = 0, z = 0, segments = 3) {
        return place(new THREE.Mesh(roundedBoxGeometry(w, h, d, radius, segments), material), x, y, z);
    }

    // Texture drawn with the 2D canvas API: draw(ctx, width, height)
    function canvasTexture(width, height, draw, { repeatX = 1, repeatY = 1 } = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        draw(canvas.getContext('2d'), width, height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (repeatX !== 1 || repeatY !== 1) {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(repeatX, repeatY);
        }
        return tex;
    }

    // Deterministic pseudo-random generator so the room looks the same on every load
    function rng(seed = 1) {
        let s = seed >>> 0;
        return () => {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- registry ----------

    const builders = [];
    const frameCallbacks = [];
    const themeCallbacks = [];
    const errors = [];
    const groups = {};

    const ROOM = window.ROOM = {
        THREE, scene, camera, renderer, controls, room, params, errors, groups,
        layout: null,           // filled in by layout.js
        isNight: true,
        helpers: { mat, shadows, box, cylinder, tube, curveTube, roundedBox, roundedBoxGeometry, roundedRectShape, canvasTexture, rng },

        // Each object file calls ROOM.register(name, ctx => { ... }) exactly once.
        register(name, build) {
            builders.push({ name, build });
        },

        onFrame(fn) { frameCallbacks.push(fn); },

        // fn(isNight) runs once at start-up and on every theme toggle
        onTheme(fn) { themeCallbacks.push(fn); fn(ROOM.isNight); },

        // Builds every registered object, yielding to the browser between objects so the
        // loading screen can show progress. onProgress(done, total, name) is called after each one.
        async buildAll(onProgress) {
            const only = params.get('only');
            const hide = (params.get('hide') || '').split(',').filter(Boolean);
            const wanted = only ? new Set(only.split(',').concat(['surfaces'])) : null;
            const todo = builders.filter(({ name }) => !((wanted && !wanted.has(name)) || hide.includes(name)));
            for (let i = 0; i < todo.length; i++) {
                const { name, build } = todo[i];
                if (onProgress) onProgress(i, todo.length, name);
                await new Promise(r => setTimeout(r, 0));
                const group = new THREE.Group();
                group.name = name;
                groups[name] = group;
                room.add(group);
                try {
                    build(Object.assign({}, ROOM.helpers, { THREE, L: ROOM.layout, group, ROOM, name }));
                } catch (e) {
                    errors.push(`${name}: ${e && e.stack || e}`);
                    console.error(`[room] failed to build "${name}"`, e);
                }
            }
            if (onProgress) onProgress(todo.length, todo.length, null);
            const expected = (ROOM.layout && ROOM.layout.objects) || [];
            expected.forEach(n => {
                if (!builders.some(b => b.name === n)) errors.push(`${n}: object file did not register (syntax error or missing script?)`);
            });
        }
    };

    // ---------- lighting (warm overhead room light, like the photo) ----------

    const hemi = new THREE.HemisphereLight(0xffe2bb, 0x9a7e5c, 0.7);
    scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffeedd, 0.2);
    scene.add(ambient);

    // Ceiling fixture behind/above the photographer: main shadow caster
    const keyLight = new THREE.DirectionalLight(0xffdfb4, 0.8);
    keyLight.position.set(1.6, 4.2, 2.6);
    keyLight.target.position.set(-0.6, 0.4, -1.1);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -3.2;
    keyLight.shadow.camera.right = 3.2;
    keyLight.shadow.camera.top = 3.2;
    keyLight.shadow.camera.bottom = -3.2;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    scene.add(keyLight.target);

    // Soft warm bulb in the middle of the ceiling
    const ceilingBulb = new THREE.PointLight(0xffd29c, 0.5, 7, 2);
    ceilingBulb.position.set(0.2, 2.45, 0.2);
    scene.add(ceilingBulb);

    const LIGHT_LEVELS = {
        night: { hemi: 0.7, ambient: 0.2, key: 0.8, bulb: 0.5, exposure: 1.0,
                 bg: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)' },
        day:   { hemi: 0.95, ambient: 0.28, key: 1.2, bulb: 0.2, exposure: 1.12,
                 bg: 'linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)' }
    };

    function applyTheme() {
        const lv = ROOM.isNight ? LIGHT_LEVELS.night : LIGHT_LEVELS.day;
        hemi.intensity = lv.hemi;
        ambient.intensity = lv.ambient;
        keyLight.intensity = lv.key;
        ceilingBulb.intensity = lv.bulb;
        renderer.toneMappingExposure = lv.exposure;
        document.body.style.background = lv.bg;
        themeCallbacks.forEach(fn => {
            try { fn(ROOM.isNight); } catch (e) { errors.push(`theme: ${e}`); }
        });
    }
    ROOM.setNight = (night) => { ROOM.isNight = night; applyTheme(); };
    ROOM.lights = { hemi, ambient, keyLight, ceilingBulb };

    // ---------- camera presets ----------

    // Presets are authored for the photo's 3:4 frame. On narrower screens (phones in portrait)
    // widen the vertical field of view so the same horizontal extent stays visible.
    const PRESET_ASPECT = 765 / 1024;
    let activeView = null;
    let tween = null;

    function fovFor(baseFov) {
        if (camera.aspect >= PRESET_ASPECT) return baseFov;
        const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) * PRESET_ASPECT / camera.aspect);
        return Math.min(85, THREE.MathUtils.radToDeg(2 * halfH));
    }

    function fitFov() {
        if (!activeView) return;
        camera.fov = fovFor(activeView.fov || 58);
        camera.updateProjectionMatrix();
    }

    ROOM.setView = function (name) {
        const v = (ROOM.layout.views || {})[name];
        if (!v) return false;
        tween = null;
        activeView = v;
        fitFov();
        camera.position.set(...v.position);
        controls.target.set(...v.target);
        controls.update();
        return true;
    };

    // Smooth camera move; resolves when it arrives (or immediately if cancelled by the user).
    ROOM.flyTo = function (position, target, { duration = 1.4, fov = null, lift = 0.25 } = {}) {
        if (tween && tween.done) tween.done(false);
        return new Promise(resolve => {
            tween = {
                p0: camera.position.clone(), t0: controls.target.clone(),
                p1: new THREE.Vector3(...position), t1: new THREE.Vector3(...target),
                f0: camera.fov, f1: fov === null ? camera.fov : fov,
                start: performance.now(), dur: Math.max(1, duration * 1000), lift, done: resolve
            };
        });
    };

    ROOM.goToView = function (name, opts = {}) {
        const v = (ROOM.layout.views || {})[name];
        if (!v) return Promise.resolve(false);
        activeView = v;
        return ROOM.flyTo(v.position, v.target, Object.assign({ fov: fovFor(v.fov || 58) }, opts));
    };

    function stepTween(now) {
        if (!tween) return;
        const k = Math.min(1, (now - tween.start) / tween.dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(tween.p0, tween.p1, e);
        camera.position.y += Math.sin(Math.PI * e) * tween.lift;
        controls.target.lerpVectors(tween.t0, tween.t1, e);
        camera.fov = tween.f0 + (tween.f1 - tween.f0) * e;
        camera.updateProjectionMatrix();
        if (k >= 1) {
            const done = tween.done;
            tween = null;
            done(true);
        }
    }

    // The user grabbing the controls cancels any camera flight
    controls.addEventListener('start', () => {
        if (tween) { const done = tween.done; tween = null; done(false); }
    });

    ROOM.setAutoRotate = function (on) {
        controls.autoRotate = on;
        controls.autoRotateSpeed = 0.7;
    };

    // Which object (top-level group name) is under a screen point, or null
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    ROOM.pick = function (clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(Object.values(groups), true);
        for (const h of hits) {
            const m = h.object.material;
            if (!h.object.visible || (m && m.depthWrite === false)) continue;   // skip decals / glows
            let o = h.object;
            while (o && o.parent && o.parent !== room) o = o.parent;
            if (!o || !o.name) continue;
            return o.name === 'surfaces' ? null : { name: o.name, point: h.point };
        }
        return null;
    };

    // Fly to a framing of one object, approaching from the side the camera is already on
    ROOM.focusObject = function (name, opts = {}) {
        const g = groups[name];
        if (!g) return Promise.resolve(false);
        const bb = new THREE.Box3().setFromObject(g);
        const c = bb.getCenter(new THREE.Vector3());
        const r = Math.max(0.25, bb.getSize(new THREE.Vector3()).length() / 2);
        const dir = new THREE.Vector3().subVectors(camera.position, c);
        dir.y = 0;
        if (dir.lengthSq() < 1e-6) dir.set(1, 0, 1);
        dir.normalize();
        dir.y = 0.55;
        dir.normalize();
        const fov = fovFor(50);
        const dist = (r * 1.35) / Math.sin(THREE.MathUtils.degToRad(Math.min(fov, 50) / 2));
        const R = ROOM.layout.room;
        const p = c.clone().addScaledVector(dir, dist);
        p.x = THREE.MathUtils.clamp(p.x, R.minX + 0.25, 3.2);
        p.z = THREE.MathUtils.clamp(p.z, R.minZ + 0.25, 3.2);
        p.y = THREE.MathUtils.clamp(p.y, 0.35, 2.8);
        return ROOM.flyTo(p.toArray(), c.toArray(), Object.assign({ fov }, opts));
    };

    // Frame one object's bounding box from a given direction (used by the screenshot tool)
    ROOM.frameObject = function (name, dir = [1, 0.6, 1], padding = 1.25) {
        const g = groups[name];
        if (!g) return false;
        const bb = new THREE.Box3().setFromObject(g);
        const c = bb.getCenter(new THREE.Vector3());
        const r = bb.getSize(new THREE.Vector3()).length() / 2;
        const d = new THREE.Vector3(...dir).normalize();
        const dist = (r * padding) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
        camera.position.copy(c).addScaledVector(d, dist);
        controls.target.copy(c);
        controls.update();
        return { center: c.toArray(), size: bb.getSize(new THREE.Vector3()).toArray() };
    };

    // ---------- start ----------

    ROOM.start = async function (onProgress) {
        await ROOM.buildAll(onProgress);
        applyTheme();
        ROOM.setView(params.get('view') || 'photo');

        const clock = new THREE.Clock();
        let time = 0;
        function animate(now) {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1);
            time += dt;
            for (const fn of frameCallbacks) {
                try { fn(time, dt); } catch (e) {
                    if (errors.length < 50) errors.push(`frame: ${e}`);
                }
            }
            stepTween(now || performance.now());
            controls.update();
            renderer.render(scene, camera);
        }
        requestAnimationFrame(animate);
        ROOM.ready = true;
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        fitFov();
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
