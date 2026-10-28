// Guitar (blockout): a slab from the stand to the head position
ROOM.register('guitar', ({ L, group, mat, tube }) => {
    const G = L.guitar;
    group.add(tube([G.base.x, 0.12, G.base.z], [G.base.x + (G.headTop.x - G.base.x) * 0.5, 0.55, G.base.z], 0.18, mat(0xc87a2a)));
    group.add(tube([G.base.x + (G.headTop.x - G.base.x) * 0.5, 0.55, G.base.z], [G.headTop.x, G.headTop.y, G.headTop.z], 0.025, mat(0x7a4a1a)));
});
