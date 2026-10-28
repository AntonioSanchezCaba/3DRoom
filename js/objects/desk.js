// Desk (blockout)
ROOM.register('desk', ({ L, group, mat, box }) => {
    const D = L.desk, m = mat(0x2f5a9a, { roughness: 0.5 });
    const w = D.maxX - D.minX, d = D.maxZ - D.minZ, cx = (D.minX + D.maxX) / 2, cz = (D.minZ + D.maxZ) / 2;
    group.add(box(w, D.topThickness, d, m, cx, D.topY - D.topThickness / 2, cz));
    group.add(box(0.03, D.topY - D.topThickness, d - 0.04, m, D.minX + 0.03, (D.topY - D.topThickness) / 2, cz - 0.02));
    group.add(box(0.03, D.topY - D.topThickness, d - 0.04, m, D.maxX - 0.03, (D.topY - D.topThickness) / 2, cz - 0.02));
});
