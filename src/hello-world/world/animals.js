// world/animals.js
import * as BABYLON from '@babylonjs/core'
import { noa } from '../engine.js'
import { noiseHeight } from '../biome.js' // шум уже есть

const pigs = []
let pigIdCounter = 0

// ------------------------------------------------------------
// getHeight прямо здесь, не трогаем генератор мира
// ------------------------------------------------------------
function getHeight(x, z) {
    const h = noiseHeight(x, z)
    const maxHeight = 40
    let height = Math.floor((h + 1) * 0.5 * maxHeight)
    if (height < 1) height = 1
    return height
}

// ------------------------------------------------------------
// Меш свинки
// ------------------------------------------------------------
function buildPigMesh(scene) {
    const mat = new BABYLON.StandardMaterial('pigMat', scene)
    mat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.7)

    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.9, height: 0.6, depth: 1.2 }, scene)
    body.position.y = 0.3

    const head = BABYLON.MeshBuilder.CreateBox('head', { width: 0.5, height: 0.5, depth: 0.5 }, scene)
    head.position.set(0, 0.4, 0.85)

    const legs = []
    const legPos = [
        [-0.3, -0.3, 0.5], [0.3, -0.3, 0.5],
        [-0.3, -0.3, -0.5], [0.3, -0.3, -0.5]
    ]
    for (const [lx, ly, lz] of legPos) {
        const leg = BABYLON.MeshBuilder.CreateBox('leg', { width: 0.18, height: 0.3, depth: 0.18 }, scene)
        leg.position.set(lx, ly, lz)
        legs.push(leg)
    }

    const pig = BABYLON.Mesh.MergeMeshes([body, head, ...legs], true, true)
    pig.material = mat
    pig.scaling.set(0.9, 0.9, 0.9)
    pig.position.y = 0
    return pig
}

// ------------------------------------------------------------
// Создание свинки
// ------------------------------------------------------------
export function createPig(noa, scene, x, y, z) {
    const mesh = buildPigMesh(scene)
    const id = pigIdCounter++
    const spawnY = getHeight(x, z) + 1

    noa.entities.add([x + 0.5, spawnY, z + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width: 1.0,
        height: 1.2,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: true,
        solid: true
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh: mesh,
        offset: [0, 0, 0]
    })

    mesh.parent = noa.entities.getMesh(id)
    const body = noa.entities.getPhysicsBody(id)
    body.mass = 1
    body.friction = 0.95

    pigs.push({ id, mesh, body, angle: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.01, pause: 0 })
    console.log(`Pig spawned at: ${x}, ${spawnY}, ${z}`)
}

// ------------------------------------------------------------
// Спавн свинок рядом с игроком для отладки
// ------------------------------------------------------------
export function spawnDebugPigs(noa, scene, count = 5) {
    const pos = noa.camera.position
    for (let i = 0; i < count; i++) {
        const dx = Math.floor((Math.random() - 0.5) * 10)
        const dz = Math.floor((Math.random() - 0.5) * 10)
        createPig(noa, scene, Math.floor(pos[0] + dx), Math.floor(pos[1]), Math.floor(pos[2] + dz))
    }
}

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

        // Если под свинкой воздух, поднимаем
        const under = noa.getBlock(Math.floor(pos[0]), Math.floor(pos[1] - 1), Math.floor(pos[2]))
        if (under === 0) body.velocity[1] = 0.05

        // Случайное блуждание
        pig.pause--
        if (pig.pause <= 0 && Math.random() < 0.05) {
            pig.angle += (Math.random() - 0.5) * Math.PI
            pig.pause = 100 + Math.random() * 100
        }

        const fx = pos[0] + Math.cos(pig.angle) * 0.7
        const fz = pos[2] + Math.sin(pig.angle) * 0.7
        const fy = Math.floor(pos[1])

        const fb = noa.getBlock(Math.floor(fx), fy, Math.floor(fz))
        const fa = noa.getBlock(Math.floor(fx), fy + 1, Math.floor(fz))
        if (fb !== 0 || fa !== 0) {
            pig.angle += Math.PI / 2 + (Math.random() - 0.5)
            continue
        }

        body.velocity[0] = Math.cos(pig.angle) * pig.speed
        body.velocity[2] = Math.sin(pig.angle) * pig.speed
        mesh.rotation.y = -pig.angle
    }
})
