// world/worldgen.js

import {
    noiseHeight,
    noiseTemp,
    noiseMoist,
    getBiome,
    noiseLake,
    noiseRiver,
    _caveCheese,
    _caveWormA,
    _caveWormB,
    _caveCrack
} from "../biome.js";

import { generateTreesInChunk } from "./trees.js";
import { generateAnimalsInChunk } from "./animals.js";

import { getHeightAt } from "./height.js";
export { getHeightAt } from "./height.js";

import { createNoise2D } from "simplex-noise";

// Пещерные шумы (оставляем твои)
const caveNoiseA = createNoise2D(() => Math.random());
const caveNoiseB = createNoise2D(() => Math.random());
const ravineNoise = createNoise2D(() => Math.random());

function N2(fn, x, z, s) {
    return fn(x * s, z * s);
}

// =====================================================
// УРОВЕНЬ ВОДЫ
// =====================================================
export function getWaterLevel(x, z) {

    const ground = getHeightAt(x, z);

    const SEA = 25;
    const RIVER_DEPTH = 3;
    const LAKE_DEPTH = 4;

    const r = noiseRiver(x * 0.002, z * 0.002);
    if (Math.abs(r) < 0.10) return ground - RIVER_DEPTH;

    const l = noiseLake(x * 0.003, z * 0.003);
    if (l > 0.45) return Math.min(ground - LAKE_DEPTH, SEA);

    if (ground < SEA) return SEA;

    return -999;
}

