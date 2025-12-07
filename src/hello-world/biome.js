import { createNoise2D } from "simplex-noise"

// фиксированный seed
let seed = Math.floor(Math.random() * 1e9)
function rnd() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
}

// биомные шумы
const _temp = createNoise2D(rnd)
const _moist = createNoise2D(rnd)
const _height = createNoise2D(rnd)

// шумы воды
const _lake  = createNoise2D(rnd)
const _river = createNoise2D(rnd)
const _water = createNoise2D(rnd)


// ====================================================
// ✨ ПЕЩЕРНЫЕ ШУМЫ (с правильными экспортами!)
// ====================================================

// Swiss-cheese caves
export const _caveCheese = createNoise2D(rnd)

// Worm tunnels
export const _caveWormA = createNoise2D(rnd)
export const _caveWormB = createNoise2D(rnd)

// Surface cracks
export const _caveCrack = createNoise2D(rnd)


// ========= ЭКСПОРТЫ ШУМОВ =========

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
