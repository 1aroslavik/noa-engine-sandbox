// plants.js
import { getHeightAt } from "./height.js";
import { getBiome } from "../biome.js";
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

// один RNG на чанк
function makeChunkRNG(cx, cz, salt = 9001) {
    const seed = hashSeed(RAW_SEED) ^ (cx * 73856093) ^ (cz * 19349663) ^ salt
    return makeRNG(seed >>> 0)
}

function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z);
}



// ===============================================
// 🍄 ГИГАНТСКИЙ ГРИБ (красный или коричневый)
// ===============================================
export function drawMushroom(noa, blocks, x, z, rand, rng) {
    const STEM = blocks["mushroom_leg"];
    const caps = [
        blocks["red_mushroom_top"],
        blocks["brown_mashroom_top"]
    ].filter(Boolean);

    if (!STEM || caps.length === 0) return;

    const CAP = caps[Math.floor(rng() * caps.length)];
    const y = getHeightAt(x, z);
    const height = rand(6, 10);
    const r = rand(4, 6);

    for (let i = 0; i < height; i++) {
        B(noa, STEM, x, y + i, z);
    }

    const capY = y + height;

    for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
            if (dx*dx + dz*dz <= r*r + 0.5) {
                B(noa, CAP, x + dx, capY, z + dz);
            }
        }
    }

    B(noa, CAP, x, capY + 2, z);
}

//
// ===============================================
// 🌵 КАКТУС (Saguaro style)
// ===============================================
export function drawCactus(noa, blocks, x, z, rand) {
    const CACTUS = blocks["cactus"];
    if (!CACTUS) return;

    const y = getHeightAt(x, z);
    const height = rand(6, 12);

    for (let i = 0; i < height; i++) {
        B(noa, CACTUS, x, y + i, z);
    }

    const branchY = y + rand(3, height - 3);

    B(noa, CACTUS, x + 1, branchY, z);
    B(noa, CACTUS, x - 1, branchY + 1, z);
    B(noa, CACTUS, x, branchY, z + 1);
}

//
// ===============================================
// ❄ ОГРОМНЫЙ ЛЕДЯНОЙ ПИК (10–13 блоков)
// ===============================================
export function drawIceSpike(noa, blocks, x, z, downward, rand, rng) {
    const ICE = blocks["ice"];
    if (!ICE) return;

    const y0 = getHeightAt(x, z);
    const height = rand(10, 13);

    for (let i = 0; i < height; i++) {
        const yy = downward ? y0 - i : y0 + i;
        if (yy <= 1) break;

        B(noa, ICE, x, yy, z);

        if (i < height * 0.5) {
            B(noa, ICE, x + 1, yy, z);
            B(noa, ICE, x - 1, yy, z);
        } else if (i < height * 0.8) {
            if (rng() < 0.6) B(noa, ICE, x + 1, yy, z);
            if (rng() < 0.6) B(noa, ICE, x - 1, yy, z);
        }
    }
}

//
// ===============================================
// 🪵 КОРЯГА (УПАВШЕЕ ДЕРЕВО)
// ===============================================
export function drawLog(noa, blocks, x, z, rand, rng) {
    const LOG = blocks["log"];
    if (!LOG) return;

    const y = getHeightAt(x, z);
    const length = rand(4, 8);
    const dir = rand(0, 3);

    for (let i = 0; i < length; i++) {
        const dx = dir === 1 ? i : dir === 3 ? -i : 0;
        const dz = dir === 0 ? i : dir === 2 ? -i : 0;

        B(noa, LOG, x + dx, y, z + dz);

        if (rng() < 0.3) {
            B(noa, LOG, x + dx, y + 1, z + dz);
        }
    }
}

//
// ===============================================
// 🪨 БОЛЬШОЙ ВАЛУН (КАМЕНЬ)
// ===============================================
export function drawBoulder(noa, blocks, x, z, rand, rng) {
    const STONE = blocks["stone"];
    if (!STONE) return;

    const baseY = getHeightAt(x, z);

    for (let ox = -3; ox <= 3; ox++) {
        for (let oz = -3; oz <= 3; oz++) {
            const dist = Math.sqrt(ox * ox + oz * oz);
            if (dist > 3.5) continue;

            const radius = rand(2, 4);

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        const sphere = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        if (sphere < radius + rng() * 0.6) {
                            B(noa, STONE,
                                x + ox + dx,
                                baseY + dy,
                                z + oz + dz
                            );
                        }
                    }
                }
            }
        }
    }
}

export function generatePlantsInChunk(noa, ids, x, y, z) {
    if (y !== 0) return;

    const blocks = ids.blocks;
    const wx = x + 8;
    const wz = z + 8;
    const biome = getBiome(wx, wz);

    const rng = makeChunkRNG(x >> 5, z >> 5)

    const rand = (a, b) => a + Math.floor(rng() * (b - a + 1))

    // 🍄 ГРИБЫ
    if (rng() < 1) {
        drawMushroom(noa, blocks, wx, wz, rand, rng);
    }

    // 🪨 КАМНИ
    if (rng() < 0.04) {
        drawBoulder(noa, blocks, wx, wz, rand, rng);
    }

    // 🌵 КАКТУСЫ
    if (biome === "desert" && rng() < 0.1) {
        drawCactus(noa, blocks, wx, wz, rand);
    }

    // 🪵 КОРЯГИ
    if (biome === "forest" && rng() < 0.05) {
        drawLog(noa, blocks, wx, wz, rand, rng);
    }

    // ❄ ЛЕД
    if (biome === "ice" && rng() < 0.07) {
        drawIceSpike(noa, blocks, wx, wz, false, rand, rng);
    }
}
