// water.js
import { noa } from '../engine.js'

export let waterID = null

export function setWaterID(id) {
    waterID = id
}

const waterLevels = new Map()

export function getWaterLevelAt(x, y, z) {
    return waterLevels.get(`${x},${y},${z}`)
}

export function setWaterLevelAt(x, y, z, level) {
    if (!waterID) return
    if (level > 7) return
    waterLevels.set(`${x},${y},${z}`, level)
    noa.setBlock(waterID, x, y, z)
}

export function updateWater(x, y, z) {
    if (!waterID) return

    const lvl = getWaterLevelAt(x, y, z)
    if (lvl === undefined) return

    if (noa.getBlock(x, y - 1, z) === 0) {
        setWaterLevelAt(x, y - 1, z, 0)
        return
    }

    if (lvl >= 7) return

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    for (const [dx, dz] of dirs) {
        const nx = x + dx
        const nz = z + dz
        if (noa.getBlock(nx, y, nz) === 0) {
            setWaterLevelAt(nx, y, nz, lvl + 1)
        }
    }
}
