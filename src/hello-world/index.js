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

// @ts-ignore
window.noa = noa

// =======================
//       СТАРТ ИГРЫ
// =======================
async function start() {
    console.log("🚀 Старт: загрузка текстур и блоков")

    const ids = await initMaterialsAndBlocks(noa)

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
    await spawnPlayerNearWater(ids)
}

start()

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
        
        // Блоки земли и травы - зависят от биома
        const biome = getBiome(x, z)
        const isDirtOrGrass = 
            blockName === 'dirt' ||
            blockName === 'grass' ||
            blockName === 'grass_top' ||
            blockName === 'grass_side' ||
            blockName === 'grass_dry' ||
            blockName === 'grass_dry_top' ||
            blockName === 'grass_dry_side' ||
            blockName === 'tundra_grass' ||
            blockName === 'tundra_grass_top' ||
            blockName === 'tundra_grass_side' ||
            blockName === 'snow_transition' ||
            blockName === 'snow_transition_side'
        
        if (isDirtOrGrass) {
            // Определяем название на основе биома
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

    noa.inputs.down.on("alt-fire", () => {
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.adjacent
            noa.setBlock(placeBlockID, p[0], p[1], p[2])
        }
    })

    // Используем другую клавишу для ставки блоков, так как E используется для крафта
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


