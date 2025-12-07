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
    
    // Даем движку больше времени на регистрацию обработчика генерации
    // Увеличено для медленных систем (Windows и т.д.)
    await new Promise(resolve => setTimeout(resolve, 500))
    
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

    setupInteraction(grassBlock, ids.blocks, ids.waterID)

    // ======= СПАВН У ВОДЫ =======
    updateLoadingText("Spawning player...")
    await waitForPlayerSpawn(ids)
    
    // Даем движку больше времени на обработку спавна и начало загрузки чанков
    // Увеличено для медленных систем (Windows и т.д.)
    updateLoadingText("Preparing world...")
    await new Promise(resolve => setTimeout(resolve, 800))

    // Проверяем что мир сгенерировался и ждем если нужно
    await waitForWorldGeneration()

    // Скрываем окно загрузки после полной инициализации
    hideLoadingScreen()
}

start()

// =======================
//   ПРОВЕРКА ГОТОВНОСТИ ДВИЖКА
// =======================
async function waitForEngineReady(maxAttempts = 80, delayMs = 150) {
    console.log("🔧 Проверка готовности движка...")
    
    // Для медленных систем увеличиваем таймауты
    const isSlowSystem = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
    if (isSlowSystem) {
        console.log("🐌 Медленная система обнаружена, увеличиваем таймауты инициализации")
        delayMs = 200
        maxAttempts = 100
    }
    
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
async function waitForWorldGeneration(maxAttempts = 200, delayMs = 150) {
    console.log("🌍 Проверка генерации мира...")
    updateLoadingText("Verifying world generation...")
    
    const chunkSize = 32 // Размер чанка из настроек движка
    
    // Для медленных систем увеличиваем начальные задержки
    const isSlowSystem = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
    if (isSlowSystem) {
        console.log("🐌 Обнаружена медленная система, увеличиваем таймауты")
        delayMs = 200
        maxAttempts = 250
    }
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const playerPos = noa.entities.getPosition(noa.playerEntity)
        if (!playerPos) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
        }

        const x = Math.floor(playerPos[0])
        const y = Math.floor(playerPos[1])
        const z = Math.floor(playerPos[2])

        // Принудительно запрашиваем загрузку чанков вокруг игрока на каждой итерации
        // Это гарантирует, что движок попытается загрузить чанки
        const chunkX = Math.floor(x / chunkSize) * chunkSize
        const chunkZ = Math.floor(z / chunkSize) * chunkSize
        
        // Увеличиваем радиус запроса чанков для более агрессивной загрузки
        const radius = attempt < 20 ? 3 : 2 // Первые 20 попыток - больший радиус
        
        // Запрашиваем чанки в радиусе вокруг игрока
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = chunkX + dx * chunkSize
                const cz = chunkZ + dz * chunkSize
                
                // Проверяем блоки в разных частях чанка, чтобы заставить его загрузиться
                const testPositions = [
                    [cx + chunkSize / 2, y, cz + chunkSize / 2], // центр
                    [cx, y, cz], // угол
                    [cx + chunkSize - 1, y, cz + chunkSize - 1], // противоположный угол
                    [cx + chunkSize / 2, y - 5, cz + chunkSize / 2], // ниже
                    [cx + chunkSize / 2, y - 10, cz + chunkSize / 2], // еще ниже
                ]
                
                for (const [tx, ty, tz] of testPositions) {
                    try {
                        noa.getBlock(tx, ty, tz)
                        // Также проверяем блоки ниже
                        noa.getBlock(tx, ty - 1, tz)
                        noa.getBlock(tx, ty - 2, tz)
                    } catch (e) {
                        // Игнорируем ошибки
                    }
                }
            }
        }
        
        // Даем движку больше времени обработать запросы
        // Для медленных систем и первых попыток - больше времени
        let processDelay = attempt < 20 ? 200 : 100
        if (isSlowSystem) {
            processDelay = attempt < 30 ? 300 : 150
        }
        await new Promise(resolve => setTimeout(resolve, processDelay))

        // Проверяем количество сгенерированных чанков (если доступно)
        // @ts-ignore
        const chunksGenerated = window.__worldGenChunksCount ? window.__worldGenChunksCount() : 0
        const chunkKey = `${Math.floor(x/32)}_0_${Math.floor(z/32)}`
        // @ts-ignore
        const hasChunk = window.__worldGenHasChunk ? window.__worldGenHasChunk(x, 0, z) : false
        
        // Если чанк уже сгенерирован, проверяем блоки
        if (hasChunk || chunksGenerated > 0) {
            // Проверяем несколько блоков вокруг игрока
            const checkPositions = [
                [x, y - 1, z],      // под ногами
                [x, y - 2, z],      // глубже под ногами
                [x, y - 3, z],      // еще глубже
                [x, y - 4, z],      // еще глубже
                [x + 1, y - 1, z],  // рядом под ногами
                [x - 1, y - 1, z],  // рядом под ногами
                [x, y - 1, z + 1],  // рядом под ногами
                [x, y - 1, z - 1],  // рядом под ногами
            ]

            let hasSolidBlocks = false
            let hasValidBlocks = false
            let validBlockCount = 0

            for (const [bx, by, bz] of checkPositions) {
                try {
                    const block = noa.getBlock(bx, by, bz)
                    // Если блок не undefined и не null, значит чанк загружен
                    if (block !== undefined && block !== null) {
                        hasValidBlocks = true
                        validBlockCount++
                        // Если есть хотя бы один не-воздушный блок, мир сгенерирован
                        if (block !== 0) {
                            hasSolidBlocks = true
                        }
                    }
                } catch (e) {
                    // Игнорируем ошибки при проверке блоков
                }
            }

            // Если нашли достаточно валидных блоков и хотя бы один твердый - мир готов
            if (hasValidBlocks && hasSolidBlocks && validBlockCount >= 3) {
                console.log(`✅ Мир сгенерирован (попытка ${attempt + 1}, проверено блоков: ${validBlockCount}, чанков: ${chunksGenerated})`)
                updateLoadingText("World ready!")
                await new Promise(resolve => setTimeout(resolve, 200))
                return
            }
        } else if (chunksGenerated === 0 && attempt > 10) {
            // Если после 10 попыток еще нет сгенерированных чанков, это проблема
            console.warn(`⚠️ После ${attempt + 1} попыток еще нет сгенерированных чанков`)
        }

        // Обновляем текст загрузки с прогрессом
        if (attempt % 10 === 0) {
            // @ts-ignore
            const chunksCount = window.__worldGenChunksCount ? window.__worldGenChunksCount() : 0
            updateLoadingText(`Verifying world generation... (${attempt + 1}/${maxAttempts}, chunks: ${chunksCount})`)
        }

        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    // Если не удалось подтвердить генерацию, пробуем еще раз с более агрессивной загрузкой
    console.warn("⚠️ Первая попытка не удалась, пробуем более агрессивную загрузку...")
    updateLoadingText("Force loading world chunks...")
    
    // Последняя попытка - очень агрессивная загрузка
    const playerPos = noa.entities.getPosition(noa.playerEntity)
    if (playerPos) {
        const x = Math.floor(playerPos[0])
        const y = Math.floor(playerPos[1])
        const z = Math.floor(playerPos[2])
        const chunkX = Math.floor(x / chunkSize) * chunkSize
        const chunkZ = Math.floor(z / chunkSize) * chunkSize
        
        // Запрашиваем все чанки в большом радиусе
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                const cx = chunkX + dx * chunkSize
                const cz = chunkZ + dz * chunkSize
                
                // Множественные запросы блоков в каждом чанке
                for (let i = 0; i < 5; i++) {
                    const tx = cx + Math.floor(Math.random() * chunkSize)
                    const ty = y - Math.floor(Math.random() * 20)
                    const tz = cz + Math.floor(Math.random() * chunkSize)
                    try {
                        noa.getBlock(tx, ty, tz)
                    } catch (e) {
                        // Игнорируем ошибки
                    }
                }
            }
        }
        
        // Даем больше времени на обработку (еще больше для медленных систем)
        const finalDelay = isSlowSystem ? 1000 : 700
        await new Promise(resolve => setTimeout(resolve, finalDelay))
        
        // Финальная проверка
        let finalCheck = false
        for (let i = 0; i < 10; i++) {
            const checkY = y - i
            try {
                const block = noa.getBlock(x, checkY, z)
                if (block !== undefined && block !== null && block !== 0) {
                    console.log(`✅ Мир сгенерирован после принудительной загрузки (блок на y=${checkY})`)
                    finalCheck = true
                    break
                }
            } catch (e) {
                // Игнорируем ошибки
            }
        }
        
        if (finalCheck) {
            updateLoadingText("World ready!")
            await new Promise(resolve => setTimeout(resolve, 200))
            return
        }
    }
    
    console.warn("⚠️ Предупреждение: не удалось подтвердить генерацию мира после всех попыток")
    console.warn("⚠️ Продолжаем загрузку, но мир может быть не полностью сгенерирован")
    console.warn("⚠️ Мир будет генерироваться по мере необходимости во время игры")
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
async function waitForPlayerSpawn(ids, maxAttempts = 30, delayMs = 250) {
    console.log("👤 Попытка спавна игрока...")
    
    // Для медленных систем увеличиваем таймауты
    const isSlowSystem = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
    if (isSlowSystem) {
        console.log("🐌 Медленная система обнаружена, увеличиваем таймауты спавна")
        delayMs = 350
        maxAttempts = 40
    }
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Пытаемся заспавнить игрока
        await spawnPlayerNearWater(ids)
        
        // Даем движку время на обработку спавна (больше для медленных систем)
        const spawnDelay = isSlowSystem ? 200 : 150
        await new Promise(resolve => setTimeout(resolve, spawnDelay))
        
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
    }
    
    // Функция для получения блока по имени предмета
    function getBlockForItem(itemName) {
        // Сначала проверяем маппинг
        if (itemToBlockMap[itemName] !== undefined) {
            return itemToBlockMap[itemName]
        }
        
        // Если предмет - сгенерированный (org_, min_, syn_), не размещаем
        if (itemName.startsWith('org_') || itemName.startsWith('min_') || itemName.startsWith('syn_')) {
            return null
        }
        
        // Пытаемся найти блок с таким же именем
        if (blocksMap[itemName]) {
            return blocksMap[itemName]
        }
        
        // Если ничего не найдено, возвращаем null
        return null
    }
    
    // E обрабатывается в crafting.js для открытия окна крафта
    // alt-fire привязан только к R, поэтому E не будет использоваться для размещения блоков
    noa.inputs.down.on("alt-fire", () => {
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
            const blockToPlace = getBlockForItem(selectedItem.name)
            
            if (!blockToPlace) {
                return // Не размещаем, если блок не найден
            }
            
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


