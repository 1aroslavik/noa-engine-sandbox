// ui/crafting.js — окно крафтинга 2x2

import { inventory, addItem, getSelectedItem, removeItem, getSelectedSlot } from './inventory.js'
import { getItemDefinition, getRarityColor, getDifficultyName, getMaterialTypeName, getRarityName, CRAFT_DIFFICULTY, getShortName, RARITY, MATERIAL_TYPE } from './items.js'

// === БАЗОВЫЕ РЕЦЕПТЫ (статические, всегда доступные) ===
const baseRecipes = [
  {
    pattern: [
      ["log", null],
      [null, null]
    ],
    result: { name: "planks", count: 4 },
    difficulty: CRAFT_DIFFICULTY.EASY,
    description: "Распил бревна на доски"
  },
  {
    pattern: [
      ["planks", null],
      ["planks", null]
    ],
    result: { name: "stick", count: 4 },
    difficulty: CRAFT_DIFFICULTY.EASY,
    description: "Изготовление палок из досок"
  }
  // Инструменты временно отключены
]

// === ДИНАМИЧЕСКИ ГЕНЕРИРУЕМЫЕ РЕЦЕПТЫ ===
let generatedRecipes = []
export let recipes = [...baseRecipes, ...generatedRecipes]

// === ГЕНЕРАЦИЯ РЕЦЕПТОВ НА ОСНОВЕ ИНВЕНТАРЯ ===
function generateRecipes() {
  generatedRecipes = []
  
  // Получаем уникальные предметы из инвентаря
  const availableItems = []
  const itemCounts = new Map()
  
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i]
    if (item && item.count > 0) {
      if (!itemCounts.has(item.name)) {
        availableItems.push(item.name)
        itemCounts.set(item.name, item.count)
      }
    }
  }
  
  if (availableItems.length === 0) {
    recipes = [...baseRecipes]
    return
  }
  
  // Генерируем 5-10 рецептов
  const targetRecipeCount = Math.min(10, Math.max(5, availableItems.length * 2))
  const generated = new Set() // Для избежания дубликатов
  
  // Правило 1: 2 одинаковых предмета = улучшенная версия (следующая редкость)
  for (const itemName of availableItems) {
    if (itemCounts.get(itemName) >= 2 && generated.size < targetRecipeCount) {
      const itemDef = getItemDefinition(itemName)
      const nextRarity = getNextRarity(itemDef.rarity)
      const resultName = generateResultName(itemName, itemDef.type, nextRarity)
      
      if (!generated.has(`${itemName}+${itemName}`)) {
        generatedRecipes.push({
          pattern: [
            [itemName, null],
            [null, null]
          ],
          result: { name: resultName, count: 1 },
          difficulty: getDifficultyFromRarity(nextRarity),
          description: `Улучшение ${itemDef.description}`
        })
        generated.add(`${itemName}+${itemName}`)
      }
    }
  }
  
  // Правило 2: 2 разных предмета одной редкости и типа = предмет следующей редкости
  for (let i = 0; i < availableItems.length && generated.size < targetRecipeCount; i++) {
    for (let j = i + 1; j < availableItems.length && generated.size < targetRecipeCount; j++) {
      const item1 = availableItems[i]
      const item2 = availableItems[j]
      const def1 = getItemDefinition(item1)
      const def2 = getItemDefinition(item2)
      
      if (def1.rarity === def2.rarity && def1.type === def2.type && 
          itemCounts.get(item1) >= 1 && itemCounts.get(item2) >= 1) {
        const nextRarity = getNextRarity(def1.rarity)
        const resultName = generateResultName(`${item1}_${item2}`, def1.type, nextRarity)
        
        if (!generated.has(`${item1}+${item2}`) && !generated.has(`${item2}+${item1}`)) {
          generatedRecipes.push({
            pattern: [
              [item1, item2],
              [null, null]
            ],
            result: { name: resultName, count: 1 },
            difficulty: getDifficultyFromRarity(nextRarity),
            description: `Комбинация ${def1.description} и ${def2.description}`
          })
          generated.add(`${item1}+${item2}`)
        }
      }
    }
  }
  
  // Правило 3: 2 разных предмета разных типов = синтетический предмет
  for (let i = 0; i < availableItems.length && generated.size < targetRecipeCount; i++) {
    for (let j = i + 1; j < availableItems.length && generated.size < targetRecipeCount; j++) {
      const item1 = availableItems[i]
      const item2 = availableItems[j]
      const def1 = getItemDefinition(item1)
      const def2 = getItemDefinition(item2)
      
      if (def1.type !== def2.type && 
          def1.rarity === def2.rarity &&
          itemCounts.get(item1) >= 1 && itemCounts.get(item2) >= 1) {
        const resultName = generateResultName(`${item1}_${item2}`, MATERIAL_TYPE.SYNTHETIC, def1.rarity)
        
        if (!generated.has(`${item1}+${item2}_synth`) && !generated.has(`${item2}+${item1}_synth`)) {
          generatedRecipes.push({
            pattern: [
              [item1, item2],
              [null, null]
            ],
            result: { name: resultName, count: 1 },
            difficulty: getDifficultyFromRarity(def1.rarity) + 1,
            description: `Синтез ${def1.description} и ${def2.description}`
          })
          generated.add(`${item1}+${item2}_synth`)
        }
      }
    }
  }
  
  // Правило 4: 3 предмета одной редкости = более редкий предмет
  for (let i = 0; i < availableItems.length && generated.size < targetRecipeCount; i++) {
    for (let j = i + 1; j < availableItems.length && generated.size < targetRecipeCount; j++) {
      for (let k = j + 1; k < availableItems.length && generated.size < targetRecipeCount; k++) {
        const item1 = availableItems[i]
        const item2 = availableItems[j]
        const item3 = availableItems[k]
        const def1 = getItemDefinition(item1)
        const def2 = getItemDefinition(item2)
        const def3 = getItemDefinition(item3)
        
        if (def1.rarity === def2.rarity && def2.rarity === def3.rarity &&
            itemCounts.get(item1) >= 1 && itemCounts.get(item2) >= 1 && itemCounts.get(item3) >= 1) {
          const nextRarity = getNextRarity(def1.rarity)
          const resultName = generateResultName(`${item1}_${item2}_${item3}`, def1.type, nextRarity)
          const key = `${item1}+${item2}+${item3}`
          
          if (!generated.has(key)) {
            generatedRecipes.push({
              pattern: [
                [item1, item2],
                [item3, null]
              ],
              result: { name: resultName, count: 1 },
              difficulty: getDifficultyFromRarity(nextRarity) + 1,
              description: `Сложная комбинация трех материалов`
            })
            generated.add(key)
          }
        }
      }
    }
  }
  
  // Обновляем общий список рецептов
  recipes = [...baseRecipes, ...generatedRecipes]
  console.log(`🔨 Сгенерировано ${generatedRecipes.length} рецептов из ${availableItems.length} доступных предметов`)
}

