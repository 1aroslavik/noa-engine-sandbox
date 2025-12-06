// world/water.js

export let waterID = null

export function setWaterID(id) {
    waterID = id
}

// безопасно получаем noa из window (ты его туда кладёшь в index.js)
function getNoa() {
    return window.noa
}

function isAir(noa, x, y, z) {
    return noa.getBlock(x, y, z) === 0
}

// ===============================
//   ПРОСТОЕ РАСТЕКАНИЕ ВОДЫ
// ===============================
export function updateWater() {
    if (!waterID) return
    const noa = getNoa()
    if (!noa) return

    const p = noa.entities.getPosition(noa.playerEntity)
    const bx = Math.floor(p[0])
    const by = Math.floor(p[1])
    const bz = Math.floor(p[2])

    const R = 10 // радиус вокруг игрока

    for (let x = bx - R; x <= bx + R; x++) {
        for (let y = by - R; y <= by + R; y++) {
            for (let z = bz - R; z <= bz + R; z++) {

                if (noa.getBlock(x, y, z) !== waterID) continue

                // вниз
                if (isAir(noa, x, y - 1, z)) {
                    noa.setBlock(waterID, x, y - 1, z)
                    continue
                }

                // по сторонам
                if (isAir(noa, x + 1, y, z)) noa.setBlock(waterID, x + 1, y, z)
                if (isAir(noa, x - 1, y, z)) noa.setBlock(waterID, x - 1, y, z)
                if (isAir(noa, x, y, z + 1)) noa.setBlock(waterID, x, y, z + 1)
                if (isAir(noa, x, y, z - 1)) noa.setBlock(waterID, x, y, z - 1)
            }
        }
    }
}
