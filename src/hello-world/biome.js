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

// ДОБАВЛЯЕМ НОВЫЕ ШУМЫ ДЛЯ ВОДЫ
const _lake  = createNoise2D(rnd)
const _river = createNoise2D(rnd)
const _water = createNoise2D(rnd)

// ===== ЭКСПОРТЫ =====
export function noiseTemp(x, z) {
    return _temp(x * 0.001, z * 0.001)
}

export function noiseMoist(x, z) {
    return _moist(x * 0.001, z * 0.001)
}

export function noiseHeight(x, z) {
    return _height(x * 0.0008, z * 0.0008)
}

// ЭТОГО НЕ ХВАТАЛО
export function noiseLake(x, z) {
    return _lake(x, z)
}

export function noiseRiver(x, z) {
    return _river(x, z)
}

export function noiseWater(x, z) {
    return _water(x, z)
}

// ========= БИОМЫ =========
export function getBiome(x, z) {
    const t = noiseTemp(x, z)
    const m = noiseMoist(x, z)
    const h = noiseHeight(x, z)

    if (t < -0.35) return "tundra"
    if (t > 0.25 && m < -0.1) return "desert"
    if (h > 0.42) return "mountain"
    if (m > 0.25) return "forest"

    return "plains"
}
