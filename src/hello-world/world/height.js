// world/height.js - функции для вычисления высоты

import {
    noiseHeight,
    getBiome,
} from "../biome.js";

import { createNoise2D } from "simplex-noise";

// Инициализируем шумы для деталей ландшафта
const localDetail = createNoise2D(() => Math.random());
const localRidge  = createNoise2D(() => Math.random());
const localRiver  = createNoise2D(() => Math.random());

function N(fn, x, z, s) {
    return fn(x * s, z * s);
}

// =====================================================
//  ВЫСОТА
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
        case "tundra":    h -= 2; break;
        case "snow":      h += 1; break;
        case "desert":    h -= 3; break;
        case "red_desert":h -= 2; break;
        case "mountain":  h += 6; break;
    }

    return Math.floor(h);
}

