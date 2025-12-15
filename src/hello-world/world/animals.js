// world/animals.js
import * as BABYLON from '@babylonjs/core'
import { noiseHeight } from '../biome.js'
import { getHeightAt } from './height.js'
import { getBiome } from '../biome.js'
import { createPigMaterial, createCowMaterial } from '../materials.js'
import { addItem } from '../ui/inventory.js'
import { damagePlayer } from '../player.js'

// Получаем noa из window (устанавливается в index.js) или из engine.js
// @ts-ignore
const noa = (typeof window !== 'undefined' && window.noa) || null

// список всех животных
const pigs = []
const cows = []
const bears = []

export function getBears() { return bears }

// Экспортируем массивы животных и функции для работы с ними
export function getPigs() {
    return pigs
}

export function getCows() {
    return cows
}


// ------------------------------------------------------------
// Высота земли по шуму
// ------------------------------------------------------------
function getHeight(x, z) {
    const h = noiseHeight(x, z)
    const maxHeight = 40
    return Math.max(1, Math.floor((h + 1) * 0.5 * maxHeight))
}

function buildBearMesh(scene, material, type = "brown", size = "normal") {
    const scale = size === "small" ? 1.3 : 2.2

    // Базовое тело
    const body = BABYLON.MeshBuilder.CreateBox("bearBody", { width: 1.2, height: 1.0, depth: 1.6 }, scene)
    body.position.y = 0.5

    const head = BABYLON.MeshBuilder.CreateBox("bearHead", { width: 0.8, height: 0.7, depth: 0.8 }, scene)
    head.position.set(0, 0.9, 1.0)

    // -------------------------------------------------------
    // 👂 УШИ
    // -------------------------------------------------------
    const ears = []

    const earSize = 0.32
    const earOffsetX = 0.35
    const earOffsetY = 1.25
    const earOffsetZ = 0.75

    // Левое ухо
    const earLeft = BABYLON.MeshBuilder.CreateBox("bearEarLeft", {
        width: earSize,
        height: earSize,
        depth: earSize
    }, scene)
    earLeft.position.set(-earOffsetX, earOffsetY, earOffsetZ)
    ears.push(earLeft)

    // Правое ухо
    const earRight = BABYLON.MeshBuilder.CreateBox("bearEarRight", {
        width: earSize,
        height: earSize,
        depth: earSize
    }, scene)
    earRight.position.set(earOffsetX, earOffsetY, earOffsetZ)
    ears.push(earRight)

    // -------------------------------------------------------
    // 🐻 ХВОСТ
    // -------------------------------------------------------
    const tailSize = 0.28
    const tail = BABYLON.MeshBuilder.CreateBox("bearTail", {
        width: tailSize,
        height: tailSize,
        depth: tailSize
    }, scene)

    // Хвост находится сзади тела, чуть ниже его верхней точки
    tail.position.set(0, 0.75, -0.95)

    // -------------------------------------------------------
    // Ноги
    // -------------------------------------------------------
    const legs = []
    const legPositions = [
        [-0.45, -0.4, 0.6], [0.45, -0.4, 0.6],
        [-0.45, -0.4, -0.6], [0.45, -0.4, -0.6],
    ]

    for (const [lx, ly, lz] of legPositions) {
        const leg = BABYLON.MeshBuilder.CreateBox("bearLeg", { width: 0.3, height: 0.6, depth: 0.3 }, scene)
        leg.position.set(lx, ly, lz)
        legs.push(leg)
    }

    // -------------------------------------------------------
    // Объединяем: тело + голова + ноги + уши + хвост
    // -------------------------------------------------------
    const bear = BABYLON.Mesh.MergeMeshes(
        [body, head, ...legs, ...ears, tail],
        true,
        true
    )

    bear.material = material
    bear.scaling.set(scale, scale, scale)

    return bear
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

export function createBear(noa, scene, x, z, y = null, type = "brown", size = "normal") {
    const groundY = y !== null ? y : getHeightAt(x, z)

    const isSmall = size === "small"
    const width = isSmall ? 0.8 : 1.2
    const height = isSmall ? 1.2 : 1.8
    const baseSpeed = isSmall ? 0.22 : 0.18
    const speedVariation = isSmall ? 0.15 : 0.1
    const offsetY = height / 2

    const spawnX = Math.floor(x)
    const spawnZ = Math.floor(z)

    let foundSpot = false
    let finalX = spawnX
    let finalZ = spawnZ
    let finalY = groundY

    for (let dx = -2; dx <= 2 && !foundSpot; dx++) {
        for (let dz = -2; dz <= 2 && !foundSpot; dz++) {
            const cx = spawnX + dx
            const cz = spawnZ + dz
            const cy = getHeightAt(cx, cz)

            const blockGround = noa.getBlock(cx, cy, cz)
            const block1 = noa.getBlock(cx, cy + 1, cz)
            const block2 = noa.getBlock(cx, cy + 2, cz)
            const block3 = noa.getBlock(cx, cy + 3, cz)

            if (blockGround !== 0 && block1 === 0 && block2 === 0 && block3 === 0) {
                foundSpot = true
                finalX = cx
                finalZ = cz
                finalY = cy
            }
        }
    }

    if (!foundSpot) {
        console.log(`🐻 Cannot spawn bear at ${x} ${groundY} ${z}`)
        return null
    }

    // МАТЕРИАЛЫ
    let material = new BABYLON.StandardMaterial("bearMat", scene)
    if (type === "polar") {
        material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 1.0)
    } else {
        material.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.15)
    }

    material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1)

    const mesh = buildBearMesh(scene, material, type, size)
    const spawnY = finalY + 1 + offsetY

    const id = noa.entities.add([finalX + 0.5, spawnY, finalZ + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width,
        height,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: false,
        solid: true,
        restitution: 0,
        friction: 0.3,
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh,
        offset: [0, offsetY, 0]
    })

    const body = noa.entities.getPhysicsBody(id)
    body.mass = 2.5

    const maxHealth = isSmall ? 10 : 20

    const initialAngle = Math.random() * Math.PI * 2
    const initialRotation = initialAngle - Math.PI / 2

    bears.push({
        id,
        mesh,
        body,
        type,
        angle: initialAngle,
        targetAngle: initialAngle,
        currentRotation: initialRotation,
        speed: baseSpeed + Math.random() * speedVariation,
        directionChangeTimer: 60 + Math.floor(Math.random() * 60),
        jumpCooldown: 0,
        attackCooldown: 0,
        size,
        health: maxHealth,
        maxHealth,
        material,
        originalEmissive: { r: 0.1, g: 0.1, b: 0.1 },
        isHighlighted: false,
        stuckCheckCounter: 0,
        lastPosition: [finalX + 0.5, spawnY, finalZ + 0.5],
    })

    mesh.rotation.y = initialRotation

    console.log(`🐻 ${type} bear spawned at ${x} ${spawnY} ${z}`)
    return id
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

    // Здоровье зависит от размера: маленькие - 3, стандартные - 5
    const maxHealth = isSmall ? 3 : 5
    
    // Сохраняем оригинальные значения emissiveColor для подсветки
    const originalEmissiveR = isSmall ? 0.4 : 0.3
    const originalEmissiveG = isSmall ? 0.12 : 0.06
    const originalEmissiveB = isSmall ? 0.12 : 0.06
    
    const initialAngle = Math.random() * Math.PI * 2
    const initialRotation = initialAngle - Math.PI / 2
    
    pigs.push({
        id,
        mesh,
        body,
        angle: initialAngle,
        targetAngle: initialAngle, // Целевой угол для плавного поворота
        currentRotation: initialRotation, // Текущий угол поворота меша (синхронизирован с начальным углом)
        speed: baseSpeed + Math.random() * speedVariation, // Скорость зависит от размера
        directionChangeTimer: 60 + Math.floor(Math.random() * 60), // Начинаем с небольшой задержки
        jumpCooldown: 0,
        size: size, // Сохраняем размер для отладки
        health: maxHealth,
        maxHealth: maxHealth,
        material: material, // Сохраняем материал для подсветки
        originalEmissive: { r: originalEmissiveR, g: originalEmissiveG, b: originalEmissiveB }, // Оригинальные значения emissive
        isHighlighted: false, // Флаг подсветки
        stuckCheckCounter: 0, // Счетчик для проверки застревания
        lastPosition: [finalX + 0.5, spawnY, finalZ + 0.5], // Последняя позиция для проверки движения
    })
    
    // Устанавливаем начальный поворот меша
    mesh.rotation.y = initialRotation

    const sizeEmoji = isSmall ? '🐽' : '🐷'
    console.log(`${sizeEmoji} ${size} Pig spawned at ${x} ${spawnY} ${z}`)
    return id
}


