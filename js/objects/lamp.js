// Lamp (blockout)
ROOM.register('lamp', ({ L, group, mat, cylinder, tube }) => {
    const A = L.lamp, top = L.desk.topY, s = mat(0xb8b8b8, { metalness: 0.8, roughness: 0.3 });
    group.add(cylinder(0.08, 0.085, 0.025, s, A.base.x, top + 0.0125, A.base.z));
    group.add(tube([A.base.x, top + 0.02, A.base.z], [A.elbow.x, A.elbow.y, A.elbow.z], 0.008, s));
    group.add(tube([A.elbow.x, A.elbow.y, A.elbow.z], [A.shade.x, A.shade.y, A.shade.z], 0.008, s));
    group.add(cylinder(0.03, 0.075, 0.12, s, A.shade.x, A.shade.y - 0.05, A.shade.z));
});
