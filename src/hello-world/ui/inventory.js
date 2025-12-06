// ui/inventory.js — инвентарь и hotbar
import { noa } from '../engine.js'
import './crafting.js'

const HOTBAR_SLOTS = 9
export const inventory = new Array(HOTBAR_SLOTS).fill(null)
export let selectedSlot = 0

const container = document.createElement('div')
container.style.position = 'absolute'
container.style.bottom = '20px'
container.style.left = '50%'
container.style.transform = 'translateX(-50%)'
container.style.display = 'flex'
container.style.gap = '8px'
container.style.pointerEvents = 'none'
container.style.zIndex = '9999'
document.body.appendChild(container)

function drawInventory() {
  container.innerHTML = ''
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const slot = document.createElement('div')
    slot.style.width = '48px'
    slot.style.height = '48px'
    slot.style.border = i === selectedSlot ? '3px solid yellow' : '2px solid gray'
    slot.style.background = '#222'
    slot.style.display = 'flex'
    slot.style.flexDirection = 'column'
    slot.style.alignItems = 'center'
    slot.style.justifyContent = 'center'
    slot.style.color = '#fff'
    slot.style.font = '13px/1.1 monospace'
    slot.style.pointerEvents = 'none'
    slot.style.userSelect = 'none'

    const item = inventory[i]
    if (item) {
      const name = document.createElement('div')
      name.textContent = item.name
      const count = document.createElement('div')
      count.textContent = item.count
      count.style.fontSize = '11px'
      count.style.opacity = '0.75'
      slot.appendChild(name)
      slot.appendChild(count)
    }
    container.appendChild(slot)
  }
}
drawInventory()

export function addItem(name, count = 1) {
  // стакаем по имени
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    if (inventory[i]?.name === name) {
      inventory[i].count += count
      drawInventory()
      return true
    }
  }
  // ищем пустой слот
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    if (!inventory[i]) {
      inventory[i] = { name, count }
      drawInventory()
      return true
    }
  }
  return false
}

function setSelected(idx) {
  selectedSlot = (idx + HOTBAR_SLOTS) % HOTBAR_SLOTS
  drawInventory()
}

export function getSelectedItem() {
  return inventory[selectedSlot]
}

window.addEventListener('wheel', e => {
  setSelected(selectedSlot + (e.deltaY > 0 ? 1 : -1))
})

window.addEventListener('keydown', e => {
  if (e.code?.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10)
    if (n >= 1 && n <= HOTBAR_SLOTS) setSelected(n - 1)
  }
})
// после функции drawInventory()
window.addEventListener('inventoryUpdate', drawInventory)
window.addEventListener('inventoryUpdate', drawInventory)
