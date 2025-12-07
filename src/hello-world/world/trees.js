// trees.js
import { getBiome } from "../biome.js"
import { getHeightAt } from "./height.js"

// быстрое размещение блока
function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z)
}

function rand(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1))
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

export function drawOak(noa, blocks, x, y, z) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_oak"]

    // высота ствола
    const trunk = rand(5, 9)

    for (let i = 0; i < trunk; i++) {
        B(noa, LOG, x, y + i, z)
    }

    const topY = y + trunk

    // --------------------------------
    // 1. Несколько случайных веток
    // --------------------------------
    const branchCount = rand(3, 5)

    for (let b = 0; b < branchCount; b++) {

        let angle = Math.random() * Math.PI * 2
        let length = rand(3, 6)

        let bx = x
        let by = topY - rand(0, 2)
        let bz = z

        for (let i = 0; i < length; i++) {
            bx += Math.round(Math.cos(angle))
            bz += Math.round(Math.sin(angle))
            by += (Math.random() < 0.3 ? 1 : 0)

            B(noa, LOG, bx, by, bz)
        }

        // облако листьев вокруг конца ветки
        makeLeafCloud(noa, LEAF, bx, by, bz, rand(2, 3))
    }

    // --------------------------------
    // 2. Центральная верхняя крона
    // --------------------------------
    makeLeafCloud(noa, LEAF, x, topY + 1, z, 3)
}


/* ========================================================================
                          🍃 ОБЛАКО ЛИСТЬЕВ
======================================================================== */

function makeLeafCloud(noa, leaf, cx, cy, cz, r) {
    for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
            for (let dz = -r; dz <= r; dz++) {
                let d = dx*dx + dy*dy + dz*dz
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

export function drawSnowPine(noa, blocks, x, y, z) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_pine"]

    const height = rand(10, 16)

    // ствол
    for (let i = 0; i < height; i++) {
        B(noa, LOG, x, y + i, z)
    }

    const top = y + height

    // где начинается хвоя
    const leafStart = y + Math.floor(height * 0.25)

    let radius = rand(4, 6)

    // слои листвы снизу вверх
    for (let yy = leafStart; yy <= top; yy++) {

        for (let dx = -radius; dx <= radius; dx++)
            for (let dz = -radius; dz <= radius; dz++)
                if (dx*dx + dz*dz <= radius*radius + 1) {
                    B(noa, LEAF, x + dx, yy, z + dz)
                }

        // постепенное уменьшение радиуса
        if (yy % 2 === 0 && radius > 1) {
            radius--
        }
    }

    // макушка
    B(noa, LEAF, x, top + 1, z)
}

// =============================================================
// 🌵 DRY TREE — МЁРТВОЕ ДЕРЕВО С L-SYSTEM БЕЗ ЛИСТЬЕВ
// =============================================================


export function drawDeadTree(noa, blocks, x, y, z) {

    const LOG = blocks["log"];

    // ----------------------------
    // 1. СТВОЛ (прямой, сухой)
    // ----------------------------
    const height = rand(4, 7);
    for (let i = 0; i < height; i++) {
        B(noa, LOG, x, y + i, z);
    }

    const topY = y + height;

    // -------------------------------------------------
    // 2. L-system ДЛЯ СУХИХ ВЕТОК (простая Y-форма)
    // -------------------------------------------------

    const branches = [
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 },
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 },
    ];

    for (const b of branches) {
        if (Math.random() > 0.6) continue; // не все ветки обязательны

        let bx = x;
        let by = topY;
        let bz = z;

        const len = rand(2, 4);

        for (let i = 0; i < len; i++) {

            // движение ветки по направлению
            bx += b.dx;
            bz += b.dz;

            // лёгкий подъём вверх
            if (Math.random() > 0.4) by += 1;

            B(noa, LOG, bx, by, bz);

            // случайный разветвитель
            if (i === Math.floor(len / 2) && Math.random() > 0.5) {
                const sx = bx + (Math.random() > 0.5 ? 1 : -1);
                const sz = bz + (Math.random() > 0.5 ? 1 : -1);
                const sy = by + rand(0, 1);
                B(noa, LOG, sx, sy, sz);
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

export function drawPalm(noa, blocks, x, y, z) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_savanna"]

    const height = rand(7, 11)

    let px = x
    let pz = z

    const leanX = rand(-1, 1) * 0.3
    const leanZ = rand(-1, 1) * 0.3

    // ствол
    for (let i = 0; i < height; i++) {
        B(noa, LOG, Math.round(px), y + i, Math.round(pz))
        px += leanX
        pz += leanZ
    }

    const topY = y + height
    const cx = Math.round(px)
    const cz = Math.round(pz)

    // направления листьев
    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1,1], [-1,1], [1,-1], [-1,-1]
    ]

    for (const [dx, dz] of dirs) {
        let lx = cx
        let lz = cz
        let ly = topY

        const length = rand(4, 6)

        for (let i = 0; i < length; i++) {
            lx += dx
            lz += dz
            if (i > 1 && Math.random() < 0.5) ly--

            B(noa, LEAF, lx, ly, lz)
        }
    }

    // центр листьев
    for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
            B(noa, LEAF, cx + dx, topY, cz + dz)
}


/* ========================================================================
                      🌿 ГЕНЕРАЦИЯ ДЕРЕВЬЕВ В ЧАНКЕ
======================================================================== */

export function generateTreesInChunk(noa, ids, x0, y0, z0) {
    const blocks = ids.blocks

    for (let i = 0; i < 12; i++) {

        const x = x0 + rand(0, 31)
        const z = z0 + rand(0, 31)
        const y = getHeightAt(x, z)

        const biome = getBiome(x, z)

        // --------------------------------------------
        // 🌵 DRY — ТОЛЬКО мёртвые стволы
        // --------------------------------------------
// 🌵 DRY — мёртвые деревья с ветками
if (biome === "dry") {
    if (Math.random() < 0.55)
        drawDeadTree(noa, blocks, x, y + 1, z)
    continue
}


        // --------------------------------------------
        // 🌳 ДУБЫ — ЛЕС + РАВНИНЫ
        // --------------------------------------------
        if (biome === "forest" || biome === "plains") {
            if (Math.random() < 0.42)
                drawOak(noa, blocks, x, y + 1, z)
        }

        // --------------------------------------------
        // 🌲 ЕЛИ — ЛЕС, ГОРЫ, ТУНДРА
        // --------------------------------------------
        if (biome === "forest" || biome === "mountain" || biome === "tundra") {

            // разнообразие елей
            if (Math.random() < 0.20)
                drawSnowPine(noa, blocks, x, y + 1, z)
        }

        // --------------------------------------------
        // 🌴 ПАЛЬМЫ — ПУСТЫНИ
        // --------------------------------------------
        if (biome === "desert" || biome === "red_desert") {
            if (Math.random() < 0.45)
                drawPalm(noa, blocks, x, y + 1, z)
        }
    }
}
