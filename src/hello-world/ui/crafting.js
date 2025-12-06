// ui/crafting.js — окно крафтинга 2x2

import { inventory, addItem, getSelectedItem, removeItem, getSelectedSlot } from './inventory.js'

// === РЕЦЕПТЫ КРАФТА ===
// pattern — массив 2x2
// null означает пустую ячейку
export const recipes = [
  {
    pattern: [
      ["wood", null],
      [null, null]
    ],
    result: { name: "planks", count: 4 }
  },
  {
    pattern: [
      ["planks", null],
      ["planks", null]
    ],
    result: { name: "stick", count: 4 }
  }
]


// === UI ЭЛЕМЕНТЫ ===
export const craftDiv = document.createElement("div")
craftDiv.style.position = "absolute"
craftDiv.style.top = "50%"
craftDiv.style.left = "50%"
craftDiv.style.transform = "translate(-50%, -50%)"
craftDiv.style.background = "#222"
craftDiv.style.padding = "12px"
craftDiv.style.border = "2px solid #555"
craftDiv.style.display = "none"
craftDiv.style.flexDirection = "column"
craftDiv.style.gap = "8px"
craftDiv.style.zIndex = "10001" // Выше чем инвентарь
craftDiv.style.pointerEvents = "auto" // Убеждаемся, что события работают
document.body.appendChild(craftDiv)


// === CRAFT GRID 2x2 ===
export const grid = []
for (let i = 0; i < 4; i++) {
  const cell = document.createElement("div")
  cell.style.width = "48px"
  cell.style.height = "48px"
  cell.style.border = "2px solid gray"
  cell.style.background = "#111"
  cell.style.display = "flex"
  cell.style.alignItems = "center"
  cell.style.justifyContent = "center"
  cell.style.color = "#fff"
  cell.style.font = "13px monospace"
  cell.style.cursor = "pointer"
  cell.dataset.item = null
  cell.dataset.gridIndex = String(i)
  
  // Разрешаем "бросать" предметы в ячейку
  cell.addEventListener('dragenter', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cell.style.border = "2px solid yellow"
    cell.style.background = "#333"
  })
  
  cell.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  })
  
  cell.addEventListener('dragleave', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cell.style.border = "2px solid gray"
    cell.style.background = "#111"
  })
  
  // Обработчик "бросания" предмета
  cell.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cell.style.border = "2px solid gray"
    cell.style.background = "#111"
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) {
        console.warn('Нет данных для перетаскивания')
        return
      }
      
      const data = JSON.parse(dataStr)
      console.log('Получены данные:', data)
      
      if (data && data.item && data.slotIndex !== undefined) {
        // Проверяем, есть ли предмет в инвентаре
        const slotItem = inventory[data.slotIndex]
        if (!slotItem || slotItem.name !== data.item.name || slotItem.count <= 0) {
          console.warn('Предмет больше не доступен в инвентаре')
          return
        }
        
        // Если ячейка уже заполнена тем же предметом, не делаем ничего
        if (cell.dataset.item === data.item.name) {
          console.log('Ячейка уже содержит этот предмет')
          return
        }
        
        // Уменьшаем количество в инвентаре на 1
        if (removeItem(data.slotIndex, 1)) {
          // Добавляем предмет в ячейку крафта
          cell.dataset.item = data.item.name
          cell.textContent = data.item.name
          updateCrafting()
          console.log('Предмет добавлен в ячейку:', data.item.name)
        } else {
          console.warn('Не удалось удалить предмет из инвентаря')
        }
      }
    } catch (err) {
      console.warn('Ошибка при перетаскивании:', err)
    }
  })
  
  // Обработчик клика для добавления предмета из инвентаря (резервный способ)
  cell.addEventListener('click', () => {
    const selected = getSelectedItem()
    if (selected) {
      // Проверяем, есть ли предмет в инвентаре
      if (selected.count <= 0) {
        console.warn('Предмет закончился в инвентаре')
        return
      }
      
      // Если ячейка уже заполнена тем же предметом, не делаем ничего
      if (cell.dataset.item === selected.name) {
        return
      }
      
      // Уменьшаем количество в инвентаре на 1
      const slotIndex = getSelectedSlot()
      if (removeItem(slotIndex, 1)) {
        cell.dataset.item = selected.name
        cell.textContent = selected.name
        updateCrafting()
      }
    } else if (cell.dataset.item) {
      // Если кликнули по заполненной ячейке, возвращаем предмет в инвентарь
      const itemName = cell.dataset.item
      addItem(itemName, 1)
      cell.dataset.item = null
      cell.textContent = ""
      updateCrafting()
    }
  })
  
  craftDiv.appendChild(cell)
  grid.push(cell)
}


