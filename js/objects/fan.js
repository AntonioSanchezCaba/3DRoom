// Fan (blockout)
ROOM.register('fan', ({ THREE, L, group, mat, cylinder }) => {
    const F = L.fan, g = new THREE.Group(), b = mat(0x111111);
    g.add(cylinder(0.22, 0.23, 0.04, b, 0, 0.02, 0));
    g.add(cylinder(0.02, 0.02, F.headCenterY, b, 0, F.headCenterY / 2, 0));
    const head = cylinder(0.22, 0.22, 0.1, b, 0, F.headCenterY, 0.05); head.rotation.x = Math.PI / 2; g.add(head);
    g.position.set(F.base.x, 0, F.base.z);
    g.rotation.y = F.rotY;
    group.add(g);
});
