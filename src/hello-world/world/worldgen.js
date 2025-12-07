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
import { generatePlantsInChunk } from "./plants.js";
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
const GRASS_PLANT = ids.grassID;   // новый растительный блок

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

    const SNOW = B["snow"];
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

        // Универсальный шумовой фильтр для поверхностного декора
        const F = (noise, x, z, scale) => {
            return Math.abs(noise(x * scale, z * scale));
        };

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

// =====================================================
// ДЕКОР БИОМОВ — БЕЗ ПЕЩЕР И РАЗЛОМОВ
// =====================================================
if (y === 0 && wy === height) {

    // -------------------------
    // 🌿 PLAINS — РАВНИНЫ
    // -------------------------
    if (biome === "plains") {

        // мелкие пятна гравия
        if (F(_caveCheese, wx, wz, 0.04) < 0.015) {
            data.set(i, j, k, GRAVEL);
            continue;
        }

        // камни
        if (F(_caveCrack, wx, wz, 0.03) < 0.01) {
            data.set(i, j, k, STONE);
            continue;
        }

        // подсушенная трава местами
        if (F(_caveWormA, wx, wz, 0.05) < 0.018) {
            data.set(i, j, k, GRASS_DRY_TOP);
            continue;
        }
    }

    // -------------------------
    // 🌲 FOREST — ЛЕС
    // -------------------------
    if (biome === "forest") {

        // камни под деревьями
        if (F(_caveCheese, wx, wz, 0.03) < 0.012) {
            data.set(i, j, k, STONE);
            continue;
        }

        // мох и влажная почва
        if (F(_caveWormA, wx, wz, 0.05) < 0.022) {
            data.set(i, j, k, DIRT);
            continue;
        }
    }

    // -------------------------
    // 🏜 DESERT — ПУСТЫНЯ
    // -------------------------
    if (biome === "desert") {

        // большие дюны
        if (F(_caveCheese, wx, wz, 0.008) < 0.03) {
            data.set(i, j, k, SAND);
            continue;
        }

        // пятна камня
        if (F(_caveCrack, wx, wz, 0.02) < 0.01) {
            data.set(i, j, k, DESERT_ROCK);
            continue;
        }
    }

    // -------------------------
    // ❤️ RED DESERT — КРАСНАЯ ПУСТЫНЯ
    // -------------------------
    if (biome === "red_desert") {

        // красные камни
        if (F(_caveCrack, wx, wz, 0.02) < 0.015) {
            data.set(i, j, k, DESERT_ROCK);
            continue;
        }
    }

    // -------------------------
    // 🏔 MOUNTAIN — ГОРЫ
    // -------------------------
    if (biome === "mountain") {

        // щебень
        if (F(_caveWormB, wx, wz, 0.05) < 0.03) {
            data.set(i, j, k, GRAVEL);
            continue;
        }

        // каменные выступы
        if (F(_caveCrack, wx, wz, 0.025) < 0.015) {
            data.set(i, j, k, STONE);
            continue;
        }
    }

    // -------------------------
    // ❄ SNOW — СНЕГ
    // -------------------------
    if (biome === "snow") {

        // рыхлый снег
        if (Math.random() < 0.2) {
            data.set(i, j, k, SNOW_BLOCK);
            continue;
        }

        // сжатый снег
        if (F(_caveCheese, wx, wz, 0.02) < 0.015) {
            data.set(i, j, k, SNOW_SIDE);
            continue;
        }
    }

    // -------------------------
    // 🌨 TUNDRA — ТУНДРА
    // -------------------------
    if (biome === "tundra") {

        if (F(_caveCrack, wx, wz, 0.03) < 0.02) {
            data.set(i, j, k, SNOW_SIDE);
            continue;
        }

        // мерзлая почва
        if (F(_caveWormA, wx, wz, 0.04) < 0.018) {
            data.set(i, j, k, DIRT);
            continue;
        }
    }

    // -------------------------
    // 🌵 DRY — СУХИЕ ЗЕМЛИ
    // -------------------------
    if (biome === "dry") {

        // жёлтая сухая трава пятнами
        if (F(_caveCheese, wx, wz, 0.03) < 0.02) {
            data.set(i, j, k, GRASS_DRY_TOP);
            continue;
        }

        // потрескавшаяся земля
        if (F(_caveCrack, wx, wz, 0.04) < 0.015) {
            data.set(i, j, k, DIRT);
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
            // 🍄 Грибы
            generatePlantsInChunk(noa, ids, x, y, z);

        }
    });
    
    console.log("✅ Генерация мира зарегистрирована")
}
