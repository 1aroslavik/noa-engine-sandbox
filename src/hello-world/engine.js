import { Engine } from "noa-engine"

export const noa = new Engine({
    debug: true,
    showFPS: true,
    chunkSize: 32,
    chunkAddDistance: 2.5,
    chunkRemoveDistance: 3.5,

    playerWidth: 0.6,
    playerHeight: 1.7,
    playerStart: [0, 20, 0],
})

noa.camera.heading = 0
noa.camera.pitch = -0.3
noa.camera.zoomDistance = 0
