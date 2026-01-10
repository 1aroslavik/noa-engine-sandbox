// trees.js
import { getBiome } from "../biome.js"
import { getHeightAt } from "./height.js"
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

function makeChunkRNG(cx, cz, salt = 7777) {
    const seed =
        hashSeed(RAW_SEED) ^
        (cx * 73856093) ^
        (cz * 19349663) ^
        salt

    return makeRNG(seed >>> 0)
}

// быстрое размещение блока
function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z)
}

import { getWaterLevel } from "./worldgen.js"

// Проверка места для дерева
function isGoodTreeSpot(noa, ids, x, y, z) {

    const blocks = ids.blocks

    const waterY = getWaterLevel(x, z)

    // 1) земля ДОЛЖНА быть выше уровня воды
    if (waterY !== -999 && y <= waterY) return false

    // 2) блок под деревом
    const ground = noa.getBlock(x, y, z)

    const badBlocks = [
        ids.waterID,
        blocks["ice"],
        blocks["snow_side"],
        blocks["sand"],            // можно убрать если хочешь пальмы на пляже
        blocks["snow_top"],
        0                          // воздух — нельзя
    ]

    if (badBlocks.includes(ground)) return false

    // 3) не должно быть воды над землёй
    const top = noa.getBlock(x, y+1, z)
    if (top === ids.waterID) return false

    return true
}

/* ========================================================================
                              🌳 ДУБ
   — естественные ветки
   — случайная форма кроны
   — разветвление вокруг ствола
======================================================================== */

export function drawOak(noa, blocks, x, y, z, rand, rng) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_oak"]

    const trunk = rand(5, 9)

    for (let i = 0; i < trunk; i++) {
        B(noa, LOG, x, y + i, z)
    }

    const topY = y + trunk
    const branchCount = rand(3, 5)

    for (let b = 0; b < branchCount; b++) {
        const angle = rng() * Math.PI * 2
        const length = rand(3, 6)

        let bx = x
        let by = topY - rand(0, 2)
        let bz = z

        for (let i = 0; i < length; i++) {
            bx += Math.round(Math.cos(angle))
            bz += Math.round(Math.sin(angle))
            if (rng() < 0.3) by++

            B(noa, LOG, bx, by, bz)
        }

        makeLeafCloud(noa, LEAF, bx, by, bz, rand(2, 3), rand)
    }

    makeLeafCloud(noa, LEAF, x, topY + 1, z, 3, rand)
}


/* ========================================================================
                          🍃 ОБЛАКО ЛИСТЬЕВ
======================================================================== */

function makeLeafCloud(noa, leaf, cx, cy, cz, r, rand) {
    for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
            for (let dz = -r; dz <= r; dz++) {
                const d = dx*dx + dy*dy + dz*dz
                if (d <= r*r + rand(-1, 2)) {
                    B(noa, leaf, cx + dx, cy + dy, cz + dz)
                }
            }
}


/* ========================================================================
                              🌲 ЕЛЬ
   — нормальный конус
   — плавное сужение к вершине
   — много "ярусов"
======================================================================== */

export function drawSnowPine(noa, blocks, x, y, z, rand, rng) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_pine"]

    const height = rand(10, 16)

    for (let i = 0; i < height; i++) {
        B(noa, LOG, x, y + i, z)
    }

    const top = y + height
    const leafStart = y + Math.floor(height * 0.25)
    let radius = rand(4, 6)

    for (let yy = leafStart; yy <= top; yy++) {
        for (let dx = -radius; dx <= radius; dx++)
            for (let dz = -radius; dz <= radius; dz++)
                if (dx*dx + dz*dz <= radius*radius + 1)
                    B(noa, LEAF, x + dx, yy, z + dz)

        if (yy % 2 === 0 && radius > 1) radius--
    }

    B(noa, LEAF, x, top + 1, z)
}

// =============================================================
// 🌵 DRY TREE — МЁРТВОЕ ДЕРЕВО С L-SYSTEM БЕЗ ЛИСТЬЕВ
// =============================================================


export function drawDeadTree(noa, blocks, x, y, z, rand, rng) {
    const LOG = blocks["log"]
    const height = rand(4, 7)

    for (let i = 0; i < height; i++)
        B(noa, LOG, x, y + i, z)

    const topY = y + height
    const branches = [
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 },
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 },
    ]

    for (const b of branches) {
        if (rng() > 0.6) continue

        let bx = x, by = topY, bz = z
        const len = rand(2, 4)

        for (let i = 0; i < len; i++) {
            bx += b.dx
            bz += b.dz
            if (rng() > 0.4) by++

            B(noa, LOG, bx, by, bz)

            if (i === Math.floor(len / 2) && rng() > 0.5) {
                B(noa, LOG,
                    bx + (rng() > 0.5 ? 1 : -1),
                    by + rand(0, 1),
                    bz + (rng() > 0.5 ? 1 : -1)
                )
            }
        }
    }
}

/* ========================================================================
                              🌴 ПАЛЬМА
   — плавный наклон ствола
   — листья расходятся лучами
   — листья опускаются вниз
======================================================================== */

export function drawPalm(noa, blocks, x, y, z, rand, rng) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_savanna"]

    const height = rand(7, 11)
    let px = x, pz = z

    const leanX = rand(-1, 1) * 0.3
    const leanZ = rand(-1, 1) * 0.3

    for (let i = 0; i < height; i++) {
        B(noa, LOG, Math.round(px), y + i, Math.round(pz))
        px += leanX
        pz += leanZ
    }

    const topY = y + height
    const cx = Math.round(px)
    const cz = Math.round(pz)

    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1,1], [-1,1], [1,-1], [-1,-1]
    ]

    for (const [dx, dz] of dirs) {
        let lx = cx, lz = cz, ly = topY
        const length = rand(4, 6)

        for (let i = 0; i < length; i++) {
            lx += dx
            lz += dz
            if (i > 1 && rng() < 0.5) ly--
            B(noa, LEAF, lx, ly, lz)
        }
    }

    for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
            B(noa, LEAF, cx + dx, topY, cz + dz)
}


/* ========================================================================
                      🌿 ГЕНЕРАЦИЯ ДЕРЕВЬЕВ В ЧАНКЕ
======================================================================== */

export function generateTreesInChunk(noa, ids, x0, y0, z0) {
    const blocks = ids.blocks

    const rng = makeChunkRNG(x0 >> 5, z0 >> 5)
    const rand = (a, b) => a + Math.floor(rng() * (b - a + 1))

    for (let i = 0; i < 12; i++) {

        const x = x0 + rand(0, 31)
        const z = z0 + rand(0, 31)
        const y = getHeightAt(x, z)

        const biome = getBiome(x, z)

        // 🌵 DRY — сухие деревья
        if (biome === "dry") {
            if (rng() < 0.55)
                drawDeadTree(noa, blocks, x, y + 1, z, rand, rng)
            continue
        }

        // 🌳 ДУБЫ
        if (biome === "forest" || biome === "plains") {
            if (rng() < 0.42)
                drawOak(noa, blocks, x, y + 1, z, rand, rng)
        }

        // 🌲 ЕЛИ
        if (biome === "forest" || biome === "mountain" || biome === "tundra") {
            if (rng() < 0.20)
                drawSnowPine(noa, blocks, x, y + 1, z, rand, rng)
        }

        // 🌴 ПАЛЬМЫ
        if (biome === "desert" || biome === "red_desert") {
            if (rng() < 0.45)
                drawPalm(noa, blocks, x, y + 1, z, rand, rng)
        }
    }
}