// Получить следующую редкость
function getNextRarity(currentRarity) {
  const rarityOrder = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY]
  const currentIndex = rarityOrder.indexOf(currentRarity)
  if (currentIndex < rarityOrder.length - 1) {
    return rarityOrder[currentIndex + 1]
  }
  return currentRarity // Если уже максимальная редкость, возвращаем её
}

// Получить сложность крафта на основе редкости
function getDifficultyFromRarity(rarity) {
  const rarityToDifficulty = {
    [RARITY.COMMON]: CRAFT_DIFFICULTY.EASY,
    [RARITY.UNCOMMON]: CRAFT_DIFFICULTY.NORMAL,
    [RARITY.RARE]: CRAFT_DIFFICULTY.MEDIUM,
    [RARITY.EPIC]: CRAFT_DIFFICULTY.HARD,
    [RARITY.LEGENDARY]: CRAFT_DIFFICULTY.EXPERT
  }
  return rarityToDifficulty[rarity] || CRAFT_DIFFICULTY.NORMAL
}

// Генерировать имя результата на основе входных данных
function generateResultName(baseName, type, rarity) {
  // Создаем уникальное имя на основе типа и редкости
  const typePrefix = type === MATERIAL_TYPE.ORGANIC ? 'org' : 
                     type === MATERIAL_TYPE.MINERAL ? 'min' : 'syn'
  const raritySuffix = rarity === RARITY.COMMON ? 'common' :
                       rarity === RARITY.UNCOMMON ? 'uncommon' :
                       rarity === RARITY.RARE ? 'rare' :
                       rarity === RARITY.EPIC ? 'epic' : 'legendary'
  
  // Упрощаем базовое имя (берем первую часть до _ или первые 8 символов)
  let base = baseName.split('_')[0] || baseName
  if (base.length > 8) {
    base = base.substring(0, 8)
  }
  
  // Если baseName содержит несколько частей через _, берем первые две
  const parts = baseName.split('_')
  if (parts.length > 1 && parts.length <= 3) {
    base = parts.slice(0, 2).join('_')
  }
  
  return `${typePrefix}_${base}_${raritySuffix}`
}


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
  cell.style.font = "10px monospace"
  cell.style.fontSize = "10px"
  cell.style.lineHeight = "1.0"
  cell.style.textAlign = "center"
  cell.style.overflow = "hidden"
  cell.style.textOverflow = "ellipsis"
  cell.style.whiteSpace = "nowrap"
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
    // Возвращаем цвет границы в зависимости от редкости предмета в ячейке
    if (cell.dataset.item) {
      const itemDef = getItemDefinition(cell.dataset.item)
      const rarityColor = getRarityColor(itemDef.rarity)
      cell.style.border = `2px solid ${rarityColor}`
    } else {
      cell.style.border = "2px solid gray"
    }
    cell.style.background = "#111"
  })
  
  // Обработчик "бросания" предмета
  cell.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
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
          cell.textContent = getShortName(data.item.name)
          
          // Обновляем цвет границы в зависимости от редкости
          const itemDef = getItemDefinition(data.item.name)
          const rarityColor = getRarityColor(itemDef.rarity)
          cell.style.border = `2px solid ${rarityColor}`
          
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
        cell.textContent = getShortName(selected.name)
        
        // Обновляем цвет границы в зависимости от редкости
        const itemDef = getItemDefinition(selected.name)
        const rarityColor = getRarityColor(itemDef.rarity)
        cell.style.border = `2px solid ${rarityColor}`
        
        updateCrafting()
      }
    } else if (cell.dataset.item) {
      // Если кликнули по заполненной ячейке, возвращаем предмет в инвентарь
      const itemName = cell.dataset.item
      addItem(itemName, 1)
      cell.dataset.item = null
      cell.textContent = ""
      cell.style.border = "2px solid gray" // Возвращаем стандартный цвет
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
resultSlot.style.font = "10px monospace"
resultSlot.style.fontSize = "10px"
resultSlot.style.lineHeight = "1.0"
resultSlot.style.textAlign = "center"
resultSlot.style.overflow = "hidden"
resultSlot.style.textOverflow = "ellipsis"
resultSlot.style.whiteSpace = "nowrap"
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
  
  // Отладочный вывод
  console.log('🔍 Проверка рецепта. Паттерн:', pattern)

  for (const rec of recipes) {
    let ok = true

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const recipeItem = rec.pattern[y][x]
        const gridItem = pattern[y][x]
        if (recipeItem !== gridItem) {
          ok = false
          break
        }
      }
      if (!ok) break
    }

    if (ok) {
      console.log('✅ Найден рецепт:', rec.result.name)
      return rec
    }
  }

  console.log('❌ Рецепт не найден')
  return null
}