// ------------------------------------------------------------
// Создание меша коровы
// ------------------------------------------------------------
function buildCowMesh(scene, material, size = 'normal', noa = null) {
    // Коровы больше свиней - определяем масштаб в зависимости от размера
    const isSmall = size === 'small'
    const scale = isSmall ? 1.1 : 1.4 // Уменьшил масштаб (было 1.3 и 1.8)
    
    // Базовые размеры (немного больше, чем у свиней, но не слишком)
    const body = BABYLON.MeshBuilder.CreateBox('cowBody', { width: 1.1, height: 0.9, depth: 1.5 }, scene)
    body.position.y = 0.45

    const head = BABYLON.MeshBuilder.CreateBox('cowHead', { width: 0.7, height: 0.7, depth: 0.7 }, scene)
    head.position.set(0, 0.6, 0.95)

    // Создаем рога ДО объединения (только для больших коров)
    const horns = []
    if (size === 'normal') {
        // Левый рог - длинный, слева от головы
        const leftHorn = BABYLON.MeshBuilder.CreateBox('cowHornLeft', { width: 0.18, height: 0.6, depth: 0.18 }, scene)
        leftHorn.position.set(-0.35, 0.95, 1.0) // Слева от головы, выше
        leftHorn.rotation.z = -0.2 // Наклонен назад
        horns.push(leftHorn)
        
        // Правый рог - длинный, справа от головы
        const rightHorn = BABYLON.MeshBuilder.CreateBox('cowHornRight', { width: 0.18, height: 0.6, depth: 0.18 }, scene)
        rightHorn.position.set(0.35, 0.95, 1.0) // Справа от головы, выше
        rightHorn.rotation.z = 0.2 // Наклонен назад
        horns.push(rightHorn)
    }

    const legs = []
    const legPositions = [
        [-0.4, -0.45, 0.65], [0.4, -0.45, 0.65],
        [-0.4, -0.45, -0.65], [0.4, -0.45, -0.65],
    ]

    for (const [lx, ly, lz] of legPositions) {
        const leg = BABYLON.MeshBuilder.CreateBox('cowLeg', { width: 0.22, height: 0.5, depth: 0.22 }, scene)
        leg.position.set(lx, ly, lz)
        legs.push(leg)
    }

    // Объединяем все части коровы, включая рога (если есть)
    const cow = BABYLON.Mesh.MergeMeshes([body, head, ...legs, ...horns], true, true)
    cow.material = material
    cow.scaling.set(scale, scale, scale)

    return cow
}


