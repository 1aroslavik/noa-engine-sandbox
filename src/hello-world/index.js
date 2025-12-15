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
    
    // Проверяем что блоки загружены
    if (!ids || !ids.blocks || typeof ids.blocks !== 'object') {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Блоки не загружены!", { ids })
        throw new Error("Blocks not loaded properly")
    }
    
    console.log("✅ Блоки загружены:", Object.keys(ids.blocks).length, "блоков")
    
    updateLoadingText("Setting up world generation...")

    // установить ID воды
    setWaterID(ids.waterID)

    // =========================================================
    // 🔍 Проверка: вызывается ли worldDataNeeded? 
    // Если нет — перезагрузить страницу
    // =========================================================
    let worldgenCalled = false;
    let worldgenErrorCount = 0;

    // Ловим вызовы worldDataNeeded ДО регистрации генерации
    // Это нужно для отслеживания, что движок запрашивает чанки
    noa.world.on("worldDataNeeded", (id, data, x, y, z) => {
        worldgenCalled = true;
        console.log("🔔 worldDataNeeded вызван! id:", id, "x:", x, "y:", y, "z:", z);
    });

    // Регистрируем генерацию мира - это должно быть ДО того, как движок начнет запрашивать чанки
    registerWorldGeneration(noa, ids)
    
    console.log("✅ Генерация мира зарегистрирована, обработчики установлены")
    
    // Проверяем что обработчики действительно зарегистрированы
    try {
        // @ts-ignore - _listeners может быть приватным свойством
        const listeners = noa.world?._listeners?.["worldDataNeeded"]
        if (listeners) {
            console.log(`🔍 Проверка регистрации: найдено ${listeners.length} обработчик(ов) worldDataNeeded`)
        } else {
            console.warn("⚠️ Не удалось проверить регистрацию обработчиков")
        }
    } catch (e) {
        console.warn("⚠️ Не удалось проверить регистрацию обработчиков:", e)
    }

    // Проверяем через 10 секунд после старта
    setTimeout(() => {
        if (!worldgenCalled) {
            console.error("❌ GEN CALL не был вызван! Генерация МИРА НЕ РАБОТАЕТ!");
            console.error("🔍 Проверка состояния движка:", {
                hasWorld: !!noa.world,
                hasRendering: !!noa.rendering,
                hasPlayer: !!noa.playerEntity,
                blocksCount: Object.keys(ids.blocks).length
            })
            console.warn("🔄 Перезагрузка страницы...");

            // Перезагрузка
            location.reload();
        } else {
            console.log("✅ worldDataNeeded вызывается, генерация работает")
        }
    }, 10000); // 10 секунд

// Ловим ситуацию, когда чанк загрузился, но в нём НЕТ ни одного блока
noa.world.on("chunkLoaded", (chunkID, chunk) => {
    const arr = chunk.voxels
    let solidCount = 0

    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== 0) {
            solidCount++
            break
        }
    }

    if (solidCount === 0) {
        console.error("❌ ПУСТОЙ ЧАНК -> chunkID:", chunkID)

        const [cx, cy, cz] = chunkID
        console.error("📍 Координаты чанка:", { cx, cy, cz })

        // Проверяем getHeightAt
        try {
            const h = getHeightAt(cx * 32, cz * 32)
            console.error("📏 getHeightAt вернул:", h)

            if (!Number.isFinite(h)) {
                console.error("🚨 ОШИБКА: getHeightAt -> NaN или Infinity")
            }
            if (h < -1000 || h > 2000) {
                console.error("🚨 ОШИБКА: нереальная высота:", h)
            }
        } catch (e) {
            console.error("💥 ИСКЛЮЧЕНИЕ В getHeightAt:", e)
        }

        // Проверяем биом
        try {
            const biome = getBiome(cx * 32, cz * 32)
            console.error("🌍 Биом:", biome)
        } catch (e) {
            console.error("💥 getBiome ERROR:", e)
        }

        // Проверяем воду
        try {
            const wl = getHeightAt(cx * 32, cz * 32)
            if (wl !== -999) {
                console.warn("💧 Возможно вода заполняет чанк.")
            }
        } catch(e) {}

        console.error("🧩 ИТОГ: Чанк пустой. Ищи ошибки в getHeightAt / cave / waterLevel.")
    }
})


