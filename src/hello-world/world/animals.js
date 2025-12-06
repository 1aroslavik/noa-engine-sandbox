// world/animals.js
import * as BABYLON from '@babylonjs/core'
import { noa } from '../engine.js'
import { noiseHeight } from '../biome.js'
import { getHeightAt } from './worldgen.js'
import { getBiome } from '../biome.js'

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
function buildPigMesh(scene) {
    const material = new BABYLON.StandardMaterial('pigMat', scene)
    material.diffuseColor = new BABYLON.Color3(1, 0, 0)

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
    pig.scaling.set(2, 2, 2)
    pig.material = material

    return pig
}


// ------------------------------------------------------------
// Создание сущности свинки
// ------------------------------------------------------------
export function createPig(noa, scene, x, z, y = null) {
    const mesh = buildPigMesh(scene)
    const groundY = y !== null ? y : getHeight(x, z)
    const spawnY = groundY + 1

    const id = noa.entities.add([x + 0.5, spawnY, z + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width: 1,
        height: 1.2,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: true,
        solid: true,
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh: mesh,
        offset: [0, 0.6, 0] // смещение для правильного позиционирования меша
    })

    const body = noa.entities.getPhysicsBody(id)
    body.mass = 1
    body.friction = 0.95

    pigs.push({
        id,
        mesh,
        body,
        angle: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.01,
        pause: 0,
    })

    console.log(`🐷 Pig spawned at ${x} ${spawnY} ${z}`)
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
    if (!noa) return

    const scene = noa.rendering.getScene()
    if (!scene) {
        // сцена ещё не создана → пробуем снова
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    // Проверяем, что игрок готов
    if (!noa.playerEntity) {
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    const pos = noa.entities.getPosition(noa.playerEntity)
    if (!pos || pos.length < 3) {
        setTimeout(spawnWhenSceneReady, 200)
        return
    }

    console.log("🐷 Scene and player ready → spawning pigs...")
    spawnDebugPigs(noa, scene, 5)
}

spawnWhenSceneReady()


// ------------------------------------------------------------
// Движение свинок
// ------------------------------------------------------------
let tick = 0

noa.on('tick', () => {
    tick++
    if (tick % 6 !== 0) return

    for (const pig of pigs) {
        const { id, mesh, body } = pig
        if (!mesh || !body) continue

        const pos = noa.entities.getPosition(id)

        // проверка блока под свинкой
        const under = noa.getBlock(Math.floor(pos[0]), Math.floor(pos[1] - 1), Math.floor(pos[2]))
        if (under === 0) {
            body.velocity[1] = 0.05
        }

        // случайный поворот
        pig.pause--
        if (pig.pause <= 0 && Math.random() < 0.05) {
            pig.angle += (Math.random() - 0.5) * Math.PI
            pig.pause = 100 + Math.random() * 100
        }

        // проверка препятствия
        const fx = pos[0] + Math.cos(pig.angle) * 0.7
        const fz = pos[2] + Math.sin(pig.angle) * 0.7

        const groundY = Math.floor(pos[1])
        const front = noa.getBlock(Math.floor(fx), groundY, Math.floor(fz))
        const above = noa.getBlock(Math.floor(fx), groundY + 1, Math.floor(fz))

        if (front !== 0 || above !== 0) {
            pig.angle += Math.PI / 2 + (Math.random() - 0.5)
            continue
        }

        // движение
        body.velocity[0] = Math.cos(pig.angle) * pig.speed
        body.velocity[2] = Math.sin(pig.angle) * pig.speed
        mesh.rotation.y = -pig.angle
    }
})


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
                createPig(noa, scene, x, z, y)
            }
        }
    }
}