// ------------------------------------------------------------
// Создание сущности коровы
// ------------------------------------------------------------
export function createCow(noa, scene, x, z, y = null, size = 'normal') {
    const groundY = y !== null ? y : getHeightAt(x, z)
    
    // Параметры коровы (больше свиней, но не слишком большие)
    const isSmall = size === 'small'
    // Маленькие коровы: width 0.6, height 1.0 (больше маленьких свиней: 0.4, 0.7)
    // Обычные коровы: width 0.9, height 1.4 (больше обычных свиней: 0.7, 1.2)
    const width = isSmall ? 0.6 : 0.9
    const height = isSmall ? 1.0 : 1.4
    const baseSpeed = isSmall ? 0.2 : 0.15 // Маленькие коровы немного быстрее
    const speedVariation = isSmall ? 0.12 : 0.1
    const offsetY = height / 2
    
    // Проверяем, что место для спавна свободно
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
            
            const blockAtGround = noa.getBlock(checkX, checkY, checkZ)
            const blockAtSpawn = noa.getBlock(checkX, checkY + 1, checkZ)
            const blockAtSpawnTop = noa.getBlock(checkX, checkY + 2, checkZ)
            
            if (blockAtGround !== 0 && blockAtSpawn === 0 && blockAtSpawnTop === 0) {
                foundSpot = true
                finalX = checkX
                finalZ = checkZ
                finalY = checkY
            }
        }
    }
    
    if (!foundSpot) {
        console.log(`🐄 Cannot spawn cow at ${x} ${groundY} ${z} - no free space nearby`)
        return null
    }
    
    const material = createCowMaterial(noa)
    const mesh = buildCowMesh(scene, material, size, noa)
    const spawnY = finalY + 1 + offsetY

    const id = noa.entities.add([finalX + 0.5, spawnY, finalZ + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width: width,
        height: height,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: false,
        solid: true,
        restitution: 0,
        friction: 0.3,
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh: mesh,
        offset: [0, offsetY, 0]
    })

    const body = noa.entities.getPhysicsBody(id)
    body.mass = 1
    body.friction = 0.3

    // Здоровье зависит от размера: маленькие - 5, обычные - 7
    const maxHealth = isSmall ? 5 : 7
    
    const originalEmissiveR = 0.1
    const originalEmissiveG = 0.1
    const originalEmissiveB = 0.1
    
    const initialAngle = Math.random() * Math.PI * 2
    const initialRotation = initialAngle - Math.PI / 2
    
    cows.push({
        id,
        mesh,
        body,
        angle: initialAngle,
        targetAngle: initialAngle,
        currentRotation: initialRotation,
        speed: baseSpeed + Math.random() * speedVariation,
        directionChangeTimer: 60 + Math.floor(Math.random() * 60),
        jumpCooldown: 0,
        size: size, // Сохраняем размер
        health: maxHealth,
        maxHealth: maxHealth,
        material: material,
        originalEmissive: { r: originalEmissiveR, g: originalEmissiveG, b: originalEmissiveB },
        isHighlighted: false,
        stuckCheckCounter: 0,
        lastPosition: [finalX + 0.5, spawnY, finalZ + 0.5],
    })
    
    mesh.rotation.y = initialRotation
    const sizeEmoji = isSmall ? '🐄' : '🐃'
    console.log(`${sizeEmoji} ${size} Cow spawned at ${x} ${spawnY} ${z}`)
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
        
        // Определяем, на какое животное смотрит игрок (каждый тик для подсветки)
        let targetedPig = null
        let targetedCow = null
        let targetedBear = null
        if (currentNoa.playerEntity) {
            const playerPos = currentNoa.entities.getPosition(currentNoa.playerEntity)
            if (playerPos) {
                // Получаем направление взгляда игрока из камеры
                const camera = currentNoa.camera
                const yaw = camera.heading
                const pitch = camera.pitch
                
                // Вычисляем направление взгляда
                const dirX = Math.cos(pitch) * Math.sin(yaw)
                const dirY = -Math.sin(pitch)
                const dirZ = Math.cos(pitch) * Math.cos(yaw)
                
                // Ищем ближайшее животное в направлении взгляда (до 6 блоков)
                const maxDistance = 6.0
                let closestDistance = maxDistance
                
                // Проверяем свиней
                for (const pig of pigs) {
                    const pigPos = currentNoa.entities.getPosition(pig.id)
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
                    
                    if (dot > 0.5 && distance < closestDistance) {
                        closestDistance = distance
                        targetedPig = pig
                    }
                }
                
                // Проверяем коров
                closestDistance = maxDistance
                for (const cow of cows) {
                    const cowPos = currentNoa.entities.getPosition(cow.id)
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
                    
                    if (dot > 0.5 && distance < closestDistance) {
                        closestDistance = distance
                        targetedCow = cow
                    }
                }
                
                // Проверяем медведей
                closestDistance = maxDistance
                for (const bear of bears) {
                    const bearPos = currentNoa.entities.getPosition(bear.id)
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
                    
                    if (dot > 0.5 && distance < closestDistance) {
                        closestDistance = distance
                        targetedBear = bear
                    }
                }
            }
        }
        
        // Обновляем подсветку для всех свиней (каждый тик)
        for (const pig of pigs) {
            if (!pig.material || !pig.originalEmissive) continue
            
            const shouldHighlight = pig === targetedPig
            if (pig.isHighlighted !== shouldHighlight) {
                pig.isHighlighted = shouldHighlight
                if (shouldHighlight) {
                    // Подсвечиваем - значительно увеличиваем emissiveColor
                    pig.material.emissiveColor.r = Math.min(1, pig.originalEmissive.r * 3)
                    pig.material.emissiveColor.g = Math.min(1, pig.originalEmissive.g * 3)
                    pig.material.emissiveColor.b = Math.min(1, pig.originalEmissive.b * 3)
                    // Также немного увеличиваем diffuseColor для более заметной подсветки
                    pig.material.diffuseColor.r = Math.min(1, pig.material.diffuseColor.r * 1.2)
                    pig.material.diffuseColor.g = Math.min(1, pig.material.diffuseColor.g * 1.2)
                    pig.material.diffuseColor.b = Math.min(1, pig.material.diffuseColor.b * 1.2)
                } else {
                    // Убираем подсветку - возвращаем оригинальные значения
                    pig.material.emissiveColor.r = pig.originalEmissive.r
                    pig.material.emissiveColor.g = pig.originalEmissive.g
                    pig.material.emissiveColor.b = pig.originalEmissive.b
                    // Возвращаем оригинальный diffuseColor
                    const isSmall = pig.size === 'small'
                    pig.material.diffuseColor.r = 1
                    pig.material.diffuseColor.g = isSmall ? 0.3 : 0.2
                    pig.material.diffuseColor.b = isSmall ? 0.3 : 0.2
                }
            }
        }
        
        // Обновляем подсветку для всех коров (каждый тик)
        for (const cow of cows) {
            if (!cow.material || !cow.originalEmissive) continue
            
            const shouldHighlight = cow === targetedCow
            if (cow.isHighlighted !== shouldHighlight) {
                cow.isHighlighted = shouldHighlight
                if (shouldHighlight) {
                    cow.material.emissiveColor.r = Math.min(1, cow.originalEmissive.r * 3)
                    cow.material.emissiveColor.g = Math.min(1, cow.originalEmissive.g * 3)
                    cow.material.emissiveColor.b = Math.min(1, cow.originalEmissive.b * 3)
                    cow.material.diffuseColor.r = Math.min(1, cow.material.diffuseColor.r * 1.2)
                    cow.material.diffuseColor.g = Math.min(1, cow.material.diffuseColor.g * 1.2)
                    cow.material.diffuseColor.b = Math.min(1, cow.material.diffuseColor.b * 1.2)
                } else {
                    cow.material.emissiveColor.r = cow.originalEmissive.r
                    cow.material.emissiveColor.g = cow.originalEmissive.g
                    cow.material.emissiveColor.b = cow.originalEmissive.b
                    cow.material.diffuseColor.r = 0.95
                    cow.material.diffuseColor.g = 0.95
                    cow.material.diffuseColor.b = 0.95
                }
            }
        }
        
        // Обновляем подсветку для всех медведей (каждый тик)
        for (const bear of bears) {
            if (!bear.material || !bear.originalEmissive) continue
            
            const shouldHighlight = bear === targetedBear
            if (bear.isHighlighted !== shouldHighlight) {
                bear.isHighlighted = shouldHighlight
                if (shouldHighlight) {
                    bear.material.emissiveColor.r = Math.min(1, bear.originalEmissive.r * 3)
                    bear.material.emissiveColor.g = Math.min(1, bear.originalEmissive.g * 3)
                    bear.material.emissiveColor.b = Math.min(1, bear.originalEmissive.b * 3)
                    bear.material.diffuseColor.r = Math.min(1, bear.material.diffuseColor.r * 1.2)
                    bear.material.diffuseColor.g = Math.min(1, bear.material.diffuseColor.g * 1.2)
                    bear.material.diffuseColor.b = Math.min(1, bear.material.diffuseColor.b * 1.2)
                } else {
                    bear.material.emissiveColor.r = bear.originalEmissive.r
                    bear.material.emissiveColor.g = bear.originalEmissive.g
                    bear.material.emissiveColor.b = bear.originalEmissive.b
                    // Возвращаем оригинальный цвет в зависимости от типа медведя
                    if (bear.type === 'polar') {
                        bear.material.diffuseColor.r = 0.95
                        bear.material.diffuseColor.g = 0.95
                        bear.material.diffuseColor.b = 1.0
                    } else {
                        bear.material.diffuseColor.r = 0.45
                        bear.material.diffuseColor.g = 0.32
                        bear.material.diffuseColor.b = 0.22
                    }
                }
            }
        }
        
        // ================================
        // ОБРАБОТКА ПРЕСЛЕДОВАНИЯ И АТАКИ МЕДВЕДЕЙ (каждый тик)
        // ================================
        for (const bear of bears) {
            const { id, mesh, body } = bear
            if (!mesh || !body) continue

            const pos = currentNoa.entities.getPosition(id)
            if (!pos) continue

            // Получаем позицию игрока
            let playerPos = null
            let distanceToPlayer = Infinity
            let isPlayerInAggroRange = false
            const AGGRO_RANGE = 10.0 // Зона агрессии - 10 блоков
            const ATTACK_RANGE = 8.0 // Зона атаки - 8 блоков (очень большая зона поражения)
            
            if (currentNoa.playerEntity) {
                playerPos = currentNoa.entities.getPosition(currentNoa.playerEntity)
                if (playerPos) {
                    const dx = playerPos[0] - pos[0]
                    const dy = playerPos[1] - pos[1]
                    const dz = playerPos[2] - pos[2]
                    distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz)
                    isPlayerInAggroRange = distanceToPlayer <= AGGRO_RANGE
                }
            }

            // Проверка блока под медведем
            const groundX = Math.floor(pos[0])
            const groundY = Math.floor(pos[1])
            const groundZ = Math.floor(pos[2])
            let under = currentNoa.getBlock(groundX, groundY - 1, groundZ)
            if (under === 0) {
                under = currentNoa.getBlock(groundX - 1, groundY - 1, groundZ) ||
                        currentNoa.getBlock(groundX + 1, groundY - 1, groundZ) ||
                        currentNoa.getBlock(groundX, groundY - 1, groundZ - 1) ||
                        currentNoa.getBlock(groundX, groundY - 1, groundZ + 1) ||
                        0
            }

            // ЛОГИКА ДВИЖЕНИЯ К ИГРОКУ (каждый тик для быстрой реакции)
            if (isPlayerInAggroRange && playerPos) {
                const dx = playerPos[0] - pos[0]
                const dz = playerPos[2] - pos[2]
                const horizontalDistance = Math.sqrt(dx * dx + dz * dz)
                
                // Вычисляем угол к игроку
                let targetAngle = Math.atan2(dx, dz)
                if (targetAngle < 0) targetAngle += 2 * Math.PI
                
                // Устанавливаем целевой угол
                bear.targetAngle = targetAngle
                
                // Плавная интерполяция поворота
                const targetRotation = bear.targetAngle - Math.PI / 2
                let angleDiff = targetRotation - bear.currentRotation
                
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                
                const rotationSpeed = 0.5 // Быстрее поворачивается к игроку
                bear.currentRotation += angleDiff * rotationSpeed
                mesh.rotation.y = bear.currentRotation
                
                // Движение к игроку (если не слишком близко для атаки)
                if (horizontalDistance > ATTACK_RANGE) {
                    // Проверяем, что медведь на земле
                    const isOnGround = under !== 0 || (body.velocity[1] >= -0.1 && body.velocity[1] < 0.3)
                    if (isOnGround) {
                        const moveSpeed = bear.speed * 6 // Быстрее движется к игроку
                        body.velocity[0] = Math.sin(bear.currentRotation) * moveSpeed
                        body.velocity[2] = Math.cos(bear.currentRotation) * moveSpeed
                        bear.angle = bear.currentRotation + Math.PI / 2
                    }
                } else {
                    // Очень близко к игроку - замедляем для атаки
                    body.velocity[0] *= 0.8
                    body.velocity[2] *= 0.8
                }
            }

            // АТАКА МЕДВЕДЯ НА ИГРОКА (каждый тик)
            if (playerPos) {
                const dx = playerPos[0] - pos[0]
                const dy = playerPos[1] - pos[1]
                const dz = playerPos[2] - pos[2]
                const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)
                
                // Проверяем, находимся ли в зоне атаки (2 блока)
                if (currentDistance <= ATTACK_RANGE) {
                    // Инициализируем таймер атаки, если его еще нет
                    if (bear.attackCooldown === undefined || bear.attackCooldown === null || bear.attackCooldown < 0) {
                        bear.attackCooldown = 0
                    }
                    
                    // Уменьшаем кулдаун каждый тик
                    bear.attackCooldown--
                    
                    // Атакуем каждые 60 тиков (примерно раз в секунду)
                    if (bear.attackCooldown <= 0) {
                        const damage = bear.size === 'small' ? 15 : 25 // Увеличенный урон: маленькие - 15, обычные - 25
                        damagePlayer(damage)
                        bear.attackCooldown = 60 // Кулдаун атаки
                        console.log(`🐻 Bear attacked player! Damage: ${damage}, Distance: ${currentDistance.toFixed(2)}`)
                    }
                } else {
                    // Игрок не в зоне атаки - сбрасываем кулдаун для немедленной атаки при приближении
                    bear.attackCooldown = 0
                }
            }
        }
        
        if (tick % 6 !== 0) return
        
        if (pigs.length === 0 && cows.length === 0 && bears.length === 0) return

        for (const pig of pigs) {
        const { id, mesh, body } = pig
        if (!mesh || !body) continue

        const pos = currentNoa.entities.getPosition(id)
        if (!pos) continue

        // Уменьшаем таймеры
        pig.directionChangeTimer--
        pig.jumpCooldown--
        pig.stuckCheckCounter++

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
        const pigWidth = body.width || 0.7
        const checkHeight = Math.ceil(pigHeight)
        
        // Улучшенная проверка застревания: проверяем блоки вокруг животного
        const centerBlockY = Math.floor(pos[1])
        const centerBlockX = Math.floor(pos[0])
        const centerBlockZ = Math.floor(pos[2])
        
        // Проверяем блоки на разных уровнях и позициях (центр, углы)
        const checkPositions = [
            [centerBlockX, centerBlockY, centerBlockZ], // Центр - ноги
            [centerBlockX, centerBlockY + 1, centerBlockZ], // Центр - тело
            [centerBlockX, centerBlockY + 2, centerBlockZ], // Центр - голова
            [centerBlockX - 1, centerBlockY, centerBlockZ], // Слева - ноги
            [centerBlockX + 1, centerBlockY, centerBlockZ], // Справа - ноги
            [centerBlockX, centerBlockY, centerBlockZ - 1], // Сзади - ноги
            [centerBlockX, centerBlockY, centerBlockZ + 1], // Впереди - ноги
        ]
        
        let isInsideBlock = false
        for (const [bx, by, bz] of checkPositions) {
            const block = currentNoa.getBlock(bx, by, bz)
            if (block !== 0) {
                isInsideBlock = true
                break
            }
        }
        
        // Проверка 2: Свинья не двигается (проверяем каждые 20 тиков = ~0.33 секунды)
        let isNotMoving = false
        if (pig.stuckCheckCounter >= 20) {
            const lastPos = pig.lastPosition
            const distance = Math.sqrt(
                Math.pow(pos[0] - lastPos[0], 2) + 
                Math.pow(pos[1] - lastPos[1], 2) + 
                Math.pow(pos[2] - lastPos[2], 2)
            )
            // Минимальное ожидаемое расстояние = скорость * время * коэффициент
            // За 0.33 секунды при скорости 0.2-0.35 свинья должна пройти минимум 0.05-0.1 блока
            const minExpectedDistance = Math.max(0.05, pig.speed * 0.33 * 0.3) // 30% от ожидаемого расстояния
            // Если свинья не двигается достаточно, и она на земле, и не падает/не прыгает
            // Проверяем только горизонтальное движение (игнорируем вертикальное)
            const horizontalDistance = Math.sqrt(
                Math.pow(pos[0] - lastPos[0], 2) + 
                Math.pow(pos[2] - lastPos[2], 2)
            )
            isNotMoving = horizontalDistance < minExpectedDistance && 
                         under !== 0 && 
                         Math.abs(body.velocity[1]) < 0.3 // Не падает и не прыгает
            pig.stuckCheckCounter = 0
            pig.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        // Если свинья застряла (внутри блока или не двигается), выталкиваем её
        if (isInsideBlock || isNotMoving) {
            // Ищем ближайшее свободное место в радиусе 5 блоков
            let foundFreeSpot = false
            let freeX = pos[0]
            let freeY = pos[1]
            let freeZ = pos[2]
            let bestDistance = Infinity
            
            // Получаем высоту свиньи из физического тела
            const pigHeight = body.height || 1.2
            const checkHeight = Math.ceil(pigHeight)
            const offsetY = pigHeight / 2
            
            // Ищем ближайшее свободное место (не только первое найденное)
            for (let radius = 1; radius <= 5; radius++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        // Пропускаем центр
                        if (dx === 0 && dz === 0) continue
                        
                        const checkX = Math.floor(pos[0] + dx)
                        const checkZ = Math.floor(pos[2] + dz)
                        // Проверяем несколько уровней по Y
                        for (let dy = -2; dy <= 2; dy++) {
                            const checkY = Math.floor(pos[1]) + dy
                            
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
                                const distance = Math.sqrt(dx * dx + dz * dz + dy * dy)
                                if (distance < bestDistance) {
                                    bestDistance = distance
                                    foundFreeSpot = true
                                    freeX = checkX + 0.5
                                    freeY = checkY + 1 + offsetY
                                    freeZ = checkZ + 0.5
                                }
                            }
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
                // Обновляем последнюю позицию
                pig.lastPosition = [freeX, freeY, freeZ]
                // Меняем направление, чтобы не застрять снова (голова повернется сама)
                // Ограничиваем поворот до ±90° от текущего направления
                const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                pig.targetAngle = currentMovementAngle + angleDiff
                while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
            } else {
                // Если не нашли место, выталкиваем вверх и в случайную сторону
                const pushAngle = Math.random() * Math.PI * 2
                body.velocity[1] = 0.8
                body.velocity[0] = Math.cos(pushAngle) * 0.6
                body.velocity[2] = Math.sin(pushAngle) * 0.6
                // Также напрямую перемещаем вверх
                const newPos = [pos[0], pos[1] + 2, pos[2]]
                currentNoa.entities.setPosition(id, newPos)
                pig.lastPosition = [newPos[0], newPos[1], newPos[2]]
                // Меняем направление (голова повернется сама)
                // Ограничиваем поворот до ±90° от текущего направления
                const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                let angleDiff = pushAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                pig.targetAngle = currentMovementAngle + angleDiff
                while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
            }
            continue
        }
        
        // Обновляем последнюю позицию для проверки движения
        if (pig.stuckCheckCounter === 0) {
            pig.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        if (under === 0) {
            // Падаем вниз
            body.velocity[1] = -0.1
        }

        // Периодическая смена направления (каждые 3-8 секунд)
        // Ограничиваем повороты до 90° в каждую сторону, чтобы не шли назад
        if (pig.directionChangeTimer <= 0) {
            // Получаем текущий угол движения
            const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
            
            // Выбираем случайный угол, но ограничиваем его до ±90° от текущего направления
            const randomAngle = Math.random() * Math.PI * 2
            let angleDiff = randomAngle - currentMovementAngle
            
            // Нормализуем разницу углов в диапазон [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
            
            // Ограничиваем поворот до ±90° (π/2) в каждую сторону
            const maxTurn = Math.PI / 2
            if (angleDiff > maxTurn) {
                angleDiff = maxTurn
            } else if (angleDiff < -maxTurn) {
                angleDiff = -maxTurn
            }
            
            // Новый целевой угол = текущий угол + ограниченный поворот
            pig.targetAngle = currentMovementAngle + angleDiff
            
            // Нормализуем угол в диапазон [0, 2π]
            while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
            while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
            
            pig.directionChangeTimer = 180 + Math.floor(Math.random() * 300) // 3-8 секунд
        }

        // Плавная интерполяция угла поворота головы к целевому углу движения
        // В Babylon.js: rotation.y = 0 означает смотрение вперед по +Z
        // targetAngle - это угол движения (0 = вперед по +Z, π/2 = влево по -X, и т.д.)
        // targetRotation = targetAngle - π/2 (преобразуем угол движения в угол поворота меша)
        const targetRotation = pig.targetAngle - Math.PI / 2
        let angleDiff = targetRotation - pig.currentRotation
        
        // Нормализуем разницу углов в диапазон [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
        
        // Плавная интерполяция с коэффициентом 0.3 (быстрее поворот)
        const rotationSpeed = 0.3
        pig.currentRotation += angleDiff * rotationSpeed
        
        // Применяем поворот к мешу - голова теперь будет плавно поворачиваться
        mesh.rotation.y = pig.currentRotation
        
        // Обновляем угол движения только когда голова достаточно повернута
        if (Math.abs(angleDiff) < 0.2) {
            pig.angle = pig.targetAngle
        }
        
        // Улучшенная проверка препятствий и прыжков
        // Проверяем блоки впереди на разных уровнях
        if (under !== 0 && Math.abs(body.velocity[1]) < 0.1) {
            const checkDistance = (pigWidth / 2) + 0.15 // Половина ширины + запас
            const fx = pos[0] + Math.sin(pig.currentRotation) * checkDistance
            const fz = pos[2] + Math.cos(pig.currentRotation) * checkDistance
            const currentY = Math.floor(pos[1])
            const feetY = currentY // Уровень ног
            const bodyY = currentY + 1 // Уровень тела
            const headY = checkHeight > 1 ? currentY + 2 : currentY + 1 // Уровень головы
            
            const blockAtFeet = currentNoa.getBlock(Math.floor(fx), feetY, Math.floor(fz))
            const blockAtBody = currentNoa.getBlock(Math.floor(fx), bodyY, Math.floor(fz))
            const blockAtHead = currentNoa.getBlock(Math.floor(fx), headY, Math.floor(fz))
            
            // Если блок на уровне ног - это препятствие, меняем направление
            if (blockAtFeet !== 0) {
                // Препятствие на уровне ног - меняем направление
                const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                pig.targetAngle = currentMovementAngle + angleDiff
                while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
                pig.directionChangeTimer = 15
            }
            // Если блок на уровне тела, но не на уровне ног - прыгаем
            else if (blockAtBody !== 0 && blockAtFeet === 0 && pig.jumpCooldown <= 0) {
                // Блок выше уровня ног - проверяем, можем ли перепрыгнуть
                const jumpCheckY = headY + 1 // Проверяем место над головой
                const jumpCheckBlock = currentNoa.getBlock(Math.floor(fx), jumpCheckY, Math.floor(fz))
                
                if (jumpCheckBlock === 0) {
                    // Можем перепрыгнуть - прыгаем!
                    body.velocity[1] = 0.4
                    body.velocity[0] = Math.sin(pig.currentRotation) * pig.speed * 2
                    body.velocity[2] = Math.cos(pig.currentRotation) * pig.speed * 2
                    pig.jumpCooldown = 30
                } else {
                    // Не можем перепрыгнуть - меняем направление
                    const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                    const randomAngle = Math.random() * Math.PI * 2
                    let angleDiff = randomAngle - currentMovementAngle
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                    const maxTurn = Math.PI / 2
                    if (angleDiff > maxTurn) angleDiff = maxTurn
                    if (angleDiff < -maxTurn) angleDiff = -maxTurn
                    pig.targetAngle = currentMovementAngle + angleDiff
                    while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                    while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
                    pig.directionChangeTimer = 15
                }
            }
            // Если блок на уровне головы - меняем направление
            else if (blockAtHead !== 0 && blockAtFeet === 0 && blockAtBody === 0) {
                // Блок только на уровне головы - меняем направление
                const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                pig.targetAngle = currentMovementAngle + angleDiff
                while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
                pig.directionChangeTimer = 15
            }
        }
        
        // Движение - ВСЕГДА в направлении головы (куда смотрит голова)
        // В Babylon.js: rotation.y = 0 означает смотрение вперед по +Z
        // Для движения в направлении головы: velocity[0] = sin(rotation.y), velocity[2] = cos(rotation.y)
        // Если голова еще не повернута достаточно, не двигаемся (или двигаемся медленнее)
        const angleDiffForMovement = Math.abs(angleDiff)
        const isHeadAligned = angleDiffForMovement < 0.3 // Голова достаточно повернута
        
        // Вычисляем угол движения из угла поворота головы
        // currentRotation - это угол поворота меша (rotation.y)
        // Для движения: X = sin(rotation.y), Z = cos(rotation.y)
        const moveSpeed = pig.speed * 4
        
        // Если голова не повернута достаточно, замедляем движение
        const speedMultiplier = isHeadAligned ? 1.0 : Math.max(0.3, 1.0 - angleDiffForMovement / Math.PI)
        
        // Проверяем, стоим ли на земле
        const isOnGround = under !== 0 || (body.velocity[1] >= -0.1 && body.velocity[1] < 0.3)
        
        if (isOnGround) {
            // ПРОВЕРКА ПРЕПЯТСТВИЙ ПЕРЕД ДВИЖЕНИЕМ - чтобы не заходить в блоки
            // Проверяем блоки впереди на расстоянии равном половине ширины + небольшой запас
            const checkDistance = (pigWidth / 2) + 0.1 // Половина ширины + небольшой запас
            const nextX = pos[0] + Math.sin(pig.currentRotation) * checkDistance
            const nextZ = pos[2] + Math.cos(pig.currentRotation) * checkDistance
            const currentY = Math.floor(pos[1])
            
            // Проверяем блоки на разных высотах (ноги, тело, голова)
            const blockAtFeet = currentNoa.getBlock(Math.floor(nextX), currentY, Math.floor(nextZ))
            const blockAtBody = currentNoa.getBlock(Math.floor(nextX), currentY + 1, Math.floor(nextZ))
            const blockAtHead = checkHeight > 1 ? currentNoa.getBlock(Math.floor(nextX), currentY + 2, Math.floor(nextZ)) : 0
            
            // Если есть препятствие впереди, не двигаемся (или меняем направление)
            if (blockAtFeet !== 0 || blockAtBody !== 0 || blockAtHead !== 0) {
                // Препятствие впереди - останавливаемся и меняем направление
                body.velocity[0] = 0
                body.velocity[2] = 0
                
                // Меняем направление (голова повернется сама)
                const currentMovementAngle = pig.angle !== undefined ? pig.angle : (pig.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let turnAngleDiff = randomAngle - currentMovementAngle
                while (turnAngleDiff > Math.PI) turnAngleDiff -= 2 * Math.PI
                while (turnAngleDiff < -Math.PI) turnAngleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (turnAngleDiff > maxTurn) turnAngleDiff = maxTurn
                if (turnAngleDiff < -maxTurn) turnAngleDiff = -maxTurn
                pig.targetAngle = currentMovementAngle + turnAngleDiff
                while (pig.targetAngle < 0) pig.targetAngle += 2 * Math.PI
                while (pig.targetAngle >= 2 * Math.PI) pig.targetAngle -= 2 * Math.PI
                pig.directionChangeTimer = 15
            } else {
                // Нет препятствий - идем строго вперед в направлении головы
                // Формула для движения в Babylon.js: X = sin(rotation.y), Z = cos(rotation.y)
                body.velocity[0] = Math.sin(pig.currentRotation) * moveSpeed * speedMultiplier
                body.velocity[2] = Math.cos(pig.currentRotation) * moveSpeed * speedMultiplier
                
                // Обновляем pig.angle для отслеживания текущего направления движения
                pig.angle = pig.currentRotation + Math.PI / 2
            }
        } else {
            // Падаем - замедляем горизонтальное движение
            body.velocity[0] *= 0.9
            body.velocity[2] *= 0.9
        }
    }
    
    // Обработка движения коров (аналогично свиньям)
    for (const cow of cows) {
        const { id, mesh, body } = cow
        if (!mesh || !body) continue

        const pos = currentNoa.entities.getPosition(id)
        if (!pos) continue

        cow.directionChangeTimer--
        cow.jumpCooldown--
        cow.stuckCheckCounter++

        const groundX = Math.floor(pos[0])
        const groundY = Math.floor(pos[1])
        const groundZ = Math.floor(pos[2])
        let under = currentNoa.getBlock(groundX, groundY - 1, groundZ)
        if (under === 0) {
            under = currentNoa.getBlock(groundX - 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX + 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ - 1) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ + 1) ||
                    0
        }
        
        const cowHeight = body.height || 1.5
        const checkHeight = Math.ceil(cowHeight)
        
        // Улучшенная проверка застревания: проверяем блоки вокруг животного
        const centerBlockY = Math.floor(pos[1])
        const centerBlockX = Math.floor(pos[0])
        const centerBlockZ = Math.floor(pos[2])
        
        // Проверяем блоки на разных уровнях и позициях (центр, углы)
        const checkPositions = [
            [centerBlockX, centerBlockY, centerBlockZ], // Центр - ноги
            [centerBlockX, centerBlockY + 1, centerBlockZ], // Центр - тело
            [centerBlockX, centerBlockY + 2, centerBlockZ], // Центр - голова
            [centerBlockX - 1, centerBlockY, centerBlockZ], // Слева - ноги
            [centerBlockX + 1, centerBlockY, centerBlockZ], // Справа - ноги
            [centerBlockX, centerBlockY, centerBlockZ - 1], // Сзади - ноги
            [centerBlockX, centerBlockY, centerBlockZ + 1], // Впереди - ноги
        ]
        
        let isInsideBlock = false
        for (const [bx, by, bz] of checkPositions) {
            const block = currentNoa.getBlock(bx, by, bz)
            if (block !== 0) {
                isInsideBlock = true
                break
            }
        }
        
        let isNotMoving = false
        if (cow.stuckCheckCounter >= 20) {
            const lastPos = cow.lastPosition
            const horizontalDistance = Math.sqrt(
                Math.pow(pos[0] - lastPos[0], 2) + 
                Math.pow(pos[2] - lastPos[2], 2)
            )
            const minExpectedDistance = Math.max(0.05, cow.speed * 0.33 * 0.3)
            isNotMoving = horizontalDistance < minExpectedDistance && 
                         under !== 0 && 
                         Math.abs(body.velocity[1]) < 0.3
            cow.stuckCheckCounter = 0
            cow.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        if (isInsideBlock || isNotMoving) {
            let foundFreeSpot = false
            let freeX = pos[0]
            let freeY = pos[1]
            let freeZ = pos[2]
            let bestDistance = Infinity
            
            const offsetY = cowHeight / 2
            
            for (let radius = 1; radius <= 5; radius++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        if (dx === 0 && dz === 0) continue
                        
                        const checkX = Math.floor(pos[0] + dx)
                        const checkZ = Math.floor(pos[2] + dz)
                        for (let dy = -2; dy <= 2; dy++) {
                            const checkY = Math.floor(pos[1]) + dy
                            
                            const blockAtFeet = currentNoa.getBlock(checkX, checkY, checkZ)
                            const blockAtBody = currentNoa.getBlock(checkX, checkY + 1, checkZ)
                            const blockUnder = currentNoa.getBlock(checkX, checkY - 1, checkZ)
                            
                            let isFree = blockAtFeet === 0 && blockAtBody === 0 && blockUnder !== 0
                            if (checkHeight > 1) {
                                const blockAtHead = currentNoa.getBlock(checkX, checkY + 2, checkZ)
                                isFree = isFree && blockAtHead === 0
                            }
                            
                            if (isFree) {
                                const distance = Math.sqrt(dx * dx + dz * dz + dy * dy)
                                if (distance < bestDistance) {
                                    bestDistance = distance
                                    foundFreeSpot = true
                                    freeX = checkX + 0.5
                                    freeY = checkY + 1 + offsetY
                                    freeZ = checkZ + 0.5
                                }
                            }
                        }
                    }
                }
            }
            
            if (foundFreeSpot) {
                currentNoa.entities.setPosition(id, [freeX, freeY, freeZ])
                body.velocity[0] = 0
                body.velocity[1] = 0
                body.velocity[2] = 0
                cow.lastPosition = [freeX, freeY, freeZ]
                // Меняем направление (голова повернется сама)
                // Ограничиваем поворот до ±90° от текущего направления
                const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                cow.targetAngle = currentMovementAngle + angleDiff
                while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
            } else {
                const pushAngle = Math.random() * Math.PI * 2
                body.velocity[1] = 0.8
                body.velocity[0] = Math.cos(pushAngle) * 0.6
                body.velocity[2] = Math.sin(pushAngle) * 0.6
                const newPos = [pos[0], pos[1] + 2, pos[2]]
                currentNoa.entities.setPosition(id, newPos)
                cow.lastPosition = [newPos[0], newPos[1], newPos[2]]
                // Ограничиваем поворот до ±90° от текущего направления
                const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                let angleDiff = pushAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                cow.targetAngle = currentMovementAngle + angleDiff
                while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
            }
            continue
        }
        
        if (cow.stuckCheckCounter === 0) {
            cow.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        if (under === 0) {
            body.velocity[1] = -0.1
        }

        // Периодическая смена направления (каждые 3-8 секунд)
        // Ограничиваем повороты до 90° в каждую сторону, чтобы не шли назад
        if (cow.directionChangeTimer <= 0) {
            // Получаем текущий угол движения
            const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
            
            // Выбираем случайный угол, но ограничиваем его до ±90° от текущего направления
            const randomAngle = Math.random() * Math.PI * 2
            let angleDiff = randomAngle - currentMovementAngle
            
            // Нормализуем разницу углов в диапазон [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
            
            // Ограничиваем поворот до ±90° (π/2) в каждую сторону
            const maxTurn = Math.PI / 2
            if (angleDiff > maxTurn) {
                angleDiff = maxTurn
            } else if (angleDiff < -maxTurn) {
                angleDiff = -maxTurn
            }
            
            // Новый целевой угол = текущий угол + ограниченный поворот
            cow.targetAngle = currentMovementAngle + angleDiff
            
            // Нормализуем угол в диапазон [0, 2π]
            while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
            while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
            
            cow.directionChangeTimer = 180 + Math.floor(Math.random() * 300)
        }

        // Плавная интерполяция угла поворота головы к целевому углу движения
        const targetRotation = cow.targetAngle - Math.PI / 2
        let angleDiff = targetRotation - cow.currentRotation
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
        
        const rotationSpeed = 0.3
        cow.currentRotation += angleDiff * rotationSpeed
        
        mesh.rotation.y = cow.currentRotation
        
        // Обновляем угол движения только когда голова достаточно повернута
        if (Math.abs(angleDiff) < 0.2) {
            cow.angle = cow.targetAngle
        }
        
        // Улучшенная проверка препятствий и прыжков
        // Проверяем блоки впереди на разных уровнях
        if (under !== 0 && Math.abs(body.velocity[1]) < 0.1) {
            const cowWidth = body.width || 0.9
            const cowHeight = body.height || 1.4
            const checkHeight = Math.ceil(cowHeight)
            const checkDistance = (cowWidth / 2) + 0.15 // Половина ширины + запас
            const fx = pos[0] + Math.sin(cow.currentRotation) * checkDistance
            const fz = pos[2] + Math.cos(cow.currentRotation) * checkDistance
            const currentY = Math.floor(pos[1])
            const feetY = currentY // Уровень ног
            const bodyY = currentY + 1 // Уровень тела
            const headY = checkHeight > 1 ? currentY + 2 : currentY + 1 // Уровень головы
            
            const blockAtFeet = currentNoa.getBlock(Math.floor(fx), feetY, Math.floor(fz))
            const blockAtBody = currentNoa.getBlock(Math.floor(fx), bodyY, Math.floor(fz))
            const blockAtHead = currentNoa.getBlock(Math.floor(fx), headY, Math.floor(fz))
            
            // Если блок на уровне ног - это препятствие, меняем направление
            if (blockAtFeet !== 0) {
                // Препятствие на уровне ног - меняем направление
                const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                cow.targetAngle = currentMovementAngle + angleDiff
                while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
                cow.directionChangeTimer = 15
            }
            // Если блок на уровне тела, но не на уровне ног - прыгаем
            else if (blockAtBody !== 0 && blockAtFeet === 0 && cow.jumpCooldown <= 0) {
                // Блок выше уровня ног - проверяем, можем ли перепрыгнуть
                const jumpCheckY = headY + 1 // Проверяем место над головой
                const jumpCheckBlock = currentNoa.getBlock(Math.floor(fx), jumpCheckY, Math.floor(fz))
                
                if (jumpCheckBlock === 0) {
                    // Можем перепрыгнуть - прыгаем!
                    body.velocity[1] = 0.4
                    body.velocity[0] = Math.sin(cow.currentRotation) * cow.speed * 2
                    body.velocity[2] = Math.cos(cow.currentRotation) * cow.speed * 2
                    cow.jumpCooldown = 30
                } else {
                    // Не можем перепрыгнуть - меняем направление
                    const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                    const randomAngle = Math.random() * Math.PI * 2
                    let angleDiff = randomAngle - currentMovementAngle
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                    const maxTurn = Math.PI / 2
                    if (angleDiff > maxTurn) angleDiff = maxTurn
                    if (angleDiff < -maxTurn) angleDiff = -maxTurn
                    cow.targetAngle = currentMovementAngle + angleDiff
                    while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                    while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
                    cow.directionChangeTimer = 15
                }
            }
            // Если блок на уровне головы - меняем направление
            else if (blockAtHead !== 0 && blockAtFeet === 0 && blockAtBody === 0) {
                // Блок только на уровне головы - меняем направление
                const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                cow.targetAngle = currentMovementAngle + angleDiff
                while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
                cow.directionChangeTimer = 15
            }
        }
        
        // Движение - ВСЕГДА в направлении головы (куда смотрит голова)
        // В Babylon.js: rotation.y = 0 означает смотрение вперед по +Z
        // Для движения в направлении головы: velocity[0] = sin(rotation.y), velocity[2] = cos(rotation.y)
        // Если голова еще не повернута достаточно, не двигаемся (или двигаемся медленнее)
        const angleDiffForMovement = Math.abs(angleDiff)
        const isHeadAligned = angleDiffForMovement < 0.3 // Голова достаточно повернута
        
        // Вычисляем угол движения из угла поворота головы
        // currentRotation - это угол поворота меша (rotation.y)
        // Для движения: X = sin(rotation.y), Z = cos(rotation.y)
        const moveSpeed = cow.speed * 4
        
        // Если голова не повернута достаточно, замедляем движение
        const speedMultiplier = isHeadAligned ? 1.0 : Math.max(0.3, 1.0 - angleDiffForMovement / Math.PI)
        
        const isOnGround = under !== 0 || (body.velocity[1] >= -0.1 && body.velocity[1] < 0.3)
        
        if (isOnGround) {
            // ПРОВЕРКА ПРЕПЯТСТВИЙ ПЕРЕД ДВИЖЕНИЕМ - чтобы не заходить в блоки
            // Получаем размеры коровы из физического тела
            const cowWidth = body.width || 0.9
            const cowHeight = body.height || 1.4
            const checkHeight = Math.ceil(cowHeight)
            
            // Проверяем блоки впереди на расстоянии равном половине ширины + небольшой запас
            const checkDistance = (cowWidth / 2) + 0.1 // Половина ширины + небольшой запас
            const nextX = pos[0] + Math.sin(cow.currentRotation) * checkDistance
            const nextZ = pos[2] + Math.cos(cow.currentRotation) * checkDistance
            const currentY = Math.floor(pos[1])
            
            // Проверяем блоки на разных высотах (ноги, тело, голова)
            const blockAtFeet = currentNoa.getBlock(Math.floor(nextX), currentY, Math.floor(nextZ))
            const blockAtBody = currentNoa.getBlock(Math.floor(nextX), currentY + 1, Math.floor(nextZ))
            const blockAtHead = checkHeight > 1 ? currentNoa.getBlock(Math.floor(nextX), currentY + 2, Math.floor(nextZ)) : 0
            
            // Если есть препятствие впереди, не двигаемся (или меняем направление)
            if (blockAtFeet !== 0 || blockAtBody !== 0 || blockAtHead !== 0) {
                // Препятствие впереди - останавливаемся и меняем направление
                body.velocity[0] = 0
                body.velocity[2] = 0
                
                // Меняем направление (голова повернется сама)
                const currentMovementAngle = cow.angle !== undefined ? cow.angle : (cow.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let turnAngleDiff = randomAngle - currentMovementAngle
                while (turnAngleDiff > Math.PI) turnAngleDiff -= 2 * Math.PI
                while (turnAngleDiff < -Math.PI) turnAngleDiff += 2 * Math.PI
                const maxTurn = Math.PI / 2
                if (turnAngleDiff > maxTurn) turnAngleDiff = maxTurn
                if (turnAngleDiff < -maxTurn) turnAngleDiff = -maxTurn
                cow.targetAngle = currentMovementAngle + turnAngleDiff
                while (cow.targetAngle < 0) cow.targetAngle += 2 * Math.PI
                while (cow.targetAngle >= 2 * Math.PI) cow.targetAngle -= 2 * Math.PI
                cow.directionChangeTimer = 15
            } else {
                // Нет препятствий - идем строго вперед в направлении головы
                // Формула для движения в Babylon.js: X = sin(rotation.y), Z = cos(rotation.y)
                body.velocity[0] = Math.sin(cow.currentRotation) * moveSpeed * speedMultiplier
                body.velocity[2] = Math.cos(cow.currentRotation) * moveSpeed * speedMultiplier
                
                // Обновляем cow.angle для отслеживания текущего направления движения
                cow.angle = cow.currentRotation + Math.PI / 2
            }
        } else {
            // Падаем - замедляем горизонтальное движение
            body.velocity[0] *= 0.9
            body.velocity[2] *= 0.9
        }
    }
    
    // ================================
    // ОБРАБОТКА ПАТРУЛИРОВАНИЯ МЕДВЕДЕЙ (только если игрок не в зоне агрессии)
    // ================================
    for (const bear of bears) {
        const { id, mesh, body } = bear
        if (!mesh || !body) continue

        const pos = currentNoa.entities.getPosition(id)
        if (!pos) continue

        // Получаем позицию игрока для проверки зоны агрессии
        let isPlayerInAggroRange = false
        const AGGRO_RANGE = 10.0 // Зона агрессии - 10 блоков
        
        if (currentNoa.playerEntity) {
            const playerPos = currentNoa.entities.getPosition(currentNoa.playerEntity)
            if (playerPos) {
                const dx = playerPos[0] - pos[0]
                const dy = playerPos[1] - pos[1]
                const dz = playerPos[2] - pos[2]
                const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz)
                isPlayerInAggroRange = distanceToPlayer <= AGGRO_RANGE
            }
        }
        
        // Пропускаем патрулирование, если игрок в зоне агрессии (преследование обрабатывается каждый тик выше)
        if (isPlayerInAggroRange) {
            continue
        }

        // Уменьшаем таймеры
        bear.directionChangeTimer--
        bear.jumpCooldown--
        bear.stuckCheckCounter++

        // Проверка блока под медведем
        const groundX = Math.floor(pos[0])
        const groundY = Math.floor(pos[1])
        const groundZ = Math.floor(pos[2])
        let under = currentNoa.getBlock(groundX, groundY - 1, groundZ)
        if (under === 0) {
            under = currentNoa.getBlock(groundX - 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX + 1, groundY - 1, groundZ) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ - 1) ||
                    currentNoa.getBlock(groundX, groundY - 1, groundZ + 1) ||
                    0
        }
        
        const bearHeight = body.height || 1.8
        const bearWidth = body.width || 1.2
        const checkHeight = Math.ceil(bearHeight)
        
        // Проверка застревания (аналогично свиньям и коровам)
        const centerBlockY = Math.floor(pos[1])
        const centerBlockX = Math.floor(pos[0])
        const centerBlockZ = Math.floor(pos[2])
        
        const checkPositions = [
            [centerBlockX, centerBlockY, centerBlockZ],
            [centerBlockX, centerBlockY + 1, centerBlockZ],
            [centerBlockX, centerBlockY + 2, centerBlockZ],
            [centerBlockX - 1, centerBlockY, centerBlockZ],
            [centerBlockX + 1, centerBlockY, centerBlockZ],
            [centerBlockX, centerBlockY, centerBlockZ - 1],
            [centerBlockX, centerBlockY, centerBlockZ + 1],
        ]
        
        let isInsideBlock = false
        for (const [bx, by, bz] of checkPositions) {
            const block = currentNoa.getBlock(bx, by, bz)
            if (block !== 0) {
                isInsideBlock = true
                break
            }
        }
        
        let isNotMoving = false
        if (bear.stuckCheckCounter >= 20) {
            const lastPos = bear.lastPosition
            const horizontalDistance = Math.sqrt(
                Math.pow(pos[0] - lastPos[0], 2) + 
                Math.pow(pos[2] - lastPos[2], 2)
            )
            const minExpectedDistance = Math.max(0.05, bear.speed * 0.33 * 0.3)
            isNotMoving = horizontalDistance < minExpectedDistance && 
                         under !== 0 && 
                         Math.abs(body.velocity[1]) < 0.3
            bear.stuckCheckCounter = 0
            bear.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        if (isInsideBlock || isNotMoving) {
            // Логика выталкивания из блока (аналогично свиньям)
            let foundFreeSpot = false
            let freeX = pos[0]
            let freeY = pos[1]
            let freeZ = pos[2]
            let bestDistance = Infinity
            
            const offsetY = bearHeight / 2
            
            for (let radius = 1; radius <= 5; radius++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        if (dx === 0 && dz === 0) continue
                        
                        const checkX = Math.floor(pos[0] + dx)
                        const checkZ = Math.floor(pos[2] + dz)
                        for (let dy = -2; dy <= 2; dy++) {
                            const checkY = Math.floor(pos[1]) + dy
                            
                            const blockAtFeet = currentNoa.getBlock(checkX, checkY, checkZ)
                            const blockAtBody = currentNoa.getBlock(checkX, checkY + 1, checkZ)
                            const blockUnder = currentNoa.getBlock(checkX, checkY - 1, checkZ)
                            
                            let isFree = blockAtFeet === 0 && blockAtBody === 0 && blockUnder !== 0
                            if (checkHeight > 1) {
                                const blockAtHead = currentNoa.getBlock(checkX, checkY + 2, checkZ)
                                isFree = isFree && blockAtHead === 0
                            }
                            
                            if (isFree) {
                                const distance = Math.sqrt(dx * dx + dz * dz + dy * dy)
                                if (distance < bestDistance) {
                                    bestDistance = distance
                                    foundFreeSpot = true
                                    freeX = checkX + 0.5
                                    freeY = checkY + 1 + offsetY
                                    freeZ = checkZ + 0.5
                                }
                            }
                        }
                    }
                }
            }
            
            if (foundFreeSpot) {
                currentNoa.entities.setPosition(id, [freeX, freeY, freeZ])
                body.velocity[0] = 0
                body.velocity[1] = 0
                body.velocity[2] = 0
                bear.lastPosition = [freeX, freeY, freeZ]
            }
            continue
        }
        
        if (bear.stuckCheckCounter === 0) {
            bear.lastPosition = [pos[0], pos[1], pos[2]]
        }
        
        if (under === 0) {
            body.velocity[1] = -0.1
        }

        // Обычное патрулирование (только если игрок не в зоне агрессии)
            // Убеждаемся, что у медведя есть целевой угол для движения
            if (bear.targetAngle === undefined || bear.targetAngle === null) {
                const currentMovementAngle = bear.angle !== undefined ? bear.angle : (bear.currentRotation + Math.PI / 2)
                bear.targetAngle = currentMovementAngle
            }
            
            // Периодическая смена направления (каждые 3-8 секунд)
            if (bear.directionChangeTimer <= 0) {
                const currentMovementAngle = bear.angle !== undefined ? bear.angle : (bear.currentRotation + Math.PI / 2)
                const randomAngle = Math.random() * Math.PI * 2
                let angleDiff = randomAngle - currentMovementAngle
                
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
                
                const maxTurn = Math.PI / 2
                if (angleDiff > maxTurn) angleDiff = maxTurn
                if (angleDiff < -maxTurn) angleDiff = -maxTurn
                
                bear.targetAngle = currentMovementAngle + angleDiff
                while (bear.targetAngle < 0) bear.targetAngle += 2 * Math.PI
                while (bear.targetAngle >= 2 * Math.PI) bear.targetAngle -= 2 * Math.PI
                
                bear.directionChangeTimer = 180 + Math.floor(Math.random() * 300)
            }

            // Плавная интерполяция угла поворота
            const targetRotation = bear.targetAngle - Math.PI / 2
            let rotationAngleDiff = targetRotation - bear.currentRotation
            
            while (rotationAngleDiff > Math.PI) rotationAngleDiff -= 2 * Math.PI
            while (rotationAngleDiff < -Math.PI) rotationAngleDiff += 2 * Math.PI
            
            const rotationSpeed = 0.3
            bear.currentRotation += rotationAngleDiff * rotationSpeed
            mesh.rotation.y = bear.currentRotation
            
            if (Math.abs(rotationAngleDiff) < 0.2) {
                bear.angle = bear.targetAngle
            }

            // Сохраняем rotationAngleDiff для использования ниже
            const savedRotationAngleDiff = rotationAngleDiff

            // Проверка препятствий и движение
            if (under !== 0 && Math.abs(body.velocity[1]) < 0.1) {
                const checkDistance = (bearWidth / 2) + 0.15
                const fx = pos[0] + Math.sin(bear.currentRotation) * checkDistance
                const fz = pos[2] + Math.cos(bear.currentRotation) * checkDistance
                const currentY = Math.floor(pos[1])
                
                const blockAtFeet = currentNoa.getBlock(Math.floor(fx), currentY, Math.floor(fz))
                const blockAtBody = currentNoa.getBlock(Math.floor(fx), currentY + 1, Math.floor(fz))
                const blockAtHead = checkHeight > 1 ? currentNoa.getBlock(Math.floor(fx), currentY + 2, Math.floor(fz)) : 0
                
                if (blockAtFeet !== 0) {
                    const currentMovementAngle = bear.angle !== undefined ? bear.angle : (bear.currentRotation + Math.PI / 2)
                    const randomAngle = Math.random() * Math.PI * 2
                    let obstacleAngleDiff = randomAngle - currentMovementAngle
                    while (obstacleAngleDiff > Math.PI) obstacleAngleDiff -= 2 * Math.PI
                    while (obstacleAngleDiff < -Math.PI) obstacleAngleDiff += 2 * Math.PI
                    const maxTurn = Math.PI / 2
                    if (obstacleAngleDiff > maxTurn) obstacleAngleDiff = maxTurn
                    if (obstacleAngleDiff < -maxTurn) obstacleAngleDiff = -maxTurn
                    bear.targetAngle = currentMovementAngle + obstacleAngleDiff
                    while (bear.targetAngle < 0) bear.targetAngle += 2 * Math.PI
                    while (bear.targetAngle >= 2 * Math.PI) bear.targetAngle -= 2 * Math.PI
                    bear.directionChangeTimer = 15
                } else if (blockAtBody !== 0 && blockAtFeet === 0 && bear.jumpCooldown <= 0) {
                    const jumpCheckY = (checkHeight > 1 ? currentY + 2 : currentY + 1) + 1
                    const jumpCheckBlock = currentNoa.getBlock(Math.floor(fx), jumpCheckY, Math.floor(fz))
                    
                    if (jumpCheckBlock === 0) {
                        body.velocity[1] = 0.4
                        body.velocity[0] = Math.sin(bear.currentRotation) * bear.speed * 2
                        body.velocity[2] = Math.cos(bear.currentRotation) * bear.speed * 2
                        bear.jumpCooldown = 30
                    } else {
                        const currentMovementAngle = bear.angle !== undefined ? bear.angle : (bear.currentRotation + Math.PI / 2)
                        const randomAngle = Math.random() * Math.PI * 2
                        let obstacleAngleDiff = randomAngle - currentMovementAngle
                        while (obstacleAngleDiff > Math.PI) obstacleAngleDiff -= 2 * Math.PI
                        while (obstacleAngleDiff < -Math.PI) obstacleAngleDiff += 2 * Math.PI
                        const maxTurn = Math.PI / 2
                        if (obstacleAngleDiff > maxTurn) obstacleAngleDiff = maxTurn
                        if (obstacleAngleDiff < -maxTurn) obstacleAngleDiff = -maxTurn
                        bear.targetAngle = currentMovementAngle + obstacleAngleDiff
                        while (bear.targetAngle < 0) bear.targetAngle += 2 * Math.PI
                        while (bear.targetAngle >= 2 * Math.PI) bear.targetAngle -= 2 * Math.PI
                        bear.directionChangeTimer = 15
                    }
                }
            }
            
            // Движение в направлении головы
            const angleDiffForMovement = Math.abs(savedRotationAngleDiff)
            const isHeadAligned = angleDiffForMovement < 0.3
            const moveSpeed = bear.speed * 4
            const speedMultiplier = isHeadAligned ? 1.0 : Math.max(0.3, 1.0 - angleDiffForMovement / Math.PI)
            const isOnGround = under !== 0 || (body.velocity[1] >= -0.1 && body.velocity[1] < 0.3)
            
            if (isOnGround) {
                const checkDistance = (bearWidth / 2) + 0.1
                const nextX = pos[0] + Math.sin(bear.currentRotation) * checkDistance
                const nextZ = pos[2] + Math.cos(bear.currentRotation) * checkDistance
                const currentY = Math.floor(pos[1])
                
                const blockAtFeet = currentNoa.getBlock(Math.floor(nextX), currentY, Math.floor(nextZ))
                const blockAtBody = currentNoa.getBlock(Math.floor(nextX), currentY + 1, Math.floor(nextZ))
                const blockAtHead = checkHeight > 1 ? currentNoa.getBlock(Math.floor(nextX), currentY + 2, Math.floor(nextZ)) : 0
                
                if (blockAtFeet !== 0 || blockAtBody !== 0 || blockAtHead !== 0) {
                    body.velocity[0] = 0
                    body.velocity[2] = 0
                    
                    const currentMovementAngle = bear.angle !== undefined ? bear.angle : (bear.currentRotation + Math.PI / 2)
                    const randomAngle = Math.random() * Math.PI * 2
                    let turnAngleDiff = randomAngle - currentMovementAngle
                    while (turnAngleDiff > Math.PI) turnAngleDiff -= 2 * Math.PI
                    while (turnAngleDiff < -Math.PI) turnAngleDiff += 2 * Math.PI
                    const maxTurn = Math.PI / 2
                    if (turnAngleDiff > maxTurn) turnAngleDiff = maxTurn
                    if (turnAngleDiff < -maxTurn) turnAngleDiff = -maxTurn
                    bear.targetAngle = currentMovementAngle + turnAngleDiff
                    while (bear.targetAngle < 0) bear.targetAngle += 2 * Math.PI
                    while (bear.targetAngle >= 2 * Math.PI) bear.targetAngle -= 2 * Math.PI
                    bear.directionChangeTimer = 15
                } else {
                    body.velocity[0] = Math.sin(bear.currentRotation) * moveSpeed * speedMultiplier
                    body.velocity[2] = Math.cos(bear.currentRotation) * moveSpeed * speedMultiplier
                    bear.angle = bear.currentRotation + Math.PI / 2
                }
            } else {
                body.velocity[0] *= 0.9
                body.velocity[2] *= 0.9
            }
        }
    })
}

