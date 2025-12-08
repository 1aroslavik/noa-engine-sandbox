// plants.js
import { getHeightAt } from "./height.js";
import { getBiome } from "../biome.js";

function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z);
}

function rand(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

// ===============================================
// 🍄 ГИГАНТСКИЙ ГРИБ (красный или коричневый)
// ===============================================
export function drawMushroom(noa, blocks, x, z) {

    // ножка
    const STEM = blocks["mushroom_leg"];

    // случайный выбор шляпы
    const caps = [
        blocks["red_mushroom_top"],
        blocks["brown_mashroom_top"]
    ].filter(Boolean);

    if (!STEM || caps.length === 0) return;

    // выбираем случайный цвет шляпы
    const CAP = caps[Math.floor(Math.random() * caps.length)];

    const y = getHeightAt(x, z);
    const height = rand(6, 10);

    // ножка
    for (let i = 0; i < height; i++) {
        B(noa, STEM, x, y + i, z);
    }

    const capY = y + height;
    const r = rand(4, 6);

    // нижний слой шляпы
    for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
            if (dx*dx + dz*dz <= r*r + 0.5) {
                B(noa, CAP, x + dx, capY, z + dz);
            }
        }
    }

    // средний слой
    for (let dx = -(r-1); dx <= (r-1); dx++) {
        for (let dz = -(r-1); dz <= (r-1); dz++) {
            if (dx*dx + dz*dz <= (r-2)*(r-2) + 0.5) {
                B(noa, CAP, x + dx, capY + 1, z + dz);
            }
        }
    }

    // верхняя точка
    B(noa, CAP, x, capY + 2, z);
}

//
// ===============================================
// 🌵 КАКТУС (Saguaro style)
// ===============================================
export function drawCactus(noa, blocks, x, z) {
const CACTUS = blocks["cactus"];
if (!CACTUS) return; // если вдруг нет — выходим
    const y = getHeightAt(x, z);

    const height = rand(6, 12);

    // ствол
    for (let i = 0; i < height; i++) {
        B(noa, CACTUS, x, y + i, z);
    }

    // боковые "руки"
    const branchY = y + rand(3, height - 3);

    B(noa, CACTUS, x + 1, branchY, z);
    B(noa, CACTUS, x - 1, branchY + 1, z);
    B(noa, CACTUS, x, branchY, z + 1);
}

//
// ===============================================
// ❄ ОГРОМНЫЙ ЛЕДЯНОЙ ПИК (10–13 блоков)
// ===============================================
export function drawIceSpike(noa, blocks, x, z, downward = false) {
    const ICE = blocks["ice"];
    if (!ICE) return;

    const y0 = getHeightAt(x, z);

    const height = rand(10, 13); // ВЫСОКИЕ ПИКИ!

    for (let i = 0; i < height; i++) {
        const yy = downward ? y0 - i : y0 + i;
        if (yy <= 1) break;

        // основной столб
        B(noa, ICE, x, yy, z);

        // расширение у основания, сужение к вершине
        if (i < height * 0.5) {
            // нижняя «толстая» часть
            B(noa, ICE, x + 1, yy, z);
            B(noa, ICE, x - 1, yy, z);
            B(noa, ICE, x, yy, z + 1);
            B(noa, ICE, x, yy, z - 1);
        } else if (i < height * 0.8) {
            // средняя зона — чуть уже
            if (Math.random() < 0.6) B(noa, ICE, x + 1, yy, z);
            if (Math.random() < 0.6) B(noa, ICE, x - 1, yy, z);
        }

        // пик — узкий
        // последний 1–2 блока — только по центру
    }
}

//
// ===============================================
// 🪵 КОРЯГА (УПАВШЕЕ ДЕРЕВО)
// ===============================================
export function drawLog(noa, blocks, x, z) {
    const LOG = blocks["log"];
    if (!LOG) return;

    let y = getHeightAt(x, z);
    const length = rand(4, 8);
    const dir = rand(0, 3); // N/E/S/W

    for (let i = 0; i < length; i++) {
        const dx = dir === 1 ? i : dir === 3 ? -i : 0;
        const dz = dir === 0 ? i : dir === 2 ? -i : 0;

        B(noa, LOG, x + dx, y, z + dz);

        // ветки
        if (Math.random() < 0.3) B(noa, LOG, x + dx, y + 1, z + dz);
    }
}

//
// ===============================================
// 🪨 БОЛЬШОЙ ВАЛУН (КАМЕНЬ)
// ===============================================
// ===============================================
// 🪨 КЛАСТЕР БОЛЬШИХ ВАЛУНОВ (7×7 область)
// ===============================================
export function drawBoulder(noa, blocks, x, z) {
    const STONE = blocks["stone"];
    if (!STONE) return;

    const baseY = getHeightAt(x, z);

    // центр кластера
    for (let ox = -3; ox <= 3; ox++) {
        for (let oz = -3; oz <= 3; oz++) {

            // расстояние до центра -> более плотный центр
            const dist = Math.sqrt(ox * ox + oz * oz);
            if (dist > 3.5) continue;

            // радиус каждого валуна
            const radius = rand(2, 4);

            // строим отдельный валун в позиции (x+ox, z+oz)
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    for (let dy = -radius; dy <= radius; dy++) {

                        const sphere = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        // делаем немного шумным и неровным
                        if (sphere < radius + Math.random()*0.6) {
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

    // ================================
    // 🍄 ГРИБЫ — МОГУТ БЫТЬ ВЕЗДЕ
    // ================================
    if (Math.random() < 1) {
        drawMushroom(noa, blocks, wx, wz);
    }

    // ================================
    // 🪨 БОЛЬШИЕ КАМНИ — ТОЖЕ ВЕЗДЕ
    // ================================
    if (Math.random() < 0.04) {
        drawBoulder(noa, blocks, wx, wz);
    }

    // ================================
    // 🌵 КАКТУСЫ — ТОЛЬКО ПУСТЫНЯ
    // ================================
    if (biome === "desert" && Math.random() < 0.1) {
        drawCactus(noa, blocks, wx, wz);
    }

    // ================================
    // 🪵 КОРЯГИ — ТОЛЬКО ЛЕС
    // ================================
    if (biome === "forest" && Math.random() < 0.05) {
        drawLog(noa, blocks, wx, wz);
    }

    // ================================
    // ❄ СТАЛАКТИТЫ — ТОЛЬКО ICE
    // ================================
    if (biome === "ice" && Math.random() < 0.07) {
        drawIceSpike(noa, blocks, wx, wz, false);
    }
}
