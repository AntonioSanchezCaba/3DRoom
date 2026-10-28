// Chair (blockout)
ROOM.register('chair', ({ THREE, L, group, mat, box }) => {
    const C = L.chair, g = new THREE.Group(), grey = mat(0x6e6c6a, { roughness: 0.9 });
    g.add(box(0.5, 0.1, 0.48, grey, 0, 0.48, 0));
    g.add(box(0.46, 0.5, 0.07, grey, 0, 0.82, 0.25));
    g.add(box(0.62, 0.04, 0.62, mat(0x111111), 0, 0.08, 0));
    g.position.set(C.base.x, 0, C.base.z);
    g.rotation.y = Math.atan2(-C.facing.x, -C.facing.z);   // local -z faces "facing"
    group.add(g);
});
