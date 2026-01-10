// ui/crafting.js — ВИЗУАЛ КРАФТИНГА (БЕЗ ЛОГИКИ)

import { inventory, addItem, removeItem, getSelectedItem, getSelectedSlot } from './inventory.js'
import { getShortName } from './items.js'
const MATERIALS = [
  "dirt",
  "stone",
  "sand",
  "granite",
  "andesite",
  "cactus",
  "desert_rock",
  "gravel",
  "ice", 
  "leaves_oak",
  "leaves_pine",
  "leaves_savanna",
  "mushroom_leg",
  "pumpkin",
  "red_mushroom_top",
  "red_sand",
  "sand"
]
let recipesInitialized = false

/* =========================
   CRAFT WINDOW
========================= */

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
craftDiv.style.zIndex = "10001"
craftDiv.style.pointerEvents = "auto"
document.body.appendChild(craftDiv)

/* =========================
   GRID 2x2
========================= */
function getItemIcon(name) {
  if (window.generatedTextures && window.generatedTextures[name]) {
    return "data:image/png;base64," + window.generatedTextures[name]
  }
  if (window.cvaeTextures && window.cvaeTextures[name]) {
    return "data:image/png;base64," + window.cvaeTextures[name]
  }
  return null
}


const gridContainer = document.createElement("div")
gridContainer.style.display = "flex"
gridContainer.style.flexWrap = "wrap"
gridContainer.style.width = "108px"
gridContainer.style.gap = "4px"
craftDiv.appendChild(gridContainer)

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
  cell.style.font = "10px monospace"
  cell.style.cursor = "pointer"
  cell.dataset.gridIndex = String(i)

  // DROP
  cell.addEventListener("dragover", e => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    cell.style.border = "2px solid yellow"
  })

  cell.addEventListener("dragleave", () => {
    cell.style.border = "2px solid gray"
  })

  cell.addEventListener("drop", e => {
    e.preventDefault()
    const data = JSON.parse(e.dataTransfer.getData("text/plain"))
    if (!data?.item) return

    if (cell.dataset.item) {
      addItem(cell.dataset.item, 1)
    }

    if (removeItem(data.slotIndex, 1)) {
      cell.dataset.item = data.item.name
      cell.textContent = getShortName(data.item.name)
    }

    updateResultPreview()
  })

  // CLICK (place / remove)
  cell.addEventListener("click", () => {
    if (cell.dataset.item) {
      addItem(cell.dataset.item, 1)
      delete cell.dataset.item
      cell.textContent = ""
    } else {
      const sel = getSelectedItem()
      if (!sel) return
      if (removeItem(getSelectedSlot(), 1)) {
        cell.dataset.item = sel.name
cell.innerHTML = ""
const img = document.createElement("div")
img.style.width = "32px"
img.style.height = "32px"
img.style.backgroundImage = `url(${getItemIcon(sel.name)})`
img.style.backgroundSize = "cover"
img.style.imageRendering = "pixelated"
cell.appendChild(img)
      }
    }
    updateResultPreview()
  })

  gridContainer.appendChild(cell)
  grid.push(cell)
}

/* =========================
   RESULT SLOT (VISUAL ONLY)
========================= */

export const resultSlot = document.createElement("div")
resultSlot.style.width = "48px"
resultSlot.style.height = "48px"
resultSlot.style.border = "2px solid yellow"
resultSlot.style.background = "#111"
resultSlot.style.color = "#fff"
resultSlot.style.display = "flex"
resultSlot.style.alignItems = "center"
resultSlot.style.justifyContent = "center"
resultSlot.style.font = "10px monospace"
craftDiv.appendChild(resultSlot)



/* =========================
   TAKE RESULT
========================= */


/* =========================
   OPEN / CLOSE
========================= */

function closeCraft() {
  craftDiv.style.display = "none"
  const noa = window.noa
  if (noa?.container?.canvas) {
    noa.container.canvas.style.cursor = "none"
  }
}

