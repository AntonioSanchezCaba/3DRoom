// Monitors (blockout)
ROOM.register('monitors', ({ L, group, mat, box }) => {
    const M = L.monitors, top = L.desk.topY, black = mat(0x111111), screen = mat(0x6a1a8a, { emissive: 0x7a2aa0, emissiveIntensity: 0.6 });
    const mh = M.main.topY - M.main.bottomY, my = (M.main.topY + M.main.bottomY) / 2;
    group.add(box(M.main.width, mh, 0.03, black, M.main.centerX, my, M.main.z));
    group.add(box(M.main.width - 0.03, mh - 0.03, 0.005, screen, M.main.centerX, my, M.main.z + 0.018));
    group.add(box(0.3, 0.015, 0.22, black, M.main.centerX, top + 0.008, M.main.z + 0.05));
    group.add(box(0.05, M.main.bottomY - top, 0.04, black, M.main.centerX, (M.main.bottomY + top) / 2, M.main.z - 0.04));
    const uh = M.upper.topY - M.upper.bottomY, uy = (M.upper.topY + M.upper.bottomY) / 2;
    const up = box(M.upper.width, uh, 0.03, black, M.upper.centerX, uy, M.upper.z); up.rotation.y = M.upper.rotY; group.add(up);
    group.add(box(0.035, M.pole.topY - top, 0.035, mat(0x333333), M.pole.x, (M.pole.topY + top) / 2, M.pole.z));
});
