

// index.js
import { Engine } from "noa-engine"
import { initMaterialsAndBlocks } from "./materials.js"
import { registerWorldGeneration, getHeightAt } from "./world/worldgen.js"
import { getBiome } from "./biome.js"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { setWaterID } from "./world/water.js"
import { updateWater } from "./world/water.js"
import { getPigs, damagePig, getCows, damageCow, getBears, damageBear } from "./world/animals.js"
import "./ui/inventory.js" // Подключаем инвентарь и крафтинг
import { addItem } from "./ui/inventory.js"
import { getItemDefinition } from "./ui/items.js"
import { initHealthUI } from "./player.js"
import { prewarmWorld } from "./world/prewarm.js"
// =======================
//  GLOBAL DEBUG OFF
// =======================
if (import.meta.env?.MODE !== "development") {
    console.log = () => {}
    console.warn = () => {}
    console.debug = () => {}
}
// =======================
//    СОЗДАЁМ ДВИЖОК
// =======================
const noa = new Engine({
    debug: false,
    showFPS: true,
    chunkSize: 32,

    // ⛔ ВАЖНО
    chunkAddDistance: 0,
    chunkRemoveDistance: 0,

    playerStart: [0, 1000, 0], // вне мира
})



// Отключаем дефолтную привязку E к alt-fire, если она есть
// Привязываем alt-fire только к R
noa.inputs.bind("alt-fire", "KeyR")

// @ts-ignore
window.noa = noa

// =======================
//       СТАРТ ИГРЫ
// =======================
async function start() {
    console.log("🚀 Старт движка")
    updateLoadingText("Initializing engine...")

    // =====================================================
    // 1️⃣ Ждём полной готовности движка
    // =====================================================
    await waitForEngineReady()

    // =====================================================
    // 2️⃣ Загружаем материалы и блоки
    // =====================================================
    console.log("📦 Загрузка блоков")
    updateLoadingText("Loading textures and blocks...")

    const ids = await initMaterialsAndBlocks(noa)

    if (!ids || !ids.blocks || typeof ids.blocks !== "object") {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: блоки не загружены", ids)
        throw new Error("Blocks not loaded")
    }

    console.log("✅ Блоки загружены:", Object.keys(ids.blocks).length)

    // Устанавливаем ID воды
    setWaterID(ids.waterID)

    // =====================================================
    // 3️⃣ Диагностика генерации мира
    // =====================================================
    let worldgenCalled = false

    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {
        worldgenCalled = true
        console.log("🔔 worldDataNeeded:", id, x, y, z)
    })

    // =====================================================
    // 4️⃣ Регистрируем генерацию мира
    // =====================================================
    console.log("🌍 Регистрация генерации мира")
    updateLoadingText("Setting up world generation...")

    registerWorldGeneration(noa, ids)

    console.log("✅ Генерация мира зарегистрирована")


    // =====================================================
    // 7️⃣ ПРОГРЕВ ЧАНКОВ (КРИТИЧНО)
    // =====================================================
    console.log("🔥 Прогрев чанков")
    updateLoadingText("Prewarming world...")
    await prewarmWorld(noa, 3)

    // =====================================================
    // 8️⃣ СПАВН ИГРОКА
    // =====================================================
    console.log("👤 Спавн игрока")
    updateLoadingText("Spawning player...")
    await waitForPlayerSpawn(ids)
const grassBlock =
    ids.blocks["grass_top"] ||
    ids.blocks["grass"] ||
    Object.values(ids.blocks)[0]

// сохранить blocksMap глобально (у тебя код этого ждёт)
window.blocksMap = ids.blocks

setupInteraction(grassBlock, ids.blocks, ids.waterID)
    // =====================================================
    // 9️⃣ ВКЛЮЧАЕМ НОРМАЛЬНУЮ ЗАГРУЗКУ МИРА
    // =====================================================
    noa.world.setAddRemoveDistance(3, 4)




    // =====================================================
    // 1️⃣2️⃣ Инициализация UI
    // =====================================================
    initHealthUI()

    console.log("✅ Мир полностью готов")
    hideLoadingScreen()
}

