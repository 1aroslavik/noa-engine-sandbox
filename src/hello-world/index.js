// index.js
import { Engine } from "noa-engine"
import { initMaterialsAndBlocks } from "./materials.js"
import { registerWorldGeneration, getHeightAt } from "./world/worldgen.js"
import { getBiome } from "./biome.js"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { setWaterID } from "./world/water.js"
import { updateWater } from "./world/water.js"

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

    setupInteraction(grassBlock)

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
function setupInteraction(placeBlockID) {
    const canvas = noa.container.canvas

    noa.inputs.down.on("fire", () => {
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.position
            noa.setBlock(0, p[0], p[1], p[2])
        }
    })

    noa.inputs.down.on("alt-fire", () => {
        if (noa.targetedBlock) {
            const p = noa.targetedBlock.adjacent
            noa.setBlock(placeBlockID, p[0], p[1], p[2])
        }
    })

    noa.inputs.bind("alt-fire", "KeyE")

    canvas.addEventListener("click", () => {
        canvas.requestPointerLock()
    })
}


let lastBiome = null

noa.on("tick", () => {

    // обновление воды
    updateWater()

    // вывод биома (не ломаем твою логику)
    const p = noa.ents.getPosition(noa.playerEntity)
    const bx = Math.floor(p[0])
    const bz = Math.floor(p[2])

    const biome = getBiome(bx, bz)
    if (biome !== lastBiome) {
        console.log("➡ Биом изменился:", biome)
        lastBiome = biome
    }
})