// Register handler after a short delay
setTimeout(registerTickHandler, 100)


// ------------------------------------------------------------
// Damage pig (called from fire handler)
// ------------------------------------------------------------
export function damagePig(noa, pig) {
    if (!pig || pig.health <= 0) return
    
    pig.health -= 1
    console.log(`🐷 Pig took damage! Health: ${pig.health}/${pig.maxHealth}`)
    
    // If health reached 0, remove pig and add meat to inventory
    if (pig.health <= 0) {
        console.log(`🐷 Pig disappeared!`)
        
        // Add pig meat to inventory
        // Meat amount depends on pig size
        const meatCount = pig.size === 'small' ? 1 : 2
        addItem('pig_meat', meatCount)
        console.log(`🥩 Received pig meat: ${meatCount}`)
        
        // Remove from array
        const index = pigs.indexOf(pig)
        if (index > -1) {
            pigs.splice(index, 1)
        }
        
        // Remove entity from noa
        noa.entities.deleteEntity(pig.id)
    }
}


// ------------------------------------------------------------
// Damage cow (called from fire handler)
// ------------------------------------------------------------
export function damageCow(noa, cow) {
    if (!cow || cow.health <= 0) return
    
    cow.health -= 1
    console.log(`🐄 Cow took damage! Health: ${cow.health}/${cow.maxHealth}`)
    
        if (cow.health <= 0) {
        console.log(`🐄 Cow disappeared!`)
        
        // Add cow meat to inventory (amount depends on size)
        const meatCount = cow.size === 'small' ? 2 : 3
        addItem('cow_meat', meatCount)
        console.log(`🥩 Received cow meat: ${meatCount}`)
        
        const index = cows.indexOf(cow)
        if (index > -1) {
            cows.splice(index, 1)
        }
        
        noa.entities.deleteEntity(cow.id)
    }
}


