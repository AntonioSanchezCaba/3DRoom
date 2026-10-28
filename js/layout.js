// Shared room layout, in metres. Every object file builds inside the footprint given here,
// so pieces built separately line up. +x right along the back wall, +y up, +z towards the room.
// Positions were solved from the reference photo (camera calibrated from photo landmarks).
ROOM.layout = {
    // Object files expected to register (see js/objects/*.js)
    objects: ['surfaces', 'desk', 'monitors', 'pc', 'peripherals', 'lamp',
              'bookshelf', 'guitar', 'fan', 'chair', 'dumbbells'],

    room: {
        minX: -1.8, maxX: 2.0,      // left wall inner face at minX; the right side is open
        minZ: -1.6, maxZ: 1.6,      // back wall inner face at minZ; the front side is open
        height: 3.0,
        wallThickness: 0.1,
        outlet: { x: -0.23, y: 1.73 },                       // duplex outlet on the back wall, two black plugs
        board: { minX: -0.04, maxX: 0.5, minY: 1.41, maxY: 1.95 }, // plain cream poster board on the back wall
        backWallSeams: [-1.05, 0.17, 1.39]                    // vertical joints between wall panels (x)
    },

    // Tall espresso/black bookshelf against the back wall, left side almost touching the left wall
    bookshelf: {
        minX: -1.775, maxX: -1.035, minZ: -1.6, maxZ: -1.31,
        height: 1.88,
        shelves: 5                       // 5 open compartments; boxes stand on the top surface
    },

    // Blue desk against the back wall, starting just right of the bookshelf
    desk: {
        minX: -0.945, maxX: 0.845, minZ: -1.6, maxZ: -0.8,
        topY: 0.76,                      // height of the top surface
        topThickness: 0.035
    },

    // Main curved ultrawide (34") on its stand, plus an upper 29" ultrawide on a desk-clamped pole
    monitors: {
        main: { centerX: -0.36, z: -1.32, width: 0.85, topY: 1.385, bottomY: 1.0 },
        upper: { centerX: -0.62, z: -1.4, width: 0.72, topY: 1.76, bottomY: 1.43, rotY: 0.12 },
        pole: { x: -0.74, z: -1.53, topY: 1.83 }
    },

    // Large cube gaming case on the right end of the desk; tempered-glass side faces the room (+z),
    // front panel with RGB fans faces +x, 2x2 RGB fans under the top mesh
    pc: {
        minX: 0.27, maxX: 0.8, minZ: -1.57, maxZ: -1.08,
        height: 0.52
    },

    // Keyboard, mouse pad + mouse, small white box and black speaker on the desk
    peripherals: {
        keyboard: { x: -0.36, z: -1.0, width: 0.44, depth: 0.14, rotY: 0.06 },
        mousepad: { x: 0.02, z: -1.01, width: 0.32, depth: 0.27, rotY: 0.0 },
        mouse: { x: 0.03, z: -1.0 },
        whiteBox: { x: -0.8, z: -1.3 },
        speaker: { x: -0.86, z: -1.5 }
    },

    // Silver swing-arm desk lamp: base on the desk in front of the PC, arms running left in front of
    // the PC glass, shade over the area between the keyboard and the mouse pad
    lamp: {
        base: { x: 0.47, z: -0.94 },
        elbow: { x: 0.58, y: 1.19, z: -1.0 },
        shade: { x: 0.06, y: 1.07, z: -1.08 }
    },

    // Acoustic guitar on a floor stand, leaning back towards the left wall, in front of the bookshelf
    guitar: {
        base: { x: -1.55, z: -0.97 },    // where the body rests on the stand
        headTop: { x: -1.74, y: 1.3, z: -0.97 },
        rotY: 0.7                        // soundboard faces +x, turned towards the camera
    },

    // Pedestal fan against the left wall, in front of the guitar, head facing into the room
    fan: {
        base: { x: -1.55, z: -0.5 },
        headCenterY: 0.82,
        rotY: 1.05
    },

    // Grey office chair with black loop armrests, pulled out in front of the left half of the desk,
    // seat facing the keyboard / mouse pad (towards +x, -z)
    chair: {
        base: { x: -0.39, z: -0.35 },
        facing: { x: 0.82, z: -0.58 }
    },

    // Adjustable dumbbells piled on the floor under the right half of the desk
    dumbbells: {
        minX: 0.18, maxX: 0.78, minZ: -1.4, maxZ: -0.86
    },

    // Camera presets. 'photo' reproduces the reference photo's viewpoint (solved from landmarks).
    views: {
        photo:    { position: [1.248, 2.598, 0.949], target: [-0.154, 1.342, -0.697], fov: 51.66 },
        overview: { position: [3.4, 2.9, 3.4], target: [-0.4, 0.8, -0.7], fov: 50 }
    }
};
