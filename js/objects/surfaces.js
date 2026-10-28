// Floor and walls (blockout)
ROOM.register('surfaces', ({ THREE, L, group, mat, box }) => {
    const R = L.room, t = R.wallThickness;
    const w = R.maxX - R.minX, d = R.maxZ - R.minZ;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xcdbb98, { roughness: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((R.minX + R.maxX) / 2, 0, (R.minZ + R.maxZ) / 2);
    floor.receiveShadow = true;
    group.add(floor);
    group.add(box(w + t, R.height, t, mat(0xe2d9c6, { roughness: 0.95 }), (R.minX + R.maxX) / 2 - t / 2, R.height / 2, R.minZ - t / 2));
    group.add(box(t, R.height, d, mat(0xe6dcc8, { roughness: 0.95 }), R.minX - t / 2, R.height / 2, (R.minZ + R.maxZ) / 2));
});
