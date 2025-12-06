// world/worldgen.js

import {
    noiseHeight,
    noiseTemp,
    noiseMoist,
    getBiome,
    noiseLake,
    noiseRiver
} from "../biome.js";

import { generateTreesInChunk } from "./trees.js";
import { generateAnimalsInChunk } from "./animals.js";

import { createNoise2D } from "simplex-noise";
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

// =====================================================
//  УРОВЕНЬ ВОДЫ
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
//  ГЕНЕРАЦИЯ МИРА
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

                const biome  = getBiome(wx, wz);
                const height = getHeightAt(wx, wz);
                const wLevel = getWaterLevel(wx, wz);

                for (let j = 0; j < SY; j++) {
                    const wy = y + j;

                    // =====================================================
                    // 0) ДНО ПОД ВОДОЙ
                    // =====================================================
                    if (wLevel !== -999 && wy < wLevel) {

                        const depth = wLevel - wy;

                        if (depth === 1) data.set(i, j, k, SAND);
                        else if (depth <= 3) data.set(i, j, k, DIRT);
                        else data.set(i, j, k, STONE);

                        continue;
                    }

                    // =====================================================
                    // 1) ГЛУБИНА
                    // =====================================================
                    if (wy < height - 4) {
                        data.set(i, j, k, STONE);
                        continue;
                    }

                    // =====================================================
                    // 2) ПОДПОВЕРХНОСТНЫЕ СЛОИ
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
                    // 3) ПОВЕРХНОСТЬ
                    // =====================================================
                    if (wy === height) {

                        switch (biome) {

                            // ----------------------------------------
                            case "desert":
                                data.set(i, j, k, SAND);
                                continue;

                            // ----------------------------------------
                            case "red_desert":
                                data.set(i, j, k, RED_SAND);
                                continue;

                            // ----------------------------------------
                            case "tundra":
                                data.set(i, j, k, TUNDRA_TOP);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;

                            // ----------------------------------------
                            case "snow": {
                                const nb = [
                                    noa.getBlock(wx+1, wy, wz),
                                    noa.getBlock(wx-1, wy, wz),
                                    noa.getBlock(wx, wy, wz+1),
                                    noa.getBlock(wx, wy, wz-1)
                                ];

                                const needTrans =
                                    nb.some(b => b !== SNOW && b !== SNOW_SIDE && b !== WATER);

                                if (needTrans)
                                    data.set(i, j, k, SNOW_TRANS);
                                else
                                    data.set(i, j, k, SNOW);

                                if (j > 0) data.set(i, j - 1, k, SNOW_SIDE);
                                continue;
                            }

                            // ----------------------------------------
                            case "ice":
                                data.set(i, j, k, ICE);
                                if (j > 0) data.set(i, j - 1, k, SNOW_SIDE);
                                continue;

                            // ----------------------------------------
                            case "dry":
                                data.set(i, j, k, GRASS_DRY_TOP);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;

                            // ----------------------------------------
                            default:
                                data.set(i, j, k, GRASS);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;
                        }
                    }

                    // =====================================================
                    // 4) ВОЗДУХ
                    // =====================================================
                    data.set(i, j, k, 0);
                }

                // =====================================================
                // ВОДА ЗАПОЛНЕНИЕ
                // =====================================================
                if (wLevel !== -999) {
                    for (let wy = y; wy < y + SY; wy++) {
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
