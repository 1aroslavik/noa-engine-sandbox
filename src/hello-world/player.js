// player.js
import { noa } from "./engine.js"

// ОДНОМУ ПЕРЕМЕННОМУ — grassID — нужно передать его сюда
export function setupPlayer(grassID) {

    const player = noa.playerEntity

    // ================================
    // 1. ПЕРЕДВИЖЕНИЕ (WASD + прыжок)
    // ================================

    // movement component
    if (!noa.entities.hasComponent(player, 'movement')) {
        noa.entities.addComponent(player, 'movement')
    }

    // управление игроком
    if (!noa.entities.hasComponent(player, 'playerControl')) {
        noa.entities.addComponent(player, 'playerControl')
    }

    // убедимся, что игрок стоит на нормальной высоте
    noa.entities.setPosition(player, [0.5, 20, 0.5])


    // ================================
    // 2. ЛОМАНИЕ БЛОКОВ
    // ================================
    noa.inputs.down.on("fire", () => {
        const hit = noa.targetedBlock
        if (!hit) return

        const p = hit.position
        noa.setBlock(0, p[0], p[1], p[2])
    })


    // ================================
    // 3. СТАВКА БЛОКОВ
    // ================================
    noa.inputs.down.on("alt-fire", () => {
        const hit = noa.targetedBlock
        if (!hit) return

        const p = hit.adjacent
        noa.setBlock(grassID, p[0], p[1], p[2])
    })

    noa.inputs.bind("alt-fire", "KeyE")


    // ================================
    // 4. ЗУМ КАМЕРЫ (как в оригинале)
    // ================================
    noa.on("tick", () => {
        const scroll = noa.inputs.pointerState.scrolly
        if (scroll !== 0) {
            noa.camera.zoomDistance += scroll > 0 ? 1 : -1
            noa.camera.zoomDistance = Math.max(0, Math.min(10, noa.camera.zoomDistance))
        }
    })

    console.log("✔ Игрок готов: движение и ломание работают")
}
