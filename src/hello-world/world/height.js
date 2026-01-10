// world/height.js

import {
    noiseHeight,
    getBiome,
} from "../biome.js";

import { createNoise2D } from "simplex-noise";

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
const rng = makeRNG(WORLD_SEED + 4242) // соль для высоты

// ================================
//        NOISE
// ================================
const localDetail = createNoise2D(rng)
const localRidge  = createNoise2D(rng)
const localRiver  = createNoise2D(rng)

function N(fn, x, z, s) {
    return fn(x * s, z * s);
}

// =====================================================
//  HEIGHT
// =====================================================
export function getHeightAt(x, z) {
    const biome = getBiome(x, z);

    const continent = N(noiseHeight, x, z, 0.0012) * 32;
    const hills     = N(localDetail, x, z, 0.01)  * 10;

    const riverAbs  = Math.abs(N(localRiver, x, z, 0.004));
    const riverCut  = (1 - riverAbs) * 14;

    let h = 38 + continent + hills - riverCut;

    const ridge = Math.abs(N(localRidge, x, z, 0.006));
    h += ridge * ridge * 75;

    switch (biome) {
        case "tundra":     h -= 2; break;
        case "snow":       h += 1; break;
        case "desert":     h -= 3; break;
        case "red_desert": h -= 2; break;
        case "mountain":   h += 6; break;
    }

    return Math.floor(h);
}
