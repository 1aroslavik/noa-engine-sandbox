// ui/crafting.js — окно крафтинга 2x2

import { inventory, addItem, getSelectedItem } from './inventory.js'

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
craftDiv.style.zIndex = "10000"
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
  cell.dataset.item = null
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
  if (e.code === "KeyE") {
    craftDiv.style.display = craftDiv.style.display === "none" ? "flex" : "none"
  }
})