// =====================================================
// ГЕНЕРАЦИЯ МИРА
// =====================================================
export function registerWorldGeneration(noa, ids) {

    const B = ids.blocks;

    const GRASS  = B["grass"];
    const DIRT   = B["dirt"];
    const SAND   = B["sand"];
    const RED_SAND = B["red_sand"];
    const DESERT_ROCK = B["desert_rock"];
    const STONE  = B["stone"];
    const GRAVEL = B["gravel"];
    const SNOW_BLOCK = B["snow_block"];

    const TUNDRA_TOP  = B["tundra_grass_top"];
    const TUNDRA_SIDE = B["tundra_grass_side"];

    const SNOW = B["snow"]
    const SNOW_SIDE  = B["snow_side"];
    const ICE        = B["ice"];

    const SNOW_TRANS = B["snow_transition_side"] || SNOW_SIDE;

    const GRASS_DRY_TOP = B["grass_dry_top"];
    const GRASS_DRY_SIDE = B["grass_dry_side"];

    const WATER = ids.waterID;

    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {
        // Логируем только первые несколько чанков для отладки
        if (y === 0 && (Math.abs(x) < 100 && Math.abs(z) < 100)) {
            console.log(`🌍 Генерация чанка: x=${x}, y=${y}, z=${z}, id=${id}`)
        }

        const SX = data.shape[0];
        const SY = data.shape[1];
        const SZ = data.shape[2];

        for (let i = 0; i < SX; i++) {
            for (let k = 0; k < SZ; k++) {

                const wx = x + i;
                const wz = z + k;

                const biome = getBiome(wx, wz);
                const height = getHeightAt(wx, wz);
                const wLevel = getWaterLevel(wx, wz);

                for (let j = 0; j < SY; j++) {

                    const wy = y + j;

                    // =====================================================
                    // ДНО ПОД ВОДОЙ
                    // =====================================================
                    if (wLevel !== -999 && wy < wLevel) {

                        if (biome === "ice") {
                            data.set(i, j, k, SNOW_SIDE);
                            continue;
                        }

                        const depth = wLevel - wy;

                        if (depth === 1) data.set(i, j, k, SAND);
                        else if (depth <= 3) data.set(i, j, k, DIRT);
                        else data.set(i, j, k, STONE);

                        continue;
                    }

                    // =====================================================
                    // ADVANCED SURFACE FORMATIONS
                    // =====================================================

                   // ADVANCED SURFACE FORMATIONS




// функция шума (вынесена наверх — больше не ломает циклы)
function F(noise, wx, wz, scale) {
    return Math.abs(noise(wx * scale, wz * scale));
};

// =====================================================
// ПОВЕРХНОСТНЫЕ УКРАШЕНИЯ
// =====================================================
if (y === 0 && wy === height) {

    // -----------------------
    // равнины и леса
    // -----------------------
    if (biome === "plains" || biome === "forest") {
        const pebble = F(_caveCheese, wx, wz, 0.035);
        if (pebble < 0.015) {
            data.set(i, j, k, GRAVEL);
            continue;
        }
        const boulder = F(_caveCrack, wx, wz, 0.02);
        if (boulder < 0.01) {
            data.set(i, j, k, STONE);
            continue;
        }
    }

    // -----------------------
    // горы и снег
    // -----------------------
    if (biome === "mountain" || biome === "snow") {
        const rock = F(_caveCheese, wx, wz, 0.02);
        if (rock < 0.018) {
            data.set(i, j, k, STONE);
            continue;
        }
        const rubble = F(_caveWormB, wx, wz, 0.05);
        if (rubble < 0.028) {
            data.set(i, j, k, GRAVEL);
            continue;
        }
    }

    // -----------------------
    // пустыня
    // -----------------------
    if (biome === "desert") {
        const dune = F(_caveCheese, wx, wz, 0.012);
        if (dune < 0.025) {
            data.set(i, j, k, SAND);
            continue;
        }
    }

    // красная пустыня
    if (biome === "red_desert") {
        const redRock = F(_caveCrack, wx, wz, 0.02);
        if (redRock < 0.018) {
            data.set(i, j, k, DESERT_ROCK);
            continue;
        }
    }

    // тундра
    if (biome === "tundra") {
        const crust = F(_caveCrack, wx, wz, 0.02);
        if (crust < 0.02) {
            data.set(i, j, k, SNOW_SIDE);
            continue;
        }
    }

    // сухие земли
    if (biome === "dry") {
        const dust = F(_caveCheese, wx, wz, 0.03);
        if (dust < 0.02) {
            data.set(i, j, k, GRASS_DRY_TOP);
            continue;
        }
    }
}

// =====================================================
// КРАСИВЫЕ СЛОИ БИОМОВ
// =====================================================
const layerNoise = F(_caveCheese, wx, wz, 0.01);

if (biome === "desert" && wy < height - 2 && wy > height - 6) {
    if (layerNoise < 0.04) {
        data.set(i, j, k, SAND);
        continue;
    }
}

if (biome === "mountain" && wy < height - 4 && wy > height - 16) {
    if (layerNoise < 0.035) {
        data.set(i, j, k, GRAVEL);
        continue;
    }
}

if (biome === "tundra" && wy < height - 4 && wy > height - 10) {
    if (layerNoise < 0.045) {
        data.set(i, j, k, SNOW_SIDE);
        continue;
    }
}

// =====================================================
// МАЛЕНЬКИЕ ПЕЩЕРЫ И ТОНКИЕ ТУННЕЛИ (ОПТИМАЛЬНОЕ МЕСТО!)
// =====================================================
if (wy < height - 6) {

    // круглые комнаты
    const cave1 = F(_caveCheese, wx, wz, 0.015);
    if (cave1 < 0.020) {
        data.set(i, j, k, 0);

        if (Math.random() < 0.3 && j + 1 < SY)
            data.set(i, j + 1, k, 0);

        continue;
    }

    // узкие тоннели
    const worm = F(_caveWormA, wx, wz, 0.02) +
                 F(_caveWormB, wx, wz, 0.018) * 0.5;

    if (worm < 0.040) {
        data.set(i, j, k, 0);

        if (Math.random() < 0.25 && j - 1 >= 0)
            data.set(i, j - 1, k, 0);

        continue;
    }
}

                    // =====================================================
                    // ГЛУБИНА
                    // =====================================================
                    if (wy < height - 4) {
                        data.set(i, j, k, STONE);
                        continue;
                    }

                    // =====================================================
                    // ПОДПОВЕРХНОСТЬ
                    // =====================================================
                    if (wy < height) {

                        switch (biome) {

                            case "desert":
                                data.set(i, j, k, SAND);
                                break;

                            case "red_desert":
                                data.set(i, j, k, RED_SAND);
                                break;

                            case "tundra":
                            case "snow":
                                data.set(i, j, k, DIRT);
                                break;

                            case "ice":
                                data.set(i, j, k, SNOW_SIDE);
                                break;

                            default:
                                data.set(i, j, k, DIRT);
                                break;
                        }

                        continue;
                    }

                    // =====================================================
                    // ПОВЕРХНОСТЬ (БАЗОВАЯ)
                    // =====================================================
                    if (y === 0 && wy === height) {

                        switch (biome) {

                            case "desert":
                                data.set(i, j, k, SAND);
                                continue;

                            case "red_desert":
                                data.set(i, j, k, RED_SAND);
                                continue;

                            case "tundra":
                                data.set(i, j, k, TUNDRA_TOP);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;
                            case "snow":

                                // 20% плитки станут полноценными блоками снега
                                if (Math.random() < 0.20) {
                                    data.set(i, j, k, SNOW_BLOCK);   // ❄ плотный снег
                                    continue;
                                }

                                // обычная поверхностная логика
                                data.set(i, j, k, SNOW);             // верх — снег
                                if (j > 0) data.set(i, j - 1, k, SNOW_TRANS); // переход
                                if (j > 1) data.set(i, j - 2, k, DIRT);       // ниже земля
                                continue;


                                case "ice":
                                    // верх — лёд
                                    data.set(i, j, k, ICE);

                                    // ❄ под льдом — снег (НЕ SNOW_TRANS!)
                                    if (j > 0) data.set(i, j - 1, k, SNOW_BLOCK);

                                    // ниже — земля
                                    if (j > 1) data.set(i, j - 2, k, DIRT);
                                    if (j > 2) data.set(i, j - 3, k, DIRT);

                                    continue;


                            case "dry":
                                data.set(i, j, k, GRASS_DRY_TOP);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;

                            default:
                                data.set(i, j, k, GRASS);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;
                        }
                    }

                    // =====================================================
                    // ВОЗДУХ
                    // =====================================================
                    data.set(i, j, k, 0);
                }

                // =====================================================
                // ЗАПОЛНЕНИЕ ВОДОЙ
                // =====================================================
                if (wLevel !== -999) {
                    for (let wy = y; wy < y + SY; wy++) {

                        if (biome === "ice") {
                            if (wy <= height) continue;
                            if (wy <= wLevel) continue;
                        }

                        if (wy > height && wy <= wLevel) {
                            data.set(i, wy - y, k, WATER);
                        }
                    }
                }

            }
        }

        noa.world.setChunkData(id, data);

        if (y === 0) {
            generateTreesInChunk(noa, ids, x, y, z);
            generateAnimalsInChunk(noa, ids, x, y, z);
        }
    });
    
    console.log("✅ Генерация мира зарегистрирована")
}
