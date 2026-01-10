import { createNoise2D } from "simplex-noise"

// ===== SEED (ОДИН И ТОТ ЖЕ, ЧТО В worldgen.js) =====
const RAW_SEED = localStorage.getItem("worldSeed") || "default"

function hashSeed(str) {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

const WORLD_SEED = hashSeed(String(RAW_SEED))

// ===== RNG =====
function makeRNG(seed) {
    let s = seed || 1
    return () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
    }
}

const rng = makeRNG(WORLD_SEED)

// ===== BIOME NOISE =====
const _temp   = createNoise2D(rng)
const _moist  = createNoise2D(rng)
const _height = createNoise2D(rng)

// ===== WATER NOISE =====
const _lake  = createNoise2D(rng)
const _river = createNoise2D(rng)
const _water = createNoise2D(rng)

// ===== CAVE NOISE =====
export const _caveCheese = createNoise2D(rng)
export const _caveWormA  = createNoise2D(rng)
export const _caveWormB  = createNoise2D(rng)
export const _caveCrack  = createNoise2D(rng)

// ========= NOISE API =========
export function noiseTemp(x, z) {
    return _temp(x * 0.001, z * 0.001)
}

export function noiseMoist(x, z) {
    return _moist(x * 0.001, z * 0.001)
}

export function noiseHeight(x, z) {
    return _height(x * 0.0008, z * 0.0008)
}

export function noiseLake(x, z) {
    return _lake(x, z)
}

export function noiseRiver(x, z) {
    return _river(x, z)
}

export function noiseWater(x, z) {
    return _water(x, z)
}

// ========= BIOME LOGIC =========
export function getBiome(x, z) {

    const t = noiseTemp(x, z)
    const m = noiseMoist(x, z)
    const h = noiseHeight(x, z)

    const realH = 38 + (h * 32)

    if (realH > 80) return "snow"

    if (t < -0.55 && m < 0) return "ice"
    if (t < -0.40 && h > 0.35) return "snow"
    if (t < -0.35) return "tundra"

    if (h > 0.55) return "mountain"

    if (t > 0.35 && m < -0.25) return "red_desert"
    if (t > 0.25 && m < -0.10) return "desert"

    if (t > 0.15 && m < 0.05) return "dry"

    if (m > 0.25) return "forest"

    return "plains"
}
