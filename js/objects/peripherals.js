// Peripherals (blockout)
ROOM.register('peripherals', ({ L, group, mat, box }) => {
    const P = L.peripherals, top = L.desk.topY;
    const kb = box(P.keyboard.width, 0.03, 0.14, mat(0x151515), P.keyboard.x, top + 0.015, P.keyboard.z); kb.rotation.y = P.keyboard.rotY; group.add(kb);
    const mp = box(P.mousepad.width, 0.004, P.mousepad.depth, mat(0x4a6a2a), P.mousepad.x, top + 0.002, P.mousepad.z); mp.rotation.y = P.mousepad.rotY; group.add(mp);
    group.add(box(0.07, 0.19, 0.1, mat(0xeeeeee), P.whiteBox.x, top + 0.095, P.whiteBox.z));
    group.add(box(0.15, 0.26, 0.2, mat(0x151515), P.speaker.x, top + 0.13, P.speaker.z));
});
