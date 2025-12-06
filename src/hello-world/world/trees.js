// trees.js
import { getBiome } from "../biome.js"
import { getHeightAt } from "./worldgen.js"

// быстрая постановка блока
function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z)
}
function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }



export function drawOak(noa, blocks, x, y, z) {
    const LOG = blocks["log"]
    const LEAF = blocks["leaves_oak"]

    // ------------------------
    // 1. СТВОЛ
    // ------------------------
    const trunkHeight = rand(5, 7)
    for (let i = 0; i < trunkHeight; i++) {
        B(noa, LOG, x, y + i, z)
    }

    const baseY = y + trunkHeight

    // ------------------------
    // 2. ПРАВИЛА L-SYSTEM ДЛЯ ВЕТОК
    // ------------------------
    const axiom = "F"
    const rules = {
        "F": "F[+F][-F][^F][vF]"  
        // 5 направлений: право, лево, вверх, вниз, прямой
    }

    function generate(iter) {
        let s = axiom
        for (let i = 0; i < iter; i++) {
            let ns = ""
            for (const ch of s) ns += rules[ch] || ch
            s = ns
        }
        return s
    }

    const L = generate(2)  // 2 итерации = нормальные ветки

    // ------------------------
    // 3. Параметры движения
    // ------------------------
    let yaw = 0
    let pitch = 0

    const yawStep = Math.PI / 3      // 60° — хорошие широкие ветки
    const pitchStep = Math.PI / 6    // наклоны вверх/вниз

    let pos = { x, y: baseY, z }
    const stack = []

    function forward() {
        // шаг по направлению
        const dx = Math.round(Math.cos(yaw) * Math.cos(pitch))
        const dz = Math.round(Math.sin(yaw) * Math.cos(pitch))
        const dy = Math.round(Math.sin(pitch))

        pos.x += dx
        pos.y += dy
        pos.z += dz

        // ставим блок ветки
        B(noa, LOG, pos.x, pos.y, pos.z)
    }

    // ------------------------
    // 4. Чтение L-system
    // ------------------------
    for (const ch of L) {

        if (ch === "F") {

            forward()

            // листья вокруг ветки
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++)
                    for (let dz = -1; dz <= 1; dz++)
                        if (dx*dx + dy*dy + dz*dz <= 2 && Math.random() > 0.55)
                            B(noa, LEAF, pos.x + dx, pos.y + dy, pos.z + dz)
        }

        else if (ch === "+") yaw += yawStep
        else if (ch === "-") yaw -= yawStep
        else if (ch === "^") pitch += pitchStep
        else if (ch === "v") pitch -= pitchStep

        else if (ch === "[") {
            stack.push({ pos: { ...pos }, yaw, pitch })
        }

        else if (ch === "]") {
            const s = stack.pop()
            pos = s.pos
            yaw = s.yaw
            pitch = s.pitch
        }
    }

    // ------------------------
    // 5. КРУПНАЯ КРОНА НА ВЕРХУ
    // ------------------------
    makeLeafBall(noa, LEAF, x, baseY + 2, z, 3)
}

function makeLeafBall(noa, leaf, cx, cy, cz, r) {
    for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
            for (let dz = -r; dz <= r; dz++)
                if (dx*dx + dy*dy + dz*dz <= r*r + 2)
                    noa.setBlock(leaf, cx + dx, cy + dy, cz + dz)
}


