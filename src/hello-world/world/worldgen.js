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

    const TUNDRA_TOP  = B["tundra_grass_top"];
    const TUNDRA_SIDE = B["tundra_grass_side"];

    const SNOW       = B["snow_top"];
    const SNOW_SIDE  = B["snow_side"];
    const ICE        = B["ice"];

    const SNOW_TRANS = B["snow_transition_side"] || SNOW_SIDE;

    const GRASS_DRY_TOP = B["grass_dry_top"];
    const GRASS_DRY_SIDE = B["grass_dry_side"];

    const WATER = ids.waterID;

    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {

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

                    function F(noise, wx, wz, scale) {
                        return Math.abs(noise(wx * scale, wz * scale));
                    }

                    // ============================
                    // РАЗЛОМЫ В ГОРАХ
                    // ============================
                    if (wy === height && (biome === "mountain" || biome === "snow")) {
                        const mouth = F(_caveCrack, wx, wz, 0.018);

                        if (mouth < 0.045) {
                            data.set(i, j, k, 0);
                            if (mouth < 0.035) data.set(i, j - 1, k, 0);
                            if (mouth < 0.03) data.set(i, j - 2, k, 0);

                            if (F(_caveCheese, wx+1, wz, 0.025) < 0.04) data.set(i+1, j, k, 0);
                            if (F(_caveCheese, wx-1, wz, 0.025) < 0.04) data.set(i-1, j, k, 0);

                            continue;
                        }
                    }

                    // ============================
                    // КАРСТОВЫЕ ПРОВАЛЫ
                    // ============================
                    if (wy === height && (biome === "plains" || biome === "forest")) {
                        const sinkhole = F(_caveCheese, wx, wz, 0.012);

                        if (sinkhole < 0.028) {
                            data.set(i, j, k, 0);
                            data.set(i, j-1, k, 0);
                            data.set(i, j-2, k, 0);

                            if (sinkhole < 0.018) {
                                for (let dx = -1; dx <= 1; dx++)
                                    for (let dz = -1; dz <= 1; dz++)
                                        data.set(i+dx, j-1, k+dz, 0);
                            }

                            continue;
                        }
                    }

                    // ============================
                    // МЕЛКИЕ НОРЫ
                    // ============================
                    if (wy === height) {
                        const hole = F(_caveWormA, wx, wz, 0.045);

                        if (hole < 0.034) {
                            data.set(i, j, k, 0);
                            if (hole < 0.02) data.set(i, j-1, k, 0);
                            continue;
                        }
                    }

                    // ============================
                    // ГОРИЗОНТАЛЬНЫЕ ТОННЕЛИ
                    // ============================
                    if (wy === height && (biome === "forest" || biome === "mountain")) {

                        const tunnel = Math.abs(
                            _caveWormA(wx * 0.02, wz * 0.02) +
                            _caveWormB(wx * 0.03, wz * 0.03) * 0.5
                        );

                        if (tunnel < 0.06) {
                            data.set(i, j, k, 0);

                            let depth = Math.floor(2 + Math.random() * 3);
                            for (let d = 1; d <= depth; d++)
                                data.set(i, j - d, k, 0);

                            continue;
                        }
                    }

                    // =====================================================
                    // ПОВЕРХНОСТНЫЕ УКРАШЕНИЯ (РАЗНООБРАЗИЕ)
                    // =====================================================
                    if (wy === height) {

                        // Pebbles / Gravel patches (пятна гравия)
                        if (biome === "plains" || biome === "forest") {
                            const pebble = F(_caveCheese, wx, wz, 0.035);
                            if (pebble < 0.015) {
                                data.set(i, j, k, GRAVEL);
                                continue;
                            }

                            const boulder = F(_caveCrack, wx, wz, 0.02);
                            if (boulder < 0.01) {
                                data.set(i, j, k, STONE);
                                if (Math.random() < 0.4) data.set(i, j+1, k, STONE);
                                continue;
                            }
                        }

                        // Rocky fields in mountains
                        if (biome === "mountain" || biome === "snow") {
                            const rock = F(_caveCheese, wx, wz, 0.02);
                            if (rock < 0.018) {
                                data.set(i, j, k, STONE);
                                if (Math.random() < 0.4) data.set(i, j+1, k, STONE);
                                continue;
                            }

                            const rubble = F(_caveWormB, wx, wz, 0.05);
                            if (rubble < 0.028) {
                                data.set(i, j, k, GRAVEL);
                                continue;
                            }
                        }

                        // Desert dunes
                        if (biome === "desert") {
                            const dune = F(_caveCheese, wx, wz, 0.012);
                            if (dune < 0.025) {
                                data.set(i, j, k, SAND);
                                if (dune < 0.012) data.set(i, j+1, k, SAND);
                                continue;
                            }
                        }

                        // Red desert rocks
                        if (biome === "red_desert") {
                            const redRock = F(_caveCrack, wx, wz, 0.02);
                            if (redRock < 0.018) {
                                data.set(i, j, k, DESERT_ROCK);
                                continue;
                            }
                        }

                        // Ice patches
                        if (biome === "ice") {
                            const frost = F(_caveCheese, wx, wz, 0.03);
                            if (frost < 0.02) {
                                data.set(i, j, k, ICE);
                                continue;
                            }
                        }

                        // Snow crust in tundra
                        if (biome === "tundra") {
                            const crust = F(_caveCrack, wx, wz, 0.02);
                            if (crust < 0.02) {
                                data.set(i, j, k, SNOW_SIDE);
                                continue;
                            }
                        }

                        // Dry biome dirt clusters
                        if (biome === "dry") {
                            const dust = F(_caveCheese, wx, wz, 0.03);
                            if (dust < 0.02) {
                                data.set(i, j, k, GRASS_DRY_TOP);
                                continue;
                            }
                        }

                        // Universal dirt patches
                        const dirtPatch = F(_caveWormA, wx, wz, 0.05);
                        if (dirtPatch < 0.014 &&
                            biome !== "desert" &&
                            biome !== "red_desert") {

                            data.set(i, j, k, DIRT);
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
                    if (wy === height) {

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
                                data.set(i, j, k, SNOW);
                                if (j > 0) data.set(i, j - 1, k, SNOW_SIDE);
                                continue;

                            case "ice":
                                // верх – лёд
                                data.set(i, j, k, ICE);

                                // 1 слой под льдом – снег
                                if (j > 0) data.set(i, j - 1, k, );

                                // 2–3 слой – плотный снег/земля (аналог packed snow)
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
}
