// plants.js
import { getHeightAt } from "./height.js"
import { getBiome } from "../biome.js"

function B(noa, id, x, y, z) {
    noa.setBlock(id, x, y, z);
}

function rand(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

// --------------------------------------
// 🍄 БОЛЬШОЙ КРАСИВЫЙ ГРИБ
// --------------------------------------
export function drawMushroom(noa, blocks, x, z, big = true) {
    const STEM = blocks["mushroom_stem"];
    const CAP  = blocks["mushroom_cap"];

    if (!STEM || !CAP) {
        console.warn("❌ Нет грибных блоков");
        return;
    }

    const y = getHeightAt(x, z);

    // -------------------------------
    // ВЫСОТА НОЖКИ
    // -------------------------------
    const height = rand(6, 10);   // БОЛЬШЕ!

    for (let i = 0; i < height; i++) {
        B(noa, STEM, x, y + i, z);
    }

    const capY = y + height;

    // -------------------------------
    // БОЛЬШАЯ ШЛЯПА
    // -------------------------------
    const r = rand(4, 6);   // РАДИУС БОЛЬШЕ

    // Нижний слой шляпы
    for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {

            // более круглая форма (евклидово расстояние)
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= r + 0.3) {
                B(noa, CAP, x + dx, capY, z + dz);
            }
        }
    }

    // Средний слой (чуть меньше)
    for (let dx = -r + 1; dx <= r - 1; dx++) {
        for (let dz = -r + 1; dz <= r - 1; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= (r - 1)) {
                B(noa, CAP, x + dx, capY + 1, z + dz);
            }
        }
    }

    // Верхняя точка гриба (толще)
    B(noa, CAP, x, capY + 2, z);
    B(noa, CAP, x + 1, capY + 2, z);
    B(noa, CAP, x - 1, capY + 2, z);
    B(noa, CAP, x, capY + 2, z + 1);
    B(noa, CAP, x, capY + 2, z - 1);
}

// --------------------------------------
// 🎯 Генерация грибов в чанке
// --------------------------------------
export function generateMushroomsInChunk(noa, ids, x, y, z) {

    if (y !== 0) return;

    // DEBUG – проверим генерацию
    console.log("🍄 Генерация грибов в чанке:", x, z);

    const blocks = ids.blocks;

    const gx = x + 8;
    const gz = z + 8;

    drawMushroom(noa, blocks, gx, gz, false);

    console.log("🍄 Гриб ПОСТАВЛЕН!");
}