// =========================================================
// Ловим ошибки внутри генератора чанков
// Примечание: основной обработчик генерации находится в worldgen.js
// Этот обработчик только отслеживает вызовы для диагностики
// =========================================================

    // Проверяем что движок готов
    if (!noa.world) {
        console.error("❌ Ошибка: движок мира не инициализирован")
        throw new Error("World engine not initialized")
    }
    
    // Проверяем что обработчик генерации зарегистрирован
    // Примечание: registerWorldGeneration регистрирует обработчик синхронно,
    // поэтому он уже должен быть зарегистрирован к этому моменту
    console.log("✅ Движок готов, обработчик генерации зарегистрирован")
    
    // Даем движку небольшое время на обработку регистрации
    // Это важно для продакшена, где может быть задержка
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Принудительно запрашиваем генерацию тестового чанка для проверки
    // Это помогает убедиться что обработчик работает
    console.log("🔍 Принудительный запрос тестового чанка...")
    try {
        const testChunkX = 0
        const testChunkZ = 0
        const testY = 0
        const testBlockX = testChunkX + 16
        const testBlockY = testY + 10
        const testBlockZ = testChunkZ + 16
        
        console.log(`🔍 Запрашиваем блок на позиции (${testBlockX}, ${testBlockY}, ${testBlockZ})`)
        
        // Пробуем получить блок в центре чанка (0,0,0)
        // Это заставит движок запросить чанк и вызвать worldDataNeeded
        const testBlock = noa.getBlock(testBlockX, testBlockY, testBlockZ)
        console.log("✅ Тестовый запрос чанка выполнен, блок:", testBlock)
        
        // Даем время на обработку
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Проверяем еще раз
        const testBlock2 = noa.getBlock(testBlockX, testBlockY, testBlockZ)
        console.log("✅ Повторная проверка блока:", testBlock2)
        
        // Пробуем запросить чанк через запрос блоков в разных точках чанка
        console.log("🔍 Пробуем запросить чанк через множественные запросы блоков...")
        // Вычисляем координаты чанка (используем chunkSize из конфигурации движка)
        const chunkSize = 32 // Из конфигурации движка: chunkSize: 32
        const chunkX = Math.floor(testBlockX / chunkSize) * chunkSize
        const chunkZ = Math.floor(testBlockZ / chunkSize) * chunkSize
        const chunkY = Math.floor(testBlockY / chunkSize) * chunkSize
        
        console.log(`🔍 Запрашиваем блоки в чанке: (${chunkX}, ${chunkY}, ${chunkZ})`)
        
        // Проверяем состояние движка перед запросом
        console.log("🔍 Состояние движка:", {
            hasWorld: !!noa.world,
            hasRendering: !!noa.rendering,
            hasPlayer: !!noa.playerEntity
        })
        
        // Принудительно запрашиваем блоки в разных точках чанка для генерации
        // Запрашиваем на разных высотах, включая поверхность
        const surfaceHeight = Math.floor(getHeightAt(chunkX + chunkSize/2, chunkZ + chunkSize/2))
        console.log(`📏 Высота поверхности в центре чанка: ${surfaceHeight}`)
        
        for (let offsetX = 0; offsetX < chunkSize; offsetX += 4) {
            for (let offsetZ = 0; offsetZ < chunkSize; offsetZ += 4) {
                // Запрашиваем блоки на поверхности и вокруг неё
                for (let offsetY = -5; offsetY <= 5; offsetY++) {
                    const checkY = surfaceHeight + offsetY
                    if (checkY >= 0 && checkY < 200) {
                        try {
                            noa.getBlock(chunkX + offsetX, checkY, chunkZ + offsetZ)
                        } catch (e) {
                            // Игнорируем ошибки
                        }
                    }
                }
            }
        }
        
        // Даем время на обработку
        await new Promise(resolve => setTimeout(resolve, 500))
    } catch (e) {
        console.log("ℹ️ Тестовый запрос чанка (это нормально при первой загрузке):", e.message)
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
    
    // Проверяем позицию игрока и высоту в этой точке
    const playerPos = noa.entities.getPosition(noa.playerEntity)
    if (playerPos) {
        const [px, py, pz] = playerPos
        console.log(`📍 Игрок заспавнен на: [${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)}]`)
        
        // Проверяем высоту в точке спавна
        try {
            const spawnHeight = getHeightAt(Math.floor(px), Math.floor(pz))
            console.log(`📏 Высота в точке спавна (${Math.floor(px)}, ${Math.floor(pz)}): ${spawnHeight}`)
            
            if (!Number.isFinite(spawnHeight)) {
                console.error("❌ ОШИБКА: getHeightAt вернул невалидное значение:", spawnHeight)
            }
        } catch (e) {
            console.error("❌ Ошибка при получении высоты:", e)
        }
    }
    
    // Даем движку время на обработку спавна и начало загрузки чанков
    updateLoadingText("Preparing world...")
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Принудительно запрашиваем блоки вокруг игрока для генерации чанков
    if (playerPos) {
        const [px, py, pz] = playerPos
        const floorX = Math.floor(px)
        const floorY = Math.floor(py)
        const floorZ = Math.floor(pz)
        
        console.log("🔍 Принудительно запрашиваем блоки вокруг игрока для генерации чанков...")
        console.log(`📍 Позиция игрока: [${floorX}, ${floorY}, ${floorZ}]`)
        
        // Запрашиваем блоки на разных высотах, включая поверхность
        // Это важно, потому что движок может не запрашивать чанки на очень высоких позициях
        const surfaceY = Math.floor(getHeightAt(floorX, floorZ))
        console.log(`📏 Высота поверхности в точке (${floorX}, ${floorZ}): ${surfaceY}`)
        
        // Запрашиваем блоки на поверхности и вокруг неё
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = -10; dy <= 5; dy++) {
                    const checkY = surfaceY + dy
                    // Запрашиваем только разумные высоты
                    if (checkY >= 0 && checkY < 200) {
                        try {
                            noa.getBlock(floorX + dx, checkY, floorZ + dz)
                        } catch (e) {
                            // Игнорируем ошибки
                        }
                    }
                }
            }
        }
        
        // Также запрашиваем блоки на позиции игрока
        for (let dy = -10; dy <= 2; dy++) {
            try {
                noa.getBlock(floorX, floorY + dy, floorZ)
            } catch (e) {
                // Игнорируем ошибки
            }
        }
        
        console.log("✅ Запросы блоков отправлены, ждем генерации...")
        await new Promise(resolve => setTimeout(resolve, 1000)) // Увеличиваем время ожидания
    }

    // Проверяем что мир сгенерировался и ждем если нужно
    await waitForWorldGeneration()

    // Инициализируем UI здоровья
    initHealthUI()

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
            console.log("👤 Игрок не заспавлен, пробуем еще раз...")

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
                        console.log(`✅ Найден твердый блок на позиции (${bx}, ${by}, ${bz}):`, block)
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
        } else {
            if (attempt % 5 === 0) {
                console.log(`⏳ hasSolidBlocks is false (попытка ${attempt + 1}/${maxAttempts}, проверено блоков: ${validBlockCount}, позиция игрока: [${x}, ${y}, ${z}])`)
                // Пробуем принудительно запросить чанк
                console.log("🔍 Принудительно запрашиваем блоки для генерации чанка...")
                for (const [bx, by, bz] of checkPositions) {
                    try {
                        noa.getBlock(bx, by, bz)
                    } catch (e) {
                        // Игнорируем
                    }
                }
            }
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


