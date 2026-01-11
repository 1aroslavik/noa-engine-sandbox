// ui/inventory.js — инвентарь и hotbar
import { noa } from '../engine.js'
import './crafting.js'
import { getItemDefinition, getRarityColor, getShortName } from './items.js'
import { healPlayer, getPlayerHealth, getPlayerMaxHealth } from '../player.js'

const HOTBAR_SLOTS = 9
export const inventory = new Array(HOTBAR_SLOTS).fill(null)
export let selectedSlot = 0

export function getSelectedSlot() {
  return selectedSlot
}


function normalizeItemName(name) {
  if (!name) return name
  return name
    .toLowerCase()
    .replace(/_block$/, '')   // grass_block → grass
    .replace(/_$/, '')        // grass_ → grass
}

// ------------------------------------------------------------
// 🧱 UI контейнер
// ------------------------------------------------------------
const container = document.createElement('div')
container.style.position = 'absolute'
container.style.bottom = '20px'
container.style.left = '50%'
container.style.transform = 'translateX(-50%)'
container.style.display = 'flex'
container.style.gap = '8px'
container.style.pointerEvents = 'auto'
container.style.zIndex = '9999'
document.body.appendChild(container)

function getInventoryIcon(itemName) {
  const baseTex = window.cvaeTextures || {}
  const genTex  = window.generatedTextures || {}
  const sideMap = window.blockSideMap || {}

  const base = normalizeItemName(itemName)
// ====================================================
  // 🥩 УНИВЕРСАЛЬНАЯ ИКОНКА ДЛЯ ЛЮБОГО МЯСА
  // ====================================================
  if (itemName === 'meat' || itemName.endsWith('_meat')) {
  return window.location.origin + '/meat.png'
}

  // 0️⃣ generatedTextures (САМЫЙ ВАЖНЫЙ ПРИОРИТЕТ)
  if (genTex[base + "_side"]) {
    return "data:image/png;base64," + genTex[base + "_side"]
  }
  if (genTex[base]) {
    return "data:image/png;base64," + genTex[base]
  }

  // 1️⃣ side (обычные блоки)
  if (sideMap[base] && baseTex[sideMap[base]]) {
    return "data:image/png;base64," + baseTex[sideMap[base]]
  }

  // 2️⃣ прямое совпадение
  if (baseTex[base]) {
    return "data:image/png;base64," + baseTex[base]
  }

  // 3️⃣ top
  if (baseTex[base + "_top"]) {
    return "data:image/png;base64," + baseTex[base + "_top"]
  }

  // 4️⃣ fallback
  if (baseTex["dirt"]) {
    return "data:image/png;base64," + baseTex["dirt"]
  }

  return null
}
window.addEventListener("texturesReady", () => {
  console.log("🎒 Inventory: textures ready → redraw")
  drawInventory()
})

