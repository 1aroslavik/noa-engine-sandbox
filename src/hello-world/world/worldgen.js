// world/worldgen.js

import {
    noiseHeight,
    noiseTemp,
    noiseMoist,
    getBiome,
    noiseWater,
    noiseLake,
    noiseRiver
} from "../biome.js"

import { generateTreesInChunk } from "./trees.js"

import { createNoise2D } from "simplex-noise"
const localDetail = createNoise2D(() => Math.random())
const localRidge  = createNoise2D(() => Math.random())
const localRiver  = createNoise2D(() => Math.random())

function N(fn, x, z, s) {
    return fn(x * s, z * s)
}

// --------------------------------------------------------
// Высота
// --------------------------------------------------------
export function getHeightAt(x, z) {
    const biome = getBiome(x, z)

    const continent = N(noiseHeight, x, z, 0.0012) * 32
    const hills     = N(localDetail, x, z, 0.01)  * 10

    const riverAbs  = Math.abs(N(localRiver, x, z, 0.004))
    const riverCut  = (1 - riverAbs) * 14

    let h = 38 + continent + hills - riverCut

    const ridge = Math.abs(N(localRidge, x, z, 0.006))
    h += ridge * ridge * 75

    switch (biome) {
        case "tundra":    h -= 4; break
        case "desert":    h -= 3; break
        case "forest":    h += 2; break
        case "mountain":  h += 6; break
    }
    return Math.floor(h)
}

// --------------------------------------------------------
// Уровень воды
// --------------------------------------------------------
export function getWaterLevel(x, z) {
    const riverN = noiseRiver(x * 0.002, z * 0.002)
    const lakeN  = noiseLake(x * 0.003, z * 0.003)

    const isRiver = Math.abs(riverN) < 0.12     // шире реки
    const isLake  = lakeN > 0.30               // легче найти озёра

    if (!isRiver && !isLake) return -999

    const ground = getHeightAt(x, z)

    return ground - 3
}

// --------------------------------------------------------
// Генерация мира
// --------------------------------------------------------
export function registerWorldGeneration(noa, ids) {
    const blocks = ids.blocks

    const GRASS  = blocks["grass"]            ?? 1
    const DIRT   = blocks["dirt"]             ?? GRASS
    const SAND   = blocks["sand"]             ?? DIRT
    const STONE  = blocks["stone"]            ?? DIRT
    const TUNDRA = blocks["tundra_grass"]     ?? GRASS
    const SNOW   = blocks["snow_top"]         ?? TUNDRA

    const WATER  = ids.waterID

    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {

        const SX = data.shape[0]
        const SY = data.shape[1]
        const SZ = data.shape[2]

        for (let i = 0; i < SX; i++) {
            for (let k = 0; k < SZ; k++) {

                const wx = x + i
                const wz = z + k

                const biome  = getBiome(wx, wz)
                const height = getHeightAt(wx, wz)
                const wLevel = getWaterLevel(wx, wz)

                // -------------------------------
                // СНАЧАЛА СТАВИМ ГРУНТ (земля)
                // -------------------------------
                for (let j = 0; j < SY; j++) {
                    const wy = y + j

                    if (wy < height - 4) {
                        data.set(i, j, k, STONE)
                        continue
                    }

                    if (wy < height) {
                        if (biome === "tundra" || biome === "mountain") {
                            data.set(i, j, k, TUNDRA)
                        } else {
                            data.set(i, j, k, DIRT)
                        }
                        continue
                    }

                    if (wy === height) {
                        if (biome === "desert") {
                            data.set(i, j, k, SAND)
                        } else if (biome === "tundra" || biome === "mountain") {
                            data.set(i, j, k, SNOW)
                        } else {
                            data.set(i, j, k, GRASS)
                        }
                        continue
                    }

                    data.set(i, j, k, 0) // воздух
                }

                // -------------------------------
                // ТЕПЕРЬ СТАВИМ ВОДУ
                // -------------------------------
                if (wLevel !== -999) {
                    for (let wy = y; wy < y + SY; wy++) {
                        if (wy > height && wy <= wLevel) {
                            data.set(i, wy - y, k, WATER)
                        }
                    }
                }
            }
        }

        noa.world.setChunkData(id, data)

        if (y === 0) generateTreesInChunk(noa, ids, x, y, z)
    })
}
