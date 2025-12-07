// index.js
import { Engine } from "noa-engine"
import { initMaterialsAndBlocks } from "./materials.js"
import { registerWorldGeneration, getHeightAt } from "./world/worldgen.js"
import { getBiome } from "./biome.js"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { setWaterID } from "./world/water.js"
import { updateWater } from "./world/water.js"
import { getPigs, damagePig } from "./world/animals.js"
import "./ui/inventory.js" // Подключаем инвентарь и крафтинг
import { addItem } from "./ui/inventory.js"

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
    console.log("🚀 Старт: загрузка текстур и блоков")
    updateLoadingText("Loading textures and blocks...")

    const ids = await initMaterialsAndBlocks(noa)
    
    updateLoadingText("Setting up world generation...")

    // установить ID воды
    setWaterID(ids.waterID)

    registerWorldGeneration(noa, ids)

    setupPlayerMesh()

    // выбираем пригодный блок для E
    const grassBlock =
        ids.blocks["grass_top"] ||
        ids.blocks["grass"] ||
        Object.values(ids.blocks)[0]

    setupInteraction(grassBlock, ids.blocks, ids.waterID)

    // ======= СПАВН У ВОДЫ =======
    updateLoadingText("Spawning player...")
    await spawnPlayerNearWater(ids)

    // Проверяем что мир сгенерировался и ждем если нужно
    await waitForWorldGeneration()

    // Скрываем окно загрузки после полной инициализации
    hideLoadingScreen()
}

start()

// =======================
//   ПРОВЕРКА ГЕНЕРАЦИИ МИРА
// =======================
async function waitForWorldGeneration(maxAttempts = 50, delayMs = 100) {
    console.log("🌍 Проверка генерации мира...")
    updateLoadingText("Verifying world generation...")
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const playerPos = noa.entities.getPosition(noa.playerEntity)
        if (!playerPos) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
        }

        const x = Math.floor(playerPos[0])
        const y = Math.floor(playerPos[1])
        const z = Math.floor(playerPos[2])

        // Проверяем несколько блоков вокруг игрока
        const checkPositions = [
            [x, y - 1, z],      // под ногами
            [x, y, z],          // на уровне игрока
            [x + 1, y, z],      // рядом
            [x - 1, y, z],      // рядом
            [x, y, z + 1],      // рядом
            [x, y, z - 1],      // рядом
            [x, y - 2, z],      // глубже
            [x, y - 3, z],      // еще глубже
        ]

        let hasSolidBlocks = false
        let hasValidBlocks = false

        for (const [bx, by, bz] of checkPositions) {
            try {
                const block = noa.getBlock(bx, by, bz)
                // Если блок не undefined и не null, значит чанк загружен
                if (block !== undefined && block !== null) {
                    hasValidBlocks = true
                    // Если есть хотя бы один не-воздушный блок, мир сгенерирован
                    if (block !== 0) {
                        hasSolidBlocks = true
                        break
                    }
                }
            } catch (e) {
                // Игнорируем ошибки при проверке блоков
            }
        }

        // Если нашли валидные блоки и хотя бы один твердый - мир готов
        if (hasValidBlocks && hasSolidBlocks) {
            console.log(`✅ Мир сгенерирован (попытка ${attempt + 1})`)
            updateLoadingText("World ready!")
            await new Promise(resolve => setTimeout(resolve, 200))
            return
        }

        // Если чанки еще не загружены, принудительно запрашиваем их
        if (!hasValidBlocks) {
            // Принудительно запрашиваем загрузку чанков вокруг игрока
            const chunkSize = 32 // Размер чанка из настроек движка
            const chunkX = Math.floor(x / chunkSize) * chunkSize
            const chunkZ = Math.floor(z / chunkSize) * chunkSize
            
            // Запрашиваем несколько чанков вокруг
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const cx = chunkX + dx * chunkSize
                    const cz = chunkZ + dz * chunkSize
                    // Проверяем блок в центре чанка, чтобы заставить его загрузиться
                    try {
                        noa.getBlock(cx + chunkSize / 2, y, cz + chunkSize / 2)
                    } catch (e) {
                        // Игнорируем ошибки
                    }
                }
            }
        }

        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    console.warn("⚠️ Предупреждение: не удалось подтвердить генерацию мира, но продолжаем...")
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
        }
    }

    if (best) {
        console.log("💧 Найдена вода, спавн:", best)
        noa.entities.setPosition(noa.playerEntity, [
            best.x + 0.5,
            best.y,
            best.z + 0.5
        ])
    } else {
        console.log("❌ ВОДА НЕ НАЙДЕНА, обычный спавн")
        const y = getHeightAt(baseX, baseZ) + 3
        noa.entities.setPosition(noa.playerEntity, [
            baseX + 0.5,
            y,
            baseZ + 0.5
        ])
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

    noa.inputs.down.on("fire", () => {
        // Сначала проверяем блоки (как обычно)
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.position
            // Получаем ID блока перед его разрушением
            const blockId = noa.getBlock(p[0], p[1], p[2])
            
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
        
        // Ищем ближайшую свинью в направлении взгляда (до 5 блоков)
        const maxDistance = 5.0
        let closestPig = null
        let closestDistance = maxDistance
        
        const pigs = getPigs()
        for (const pig of pigs) {
            const pigPos = noa.entities.getPosition(pig.id)
            if (!pigPos) continue
            
            // Вектор от игрока к свинье
            const dx = pigPos[0] - playerPos[0]
            const dy = pigPos[1] - playerPos[1]
            const dz = pigPos[2] - playerPos[2]
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            
            if (distance > maxDistance) continue
            
            // Проверяем, находится ли свинья в направлении взгляда
            // Нормализуем вектор к свинье
            const normDx = dx / distance
            const normDy = dy / distance
            const normDz = dz / distance
            
            // Скалярное произведение для проверки угла (должно быть близко к 1)
            const dot = dirX * normDx + dirY * normDy + dirZ * normDz
            
            // Если свинья в конусе взгляда (угол < 45 градусов, dot > 0.7)
            if (dot > 0.7 && distance < closestDistance) {
                closestDistance = distance
                closestPig = pig
            }
        }
        
        // Если нашли свинью, наносим урон
        if (closestPig) {
            damagePig(noa, closestPig)
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