// ------------------------------------------------------------
// Damage bear (called from fire handler)
// ------------------------------------------------------------
export function damageBear(noa, bear) {
    if (!bear || bear.health <= 0) return
    
    bear.health -= 1
    console.log(`🐻 Bear took damage! Health: ${bear.health}/${bear.maxHealth}`)
    
    if (bear.health <= 0) {
        console.log(`🐻 Bear disappeared!`)
        
        // Add bear meat to inventory (most meat)
        // Meat amount depends on size: small - 4-5, normal - 6-8
        const meatCount = bear.size === 'small' ? (4 + Math.floor(Math.random() * 2)) : (6 + Math.floor(Math.random() * 3))
        addItem('bear_meat', meatCount)
        console.log(`🥩 Received bear meat: ${meatCount}`)
        
        const index = bears.indexOf(bear)
        if (index > -1) {
            bears.splice(index, 1)
        }
        
        noa.entities.deleteEntity(bear.id)
    }
}


// ------------------------------------------------------------
// Generate animals in chunk
// ------------------------------------------------------------
export function generateAnimalsInChunk(noa, ids, x0, y0, z0) {
    const scene = noa.rendering.getScene()
    if (!scene) return // сцена ещё не готова

    // Генерируем животных в чанке (уменьшил количество попыток)
    const animalCount = 2 + Math.floor(Math.random() * 3) // 2-4 попытки спавна на чанк
    
    // Список уже заспавненных позиций в этом чанке (чтобы не спавнить слишком близко)
    const spawnedPositions = []

    for (let i = 0; i < animalCount; i++) {
        const x = x0 + Math.floor(Math.random() * 32)
        const z = z0 + Math.floor(Math.random() * 32)
        const y = getHeightAt(x, z)
        const biome = getBiome(x, z)
        
        // Проверяем, что нет других животных слишком близко (минимум 3 блока)
        let tooClose = false
        for (const [sx, sz] of spawnedPositions) {
            const dx = x - sx
            const dz = z - sz
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < 3) {
                tooClose = true
                break
            }
        }
        
        if (tooClose) continue // Пропускаем эту позицию

        // Спавним свинок в подходящих биомах
        if (biome === "plains" || biome === "forest" || biome === "dry") {
            if (Math.random() < 0.4) { // 40% шанс спавна (уменьшил с 60%)
                const size = Math.random() < 0.5 ? 'small' : 'normal'
                const result = createPig(noa, scene, x, z, y, size)
                if (result) {
                    spawnedPositions.push([x, z]) // Запоминаем позицию
                }
            }
        }
        // ================================
// 🐻 СПАВН МЕДВЕДЕЙ ПО БИОМАМ
// ================================

// ❄ Белые медведи — только холодные биомы
if (biome === "snow" || biome === "tundra" || biome === "ice") {
    if (Math.random() < 0.25) { // 25% шанс
        const size = Math.random() < 0.3 ? 'small' : 'normal'
        const result = createBear(noa, scene, x, z, y, "polar", size)
        if (result) {
            spawnedPositions.push([x, z])
        }
    }
}

// 🟫 Коричневые медведи — лес, тайга, горы
if (biome === "forest" || biome === "dry" || biome === "mountain") {
    if (Math.random() < 0.35) { // 35% шанс
        const size = Math.random() < 0.4 ? 'small' : 'normal'
        const result = createBear(noa, scene, x, z, y, "brown", size)
        if (result) {
            spawnedPositions.push([x, z])
        }
    }
}

        // Спавним коров в тех же биомах, что и свиньи
        if (biome === "plains" || biome === "forest" || biome === "dry") {
            if (Math.random() < 0.3) { // 30% шанс спавна коровы (уменьшил с 50%)
                const size = Math.random() < 0.5 ? 'small' : 'normal'
                const result = createCow(noa, scene, x, z, y, size)
                if (result) {
                    spawnedPositions.push([x, z]) // Запоминаем позицию
                }
            }
        }
    }
}
