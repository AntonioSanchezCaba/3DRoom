// PC (blockout)
ROOM.register('pc', ({ L, group, mat, box }) => {
    const P = L.pc;
    group.add(box(P.maxX - P.minX, P.height, P.maxZ - P.minZ, mat(0x121212), (P.minX + P.maxX) / 2, L.desk.topY + P.height / 2, (P.minZ + P.maxZ) / 2));
});
