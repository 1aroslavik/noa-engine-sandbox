// world/animals.js — свинки с полноценной коллизией
import * as BABYLON from '@babylonjs/core'
import { noa } from '../engine.js'
import { getHeight } from './terrain.js'
import { getBiome } from '../biome.js'
import { grassID, tundraID } from '../blocks.js'

const pigs = []
const MAX_PIGS = 8

// === создание меша свинки ===
function buildPigMesh(scene) {
  const mat = new BABYLON.StandardMaterial('pigMat', scene)
  mat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.7)
  mat.backFaceCulling = false

  const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.9, height: 0.6, depth: 1.2 }, scene)
  body.position.y = 0.3

  const head = BABYLON.MeshBuilder.CreateBox('head', { width: 0.5, height: 0.5, depth: 0.5 }, scene)
  head.position.set(0, 0.4, 0.85)

  const legs = []
  const legPositions = [
    [-0.3, -0.3,  0.5], [0.3, -0.3,  0.5],
    [-0.3, -0.3, -0.5], [0.3, -0.3, -0.5]
  ]
  for (const [lx, ly, lz] of legPositions) {
    const leg = BABYLON.MeshBuilder.CreateBox('leg', { width: 0.18, height: 0.3, depth: 0.18 }, scene)
    leg.position.set(lx, ly, lz)
    legs.push(leg)
  }

  const pig = BABYLON.Mesh.MergeMeshes([body, head, ...legs], true, true)
  pig.material = mat
  pig.scaling.set(0.9, 0.9, 0.9)
  return pig
}

// === создание свинки ===
export function createPig(noa, scene, x, y, z) {
  if (pigs.length >= MAX_PIGS) return

  const groundY = getHeight(x, z)
  const blockBelow = noa.getBlock(x, groundY, z)
  if (blockBelow === 0) return // не спавним в воздухе

  const mesh = buildPigMesh(scene)
  const spawnY = groundY + 1.1 // чуть выше поверхности

  const id = noa.entities.add([x + 0.5, spawnY, z + 0.5])

  noa.entities.addComponent(id, noa.entities.names.physics, {
    width: 0.8,
    height: 0.9,
    gravity: true,
    collideWithTerrain: true,
    collideWithEntities: true,
    solid: true
  })

  noa.entities.addComponent(id, noa.entities.names.mesh, {
    mesh,
    offset: [0, -0.45, 0]
  })

  const body = noa.entities.getPhysicsBody(id)
  body.mass = 1
  body.friction = 0.95
  body.restitution = 0

  pigs.push({
    id,
    mesh,
    body,
    angle: Math.random() * Math.PI * 2,
    speed: 0.02 + Math.random() * 0.008,
    pause: 0
  })
}

// === генерация свинок в чанке ===
export function generateAnimalsInChunk(noa, scene, x0, y0, z0) {
  if (pigs.length >= MAX_PIGS) return
  for (let i = 0; i < 2; i++) {
    const x = x0 + Math.floor(Math.random() * 32)
    const z = z0 + Math.floor(Math.random() * 32)
    const y = getHeight(x, z)
    const biome = getBiome(x, z)
    const block = noa.getBlock(x, y, z)
    if ((block === grassID || block === tundraID) &&
        (biome === 'plains' || biome === 'forest')) {
      createPig(noa, scene, x, y, z)
    }
  }
}

// === движение ===
let tick = 0
noa.on('tick', () => {
  tick++
  if (tick % 6 !== 0) return

  for (const pig of pigs) {
    const { id, mesh, body } = pig
    if (!mesh || !body) continue

    const pos = noa.entities.getPosition(id)
    const underBlock = noa.getBlock(Math.floor(pos[0]), Math.floor(pos[1] - 1), Math.floor(pos[2]))

    // если под свинкой воздух — поднимаем чуть вверх
    if (underBlock === 0) {
      body.velocity[1] = 0.05
    }

    // случайное блуждание
    pig.pause--
    if (pig.pause <= 0 && Math.random() < 0.05) {
      pig.angle += (Math.random() - 0.5) * Math.PI
      pig.pause = 100 + Math.random() * 100
    }

    // проверка впереди — если препятствие, поворачиваем
    const frontX = pos[0] + Math.cos(pig.angle) * 0.7
    const frontZ = pos[2] + Math.sin(pig.angle) * 0.7
    const frontY = Math.floor(pos[1])
    const frontBlock = noa.getBlock(Math.floor(frontX), frontY, Math.floor(frontZ))
    const frontAbove = noa.getBlock(Math.floor(frontX), frontY + 1, Math.floor(frontZ))
    if (frontBlock !== 0 || frontAbove !== 0) {
      pig.angle += Math.PI / 2 + (Math.random() - 0.5)
      continue
    }

    // движение
    body.velocity[0] = Math.cos(pig.angle) * pig.speed
    body.velocity[2] = Math.sin(pig.angle) * pig.speed
    mesh.rotation.y = -pig.angle
  }
})
