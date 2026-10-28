// Dumbbells (blockout)
ROOM.register('dumbbells', ({ L, group, mat, box }) => {
    const D = L.dumbbells;
    group.add(box(D.maxX - D.minX, 0.2, D.maxZ - D.minZ, mat(0x1a1a1a), (D.minX + D.maxX) / 2, 0.1, (D.minZ + D.maxZ) / 2));
});
