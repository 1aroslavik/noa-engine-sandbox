// world/plants.js
import { getBiome } from "../biome.js"
import { getHeightAt } from "./height.js"
import { getWaterLevel } from "./worldgen.js"

// быстрый сет блока
function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z)
}

function rand(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1))
}

// проверка хорошего места (как у деревьев)
function isGoodPlantSpot(noa, ids, x, y, z) {
    const blocks = ids.blocks
    const water = ids.waterID

    const waterY = getWaterLevel(x, z)
    if (waterY !== -999 && y <= waterY) return false

    const ground = noa.getBlock(x, y, z)

    const bad = [
        0,
        water,
        blocks["ice"],
        blocks["snow_top"],
        blocks["snow_side"]
    ]

    return !bad.includes(ground)
}

// =====================================================
// ГЕНЕРАЦИЯ РАСТЕНИЙ В ЧАНКЕ
// =====================================================
export function generatePlantsInChunk(noa, ids, cx, cy, cz) {
    const blocks = ids.blocks
    const CH = ids.chunkSize

    const BUSH   = blocks["bush"]
    const CACTUS = blocks["cactus"]
    const M_BIG  = blocks["mushroom_big"]
    const M_CAP  = blocks["mushroom_cap"]
    const GRASS  = blocks["grass_plant"]
    const FLOWER = blocks["flower"]
    const TWIG   = blocks["twig"]

    for (let i = 0; i < CH; i++) {
        for (let k = 0; k < CH; k++) {

            const x = cx + i
            const z = cz + k
            const y = getHeightAt(x, z)
            const wy = y + 1

            const biome = getBiome(x, z)

            // ПРОВЕРКА МЕСТА (как деревья)
            if (!isGoodPlantSpot(noa, ids, x, y, z)) continue

            // 🌿 КУСТЫ
            if (Math.random() < 0.06 && biome !== "desert" && biome !== "red_desert") {
                B(noa, BUSH, x, wy, z)
            }

            // 🌾 ТРАВА
            if (Math.random() < 0.25 && biome !== "snow") {
                B(noa, GRASS, x, wy, z)
            }

            // 🌼 ЦВЕТЫ
            if (Math.random() < 0.08 && biome !== "snow" && biome !== "tundra") {
                B(noa, FLOWER, x, wy, z)
            }

            // 🌵 КАКТУСЫ
            if (biome === "desert" || biome === "red_desert") {
                if (Math.random() < 0.04) {
                    const h = rand(2, 4)
                    for (let t = 0; t < h; t++) {
                        B(noa, CACTUS, x, wy + t, z)
                    }
                }
            }

            // 🍄 БОЛЬШИЕ ГРИБЫ
            if (biome === "forest" || biome === "tundra") {
                if (Math.random() < 0.015) {

                    const h = rand(3, 5)

                    for (let t = 0; t < h; t++) {
                        B(noa, M_BIG, x, wy + t, z)
                    }

                    const R = 2
                    for (let dx = -R; dx <= R; dx++) {
                        for (let dz = -R; dz <= R; dz++) {
                            if (dx*dx + dz*dz <= R*R) {
                                B(noa, M_CAP, x + dx, wy + h, z + dz)
                            }
                        }
                    }
                }
            }

            // 🌿 ВЕТОЧКИ
            if (Math.random() < 0.05 && biome !== "desert") {

                B(noa, TWIG, x, wy, z)

                if (Math.random() < 0.5) {
                    B(noa, TWIG, x+1, wy+1, z)
                    B(noa, TWIG, x-1, wy+1, z)
                } else {
                    B(noa, TWIG, x, wy+1, z+1)
                    B(noa, TWIG, x, wy+1, z-1)
                }
            }
        }
    }
}