start()
function prewarmChunks(noa, x, z) {
  const y = 32
  const pts = [
    [x, z],
    [x + 16, z],
    [x - 16, z],
    [x, z + 16],
    [x, z - 16],
  ]

  for (const [px, pz] of pts) {
    try { noa.getBlock(px, y, pz) } catch {}
  }
}

// =======================
//   ПРОВЕРКА ГОТОВНОСТИ ДВИЖКА
// =======================
async function waitForEngineReady(maxAttempts = 30, delayMs = 100) {
    console.log("🔧 Проверка готовности движка...")
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Проверяем основные компоненты движка
        const checks = {
            world: !!noa.world,
            rendering: !!noa.rendering,
            entities: !!noa.entities,
            playerEntity: !!noa.playerEntity,
            scene: noa.rendering ? !!noa.rendering.getScene() : false,
        }
        
        const allReady = Object.values(checks).every(v => v === true)
        
        if (allReady) {
            console.log("✅ Движок готов к работе")
            return
        }
        
        // Логируем что еще не готово
        const notReady = Object.entries(checks)
            .filter(([_, v]) => !v)
            .map(([name]) => name)
        
        if (attempt % 10 === 0) {
            console.log(`⏳ Ожидание готовности движка... (попытка ${attempt + 1}/${maxAttempts})`)
            console.log(`   Не готово: ${notReady.join(", ")}`)
        }
        
        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }
    
    console.warn("⚠️ Движок не полностью готов, но продолжаем...")
}

// =======================
//   ПРОВЕРКА ГЕНЕРАЦИИ МИРА
// =======================

// =======================
//   ОБНОВЛЕНИЕ ТЕКСТА ЗАГРУЗКИ
// =======================
function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text')
    if (loadingText) {
        loadingText.textContent = text
    }
}

// =======================
//   СКРЫТИЕ ЗАГРУЗКИ
// =======================
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
        loadingScreen.classList.add('hidden')
        // Удаляем элемент после анимации
        setTimeout(() => {
            loadingScreen.remove()
        }, 500)
    }
}

// =======================
//   ЭКРАН СМЕРТИ
// =======================
function showDeathScreen() {
    const deathScreen = document.getElementById('death-screen')
    if (deathScreen) {
        deathScreen.classList.remove('hidden')
        deathScreen.classList.add('visible')
    }
}

function hideDeathScreen() {
    const deathScreen = document.getElementById('death-screen')
    if (deathScreen) {
        deathScreen.classList.remove('visible')
        deathScreen.classList.add('hidden')
    }
}

// =======================
//   ПЕРЕЗАГРУЗКА МИРА
// =======================
let isRespawning = false

export async function respawnPlayer() {
    // Защита от множественных вызовов
    if (isRespawning) {
        console.log("⚠️ Перерождение уже запущено, пропускаем...")
        return
    }
    
    isRespawning = true
    console.log("💀 Игрок умер, показываем экран смерти...")
    
    // Показываем экран смерти
    showDeathScreen()
    
    // Ждем 2 секунды, чтобы игрок увидел экран смерти
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Скрываем экран смерти
    hideDeathScreen()
    
    // Перезагружаем страницу для полной перезагрузки мира
    console.log("🔄 Перезагрузка мира...")
    location.reload()
}

