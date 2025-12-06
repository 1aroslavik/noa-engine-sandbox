// world/animals.js
import * as BABYLON from '@babylonjs/core'
import { noiseHeight } from '../biome.js'
import { getHeightAt } from './worldgen.js'
import { getBiome } from '../biome.js'
import { createPigMaterial } from '../materials.js'

// Получаем noa из window (устанавливается в index.js) или из engine.js
// @ts-ignore
const noa = (typeof window !== 'undefined' && window.noa) || null

// список всех животных
const pigs = []


// ------------------------------------------------------------
// Высота земли по шуму
// ------------------------------------------------------------
function getHeight(x, z) {
    const h = noiseHeight(x, z)
    const maxHeight = 40
    return Math.max(1, Math.floor((h + 1) * 0.5 * maxHeight))
}


// ------------------------------------------------------------
// Создание меша свинки
// ------------------------------------------------------------
function buildPigMesh(scene, material, size = 'normal') {
    // Определяем масштаб в зависимости от размера
    const scale = size === 'small' ? 1.2 : 2.0

    const body = BABYLON.MeshBuilder.CreateBox('pigBody', { width: 0.9, height: 0.6, depth: 1.2 }, scene)
    body.position.y = 0.3

    const head = BABYLON.MeshBuilder.CreateBox('pigHead', { width: 0.5, height: 0.5, depth: 0.5 }, scene)
    head.position.set(0, 0.4, 0.85)

    const legs = []
    const legPositions = [
        [-0.3, -0.3, 0.5], [0.3, -0.3, 0.5],
        [-0.3, -0.3, -0.5], [0.3, -0.3, -0.5],
    ]

    for (const [lx, ly, lz] of legPositions) {
        const leg = BABYLON.MeshBuilder.CreateBox('pigLeg', { width: 0.18, height: 0.3, depth: 0.18 }, scene)
        leg.position.set(lx, ly, lz)
        legs.push(leg)
    }

    const pig = BABYLON.Mesh.MergeMeshes([body, head, ...legs], true, true)
    pig.scaling.set(scale, scale, scale)
    pig.material = material

    return pig
}


// ------------------------------------------------------------
// Создание сущности свинки
// ------------------------------------------------------------
export function createPig(noa, scene, x, z, y = null, size = 'normal') {
    const groundY = y !== null ? y : getHeightAt(x, z)
    
    // Определяем параметры в зависимости от размера
    const isSmall = size === 'small'
    const width = isSmall ? 0.4 : 0.7
    const height = isSmall ? 0.7 : 1.2
    const baseSpeed = isSmall ? 0.35 : 0.2 // Маленькие свиньи быстрее
    const speedVariation = isSmall ? 0.2 : 0.15
    const offsetY = height / 2
    
    // Проверяем, что место для спавна свободно - проверяем несколько позиций
    const spawnX = Math.floor(x)
    const spawnZ = Math.floor(z)
    
    // Ищем свободное место в радиусе 2 блоков
    let foundSpot = false
    let finalX = spawnX
    let finalZ = spawnZ
    let finalY = groundY
    
    for (let dx = -2; dx <= 2 && !foundSpot; dx++) {
        for (let dz = -2; dz <= 2 && !foundSpot; dz++) {
            const checkX = spawnX + dx
            const checkZ = spawnZ + dz
            const checkY = getHeightAt(checkX, checkZ)
            
            // Блок на земле должен существовать (не воздух)
            const blockAtGround = noa.getBlock(checkX, checkY, checkZ)
            // Блоки выше должны быть воздухом (0)
            const blockAtSpawn = noa.getBlock(checkX, checkY + 1, checkZ)
            const blockAtSpawnTop = noa.getBlock(checkX, checkY + 2, checkZ)
            
            // Проверяем, что место свободно
            if (blockAtGround !== 0 && blockAtSpawn === 0 && blockAtSpawnTop === 0) {
                foundSpot = true
                finalX = checkX
                finalZ = checkZ
                finalY = checkY
            }
        }
    }
    
    // Если не нашли место, не спавним
    if (!foundSpot) {
        console.log(`🐷 Cannot spawn pig at ${x} ${groundY} ${z} - no free space nearby`)
        return null
    }
    
    const material = createPigMaterial(noa, size)
    const mesh = buildPigMesh(scene, material, size)
    // Спавним точно на поверхности блока (finalY + 1) плюс небольшой отступ для высоты
    const spawnY = finalY + 1 + offsetY

    const id = noa.entities.add([finalX + 0.5, spawnY, finalZ + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width: width,
        height: height,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: false, // Отключил коллизии между свиньями, чтобы они не толкали друг друга
        solid: true,
        // Добавляем настройки для лучшей коллизии
        restitution: 0, // Нет отскока
        friction: 0.3,
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh: mesh,
        offset: [0, offsetY, 0] // смещение для правильного позиционирования меша
    })

    const body = noa.entities.getPhysicsBody(id)
    body.mass = 1
    body.friction = 0.3 // Уменьшил трение, чтобы движение было возможным

    pigs.push({
        id,
        mesh,
        body,
        angle: Math.random() * Math.PI * 2,
        speed: baseSpeed + Math.random() * speedVariation, // Скорость зависит от размера
        directionChangeTimer: 60 + Math.floor(Math.random() * 60), // Начинаем с небольшой задержки
        jumpCooldown: 0,
        size: size, // Сохраняем размер для отладки
    })

    const sizeEmoji = isSmall ? '🐽' : '🐷'
    console.log(`${sizeEmoji} ${size} Pig spawned at ${x} ${spawnY} ${z}`)
    return id
}