export function drawSnowPine(noa, blocks, x, y, z) {
    const LOG = blocks["log"];
    const LEAF = blocks["leaves_pine"];

    // высота дерева
    const height = rand(12, 18);

    // ствол
    for (let i = 0; i < height; i++) {
        B(noa, LOG, x, y + i, z);
    }

    const top = y + height;

    // Чистый ствол без листвы (нижние блоки пустые)
    const leafStart = y + Math.floor(height * 0.3);

    // максимальный радиус нижней хвои
    const maxRadius = 5;

    // ---------------------------
    //   ЛИСТВА ОТ НИЗА ВВЕРХ!!!
    // ---------------------------
    let radius = maxRadius;

    for (let yy = leafStart; yy <= top; yy++) {

        // ставим круг листвы
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                if (dx*dx + dz*dz <= radius * radius) {
                    B(noa, LEAF, x + dx, yy, z + dz);
                }
            }
        }

        // поднимаемся вверх и уменьшаем радиус = конус вниз → вверх
        if ((yy - leafStart) % 2 === 0 && radius > 1) {
            radius -= 1;
        }
    }

    // макушка
    B(noa, LEAF, x, top + 1, z);
}



export function drawPalm(noa, blocks, x, y, z) {
    const LOG = blocks["log"];
    const LEAF = blocks["leaves_savanna"];

    // --- 1. СТВОЛ ПАЛЬМЫ ---
    const height = rand(7, 11);
    let px = x;
    let pz = z;

    // лёгкий случайный наклон ствола
    const leanX = rand(-1, 1) * 0.3;
    const leanZ = rand(-1, 1) * 0.3;

    for (let i = 0; i < height; i++) {
        B(noa, LOG, Math.round(px), y + i, Math.round(pz));

        // постепенно смещаем ствол
        px += leanX;
        pz += leanZ;
    }

    const topY = y + height;
    const cx = Math.round(px);
    const cz = Math.round(pz);

    // --- 2. ЛИСТВА ПАЛЬМЫ (СПРАВЖНИЕ ЛУЧИ) ---

    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1]
    ];

    // ДЛИННЫЕ ЛИСТЬЯ (горизонтальные)
    for (const [dx, dz] of directions) {
        let lx = cx;
        let lz = cz;
        let ly = topY;

        const length = rand(4, 5);

        for (let i = 0; i < length; i++) {
            lx += dx;
            lz += dz;

            // листья образуют "пальмовую звезду"
            B(noa, LEAF, lx, ly, lz);

            // листья плавно опускаются вниз
            if (i > 1 && Math.random() < 0.5) {
                ly -= 1;
            }
        }
    }

    // --- 3. ЦЕНТРАЛЬНАЯ ШАПКА ЛИСТЬЕВ ---
    for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
            B(noa, LEAF, cx + dx, topY, cz + dz);

    // --- 4. ПАРА ВИСЯЩИХ ЛИСТЬЕВ ДЛЯ КРАСОТЫ ---
    for (const [dx, dz] of directions) {
        if (Math.random() < 0.5) {
            B(noa, LEAF, cx + dx, topY - 1, cz + dz);
        }
    }
}



export function generateTreesInChunk(noa, ids, x0, y0, z0) {
    const blocks = ids.blocks

    for (let i = 0; i < 10; i++) {

        const x = x0 + rand(0, 31)
        const z = z0 + rand(0, 31)
        const y = getHeightAt(x, z)

        const biome = getBiome(x, z)

        // --------------------------------------------
        // 🌳 ДУБЫ — ТОЛЬКО ЛЕС И ПЛЕЙНС
        // --------------------------------------------
        if (biome === "forest" || biome === "plains") {
            if (Math.random() < 0.45)
                drawOak(noa, blocks, x, y + 1, z)
        }

        // --------------------------------------------
        // 🌲 ЕЛИ — ЛЕС, ТУНДРА, ГОРЫ
        // --------------------------------------------
        if (biome === "forest" || biome === "tundra" || biome === "mountain") {
            if (Math.random() < 0.25)
                drawSnowPine(noa, blocks, x, y + 1, z)
        }

        // --------------------------------------------
        // 🌴 ПАЛЬМЫ — ТОЛЬКО ПУСТЫНЯ
        // --------------------------------------------
        if (biome === "desert") {
            if (Math.random() < 0.4)
                drawPalm(noa, blocks, x, y + 1, z)
        }
    }
}