// =======================
//   ПРОВЕРКА СПАВНА ИГРОКА
// =======================
async function waitForPlayerSpawn(ids, maxAttempts = 15, delayMs = 150) {
    console.log("👤 Попытка спавна игрока...")
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Пытаемся заспавнить игрока
await spawnPlayerOnSurface(ids)
        
        // Даем движку время на обработку спавна
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Проверяем что игрок действительно заспавнился
        const playerPos = noa.entities.getPosition(noa.playerEntity)
        
        if (playerPos && playerPos.length === 3) {
            // Проверяем что позиция валидная (не NaN, не Infinity)
            const [px, py, pz] = playerPos
            if (
                !isNaN(px) && !isNaN(py) && !isNaN(pz) &&
                isFinite(px) && isFinite(py) && isFinite(pz) &&
                py > -1000 && py < 1000 // Разумные границы по Y
            ) {
                console.log(`✅ Игрок заспавнен на позиции: [${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)}] (попытка ${attempt + 1})`)
                return
            }
        }
        
        // Если спавн не удался, пробуем снова
        if (attempt < maxAttempts - 1) {
            console.log(`⚠️ Спавн не удался, повторная попытка ${attempt + 2}/${maxAttempts}...`)
            updateLoadingText(`Spawning player... (attempt ${attempt + 2}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }
    
    // Если все попытки не удались, пробуем принудительный спавн
    console.warn("⚠️ Все попытки спавна не удались, пробуем принудительный спавн...")
    forceSpawnPlayer(ids)
    
    // Проверяем еще раз после принудительного спавна
    await new Promise(resolve => setTimeout(resolve, 200))
    const playerPos = noa.entities.getPosition(noa.playerEntity)
    if (playerPos && playerPos.length === 3) {
        const [px, py, pz] = playerPos
        if (!isNaN(px) && !isNaN(py) && !isNaN(pz)) {
            console.log(`✅ Игрок заспавнен принудительно: [${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)}]`)
            return
        }
    }
    
    console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось заспавнить игрока!")
    throw new Error("Failed to spawn player after all attempts")
}

// =======================
//   ПРИНУДИТЕЛЬНЫЙ СПАВН
// =======================
function forceSpawnPlayer(ids) {
    // Пробуем спавн в нескольких известных безопасных местах
    const safePositions = [
        [0, 200, 0],      // Стартовая позиция из настроек
        [0, 100, 0],      // Чуть ниже
        [0, 50, 0],       // Еще ниже
        [100, 200, 100], // Другая позиция
        [-100, 200, -100], // Еще одна позиция
    ]
    
    for (const [x, y, z] of safePositions) {
        try {
            noa.entities.setPosition(noa.playerEntity, [x, y, z])
            const pos = noa.entities.getPosition(noa.playerEntity)
            if (pos && pos.length === 3) {
                console.log(`💪 Принудительный спавн на [${x}, ${y}, ${z}]`)
                return
            }
        } catch (e) {
            console.warn(`⚠️ Не удалось заспавнить на [${x}, ${y}, ${z}]:`, e)
        }
    }
}

// =======================
//         СПАВН
// =======================
// =====================================================
//      ИДЕАЛЬНЫЙ СПАВН: ИГРОК НА ПОВЕРХНОСТИ
// =====================================================
async function spawnPlayerOnSurface(ids) {
    // выбираем безопасную область вокруг (0,0)
    const x = Math.floor(Math.random() * 40 - 20) // -20..20
    const z = Math.floor(Math.random() * 40 - 20)

    // получаем высоту
    let h = getHeightAt(x, z)

    if (!Number.isFinite(h)) {
        console.error("❌ getHeightAt вернул NaN:", { x, z, h })
        h = 10 // fallback
    }

    // поднимаем игрока чуть выше поверхности
    const y = h + 3

    console.log(`🌄 Спавним игрока на поверхности: x=${x}, y=${y}, z=${z}`)

    try {
        noa.entities.setPosition(noa.playerEntity, [
            x + 0.5,
            y,
            z + 0.5
        ])
    } catch (e) {
        console.error("❌ Ошибка при спавне игрока:", e)
    }
}

// =======================
//    МЕШ ИГРОКА
// =======================
function setupPlayerMesh() {
    const player = noa.playerEntity
    const dat = noa.entities.getPositionData(player)

    const scene = noa.rendering.getScene()
    const mesh = CreateBox("player-mesh", {}, scene)

    mesh.scaling.set(dat.width, dat.height, dat.width)
    mesh.material = noa.rendering.makeStandardMaterial()

    noa.entities.addComponent(player, noa.entities.names.mesh, {
        mesh,
        offset: [0, dat.height / 2, 0],
    })
}

// =======================
//   ЛОМАНИЕ / СТАВКА
// =======================
function setupInteraction(placeBlockID, blocksMap, waterID) {
    const canvas = noa.container.canvas

    // Создаем обратный маппинг: ID блока -> имя блока
    const blockIdToName = {}
    for (const [name, id] of Object.entries(blocksMap)) {
        blockIdToName[id] = name
    }
    
    // Сохраняем blockIdToName глобально для обновления
    // @ts-ignore
    window.blockIdToName = blockIdToName
    
    // Слушаем события регистрации новых блоков
    window.addEventListener('blockRegistered', (event) => {
        // @ts-ignore
        const detail = event.detail
        const blockName = detail.blockName
        const blockId = detail.blockId
        
        // Обновляем обратный маппинг
        // @ts-ignore
        window.blockIdToName[blockId] = blockName
        console.log(`✅ Обновлен blockIdToName: ${blockId} -> ${blockName}`)
    })
    
    // Функция для определения названия предмета на основе блока и биома
    function getItemNameFromBlock(blockName, x, z) {
        // Дерево/бревна - всегда одинаковые
        if (blockName === 'log' || blockName === 'log_top' || blockName === 'log_side') {
            return 'log'
        }
        
        const biome = getBiome(x, z)
        
        // Блоки с ТРАВОЙ - размещаются как трава
        const isGrassBlock = 
            blockName === 'grass' ||
            blockName === 'grass_top' ||
            blockName === 'grass_side' ||
            blockName === 'tundra_grass' ||
            blockName === 'tundra_grass_top' ||
            blockName === 'tundra_grass_side' ||
            blockName === 'grass_dry' ||
            blockName === 'grass_dry_top' ||
            blockName === 'grass_dry_side' ||
            blockName === 'snow_transition' ||
            blockName === 'snow_transition_side'
        
        if (isGrassBlock) {
            // Блоки с травой попадают в инвентарь как предметы, которые размещаются как трава
            switch (biome) {
                case 'plains':
                case 'forest':
                    return 'grass_block_plains' // Новый предмет для блоков с травой равнин
                case 'tundra':
                case 'snow':
                case 'ice':
                    return 'grass_block_tundra' // Новый предмет для блоков с травой тундры
                case 'desert':
                case 'red_desert':
                case 'dry':
                    return 'grass_block_desert' // Новый предмет для блоков с травой пустыни
                case 'mountain':
                    return 'grass_block_mountain' // Новый предмет для блоков с травой гор
                default:
                    return 'grass_block_plains'
            }
        }
        
        // Блоки ЗЕМЛИ (dirt) - размещаются как земля
        if (blockName === 'dirt') {
            switch (biome) {
                case 'plains':
                case 'forest':
                    return 'dirt_plains'
                case 'tundra':
                case 'snow':
                case 'ice':
                    return 'dirt_tundra'
                case 'desert':
                case 'red_desert':
                case 'dry':
                    return 'dirt_desert'
                case 'mountain':
                    return 'dirt_mountain'
                default:
                    return 'dirt_plains'
            }
        }
        
        // Для остальных блоков возвращаем исходное имя
        return blockName
    }

    // Переменная для отслеживания времени последнего ломания блока
    let lastBlockBreakTime = 0
    
    noa.inputs.down.on("fire", () => {
        // Сначала проверяем блоки (как обычно)
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.position
            // Получаем ID блока перед его разрушением
            const blockId = noa.getBlock(p[0], p[1], p[2])
            
            // Проверяем, есть ли кирка в руках
            // @ts-ignore
            const selectedItem = window.getSelectedItem ? window.getSelectedItem() : null
            let breakSpeed = 1.0 // Базовая скорость ломания
            
            if (selectedItem && selectedItem.name) {
                const itemDef = getItemDefinition(selectedItem.name)
                // @ts-ignore
                if (itemDef.toolType === 'pickaxe' && itemDef.efficiency) {
                    // @ts-ignore
                    breakSpeed = itemDef.efficiency
                }
            }
            
            // Проверяем кулдаун (чтобы не ломать слишком быстро)
            const currentTime = Date.now()
            const requiredCooldown = Math.max(50, 200 / breakSpeed) // Минимум 50мс, максимум 200мс
            
            if (currentTime - lastBlockBreakTime < requiredCooldown) {
                return // Слишком рано, пропускаем
            }
            
            lastBlockBreakTime = currentTime
            
            // Разрушаем блок
            noa.setBlock(0, p[0], p[1], p[2])
            
            // Если блок не воздух (0) и не вода, добавляем его в инвентарь
            if (blockId !== 0 && blockId !== waterID) {
                const blockName = blockIdToName[blockId]
                if (blockName) {
                    // Преобразуем имя блока в имя предмета с учетом биома
                    const itemName = getItemNameFromBlock(blockName, p[0], p[2])
                    addItem(itemName, 1)
                    console.log(`📦 Получен блок: ${blockName} -> ${itemName} (биом: ${getBiome(p[0], p[2])})`)
                } else {
                    // Если имя не найдено, пробуем использовать ID как имя
                    console.warn(`⚠ Неизвестный блок ID: ${blockId}`)
                }
            }
            return
        }
        
        // Если нет targetedBlock, проверяем свиней в направлении взгляда
        const playerPos = noa.entities.getPosition(noa.playerEntity)
        if (!playerPos) return
        
        // Получаем направление взгляда игрока из камеры
        const camera = noa.camera
        const yaw = camera.heading
        const pitch = camera.pitch
        
        // Вычисляем направление взгляда
        const dirX = Math.cos(pitch) * Math.sin(yaw)
        const dirY = -Math.sin(pitch)
        const dirZ = Math.cos(pitch) * Math.cos(yaw)
        
        // Ищем ближайшее животное в направлении взгляда (до 5 блоков)
        const maxDistance = 5.0
        let closestPig = null
        let closestCow = null
        let closestBear = null
        let closestDistance = maxDistance
        
        // Проверяем свиней
        const pigs = getPigs()
        for (const pig of pigs) {
            const pigPos = noa.entities.getPosition(pig.id)
            if (!pigPos) continue
            
            const dx = pigPos[0] - playerPos[0]
            const dy = pigPos[1] - playerPos[1]
            const dz = pigPos[2] - playerPos[2]
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            
            if (distance > maxDistance) continue
            
            const normDx = dx / distance
            const normDy = dy / distance
            const normDz = dz / distance
            
            const dot = dirX * normDx + dirY * normDy + dirZ * normDz
            
            if (dot > 0.7 && distance < closestDistance) {
                closestDistance = distance
                closestPig = pig
            }
        }
        
        // Проверяем коров
        closestDistance = maxDistance
        const cows = getCows()
        for (const cow of cows) {
            const cowPos = noa.entities.getPosition(cow.id)
            if (!cowPos) continue
            
            const dx = cowPos[0] - playerPos[0]
            const dy = cowPos[1] - playerPos[1]
            const dz = cowPos[2] - playerPos[2]
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            
            if (distance > maxDistance) continue
            
            const normDx = dx / distance
            const normDy = dy / distance
            const normDz = dz / distance
            
            const dot = dirX * normDx + dirY * normDy + dirZ * normDz
            
            if (dot > 0.7 && distance < closestDistance) {
                closestDistance = distance
                closestCow = cow
            }
        }
        
        // Проверяем медведей
        closestDistance = maxDistance
        const bears = getBears()
        for (const bear of bears) {
            const bearPos = noa.entities.getPosition(bear.id)
            if (!bearPos) continue
            
            const dx = bearPos[0] - playerPos[0]
            const dy = bearPos[1] - playerPos[1]
            const dz = bearPos[2] - playerPos[2]
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            
            if (distance > maxDistance) continue
            
            const normDx = dx / distance
            const normDy = dy / distance
            const normDz = dz / distance
            
            const dot = dirX * normDx + dirY * normDy + dirZ * normDz
            
            if (dot > 0.7 && distance < closestDistance) {
                closestDistance = distance
                closestBear = bear
            }
        }
        
        // Если нашли животное, наносим урон
        // @ts-ignore
        const selectedItem = window.getSelectedItem ? window.getSelectedItem() : null
        let damageMultiplier = 1.0
        
        if (selectedItem && selectedItem.name) {
            const itemDef = getItemDefinition(selectedItem.name)
            // @ts-ignore
            if (itemDef.toolType === 'sword' && itemDef.damage) {
                // @ts-ignore
                damageMultiplier = itemDef.damage
            }
        }
        
        // Атакуем свинью
        if (closestPig) {
            for (let i = 0; i < Math.floor(damageMultiplier); i++) {
                damagePig(noa, closestPig)
            }
            if (damageMultiplier % 1 > 0 && Math.random() < (damageMultiplier % 1)) {
                damagePig(noa, closestPig)
            }
        }
        
        // Атакуем корову
        if (closestCow) {
            for (let i = 0; i < Math.floor(damageMultiplier); i++) {
                damageCow(noa, closestCow)
            }
            if (damageMultiplier % 1 > 0 && Math.random() < (damageMultiplier % 1)) {
                damageCow(noa, closestCow)
            }
        }
        
        // Атакуем медведя
        if (closestBear) {
            for (let i = 0; i < Math.floor(damageMultiplier); i++) {
                damageBear(noa, closestBear)
            }
            if (damageMultiplier % 1 > 0 && Math.random() < (damageMultiplier % 1)) {
                damageBear(noa, closestBear)
            }
        }
    })

    // Маппинг предметов на блоки для размещения
    const itemToBlockMap = {
        // Блоки с ТРАВОЙ - размещаются как трава
        'grass_block_plains': blocksMap['grass'] || null,
        'grass_block_tundra': blocksMap['tundra_grass'] || null,
        'grass_block_desert': blocksMap['grass_dry'] || null,
        'grass_block_mountain': blocksMap['grass'] || null,
        
        // Блоки биомов (из крафта)
        'biome_block_plains': blocksMap['grass'] || null,
        'biome_block_tundra': blocksMap['tundra_grass'] || null,
        'biome_block_desert': blocksMap['grass_dry'] || null,
        'biome_block_mountain': blocksMap['grass'] || null,
        'biome_block_hybrid': blocksMap['grass'] || null,
        
        // Блоки ЗЕМЛИ - размещаются как земля
        'dirt_plains': blocksMap['dirt'] || null,
        'dirt_tundra': blocksMap['dirt'] || null,
        'dirt_desert': blocksMap['dirt'] || null,
        'dirt_mountain': blocksMap['dirt'] || null,
        'dirt': blocksMap['dirt'] || null,
        
        // Остальные блоки
        'stone': blocksMap['stone'] || null,
        'sand': blocksMap['sand'] || null,
        'log': blocksMap['log'] || null,
        'planks': blocksMap['log'] || null, // Планки размещаем как бревна (или можно создать отдельный блок)
        'stick': null, // Палки нельзя размещать
        'meat': null, // Мясо нельзя размещать
        'gravel': blocksMap['gravel'] || null,
        'andesite': blocksMap['andesite'] || null,
        'granite': blocksMap['granite'] || null,
        
        // Смешанные блоки (из крафтинга)
        'wood': blocksMap['wood'] || null,
        'brick': blocksMap['brick'] || null,
        'coal': blocksMap['coal'] || null,
        'glass': blocksMap['glass'] || null,
        'dirty_planks': blocksMap['dirty_planks'] || null,
        'stone_planks': blocksMap['stone_planks'] || null,
        'sandy_planks': blocksMap['sandy_planks'] || null,
        'enhanced_log': blocksMap['enhanced_log'] || blocksMap['log'] || null,
        'mixed_stone': blocksMap['mixed_stone'] || blocksMap['stone'] || null,
        'mixed_dirt': blocksMap['mixed_dirt'] || blocksMap['dirt'] || null,
        'improved_log': blocksMap['improved_log'] || blocksMap['log'] || null,
        'refined_log': blocksMap['refined_log'] || blocksMap['log'] || null,
        'enhanced_stone': blocksMap['enhanced_stone'] || blocksMap['stone'] || null,
        'enhanced_dirt': blocksMap['enhanced_dirt'] || blocksMap['dirt'] || null,
    }
    
    // Обработчик события регистрации нового блока - обновляем маппинг
    window.addEventListener('blockRegistered', (event) => {
        // @ts-ignore
        const { blockName, blockId } = event.detail
        console.log(`🔄 Обновление маппинга после регистрации блока: ${blockName} -> ${blockId}`)
        
        // Обновляем itemToBlockMap для нового блока (если его там еще нет)
        if (itemToBlockMap[blockName] === undefined || itemToBlockMap[blockName] === null) {
            itemToBlockMap[blockName] = blockId
            console.log(`✅ Маппинг обновлен: ${blockName} -> ${blockId}`)
        }
        
        // Также обновляем глобальный blocksMap, если его еще нет
        // @ts-ignore
        if (window.blocksMap && !window.blocksMap[blockName]) {
            // @ts-ignore
            window.blocksMap[blockName] = blockId
            console.log(`✅ Глобальный blocksMap обновлен: ${blockName} -> ${blockId}`)
        }
    })
    
    // Функция для получения имени блока из имени предмета
    function getBlockNameFromItemName(itemName) {
        console.log(`🔍 Преобразование имени предмета в блок: ${itemName}`)
        
        // Теперь предметы не имеют префиксов syn_/org_/min_, но оставляем проверку для обратной совместимости
        if (itemName.startsWith('org_') || itemName.startsWith('min_') || itemName.startsWith('syn_')) {
            // Старый формат - извлекаем базовое имя
            const parts = itemName.split('_')
            if (parts.length >= 3) {
                const baseParts = parts.slice(1, -1)
                const baseName = baseParts.join('_')
                return getBlockNameFromItemName(baseName) // Рекурсивно обрабатываем
            }
        }
        
        // Проверяем известные маппинги для смешанных блоков
        const mixedBlockMapping = {
            'wood': 'wood',
            'brick': 'brick',
            'coal': 'coal',
            'glass': 'glass',
            'dirty_planks': 'dirty_planks',
            'stone_planks': 'stone_planks',
            'sandy_planks': 'sandy_planks',
            'enhanced_log': 'log', // enhanced_log -> log (но с другой текстурой)
            'mixed_stone': 'stone',
            'mixed_dirt': 'dirt',
            'improved_log': 'log',
            'refined_log': 'log',
            'enhanced_stone': 'stone',
            'enhanced_dirt': 'dirt'
        }
        
        // Прямая проверка маппинга
        if (mixedBlockMapping[itemName]) {
            console.log(`✅ Маппинг найден: ${itemName} -> ${mixedBlockMapping[itemName]}`)
            return mixedBlockMapping[itemName]
        }
        
        // Если имя предмета совпадает с именем блока, возвращаем как есть
        // @ts-ignore
        const globalBlocksMap = window.blocksMap
        if (globalBlocksMap && globalBlocksMap[itemName]) {
            console.log(`✅ Блок найден по имени предмета: ${itemName}`)
            return itemName
        }
        
        // Если не нашли, возвращаем как есть (может быть новый блок)
        console.log(`ℹ️ Блок для предмета ${itemName} не найден в маппинге, возвращаем как есть`)
        return itemName
    }
    
    // Функция для создания блока на лету для предмета, если его нет
    async function ensureBlockForItem(itemName) {
        const blockName = getBlockNameFromItemName(itemName)
        
        // Проверяем, есть ли уже блок
        // @ts-ignore
        const globalBlocksMap = window.blocksMap
        if (globalBlocksMap && globalBlocksMap[blockName]) {
            return globalBlocksMap[blockName]
        }
        
        // Если блок не найден, но это известный базовый блок, возвращаем null
        // (не создаем блоки для неизвестных комбинаций автоматически)
        console.log(`⚠ Блок ${blockName} не найден для предмета ${itemName}`)
        return null
    }
    
    // Функция для получения блока по имени предмета
    function getBlockForItem(itemName) {
        // Сначала проверяем статический маппинг
        if (itemToBlockMap[itemName] !== undefined) {
            return itemToBlockMap[itemName]
        }
        
        // Получаем имя блока из имени предмета
        const blockName = getBlockNameFromItemName(itemName)
        console.log(`🔍 Преобразование предмета в блок: ${itemName} -> ${blockName}`)
        
        // Пытаемся найти блок с таким именем в исходном blocksMap
        if (blocksMap[blockName]) {
            console.log(`✅ Найден блок в blocksMap: ${blockName} -> ID ${blocksMap[blockName]}`)
            return blocksMap[blockName]
        }
        
        // Проверяем глобальный blocksMap (для динамически созданных блоков)
        // @ts-ignore
        const globalBlocksMap = window.blocksMap
        if (globalBlocksMap && globalBlocksMap[blockName]) {
            console.log(`✅ Найден динамический блок для размещения: ${blockName} -> ID ${globalBlocksMap[blockName]}`)
            return globalBlocksMap[blockName]
        }
        
        // Если ничего не найдено, возвращаем null
        console.log(`⚠ Блок не найден для предмета: ${itemName} (искали блок: ${blockName})`)
        // @ts-ignore
        console.log('Доступные блоки:', Object.keys(globalBlocksMap || blocksMap))
        return null
    }
    
    // E обрабатывается в crafting.js для открытия окна крафта
    // alt-fire привязан только к R, поэтому E не будет использоваться для размещения блоков
    noa.inputs.down.on("alt-fire", async () => {
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.adjacent
            
            // Получаем выбранный предмет из инвентаря
            // @ts-ignore
            const selectedItem = window.getSelectedItem ? window.getSelectedItem() : null
            
            // Размещаем ТОЛЬКО если есть выбранный предмет
            if (!selectedItem || !selectedItem.name) {
                return // Не размещаем ничего, если нет выбранного предмета
            }
            
            // Получаем блок для этого предмета
            let blockToPlace = getBlockForItem(selectedItem.name)
            
            // Если блок не найден, пытаемся создать его на лету
            if (!blockToPlace) {
                blockToPlace = await ensureBlockForItem(selectedItem.name)
            }
            
            if (!blockToPlace) {
                console.log(`⚠ Не удалось найти блок для предмета: ${selectedItem.name}`)
                // @ts-ignore
                const globalBlocksMap = window.blocksMap
                if (globalBlocksMap) {
                    console.log('Доступные блоки в blocksMap:', Object.keys(globalBlocksMap))
                }
                return // Не размещаем, если блок не найден
            }
            
            console.log(`🔨 Размещаем блок: ${selectedItem.name} -> ID ${blockToPlace} в позиции (${p[0]}, ${p[1]}, ${p[2]})`)
            
            // Размещаем блок
            noa.setBlock(blockToPlace, p[0], p[1], p[2])
            
            // Уменьшаем количество предмета в инвентаре
            // @ts-ignore
            if (window.removeItem && window.getSelectedSlot) {
                // @ts-ignore
                const slotIndex = window.getSelectedSlot()
                // @ts-ignore
                window.removeItem(slotIndex, 1)
            }
        }
    })

    // Используем R для ставки блоков, так как E используется для крафта
    // Привязываем alt-fire только к R
    noa.inputs.bind("alt-fire", "KeyR")

    canvas.addEventListener("click", () => {
        canvas.requestPointerLock()
    })
}


let lastBiome = null
let lastPlayerPos = null

noa.on("tick", () => {

    // обновление воды
    updateWater()

    // вывод координат игрока при движении
    const p = noa.entities.getPosition(noa.playerEntity)
    
    // Проверяем, изменилась ли позиция (с небольшой погрешностью)
    if (!lastPlayerPos || 
        Math.abs(p[0] - lastPlayerPos[0]) > 0.1 || 
        Math.abs(p[1] - lastPlayerPos[1]) > 0.1 || 
        Math.abs(p[2] - lastPlayerPos[2]) > 0.1) {
        //console.log(`📍 Игрок: x=${p[0].toFixed(2)}, y=${p[1].toFixed(2)}, z=${p[2].toFixed(2)}`)
        lastPlayerPos = [...p]
    }

    // вывод биома (не ломаем твою логику)
    const bx = Math.floor(p[0])
    const bz = Math.floor(p[2])

    const biome = getBiome(bx, bz)
    if (biome !== lastBiome) {
        console.log("➡ Биом изменился:", biome)
        lastBiome = biome
    }
})