// ------------------------------------------------------------
// Спавн свинок возле игрока
// ------------------------------------------------------------
export function spawnDebugPigs(noa, scene, count = 5) {
    if (!noa.playerEntity) {
        console.warn("🐷 Player entity not ready yet")
        return
    }

    const pos = noa.entities.getPosition(noa.playerEntity)
    if (!pos || pos.length < 3) {
        console.warn("🐷 Player position not available")
        return
    }

    for (let i = 0; i < count; i++) {
        const dx = Math.floor((Math.random() - 0.5) * 10)
        const dz = Math.floor((Math.random() - 0.5) * 10)

        createPig(noa, scene, Math.floor(pos[0] + dx), Math.floor(pos[2] + dz))
    }
}


// ------------------------------------------------------------
// Ожидание загрузки сцены и игрока (важно!)
// ------------------------------------------------------------
function spawnWhenSceneReady() {
    // @ts-ignore
    const currentNoa = (typeof window !== 'undefined' && window.noa) || noa
    if (!currentNoa) return

    const scene = currentNoa.rendering.getScene()
    if (!scene) {
        // сцена ещё не создана → пробуем снова
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    // Проверяем, что игрок готов
    if (!currentNoa.playerEntity) {
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    const pos = currentNoa.entities.getPosition(currentNoa.playerEntity)
    if (!pos || pos.length < 3) {
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    console.log("🐷 Scene and player ready → spawning pigs...")
    spawnDebugPigs(currentNoa, scene, 5)
}

spawnWhenSceneReady()


// ------------------------------------------------------------
// Движение свинок
// ------------------------------------------------------------
let tick = 0
let tickHandlerRegistered = false

function registerTickHandler() {
    if (tickHandlerRegistered) return
    
    // Пробуем получить noa из window (основной экземпляр из index.js)
    // @ts-ignore
    const currentNoa = (typeof window !== 'undefined' && window.noa) || noa
    
    if (!currentNoa || typeof currentNoa.on !== 'function') {
        // @ts-ignore
        console.warn("🐷 noa not ready for tick handler, retrying...", { hasWindowNoa: !!(typeof window !== 'undefined' && window.noa), hasNoa: !!noa })
        setTimeout(registerTickHandler, 200)
        return
    }
    
    console.log("🐷 Registering tick handler for pig movement")
    tickHandlerRegistered = true
    
    currentNoa.on('tick', () => {
        tick++
        if (tick % 6 !== 0) return
        
        if (pigs.length === 0) return

        for (const pig of pigs) {
        const { id, mesh, body } = pig
        if (!mesh || !body) continue

        const pos = currentNoa.entities.getPosition(id)
        if (!pos) continue

        // Уменьшаем таймеры
        pig.directionChangeTimer--
        pig.jumpCooldown--

        // Проверка блока под свинкой - более надежная проверка
        const groundX = Math.floor(pos[0])
        const groundY = Math.floor(pos[1])
        const groundZ = Math.floor(pos[2])
        let under = currentNoa.getBlock(groundX, groundY - 1, groundZ)
        // Если под центром нет блока, проверяем соседние блоки (свинья может стоять на краю)
        if (under === 0) {
            under = currentNoa.getBlock(groundX - 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX + 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ - 1) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ + 1) ||
                    0
        }
        
        // Определяем высоту свиньи из физического тела
        const pigHeight = body.height || 1.2
        const checkHeight = Math.ceil(pigHeight)
        
        // Проверяем блоки на разных уровнях (с учетом размера свиньи)
        // Проверяем не только центр, но и края для более точной проверки
        const stuckCheckPoints = [
            [groundX, groundZ], // Центр
            [groundX + 1, groundZ], // Справа
            [groundX - 1, groundZ], // Слева
            [groundX, groundZ + 1], // Вперед
            [groundX, groundZ - 1], // Назад
        ]
        
        let isStuck = false
        for (const [cx, cz] of stuckCheckPoints) {
            const atFeet = currentNoa.getBlock(cx, groundY, cz)
            const atBody = currentNoa.getBlock(cx, groundY + 1, cz)
            // Проверяем только нужную высоту в зависимости от размера
            if (checkHeight > 1) {
                const atHead = currentNoa.getBlock(cx, groundY + 2, cz)
                if (atFeet !== 0 || atBody !== 0 || atHead !== 0) {
                    isStuck = true
                    break
                }
            } else {
                // Для маленьких свиней проверяем только до уровня тела
                if (atFeet !== 0 || atBody !== 0) {
                    isStuck = true
                    break
                }
            }
        }
        
        // Если свинья внутри блока, выталкиваем её вверх и ищем свободное место
        if (isStuck) {
            // Ищем ближайшее свободное место в радиусе 4 блоков
            let foundFreeSpot = false
            let freeX = pos[0]
            let freeY = pos[1]
            let freeZ = pos[2]
            
            // Получаем высоту свиньи из физического тела
            const pigHeight = body.height || 1.2
            const checkHeight = Math.ceil(pigHeight)
            const offsetY = pigHeight / 2
            
            for (let radius = 1; radius <= 4 && !foundFreeSpot; radius++) {
                for (let dx = -radius; dx <= radius && !foundFreeSpot; dx++) {
                    for (let dz = -radius; dz <= radius && !foundFreeSpot; dz++) {
                        const checkX = Math.floor(pos[0] + dx)
                        const checkZ = Math.floor(pos[2] + dz)
                        const checkY = Math.floor(pos[1])
                        
                        const blockAtFeet = currentNoa.getBlock(checkX, checkY, checkZ)
                        const blockAtBody = currentNoa.getBlock(checkX, checkY + 1, checkZ)
                        const blockUnder = currentNoa.getBlock(checkX, checkY - 1, checkZ)
                        
                        // Проверяем блоки в зависимости от размера свиньи
                        let isFree = blockAtFeet === 0 && blockAtBody === 0 && blockUnder !== 0
                        if (checkHeight > 1) {
                            const blockAtHead = currentNoa.getBlock(checkX, checkY + 2, checkZ)
                            isFree = isFree && blockAtHead === 0
                        }
                        
                        // Если место свободно и есть блок под ногами
                        if (isFree) {
                            foundFreeSpot = true
                            freeX = checkX + 0.5
                            freeY = checkY + 1 + offsetY
                            freeZ = checkZ + 0.5
                        }
                    }
                }
            }
            
            if (foundFreeSpot) {
                // Перемещаем в свободное место
                currentNoa.entities.setPosition(id, [freeX, freeY, freeZ])
                // Сбрасываем velocity
                body.velocity[0] = 0
                body.velocity[1] = 0
                body.velocity[2] = 0
            } else {
                // Если не нашли место, выталкиваем вверх и в случайную сторону
                const pushAngle = Math.random() * Math.PI * 2
                body.velocity[1] = 0.6
                body.velocity[0] = Math.cos(pushAngle) * 0.4
                body.velocity[2] = Math.sin(pushAngle) * 0.4
                // Также напрямую перемещаем вверх
                const newPos = [pos[0], pos[1] + 1.5, pos[2]]
                currentNoa.entities.setPosition(id, newPos)
            }
            continue
        }
        
        if (under === 0) {
            // Падаем вниз
            body.velocity[1] = -0.1
        }

        // Периодическая смена направления (каждые 3-8 секунд)
        if (pig.directionChangeTimer <= 0) {
            pig.angle = Math.random() * Math.PI * 2
            pig.directionChangeTimer = 180 + Math.floor(Math.random() * 300) // 3-8 секунд
        }

        // СНАЧАЛА ПОВОРАЧИВАЕМ МЕШ - чтобы голова была направлена в сторону движения
        // Голова изначально направлена по +Z (вперед в Babylon.js)
        // В noa: angle = 0 → движение по +X, angle = π/2 → движение по +Z, angle = π → движение по -X, angle = 3π/2 → движение по -Z
        // В Babylon.js: rotation.y = 0 → смотрение по +Z, rotation.y = π/2 → смотрение по -X, rotation.y = π → смотрение по -Z, rotation.y = 3π/2 → смотрение по +X
        // Формула: rotation.y = angle - π/2
        mesh.rotation.y = pig.angle - Math.PI / 2
        
        // Упрощенная проверка препятствий - только для прыжков
        if (under !== 0 && Math.abs(body.velocity[1]) < 0.1) {
            const checkDistance = 0.4
            const fx = pos[0] + Math.cos(pig.angle) * checkDistance
            const fz = pos[2] + Math.sin(pig.angle) * checkDistance
            const currentY = Math.floor(pos[1])
            
            const frontBlock = currentNoa.getBlock(Math.floor(fx), currentY, Math.floor(fz))
            const frontBlockAbove = currentNoa.getBlock(Math.floor(fx), currentY + 1, Math.floor(fz))
            
            // Если препятствие впереди - прыгаем В НАПРАВЛЕНИИ ДВИЖЕНИЯ
            if (frontBlock !== 0 || frontBlockAbove !== 0) {
                if (pig.jumpCooldown <= 0) {
                    // Проверяем, есть ли место сверху для прыжка
                    const jumpCheckY = currentY + 2
                    const jumpCheckBlock = currentNoa.getBlock(Math.floor(fx), jumpCheckY, Math.floor(fz))
                    
                    if (jumpCheckBlock === 0) {
                        // Прыгаем ВПЕРЕД в направлении головы!
                        body.velocity[1] = 0.35
                        // Добавляем горизонтальную скорость для прыжка вперед
                        body.velocity[0] = Math.cos(pig.angle) * pig.speed * 2
                        body.velocity[2] = Math.sin(pig.angle) * pig.speed * 2
                        pig.jumpCooldown = 30
                    } else {
                        // Не можем перепрыгнуть - меняем направление
                        pig.angle = Math.random() * Math.PI * 2
                        pig.directionChangeTimer = 15
                    }
                }
            }
        }
        
        // Движение - упрощенная логика, всегда применяем движение
        const moveSpeed = pig.speed * 4
        
        // Проверяем, стоим ли на земле (более надежная проверка)
        // Используем более мягкую проверку - если есть блок под ногами ИЛИ скорость вниз небольшая
        const isOnGround = under !== 0 || (body.velocity[1] >= -0.1 && body.velocity[1] < 0.3)
        
        if (isOnGround) {
            // Всегда устанавливаем velocity в направлении движения
            body.velocity[0] = Math.cos(pig.angle) * moveSpeed
            body.velocity[2] = Math.sin(pig.angle) * moveSpeed
            
            // Также применяем прямое перемещение для надежности
            const moveDistance = moveSpeed * 0.12
            const newX = pos[0] + Math.cos(pig.angle) * moveDistance
            const newZ = pos[2] + Math.sin(pig.angle) * moveDistance
            const newY = pos[1]
            
            // Проверяем перед перемещением - если есть препятствие, просто не перемещаем напрямую
            // но velocity все равно установлен, так что физика попытается двигаться
            const finalCheckX = Math.floor(newX)
            const finalCheckZ = Math.floor(newZ)
            const finalCheckY = Math.floor(newY)
            const finalBlock = currentNoa.getBlock(finalCheckX, finalCheckY, finalCheckZ)
            const finalBlockAbove = currentNoa.getBlock(finalCheckX, finalCheckY + 1, finalCheckZ)
            
            if (finalBlock === 0 && finalBlockAbove === 0) {
                // Нет препятствия - перемещаем напрямую для плавности
                currentNoa.entities.setPosition(id, [newX, newY, newZ])
            }
        } else {
            // Падаем - не двигаемся горизонтально
            body.velocity[0] *= 0.8
            body.velocity[2] *= 0.8
        }
    }
    })
}

// Регистрируем обработчик после небольшой задержки
setTimeout(registerTickHandler, 100)


// ------------------------------------------------------------
// Генерация животных в чанке
// ------------------------------------------------------------
export function generateAnimalsInChunk(noa, ids, x0, y0, z0) {
    const scene = noa.rendering.getScene()
    if (!scene) return // сцена ещё не готова

    // Генерируем несколько животных в чанке
    const animalCount = Math.floor(Math.random() * 3) // 0-2 животных на чанк

    for (let i = 0; i < animalCount; i++) {
        const x = x0 + Math.floor(Math.random() * 32)
        const z = z0 + Math.floor(Math.random() * 32)
        const y = getHeightAt(x, z)
        const biome = getBiome(x, z)

        // Спавним свинок только в подходящих биомах
        if (biome === "plains" || biome === "forest") {
            if (Math.random() < 0.3) { // 30% шанс спавна
                // Случайно выбираем размер: 50% маленькие, 50% стандартные
                const size = Math.random() < 0.5 ? 'small' : 'normal'
                createPig(noa, scene, x, z, y, size)
            }
        }
    }
}