document.addEventListener("keydown", e => {
  const isOpen = craftDiv.style.display === "flex"

  if (e.code === "Escape" && isOpen) {
    e.preventDefault()
    closeCraft()
    return
  }

  if (e.code === "KeyE") {
    e.preventDefault()
    const noa = window.noa

    if (!isOpen) {
      craftDiv.style.display = "flex"

      if (!recipesInitialized) {
        generateRandomRecipes()
        updateRecipesList()
        recipesInitialized = true
      }

      updateResultPreview()

      document.exitPointerLock()
      noa?.container?.canvas &&
        (noa.container.canvas.style.cursor = "default")
    } else {
      closeCraft()
    }
  }
}, true)

let randomRecipes = []

function generateRandomRecipes() {
  randomRecipes = []

  const count = 5 + Math.floor(Math.random() * 6) // 5–10
  const used = new Set()

  while (randomRecipes.length < count) {
    const a = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
    const b = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
    if (a === b) continue

    const key = [a, b].sort().join("+")
    if (used.has(key)) continue
    used.add(key)

    const ratio = 0.25 + Math.random() * 0.5 // 25–75%

    randomRecipes.push({
      a,
      b,
      ratio,
result: `mixed_${a}_${b}_side`
    })
  }
}
const recipesList = document.createElement("div")
recipesList.style.marginTop = "8px"
recipesList.style.font = "10px monospace"
recipesList.style.color = "#ccc"
recipesList.style.maxHeight = "120px"
recipesList.style.overflowY = "auto"
craftDiv.appendChild(recipesList)
function updateRecipesList() {
  recipesList.innerHTML = "<b>Recipes:</b><br>"

  randomRecipes.forEach(r => {
    const line = document.createElement("div")
    line.textContent = `${r.a} + ${r.b} → ${r.result}`
    line.style.color = "#ffaa44"
    recipesList.appendChild(line)
  })
}
function findMatchingRecipe() {
  const items = grid
    .map(c => c.dataset.item)
    .filter(Boolean)

  if (items.length !== 2) return null

  const key = items.sort().join("+")

  return randomRecipes.find(r =>
    [r.a, r.b].sort().join("+") === key
  )
}
function updateResultPreview() {
  const recipe = findMatchingRecipe()

  if (!recipe) {
    resultSlot.innerHTML = ""
    resultSlot.dataset.recipe = ""
    return
  }

  resultSlot.innerHTML = ""

  const img = document.createElement("div")
  img.style.width = "32px"
  img.style.height = "32px"
  img.style.backgroundImage =
    `url(${getItemIcon(recipe.a)})`
  img.style.backgroundSize = "cover"
  img.style.imageRendering = "pixelated"

  resultSlot.appendChild(img)
  resultSlot.dataset.recipe = JSON.stringify(recipe)
}
resultSlot.onclick = async () => {
  if (!resultSlot.dataset.recipe) return

  const recipe = JSON.parse(resultSlot.dataset.recipe)

  const { mixTextures } = await import("../texture_runtime_loader.js")

const baseName = recipe.result.replace("_side", "")
const sideName = `${baseName}_side`
const topName = `${baseName}_top`

const { mixPixels } = await import("../texture_runtime_loader.js")

const sideTex = await mixPixels(recipe.a, recipe.b, recipe.ratio)
const topTex  = await mixPixels(recipe.a, recipe.b, recipe.ratio)


window.generatedTextures ||= {}
window.generatedTextures[sideName] = sideTex
window.generatedTextures[topName] = topTex

window.dispatchEvent(new CustomEvent("textureGenerated", {
  detail: { textureName: topName, textureData: topTex }
}))
window.dispatchEvent(new CustomEvent("textureGenerated", {
  detail: { textureName: sideName, textureData: sideTex }
}))


  // сохраняем текстуру
  window.generatedTextures ||= {}


  // даём время на регистрацию
  await new Promise(r => setTimeout(r, 200))
await new Promise(r => setTimeout(r, 300))

const blocksMap = window.blocksMap
if (!blocksMap || !blocksMap[baseName]) {
  console.error("❌ Блок не зарегистрирован:", baseName)
  return
}

addItem(baseName, 1)


  // очистка сетки
  grid.forEach(c => {
    delete c.dataset.item
    c.textContent = ""
    c.style.border = "2px solid gray"
  })

  updateResultPreview()
}
