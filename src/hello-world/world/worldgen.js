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
import { isCave, isSurfaceCave } from "./caves.js";

import { generateTreesInChunk } from "./trees.js";
import { generateAnimalsInChunk } from "./animals.js";

import { getHeightAt } from "./height.js";
export { getHeightAt } from "./height.js";

import { createNoise2D } from "simplex-noise";
import { generatePlantsInChunk } from "./plants.js";
// Пещерные шумы (оставляем твои)
const iceSpikeNoise = createNoise2D(() => Math.random());
const postGenQueue = []
let postGenRunning = false

function runPostGenQueue(noa, ids) {
  if (postGenRunning) return
  postGenRunning = true

  noa.on("tick", () => {
    // делаем максимум 1 задачу за кадр
    const job = postGenQueue.shift()
    if (!job) return
    try { job() } catch (e) {}
  })
}

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
    runPostGenQueue(noa, ids)

    const B = ids.blocks;
    const GRASS_PLANT = ids.grassID; 

    // Проверяем что все необходимые блоки загружены
    if (!B || typeof B !== 'object') {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: ids.blocks не определен или не является объектом", { ids, blocks: B })
        throw new Error("Blocks not loaded: ids.blocks is undefined or not an object")
    }

const ANDESITE = B["andesite"];
const BOARDS_WOOD = B["boards_wood"];     // FIXED
const GRANITE = B["granite"];

const GRASS = B["grass"];                 // переходная трава
const GRASS_BLOCK = B["grass_block"];     // полный блок

const DIRT = B["dirt"];
const SAND = B["sand"];
const RED_SAND = B["red_sand"];
const DESERT_ROCK = B["desert_rock"];
const STONE = B["stone"];
const GRAVEL = B["gravel"];

const SNOW_BLOCK = B["snow_block"];
const SNOW = B["snow"];
const SNOW_SIDE = B["snow_side"];
const SNOW_TRANS = B["snow_transition_side"] || SNOW_SIDE;

const ICE = B["ice"];

const TUNDRA_GRASS = B["tundra_grass"];               // переход
const TUNDRA_GRASS_BLOCK = B["tundra_grass_block"];   // полный блок

const GRASS_DRY = B["grass_dry"];                     // переход
const GRASS_DRY_BLOCK = B["grass_dry_block"];         // полный блок