// === ОБНОВЛЕНИЕ UI ===
function updateCrafting() {
  const rec = matchRecipe()

  if (rec) {
    const resultName = rec.result.name
    const resultCount = rec.result.count
    resultSlot.textContent = getShortName(resultName) + " x" + resultCount
    resultSlot.dataset.result = JSON.stringify(rec.result)
    
    // Получаем метаданные результирующего предмета
    const itemDef = getItemDefinition(resultName)
    const rarityColor = getRarityColor(itemDef.rarity)
    
    // Устанавливаем цвет границы в зависимости от редкости
    resultSlot.style.border = `2px solid ${rarityColor}`
    
    // Добавляем tooltip с информацией о предмете и сложности крафта
    const difficultyName = getDifficultyName(rec.difficulty || CRAFT_DIFFICULTY.NORMAL)
    const materialTypeName = getMaterialTypeName(itemDef.type)
    const rarityName = getRarityName(itemDef.rarity)
    
    resultSlot.title = `${itemDef.description}\n` +
      `Редкость: ${rarityName}\n` +
      `Тип: ${materialTypeName}\n` +
      `Сложность крафта: ${difficultyName}`
  } else {
    resultSlot.textContent = ""
    resultSlot.dataset.result = ""
    resultSlot.style.border = "2px solid yellow"
    resultSlot.title = ""
  }
}