// === РЕЗУЛЬТАТ КРАФТА ===
export const resultSlot = document.createElement("div")
resultSlot.style.width = "48px"
resultSlot.style.height = "48px"
resultSlot.style.border = "2px solid yellow"
resultSlot.style.background = "#111"
resultSlot.style.color = "#fff"
resultSlot.style.display = "flex"
resultSlot.style.alignItems = "center"
resultSlot.style.justifyContent = "center"
resultSlot.style.font = "13px monospace"
craftDiv.appendChild(resultSlot)



// === ПОЛУЧЕНИЕ ПАТТЕРНА ИЗ 2x2 ===
function getGridPattern() {
  return [
    [grid[0].dataset.item || null, grid[1].dataset.item || null],
    [grid[2].dataset.item || null, grid[3].dataset.item || null]
  ]
}


// === ПОИСК РЕЦЕПТА ===
function matchRecipe() {
  const pattern = getGridPattern()

  for (const rec of recipes) {
    let ok = true

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        if (rec.pattern[y][x] !== pattern[y][x]) ok = false
      }
    }

    if (ok) return rec
  }

  return null
}


// === ОБНОВЛЕНИЕ UI ===
function updateCrafting() {
  const rec = matchRecipe()

  if (rec) {
    resultSlot.textContent = rec.result.name + " x" + rec.result.count
    resultSlot.dataset.result = JSON.stringify(rec.result)
  } else {
    resultSlot.textContent = ""
    resultSlot.dataset.result = ""
  }
}


// === ПОВЕДЕНИЕ ПРИ КЛИКЕ НА ЯЧЕЙКУ GRID ===
grid.forEach(cell => {
  cell.onclick = () => {
    const selected = getSelectedItem()
    if (!selected) return
    cell.dataset.item = selected.name
    cell.textContent = selected.name
    updateCrafting()
  }
})


// === КЛИК ПО РЕЗУЛЬТАТУ — КРАФТ ===
resultSlot.onclick = () => {
  if (!resultSlot.dataset.result) return

  const { name, count } = JSON.parse(resultSlot.dataset.result)

  // добавляем в инвентарь
  addItem(name, count)

  // очищаем сетку
  grid.forEach(c => {
    c.dataset.item = null
    c.textContent = ""
  })

  updateCrafting()
}


// === ОТКРЫТИЕ/ЗАКРЫТИЕ ИНТЕРФЕЙСА ===
window.addEventListener("keydown", e => {
  // Открываем крафт по E
  if (e.code === "KeyE" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    e.stopPropagation()
    
    // @ts-ignore
    const noa = window.noa
    const isOpening = craftDiv.style.display === "none" || craftDiv.style.display === ""
    
    if (isOpening) {
      // Открываем окно крафта
      craftDiv.style.display = "flex"
      // Отключаем pointer lock, чтобы курсор был виден для перетаскивания
      if (noa && noa.container && noa.container.canvas) {
        document.exitPointerLock()
        noa.container.canvas.style.cursor = "default"
      }
    } else {
      // Закрываем окно крафта
      craftDiv.style.display = "none"
      // Включаем pointer lock обратно для управления камерой
      if (noa && noa.container && noa.container.canvas) {
        noa.container.canvas.requestPointerLock()
        noa.container.canvas.style.cursor = "none"
      }
    }
  }
})
