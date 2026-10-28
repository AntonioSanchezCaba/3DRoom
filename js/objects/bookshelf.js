// Bookshelf (blockout)
ROOM.register('bookshelf', ({ L, group, mat, box }) => {
    const B = L.bookshelf, w = B.maxX - B.minX, d = B.maxZ - B.minZ, cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
    group.add(box(w, B.height, 0.02, mat(0x1a1614), cx, B.height / 2, B.minZ + 0.01));
    group.add(box(0.02, B.height, d, mat(0x1a1614), B.minX + 0.01, B.height / 2, cz));
    group.add(box(0.02, B.height, d, mat(0x1a1614), B.maxX - 0.01, B.height / 2, cz));
    for (let i = 0; i <= B.shelves; i++) group.add(box(w, 0.02, d, mat(0x1a1614), cx, 0.04 + i * (B.height - 0.05) / B.shelves, cz));
    group.add(box(0.18, 0.38, 0.28, mat(0x151515), B.minX + 0.3, B.height + 0.19, cz));
    group.add(box(0.3, 0.38, 0.28, mat(0xeeeeee), B.minX + 0.55, B.height + 0.19, cz));
});