// ------------------------------------------------------------
// 🎒 Отрисовка инвентаря
// ------------------------------------------------------------
function drawInventory() {
  container.innerHTML = ''

  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const slot = document.createElement('div')
    slot.style.width = '48px'
    slot.style.height = '48px'
    slot.style.background = '#222'
    slot.style.display = 'flex'
    slot.style.flexDirection = 'column'
    slot.style.alignItems = 'center'
    slot.style.justifyContent = 'flex-start'
    slot.style.font = '10px monospace'
    slot.style.color = '#fff'
    slot.style.cursor = 'pointer'
    slot.style.userSelect = 'none'
    slot.style.position = 'relative'
    slot.dataset.slotIndex = String(i)

    const item = inventory[i]

    // --------------------------------------------------------
    // 📦 СЛОТ С ПРЕДМЕТОМ
    // --------------------------------------------------------
    if (item) {
      slot.draggable = true

      const itemDef = getItemDefinition(item.name)
      const rarityColor = getRarityColor(itemDef.rarity)

      slot.style.border =
        i === selectedSlot
          ? `3px solid ${rarityColor}`
          : `2px solid ${rarityColor}`

      // 🖼 ИКОНКА
const texURL = getInventoryIcon(item.name)
      if (texURL) {
        const icon = document.createElement('div')
        icon.style.width = '32px'
        icon.style.height = '32px'
        icon.style.marginTop = '2px'
        icon.style.backgroundImage = `url(${texURL})`
icon.style.backgroundSize = 'contain'
        icon.style.backgroundRepeat = 'no-repeat'
        icon.style.backgroundPosition = 'center'
        icon.style.imageRendering = 'pixelated'
        icon.style.pointerEvents = 'none'
        slot.appendChild(icon)
      }

      // 🏷 НАЗВАНИЕ
      const name = document.createElement('div')
      name.textContent = getShortName(item.name)
      name.style.fontSize = '9px'
      name.style.opacity = '0.9'
      name.style.whiteSpace = 'nowrap'
      name.style.overflow = 'hidden'
      name.style.textOverflow = 'ellipsis'
      name.style.maxWidth = '100%'
      name.style.pointerEvents = 'none'
      slot.appendChild(name)

      // 🔢 КОЛИЧЕСТВО
      const count = document.createElement('div')
      count.textContent = item.count
      count.style.position = 'absolute'
      count.style.bottom = '2px'
      count.style.right = '4px'
      count.style.fontSize = '10px'
      count.style.color = 'white'
      count.style.textShadow = '1px 1px 2px black'
      count.style.pointerEvents = 'none'
      slot.appendChild(count)

      // tooltip
      slot.title = `${itemDef.description}
Редкость: ${itemDef.rarity}
Тип: ${itemDef.type}
Сложность: ${itemDef.craftDifficulty}`

      // drag start
      slot.addEventListener('dragstart', (e) => {
        e.stopPropagation()
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({ slotIndex: i, item })
        )
        e.dataTransfer.effectAllowed = 'move'
        slot.style.opacity = '0.5'
      })

      // drag end
      slot.addEventListener('dragend', () => {
        slot.style.opacity = '1'
      })

    // --------------------------------------------------------
    // ⬜ ПУСТОЙ СЛОТ
    // --------------------------------------------------------
    } else {
      slot.draggable = false
      slot.style.border =
        i === selectedSlot
          ? '3px solid yellow'
          : '2px solid gray'
    }

    // выбор слота
    slot.addEventListener('click', () => {
      selectedSlot = i
      drawInventory()
    })

    // двойной клик — еда
    slot.addEventListener('dblclick', (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (
        item &&
        ['meat', 'pig_meat', 'cow_meat', 'bear_meat'].includes(item.name)
      ) {
        const hp = getPlayerHealth()
        const maxHp = getPlayerMaxHealth()
        if (hp < maxHp) {
          let heal = 10
          if (item.name === 'pig_meat') heal = 15
          if (item.name === 'cow_meat') heal = 20
          if (item.name === 'bear_meat') heal = 30

          healPlayer(heal)
          removeItem(i, 1)
        }
      }
    })

    container.appendChild(slot)
  }
}

drawInventory()

// ------------------------------------------------------------
// ➕ Добавление предмета
// ------------------------------------------------------------
export function addItem(name, count = 1) {
  if (!name) return false

  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    if (inventory[i]?.name === name) {
      inventory[i].count += count
      drawInventory()
      return true
    }
  }

  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    if (!inventory[i]) {
      inventory[i] = { name, count }
      drawInventory()
      return true
    }
  }

  return false
}

// ------------------------------------------------------------
// ➖ Удаление предмета
// ------------------------------------------------------------
export function removeItem(slotIndex, count = 1) {
  if (!inventory[slotIndex]) return false

  inventory[slotIndex].count -= count
  if (inventory[slotIndex].count <= 0) {
    inventory[slotIndex] = null
  }

  drawInventory()
  return true
}

// ------------------------------------------------------------
// 🔄 Управление
// ------------------------------------------------------------
export function getSelectedItem() {
  return inventory[selectedSlot]
}

// @ts-ignore
window.getSelectedItem = getSelectedItem
// @ts-ignore
window.getSelectedSlot = getSelectedSlot
// @ts-ignore
window.removeItem = removeItem

window.addEventListener('wheel', e => {
  selectedSlot = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + HOTBAR_SLOTS) % HOTBAR_SLOTS
  drawInventory()
})

window.addEventListener('keydown', e => {
  if (e.code?.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10)
    if (n >= 1 && n <= HOTBAR_SLOTS) {
      selectedSlot = n - 1
      drawInventory()
    }
  }
})

window.addEventListener('inventoryUpdate', drawInventory)