const WATER = ids.waterID;

    // Проверяем критически важные блоки
    const criticalBlocks = { STONE, DIRT, GRASS, WATER }
    const missingBlocks = Object.entries(criticalBlocks)
        .filter(([name, value]) => value === undefined || value === null)
        .map(([name]) => name)
    
    if (missingBlocks.length > 0) {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют необходимые блоки:", missingBlocks)
        console.error("📦 Доступные блоки:", Object.keys(B))
        throw new Error(`Critical blocks missing: ${missingBlocks.join(", ")}`)
    }

    // Fallback значения для опциональных блоков
    const warnedBlocks = new Set()
    const safeGetBlock = (blockId, fallback = STONE) => {
        if (blockId === undefined || blockId === null) {
            // Логируем только первые несколько раз, чтобы не засорять консоль
            const key = `${blockId}_${fallback}`
            if (!warnedBlocks.has(key)) {
                warnedBlocks.add(key)
                console.warn(`⚠️ Блок не определен (${blockId}), используем fallback: ${fallback}`)
            }
            return fallback
        }
        return blockId
    }
    
    // Проверяем что все основные блоки определены
    const requiredBlocks = {
        STONE, DIRT, GRASS, WATER,
        SAND: safeGetBlock(SAND, STONE),
        ICE: safeGetBlock(ICE, STONE),
        SNOW: safeGetBlock(SNOW, STONE),
        GRAVEL: safeGetBlock(GRAVEL, STONE)
    }
    
    console.log("✅ Проверка блоков завершена, начинаем генерацию")
    
    // Проверяем что noa.world существует и имеет метод on
    if (!noa.world || typeof noa.world.on !== 'function') {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: noa.world.on не доступен!", { noa, world: noa.world })
        throw new Error("noa.world.on is not available")
    }
    
    console.log("🔧 Регистрируем обработчик worldDataNeeded...")

    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {
        // Определяем, является ли это первым чанком (для логирования)
        // Объявляем ДО try блока, чтобы переменная была доступна во всей функции
        const isFirstChunk = y === 0 && (Math.abs(x) < 100 && Math.abs(z) < 100)
        
        try {
            // Логируем ВСЕ вызовы для отладки проблемы в продакшене
            console.log("🔵 GEN CALL - worldDataNeeded вызван!", { id, x, y, z, shape: data?.shape })
            
            if (isFirstChunk) {
                console.log(`🌍 Генерация чанка: x=${x}, y=${y}, z=${z}, id=${id}, shape=${data?.shape}`)
            }
            
            // Проверяем что data валидна
            if (!data || !data.set || !data.shape) {
                console.error("❌ Невалидные данные чанка:", { id, x, y, z, data })
                throw new Error("Invalid chunk data")
            }

        const SX = data.shape[0];
        const SY = data.shape[1];
        const SZ = data.shape[2];

        // Универсальный шумовой фильтр для поверхностного декора
        const F = (noise, x, z, scale) => {
            return Math.abs(noise(x * scale, z * scale));
        };

        for (let i = 0; i < SX; i++) {
            for (let k = 0; k < SZ; k++) {

                const wx = x + i;
                const wz = z + k;

                // Безопасное получение данных для генерации
                let biome, height, wLevel
                try {
                    biome = getBiome(wx, wz);
                    height = getHeightAt(wx, wz);
                    wLevel = getWaterLevel(wx, wz);
                    
                    // Проверяем что значения валидны
                    if (!Number.isFinite(height)) {
                        console.error(`❌ Невалидная высота: ${height} для позиции (${wx}, ${wz})`)
                        height = 50 // Fallback высота
                    }
                    if (wLevel !== -999 && !Number.isFinite(wLevel)) {
                        console.error(`❌ Невалидный уровень воды: ${wLevel} для позиции (${wx}, ${wz})`)
                        wLevel = -999
                    }
                    
                    // Логируем первые несколько позиций для отладки
                    if (isFirstChunk && i === 0 && k === 0) {
                        console.log(`📐 Данные генерации для (${wx}, ${wz}): biome=${biome}, height=${height}, wLevel=${wLevel}`)
                    }
                } catch (genErr) {
                    console.error(`💥 Ошибка при получении данных генерации для (${wx}, ${wz}):`, genErr)
                    // Используем безопасные значения по умолчанию
                    biome = "plains"
                    height = 50
                    wLevel = -999
                }

                for (let j = 0; j < SY; j++) {

                    const wy = y + j;

                    // =====================================================
                    // ДНО ПОД ВОДОЙ
                    // =====================================================
                    if (wLevel !== -999 && wy < wLevel) {

                      

                        const depth = wLevel - wy;

                        if (depth === 1) data.set(i, j, k, safeGetBlock(SAND, STONE));
                        else if (depth <= 3) data.set(i, j, k, safeGetBlock(DIRT, STONE));
                        else data.set(i, j, k, STONE);

                        continue;
                    }

// =====================================================
// ДЕКОР БИОМОВ — БЕЗ ПЕЩЕР И РАЗЛОМОВ
// =====================================================
if (y === 0 && wy === height) {
    // -------------------------
// 🧊 ICE — ЛЕДЯНОЙ БИОМ
// -------------------------
if (biome === "ice") {

    // Генерация ледяных пиков (Ice Spikes)
    const spike = F(iceSpikeNoise, wx, wz, 0.015);

    // Большие пики
    if (spike < 0.008) {
        const spikeHeight = Math.floor(12 + Math.random() * 18); // 12–30
        for (let h = 0; h < spikeHeight; h++) {
            if (j + h < SY) data.set(i, j + h, k, ICE);
        }
        continue;
    }

    // Средние пики
    if (spike < 0.018) {
        const spikeHeight = Math.floor(6 + Math.random() * 8); // 6–14
        for (let h = 0; h < spikeHeight; h++) {
            if (j + h < SY) data.set(i, j + h, k, ICE);
        }
        continue;
    }

    // Малые пики
    if (spike < 0.04) {
        const spikeHeight = Math.floor(2 + Math.random() * 4); // 2–5
        for (let h = 0; h < spikeHeight; h++) {
            if (j + h < SY) data.set(i, j + h, k, ICE);
        }
        continue;
    }

    // Базовая поверхность
    data.set(i, j, k, ICE);
    if (j > 0) data.set(i, j - 1, k, DIRT);
    if (j > 1) data.set(i, j - 2, k, DIRT);

    continue;
}

    // -------------------------
    // 🌿 PLAINS — РАВНИНЫ
    // -------------------------
    if (biome === "plains") {

        // мелкие пятна гравия
        if (F(_caveCheese, wx, wz, 0.04) < 0.015) {
            data.set(i, j, k, GRAVEL);
            continue;
        }

        // камни
        if (F(_caveCrack, wx, wz, 0.03) < 0.01) {
            data.set(i, j, k, STONE);
            continue;
        }

        // подсушенная трава местами
        if (F(_caveWormA, wx, wz, 0.05) < 0.018) {
            data.set(i, j, k, GRASS_DRY_BLOCK);
            continue;
        }
    }

    // -------------------------
    // 🌲 FOREST — ЛЕС
    // -------------------------
    if (biome === "forest") {

        // камни под деревьями
        if (F(_caveCheese, wx, wz, 0.03) < 0.012) {
            data.set(i, j, k, STONE);
            continue;
        }

        // мох и влажная почва
        if (F(_caveWormA, wx, wz, 0.05) < 0.022) {
            data.set(i, j, k, DIRT);
            continue;
        }
    }

    // -------------------------
    // 🏜 DESERT — ПУСТЫНЯ
    // -------------------------
    if (biome === "desert") {

        // большие дюны
        if (F(_caveCheese, wx, wz, 0.008) < 0.03) {
            data.set(i, j, k, SAND);
            continue;
        }

        // пятна камня
        if (F(_caveCrack, wx, wz, 0.02) < 0.01) {
            data.set(i, j, k, DESERT_ROCK);
            continue;
        }
    }

    // -------------------------
    // ❤️ RED DESERT — КРАСНАЯ ПУСТЫНЯ
    // -------------------------
    if (biome === "red_desert") {

        // красные камни
        if (F(_caveCrack, wx, wz, 0.02) < 0.015) {
            data.set(i, j, k, DESERT_ROCK);
            continue;
        }
    }

    // -------------------------
    // 🏔 MOUNTAIN — ГОРЫ
    // -------------------------
    if (biome === "mountain") {

        // щебень
        if (F(_caveWormB, wx, wz, 0.05) < 0.03) {
            data.set(i, j, k, GRAVEL);
            continue;
        }

        // каменные выступы
        if (F(_caveCrack, wx, wz, 0.025) < 0.015) {
            data.set(i, j, k, STONE);
            continue;
        }
    }

    // -------------------------
    // ❄ SNOW — СНЕГ
    // -------------------------
    if (biome === "snow") {

        // рыхлый снег
        if (Math.random() < 0.2) {
            data.set(i, j, k, SNOW_BLOCK);
            continue;
        }

        // сжатый снег
        if (F(_caveCheese, wx, wz, 0.02) < 0.015) {
            data.set(i, j, k, SNOW_SIDE);
            continue;
        }
    }

    // -------------------------
    // 🌨 TUNDRA — ТУНДРА
    // -------------------------
    if (biome === "tundra") {

        if (F(_caveCrack, wx, wz, 0.03) < 0.02) {
            data.set(i, j, k, SNOW_SIDE);
            continue;
        }

        // мерзлая почва
        if (F(_caveWormA, wx, wz, 0.04) < 0.018) {
            data.set(i, j, k, DIRT);
            continue;
        }
    }

    // -------------------------
    // 🌵 DRY — СУХИЕ ЗЕМЛИ
    // -------------------------
    if (biome === "dry") {

        // жёлтая сухая трава пятнами
        if (F(_caveCheese, wx, wz, 0.03) < 0.02) {
            data.set(i, j, k, GRASS_DRY);
            continue;
        }

        // потрескавшаяся земля
        if (F(_caveCrack, wx, wz, 0.04) < 0.015) {
            data.set(i, j, k, DIRT);
            continue;
        }
    }
}
// =====================================================
// КРАСИВЫЕ СЛОИ БИОМОВ
// =====================================================
const layerNoise = F(_caveCheese, wx, wz, 0.01);

if (biome === "desert" && wy < height - 2 && wy > height - 6) {
    if (layerNoise < 0.04) {
        data.set(i, j, k, SAND);
        continue;
    }
}

if (biome === "mountain" && wy < height - 4 && wy > height - 16) {
    if (layerNoise < 0.035) {
        data.set(i, j, k, GRAVEL);
        continue;
    }
}

if (biome === "tundra" && wy < height - 4 && wy > height - 10) {
    if (layerNoise < 0.045) {
        data.set(i, j, k, SNOW_SIDE);
        continue;
    }
}


// Часть подземелья
if (wy < height - 4) {

    // Обычные пещеры
    if (isCave(wx, wy, wz)) {
        data.set(i, j, k, 0);
        continue;
    }

    data.set(i, j, k, STONE);
    continue;
}

// -------------------------
// ВЫХОДЫ ПЕЩЕР НА ПОВЕРХНОСТЬ
// -------------------------

if (wy >= height - 4 && wy <= height) {

    if (isCave(wx, wy, wz) || isSurfaceCave(wx, wy, wz, height)) {
        // Это вход в пещеру
        data.set(i, j, k, 0);
        continue;
    }
}



// ПОДПОВЕРХНОСТЬ (как в Minecraft)
if (wy < height) {

    const depth = height - wy;

    // 1–3 блока под поверхностью — всегда земля
    if (depth <= 5) {
        data.set(i, j, k, GRASS);
        continue;
    }
    if (depth <= 15) {
        data.set(i, j, k, DIRT);
        continue;
    }
        if (depth <= 25) {
        data.set(i, j, k, GRAVEL);
        continue;
    }
            if (depth <= 35) {
        data.set(i, j, k, ANDESITE);
        continue;
    }
    // Все, что глубже — камень (для нормальных гор)
    data.set(i, j, k, STONE);
    continue;
}

                    // =====================================================
                    // ПОВЕРХНОСТЬ (БАЗОВАЯ)
                    // =====================================================
                    if (y === 0 && wy === height) {

                        switch (biome) {

                            case "desert":
                                data.set(i, j, k, SAND);
                                continue;

                            case "red_desert":
                                data.set(i, j, k, RED_SAND);
                                continue;

                            case "tundra":
                                // 20% плитки станут полноценными блоками снега
                                if (Math.random() < 0.20) {
                                    data.set(i, j, k, TUNDRA_GRASS_BLOCK);   // ❄ плотный снег
                                    continue;
                                }
                                data.set(i, j, k, TUNDRA_GRASS);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;
                            case "snow":

                                // 20% плитки станут полноценными блоками снега
                                if (Math.random() < 0.20) {
                                    data.set(i, j, k, SNOW_BLOCK);   // ❄ плотный снег
                                    continue;
                                }

                                // обычная поверхностная логика
                                data.set(i, j, k, SNOW);             // верх — снег
                                if (j > 0) data.set(i, j - 1, k, SNOW_TRANS); // переход
                                if (j > 1) data.set(i, j - 2, k, DIRT);       // ниже земля
                                continue;


                            case "ice":
                                data.set(i, j, k, ICE);      // верхний слой — светлый морозный снег
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                if (j > 1) data.set(i, j - 2, k, DIRT);
                                continue;

                                

                            case "dry":
                                // 20% плитки станут полноценными блоками снега
                                if (Math.random() < 0.20) {
                                    data.set(i, j, k, GRASS_DRY_BLOCK);   // ❄ плотный снег
                                    continue;
                                }
                                data.set(i, j, k, GRASS_DRY);
                                if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;

                            default:
                                data.set(i, j, k, GRASS);
                                //if (j > 0) data.set(i, j - 1, k, DIRT);
                                continue;
                        }
                    }

                    // =====================================================
                    // ВОЗДУХ
                    // =====================================================
                    
                }

                // =====================================================
                // ЗАПОЛНЕНИЕ ВОДОЙ
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

            // Проверяем что в чанке есть хотя бы несколько блоков (не все воздух)
            let solidBlockCount = 0
            let totalBlocks = 0
            if (data && data.shape) {
                const SX = data.shape[0]
                const SY = data.shape[1]
                const SZ = data.shape[2]
                // Проверяем только несколько случайных позиций для производительности
                for (let checkI = 0; checkI < Math.min(10, SX); checkI += Math.max(1, Math.floor(SX/10))) {
                    for (let checkJ = 0; checkJ < Math.min(10, SY); checkJ += Math.max(1, Math.floor(SY/10))) {
                        for (let checkK = 0; checkK < Math.min(10, SZ); checkK += Math.max(1, Math.floor(SZ/10))) {
                            totalBlocks++
                            try {
                                const blockValue = data.get ? data.get(checkI, checkJ, checkK) : 0
                                if (blockValue !== undefined && blockValue !== null && blockValue !== 0) {
                                    solidBlockCount++
                                }
                            } catch (e) {
                                // Игнорируем ошибки при проверке
                            }
                        }
                    }
                }
            }
            
            if (isFirstChunk) {
                console.log(`📊 Чанк (${x}, ${y}, ${z}): проверено ${totalBlocks} блоков, ${solidBlockCount} твердых`)
            }
            
            // Если чанк полностью пустой, это проблема
            if (totalBlocks > 0 && solidBlockCount === 0 && y === 0) {
                console.warn(`⚠️ ПРЕДУПРЕЖДЕНИЕ: Чанк (${x}, ${y}, ${z}) кажется пустым (все блоки = 0 или воздух)`)
            }

            noa.world.setChunkData(id, data);
            
            if (isFirstChunk) {
                console.log(`✅ setChunkData вызван для чанка (${x}, ${y}, ${z})`)
            }

            if (y === 0) {
  const cx = x, cy = y, cz = z
  postGenQueue.push(() => generateTreesInChunk(noa, ids, cx, cy, cz))
  postGenQueue.push(() => generatePlantsInChunk(noa, ids, cx, cy, cz))
  postGenQueue.push(() => generateAnimalsInChunk(noa, ids, cx, cy, cz))
}

        } catch (err) {
            console.error("💥 КРИТИЧЕСКАЯ ОШИБКА В ГЕНЕРАЦИИ ЧАНКА:", err)
            console.error("📍 Детали чанка:", { id, x, y, z, shape: data?.shape })
            console.error("📦 Доступные блоки:", B ? Object.keys(B) : "Блоки не загружены")
            console.error("🔍 Стек ошибки:", err.stack)
            
            // Пытаемся заполнить чанк хотя бы камнем, чтобы игра не сломалась
            try {
                if (data && data.set && STONE) {
                    const SX = data.shape[0];
                    const SY = data.shape[1];
                    const SZ = data.shape[2];
                    for (let i = 0; i < SX; i++) {
                        for (let j = 0; j < SY; j++) {
                            for (let k = 0; k < SZ; k++) {
                                // Заполняем нижнюю часть чанка камнем как fallback
                                if (y + j < 50) {
                                    data.set(i, j, k, STONE)
                                } else {
                                    data.set(i, j, k, 0)
                                }
                            }
                        }
                    }
                    noa.world.setChunkData(id, data)
                    console.warn("⚠️ Чанк заполнен fallback данными (камень)")
                } else {
                    console.error("❌ Не удалось заполнить чанк fallback данными")
                }
            } catch (fallbackErr) {
                console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось даже заполнить fallback:", fallbackErr)
            }
        }
    });
    
    console.log("✅ Обработчик worldDataNeeded зарегистрирован")
    
    // Проверяем что обработчик действительно зарегистрирован
    // (это сложно проверить напрямую, но можем попробовать)
    if (noa.world && noa.world._listeners) {
        const listeners = noa.world._listeners["worldDataNeeded"]
        if (listeners && listeners.length > 0) {
            console.log(`✅ Подтверждено: ${listeners.length} обработчик(ов) worldDataNeeded зарегистрировано`)
        } else {
            console.warn("⚠️ Предупреждение: обработчики worldDataNeeded не найдены в _listeners")
        }
    }
    
    console.log("✅ Генерация мира зарегистрирована")
}
