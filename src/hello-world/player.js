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
    // Удалено - ломание блоков теперь обрабатывается в index.js
    // noa.inputs.down.on("fire", () => { ... })


    // ================================
    // 3. СТАВКА БЛОКОВ
    // ================================
    // Удалено - размещение блоков теперь обрабатывается в index.js через KeyR
    // Эта функция больше не используется, логика размещения блоков в setupInteraction()


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
