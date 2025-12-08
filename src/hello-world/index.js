// index.js
import { Engine } from "noa-engine"
import { initMaterialsAndBlocks } from "./materials.js"
import { registerWorldGeneration, getHeightAt } from "./world/worldgen.js"
import { getBiome } from "./biome.js"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { setWaterID } from "./world/water.js"
import { updateWater } from "./world/water.js"
import { getPigs, damagePig, getCows, damageCow } from "./world/animals.js"
import "./ui/inventory.js" // Подключаем инвентарь и крафтинг
import { addItem } from "./ui/inventory.js"
import { getItemDefinition } from "./ui/items.js"

// =======================
//    СОЗДАЁМ ДВИЖОК
// =======================
const noa = new Engine({
    debug: true,
    showFPS: true,
    chunkSize: 32,
    chunkAddDistance: 2.5,
    chunkRemoveDistance: 3.5,
    playerStart: [0, 200, 0],
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
    console.log("🚀 Старт: проверка готовности движка...")
    updateLoadingText("Initializing engine...")
    
    // Ждем полной инициализации движка
    await waitForEngineReady()
    
    console.log("🚀 Старт: загрузка текстур и блоков")
    updateLoadingText("Loading textures and blocks...")

    const ids = await initMaterialsAndBlocks(noa)
    
    updateLoadingText("Setting up world generation...")

    // установить ID воды
    setWaterID(ids.waterID)

    registerWorldGeneration(noa, ids)
    
    // Даем движку время на регистрацию обработчика генерации
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Проверяем что движок готов
    if (!noa.world) {
        console.error("❌ Ошибка: движок мира не инициализирован")
        throw new Error("World engine not initialized")
    }
    
    // Проверяем что обработчик генерации зарегистрирован
    console.log("✅ Движок готов, обработчик генерации зарегистрирован")
    
    // Принудительно запрашиваем генерацию тестового чанка для проверки
    // Это помогает убедиться что обработчик работает
    try {
        const testChunkX = 0
        const testChunkZ = 0
        const testY = 0
        // Пробуем получить блок в центре чанка (0,0,0)
        noa.getBlock(testChunkX + 16, testY + 10, testChunkZ + 16)
        console.log("✅ Тестовый запрос чанка выполнен")
    } catch (e) {
        console.log("ℹ️ Тестовый запрос чанка (это нормально при первой загрузке)")
    }

    setupPlayerMesh()

    // выбираем пригодный блок для E
    const grassBlock =
        ids.blocks["grass_top"] ||
        ids.blocks["grass"] ||
        Object.values(ids.blocks)[0]

    // Сохраняем blocksMap глобально для динамического доступа
    // @ts-ignore
    window.blocksMap = ids.blocks
    
    setupInteraction(grassBlock, ids.blocks, ids.waterID)

    // ======= СПАВН У ВОДЫ =======
    updateLoadingText("Spawning player...")
    await waitForPlayerSpawn(ids)
    
    // Даем движку время на обработку спавна и начало загрузки чанков
    updateLoadingText("Preparing world...")
    await new Promise(resolve => setTimeout(resolve, 300))

    // Проверяем что мир сгенерировался и ждем если нужно
    await waitForWorldGeneration()

    // Скрываем окно загрузки после полной инициализации
    hideLoadingScreen()
}

start()

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
async function waitForWorldGeneration(maxAttempts = 80, delayMs = 120) {
    console.log("🌍 Проверка генерации мира...")
    updateLoadingText("Verifying world generation...")
    
    // Даем движку начальное время на генерацию перед первой проверкой
    await new Promise(resolve => setTimeout(resolve, 300))
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const playerPos = noa.entities.getPosition(noa.playerEntity)
        if (!playerPos) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
        }

        const x = Math.floor(playerPos[0])
        const y = Math.floor(playerPos[1])
        const z = Math.floor(playerPos[2])

        // Простая проверка: запрашиваем блоки под ногами игрока
        // Это заставит движок загрузить чанк если он еще не загружен
        const checkPositions = [
            [x, y - 1, z],      // под ногами
            [x, y - 2, z],      // глубже
            [x, y - 3, z],      // еще глубже
            [x, y - 4, z],      // еще глубже
            [x, y - 5, z],      // еще глубже
        ]

        let hasSolidBlocks = false
        let validBlockCount = 0

        // Запрашиваем и проверяем блоки одновременно
        for (const [bx, by, bz] of checkPositions) {
            try {
                const block = noa.getBlock(bx, by, bz)
                if (block !== undefined && block !== null) {
                    validBlockCount++
                    if (block !== 0) {
                        hasSolidBlocks = true
                        // Если нашли хотя бы один твердый блок - сразу выходим
                        break
                    }
                }
            } catch (e) {
                // Игнорируем ошибки - это нормально если чанк еще не загружен
            }
        }

        // Если нашли хотя бы один твердый блок - мир готов
        if (hasSolidBlocks) {
            console.log(`✅ Мир сгенерирован (попытка ${attempt + 1}, проверено блоков: ${validBlockCount})`)
            updateLoadingText("World ready!")
            await new Promise(resolve => setTimeout(resolve, 100))
            return
        }

        // Обновляем текст загрузки реже
        if (attempt % 20 === 0 && attempt > 0) {
            updateLoadingText("Verifying world generation...")
        }

        // Даем движку время обработать запросы
        // Увеличиваем задержку для первых попыток, чтобы дать время на генерацию
        const currentDelay = attempt < 10 ? delayMs * 1.5 : delayMs
        await new Promise(resolve => setTimeout(resolve, currentDelay))
    }

    // Если не удалось подтвердить, пробуем еще раз с более длительным ожиданием
    console.warn("⚠️ Первая проверка не удалась, пробуем еще раз с увеличенным временем ожидания...")
    updateLoadingText("Loading world...")
    
    const playerPos = noa.entities.getPosition(noa.playerEntity)
    if (playerPos) {
        const x = Math.floor(playerPos[0])
        const y = Math.floor(playerPos[1])
        const z = Math.floor(playerPos[2])
        
        // Даем больше времени на генерацию перед проверкой
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Проверяем блоки под ногами несколько раз с увеличенными задержками
        for (let i = 0; i < 15; i++) {
            // Запрашиваем блоки, чтобы заставить движок их сгенерировать
            try {
                noa.getBlock(x, y - 1, z)
                noa.getBlock(x, y - 2, z)
                noa.getBlock(x, y - 3, z)
                noa.getBlock(x, y - 4, z)
                noa.getBlock(x, y - 5, z)
            } catch (e) {
                // Игнорируем ошибки - это нормально
            }
            
            // Даем время на обработку
            await new Promise(resolve => setTimeout(resolve, 150))
            
            // Проверяем результат
            try {
                const block = noa.getBlock(x, y - 1, z)
                if (block !== undefined && block !== null && block !== 0) {
                    console.log(`✅ Мир сгенерирован после повторной проверки (попытка ${i + 1})`)
                    updateLoadingText("World ready!")
                    await new Promise(resolve => setTimeout(resolve, 100))
                    return
                }
            } catch (e) {
                // Продолжаем попытки
            }
        }
    }
    
    console.warn("⚠️ Не удалось подтвердить генерацию после всех попыток")
    console.warn("⚠️ Продолжаем загрузку - мир будет генерироваться по мере необходимости во время игры")
    console.warn("⚠️ Это нормально для медленных систем, игра должна работать корректно")
}

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
//   ПРОВЕРКА СПАВНА ИГРОКА
// =======================
async function waitForPlayerSpawn(ids, maxAttempts = 15, delayMs = 150) {
    console.log("👤 Попытка спавна игрока...")
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Пытаемся заспавнить игрока
        await spawnPlayerNearWater(ids)
        
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
async function spawnPlayerNearWater(ids) {
    const WATER = ids.waterID
    console.log("💧 WATER ID =", WATER)

    // случайный регион
    const baseX = Math.floor(Math.random() * 4000 - 2000)
    const baseZ = Math.floor(Math.random() * 4000 - 2000)

    let best = null
    let bestDist = Infinity
    const R = 200

    for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
            const x = baseX + dx
            const z = baseZ + dz

            try {
                const h = getHeightAt(x, z)

                // проверяем воду на высоте h+1
                const block = noa.getBlock(x, h + 1, z)

                if (block === WATER) {
                    const d = dx * dx + dz * dz
                    if (d < bestDist) {
                        bestDist = d
                        best = { x, y: h + 4, z }
                    }
                }
            } catch (e) {
                // Игнорируем ошибки при проверке блоков
                continue
            }
        }
    }

    if (best) {
        console.log("💧 Найдена вода, спавн:", best)
        try {
            noa.entities.setPosition(noa.playerEntity, [
                best.x + 0.5,
                best.y,
                best.z + 0.5
            ])
        } catch (e) {
            console.warn("⚠️ Ошибка при установке позиции игрока:", e)
        }
    } else {
        console.log("❌ ВОДА НЕ НАЙДЕНА, обычный спавн")
        try {
            const y = getHeightAt(baseX, baseZ) + 3
            noa.entities.setPosition(noa.playerEntity, [
                baseX + 0.5,
                y,
                baseZ + 0.5
            ])
        } catch (e) {
            console.warn("⚠️ Ошибка при установке позиции игрока:", e)
        }
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
        'dark_log': blocksMap['dark_log'] || null,
        'stone_log': blocksMap['stone_log'] || null,
        'mud_stone': blocksMap['mud_stone'] || null,
        'sandy_log': blocksMap['sandy_log'] || null,
    }
    
    // Функция для получения имени блока из имени предмета
    function getBlockNameFromItemName(itemName) {
        console.log(`🔍 Преобразование имени предмета в блок: ${itemName}`)
        
        // Если предмет начинается с org_, min_, syn_, пытаемся извлечь базовое имя
        if (itemName.startsWith('org_') || itemName.startsWith('min_') || itemName.startsWith('syn_')) {
            const parts = itemName.split('_')
            if (parts.length >= 3) {
                // Извлекаем базовое имя (пропускаем префикс типа и суффикс редкости)
                const baseParts = parts.slice(1, -1) // Убираем первый (тип) и последний (редкость)
                const baseName = baseParts.join('_')
                
                console.log(`🔍 Извлечено базовое имя: ${baseName} из ${itemName}`)
                
                // Проверяем известные маппинги для смешанных блоков
                const mixedBlockMapping = {
                    'log_dirt': 'dark_log',
                    'dirt_log': 'dark_log',
                    'log_stone': 'stone_log',
                    'stone_log': 'stone_log',
                    'dirt_stone': 'mud_stone',
                    'stone_dirt': 'mud_stone',
                    'log_sand': 'sandy_log',
                    'sand_log': 'sandy_log',
                    // Дополнительные варианты для разных порядков
                    'dirt_plains': 'dirt',
                    'plains_dirt': 'dirt',
                    'dirt_tundra': 'dirt',
                    'tundra_dirt': 'dirt',
                    'dirt_desert': 'dirt',
                    'desert_dirt': 'dirt',
                    'dirt_mountain': 'dirt',
                    'mountain_dirt': 'dirt'
                }
                
                // Проверяем маппинг (с учетом разных порядков - сортируем части)
                const sortedBaseName = baseName.split('_').sort().join('_')
                console.log(`🔍 Отсортированное базовое имя: ${sortedBaseName}`)
                
                for (const [key, value] of Object.entries(mixedBlockMapping)) {
                    const sortedKey = key.split('_').sort().join('_')
                    if (sortedBaseName === sortedKey) {
                        console.log(`✅ Маппинг найден: ${baseName} (${sortedBaseName}) -> ${value}`)
                        return value
                    }
                }
                
                // Прямая проверка
                if (mixedBlockMapping[baseName]) {
                    console.log(`✅ Маппинг найден (прямой): ${baseName} -> ${mixedBlockMapping[baseName]}`)
                    return mixedBlockMapping[baseName]
                }
                
                // Если базовое имя содержит известные блоки (dirt, stone, log, sand и т.д.)
                // Проверяем, есть ли такой блок в blocksMap
                // @ts-ignore
                const globalBlocksMap = window.blocksMap
                if (globalBlocksMap && globalBlocksMap[baseName]) {
                    console.log(`✅ Блок найден по базовому имени: ${baseName}`)
                    return baseName
                }
                
                // Если базовое имя содержит подстроку известного блока, используем его
                // Например: dirt_plains -> dirt, stone_mountain -> stone
                const knownBlocks = ['dirt', 'stone', 'log', 'sand', 'gravel', 'andesite', 'granite', 'grass']
                for (const knownBlock of knownBlocks) {
                    if (baseName.includes(knownBlock) && globalBlocksMap && globalBlocksMap[knownBlock]) {
                        console.log(`✅ Маппинг ${baseName} -> ${knownBlock} (по подстроке)`)
                        return knownBlock
                    }
                }
                
                // Если не нашли в маппинге, возвращаем базовое имя
                console.log(`⚠ Маппинг не найден для ${baseName}, возвращаем базовое имя`)
                return baseName
            }
        }
        
        // Если не сгенерированный предмет, возвращаем как есть
        console.log(`ℹ️ Предмет ${itemName} не сгенерированный, возвращаем как есть`)
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