// Удаляем дублирующий обработчик - он уже есть в цикле создания ячеек выше
// Этот обработчик конфликтует с обработчиком в строке 245


// === КЛИК ПО РЕЗУЛЬТАТУ — КРАФТ ===
resultSlot.onclick = () => {
  if (!resultSlot.dataset.result) {
    console.log('❌ Нет результата для крафта')
    return
  }

  try {
    const { name, count } = JSON.parse(resultSlot.dataset.result)
    console.log('🔨 Крафт предмета:', name, 'x', count)

    // добавляем в инвентарь
    const added = addItem(name, count)
    if (!added) {
      console.warn('⚠ Не удалось добавить предмет в инвентарь (инвентарь полон?)')
      return
    }

    // очищаем сетку
    grid.forEach(c => {
      c.dataset.item = null
      c.textContent = ""
      c.style.border = "2px solid gray"
    })

    updateCrafting()
    console.log('✅ Крафт завершен')
  } catch (err) {
    console.error('❌ Ошибка при крафте:', err)
  }
}


// === ОТКРЫТИЕ/ЗАКРЫТИЕ ИНТЕРФЕЙСА ===
// Используем capture phase, чтобы перехватить E до других обработчиков
document.addEventListener("keydown", e => {
  // Открываем крафт по E
  if (e.code === "KeyE" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation() // Предотвращаем обработку E в noa
    
    console.log("🔧 E нажата - открываем/закрываем крафт")
    
    // @ts-ignore
    const noa = window.noa
    const isOpening = craftDiv.style.display === "none" || craftDiv.style.display === ""
    
    if (isOpening) {
      // Открываем окно крафта
      craftDiv.style.display = "flex"
      console.log("✅ Окно крафта открыто")
      // Генерируем рецепты на основе текущего инвентаря
      generateRecipes()
      // Обновляем крафт при открытии
      updateCrafting()
      // Отключаем pointer lock, чтобы курсор был виден для перетаскивания
      if (noa && noa.container && noa.container.canvas) {
        document.exitPointerLock()
        noa.container.canvas.style.cursor = "default"
      }
    } else {
      // Закрываем окно крафта
      craftDiv.style.display = "none"
      console.log("❌ Окно крафта закрыто")
      // Включаем pointer lock обратно для управления камерой
      if (noa && noa.container && noa.container.canvas) {
        noa.container.canvas.requestPointerLock()
        noa.container.canvas.style.cursor = "none"
      }
    }
  }
}, true) // Используем capture phase для раннего перехвата
