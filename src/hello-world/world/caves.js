import { createNoise3D, createNoise2D } from "simplex-noise";

// ================================
//        SEEDED RNG
// ================================
const RAW_SEED = localStorage.getItem("worldSeed") || "default"

function hashSeed(str) {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function makeRNG(seed) {
    let s = seed || 1
    return () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
    }
}

const WORLD_SEED = hashSeed(RAW_SEED)
const rng = makeRNG(WORLD_SEED + 1337) // соль пещер

// ================================
//        NOISE
// ================================
const caveNoise     = createNoise3D(rng)
const tunnelNoise   = createNoise3D(rng)
const entranceNoise = createNoise2D(rng)

// ================================
//        CAVES
// ================================
export function isCave(x, y, z) {
    if (y > 60) return false

    const cave = Math.abs(caveNoise(x * 0.03, y * 0.03, z * 0.03))
    if (cave < 0.06) return true

    const tunnel = Math.abs(tunnelNoise(x * 0.02, y * 0.02, z * 0.02))
    if (tunnel < 0.03) return true

    return false
}

// ================================
//     SURFACE ENTRANCES
// ================================
export function isSurfaceCave(x, y, z, surfaceHeight) {
    if (y < surfaceHeight - 4) return false

    const n = Math.abs(entranceNoise(x * 0.05, z * 0.05))
    return n < 0.003
}
