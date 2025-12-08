// player.js
import { noa } from "./engine.js"
import { removeItem } from "./ui/inventory.js"

// Система здоровья игрока
let playerHealth = 100
let playerMaxHealth = 100
let lastDamageTime = 0
const DAMAGE_COOLDOWN = 500 // Кулдаун между атаками (мс)

// Экспортируем функции для работы со здоровьем
export function getPlayerHealth() {
    return playerHealth
}

export function getPlayerMaxHealth() {
    return playerMaxHealth
}

export function damagePlayer(amount) {
    const currentTime = Date.now()
    // Проверяем кулдаун, чтобы не получать урон слишком часто
    if (currentTime - lastDamageTime < DAMAGE_COOLDOWN) {
        return
    }
    
    lastDamageTime = currentTime
    playerHealth = Math.max(0, playerHealth - amount)
    
    // Обновляем UI здоровья
    updateHealthUI()
    
    console.log(`💔 Игрок получил урон! Здоровье: ${playerHealth}/${playerMaxHealth}`)
    
    // Если здоровье упало до 0, можно добавить логику смерти
    if (playerHealth <= 0) {
        console.log("💀 Игрок умер!")
        // Здесь можно добавить логику смерти (респавн, экран смерти и т.д.)
    }
}

export function healPlayer(amount) {
    playerHealth = Math.min(playerMaxHealth, playerHealth + amount)
    
    // Обновляем UI здоровья
    updateHealthUI()
    
    console.log(`❤️ Игрок восстановил здоровье! Здоровье: ${playerHealth}/${playerMaxHealth}`)
}

// Функция для обновления UI здоровья
function updateHealthUI() {
    const healthBar = document.getElementById('health-bar')
    const healthText = document.getElementById('health-text')
    
    if (healthBar) {
        const percentage = (playerHealth / playerMaxHealth) * 100
        healthBar.style.width = `${percentage}%`
        
        // Меняем цвет в зависимости от здоровья (пиксельные цвета)
        if (percentage > 60) {
            healthBar.style.backgroundColor = '#00FF00' // Яркий зеленый
        } else if (percentage > 30) {
            healthBar.style.backgroundColor = '#FFFF00' // Яркий желтый
        } else {
            healthBar.style.backgroundColor = '#FF0000' // Яркий красный
        }
    }
    
    if (healthText) {
        healthText.textContent = `${Math.ceil(playerHealth)}/${playerMaxHealth}`
    }
}

// Инициализируем UI здоровья при загрузке
export function initHealthUI() {
    updateHealthUI()
    initHealSlot()
}

// Инициализация слота для восстановления здоровья
function initHealSlot() {
    // Ждем, пока элемент будет создан в crafting.js
    // Используем небольшую задержку, чтобы убедиться, что crafting.js уже загружен
    setTimeout(() => {
        const healSlot = document.getElementById('heal-slot')
        if (!healSlot) {
            console.warn('Heal slot not found - crafting.js may not be loaded yet')
            return
        }
        setupHealSlot(healSlot)
    }, 100)
}

function setupHealSlot(healSlot) {

    // Обработчики для drag and drop
    healSlot.addEventListener('dragenter', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const types = e.dataTransfer.types
        if (types && types.includes('text/plain')) {
            healSlot.classList.add('drag-over')
        }
    })

    healSlot.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const types = e.dataTransfer.types
        if (types && types.includes('text/plain')) {
            e.dataTransfer.dropEffect = 'move'
            healSlot.classList.add('drag-over')
        } else {
            e.dataTransfer.dropEffect = 'none'
        }
    })

    healSlot.addEventListener('dragleave', (e) => {
        e.preventDefault()
        e.stopPropagation()
        healSlot.classList.remove('drag-over')
    })

    healSlot.addEventListener('drop', (e) => {
        e.preventDefault()
        e.stopPropagation()
        healSlot.classList.remove('drag-over')

        try {
            const dataStr = e.dataTransfer.getData('text/plain')
            if (!dataStr) {
                console.warn('No data for drag and drop')
                return
            }

            const data = JSON.parse(dataStr)
            if (!data || !data.item || data.slotIndex === undefined) {
                console.warn('Invalid drag data:', data)
                return
            }

            // Проверяем, что это мясо
            const itemName = data.item.name
            const isMeat = itemName === 'meat' || itemName === 'pig_meat' || 
                          itemName === 'cow_meat' || itemName === 'bear_meat'

            if (!isMeat) {
                console.log('❌ Only meat can be used to restore health')
                return
            }

            const currentHealth = getPlayerHealth()
            const maxHealth = getPlayerMaxHealth()

            // Используем мясо только если здоровье не полное
            if (currentHealth < maxHealth) {
                // Определяем количество восстановления здоровья в зависимости от типа мяса
                let healAmount = 10 // По умолчанию
                if (itemName === 'pig_meat') {
                    healAmount = 15
                } else if (itemName === 'cow_meat') {
                    healAmount = 20
                } else if (itemName === 'bear_meat') {
                    healAmount = 30
                }

                // Удаляем один предмет из инвентаря
                if (removeItem(data.slotIndex, 1)) {
                    healPlayer(healAmount)
                    console.log(`🍖 Used meat: ${itemName}, restored ${healAmount} health`)
                } else {
                    console.warn('Failed to remove item from inventory')
                }
            } else {
                console.log('💚 Health is already full!')
            }
        } catch (err) {
            console.error('Error during drag and drop:', err)
        }
    })
}

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
