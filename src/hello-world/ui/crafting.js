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
  },
  // === РЕЦЕПТЫ СМЕШИВАНИЯ БЛОКОВ ===
  {
    pattern: [
      ["dirt", "log"],
      [null, null]
    ],
    result: { name: "dark_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание земли с деревом - темное дерево",
    textureMix: { texture1: "log_side", texture2: "dirt", ratio: 0.3, resultName: "dark_log_side" }
  },
  {
    pattern: [
      ["log", "dirt"],
      [null, null]
    ],
    result: { name: "dark_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с землей - темное дерево",
    textureMix: { texture1: "log_side", texture2: "dirt", ratio: 0.3, resultName: "dark_log_side" }
  },
  {
    pattern: [
      ["stone", "log"],
      [null, null]
    ],
    result: { name: "stone_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание камня с деревом - каменное дерево",
    textureMix: { texture1: "log_side", texture2: "stone", ratio: 0.4, resultName: "stone_log_side" }
  },
  {
    pattern: [
      ["log", "stone"],
      [null, null]
    ],
    result: { name: "stone_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с камнем - каменное дерево",
    textureMix: { texture1: "log_side", texture2: "stone", ratio: 0.4, resultName: "stone_log_side" }
  },
  {
    pattern: [
      ["dirt", "stone"],
      [null, null]
    ],
    result: { name: "mud_stone", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание земли с камнем - грязный камень",
    textureMix: { texture1: "stone", texture2: "dirt", ratio: 0.35, resultName: "mud_stone" }
  },
  {
    pattern: [
      ["stone", "dirt"],
      [null, null]
    ],
    result: { name: "mud_stone", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание камня с землей - грязный камень",
    textureMix: { texture1: "stone", texture2: "dirt", ratio: 0.35, resultName: "mud_stone" }
  },
  {
    pattern: [
      ["sand", "log"],
      [null, null]
    ],
    result: { name: "sandy_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание песка с деревом - песчаное дерево",
    textureMix: { texture1: "log_side", texture2: "sand", ratio: 0.3, resultName: "sandy_log_side" }
  },
  {
    pattern: [
      ["log", "sand"],
      [null, null]
    ],
    result: { name: "sandy_log", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с песком - песчаное дерево",
    textureMix: { texture1: "log_side", texture2: "sand", ratio: 0.3, resultName: "sandy_log_side" }
  }
  // Инструменты временно отключены
]

// === ДИНАМИЧЕСКИ ГЕНЕРИРУЕМЫЕ РЕЦЕПТЫ ===
let generatedRecipes = []
// Базовые рецепты идут ПЕРВЫМИ, чтобы иметь приоритет
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
  // НО: пропускаем комбинации, которые уже есть в базовых рецептах
  const baseRecipePatterns = new Set()
  for (const baseRecipe of baseRecipes) {
    if (baseRecipe.pattern) {
      const items = []
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          if (baseRecipe.pattern[y][x]) {
            items.push(baseRecipe.pattern[y][x])
          }
        }
      }
      if (items.length >= 2) {
        const sorted = [...items].sort().join('+')
        baseRecipePatterns.add(sorted)
      }
    }
  }
  
  for (let i = 0; i < availableItems.length && generated.size < targetRecipeCount; i++) {
    for (let j = i + 1; j < availableItems.length && generated.size < targetRecipeCount; j++) {
      const item1 = availableItems[i]
      const item2 = availableItems[j]
      const def1 = getItemDefinition(item1)
      const def2 = getItemDefinition(item2)
      
      // Пропускаем комбинации, которые уже есть в базовых рецептах
      const comboKey = [item1, item2].sort().join('+')
      if (baseRecipePatterns.has(comboKey)) {
        console.log(`⏭ Пропускаем комбинацию ${item1}+${item2} - есть в базовых рецептах`)
        continue
      }
      
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
  // Не устанавливаем dataset.item, оставляем его undefined
  cell.dataset.gridIndex = String(i)
  
  // Разрешаем "бросать" предметы в ячейку
  cell.addEventListener('dragenter', (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Проверяем, что это перетаскивание из инвентаря
    const types = e.dataTransfer.types
    if (types && types.includes('text/plain')) {
      cell.style.border = "2px solid yellow"
      cell.style.background = "#333"
    }
  })
  
  cell.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const types = e.dataTransfer.types
    if (types && types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'move'
      cell.style.border = "2px solid yellow"
      cell.style.background = "#333"
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
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
    
    // Возвращаем нормальный цвет
    if (cell.dataset.item) {
      const itemDef = getItemDefinition(cell.dataset.item)
      const rarityColor = getRarityColor(itemDef.rarity)
      cell.style.border = `2px solid ${rarityColor}`
    } else {
      cell.style.border = "2px solid gray"
    }
    cell.style.background = "#111"
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) {
        console.warn('Нет данных для перетаскивания')
        return
      }
      
      const data = JSON.parse(dataStr)
      console.log('Получены данные при drop:', data)
      
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
        
        // Если ячейка уже заполнена другим предметом, возвращаем старый предмет в инвентарь
        if (cell.dataset.item && 
            cell.dataset.item !== 'null' && 
            cell.dataset.item !== '' && 
            cell.dataset.item !== data.item.name) {
          const oldItemName = cell.dataset.item
          if (oldItemName && oldItemName !== 'null' && oldItemName !== '') {
            addItem(oldItemName, 1)
            console.log('Старый предмет возвращен в инвентарь:', oldItemName)
          }
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
          
          console.log(`✅ Предмет добавлен в ячейку крафтинга: ${data.item.name}, dataset.item = ${cell.dataset.item}`)
          
          // Небольшая задержка перед обновлением, чтобы убедиться что dataset обновился
          setTimeout(() => {
            updateCrafting()
          }, 0)
        } else {
          console.warn('Не удалось удалить предмет из инвентаря')
        }
      } else {
        console.warn('Некорректные данные при drop:', data)
      }
    } catch (err) {
      console.error('Ошибка при перетаскивании:', err)
    }
  })
  
  // Обработчик клика для добавления/удаления предмета из инвентаря
  cell.addEventListener('click', (e) => {
    // Предотвращаем конфликт с drag событиями
    e.stopPropagation()
    
    const selected = getSelectedItem()
    
    // Если ячейка уже заполнена, возвращаем предмет в инвентарь
    if (cell.dataset.item && cell.dataset.item !== 'null' && cell.dataset.item !== '') {
      const itemName = cell.dataset.item
      // Проверяем, что itemName валидный перед добавлением
      if (itemName && itemName !== 'null' && itemName !== '') {
        addItem(itemName, 1)
        // Удаляем data-атрибут вместо установки null
        delete cell.dataset.item
        cell.textContent = ""
        cell.style.border = "2px solid gray"
        cell.style.background = "#111"
        updateCrafting()
        console.log('Предмет возвращен в инвентарь:', itemName)
      }
      return
    }
    
    // Если ячейка пустая и есть выбранный предмет, добавляем его
    if (selected && selected.name && selected.count > 0) {
      const slotIndex = getSelectedSlot()
      if (removeItem(slotIndex, 1)) {
        cell.dataset.item = selected.name
        cell.textContent = getShortName(selected.name)
        
        // Обновляем цвет границы в зависимости от редкости
        const itemDef = getItemDefinition(selected.name)
        const rarityColor = getRarityColor(itemDef.rarity)
        cell.style.border = `2px solid ${rarityColor}`
        cell.style.background = "#111"
        
        console.log(`✅ Предмет добавлен в ячейку: ${selected.name}, dataset.item = ${cell.dataset.item}`)
        
        // Небольшая задержка перед обновлением, чтобы убедиться что dataset обновился
        setTimeout(() => {
          updateCrafting()
        }, 0)
      } else {
        console.warn('Не удалось добавить предмет - возможно инвентарь полон или предмет закончился')
      }
    }
    // Если ячейка пустая и нет выбранного предмета - ничего не делаем
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
  // Функция для нормализации значения из dataset
  const normalizeItem = (cell) => {
    // Проверяем наличие свойства item в dataset
    if (!cell || !('item' in cell.dataset)) {
      return null
    }
    const item = cell.dataset.item
    if (!item || item === 'null' || item === '' || item === 'undefined') {
      return null
    }
    return item
  }
  
  const pattern = [
    [normalizeItem(grid[0]), normalizeItem(grid[1])],
    [normalizeItem(grid[2]), normalizeItem(grid[3])]
  ]
  
  // Отладочный вывод для диагностики
  console.log('📋 getGridPattern вызван. Ячейки:', {
    0: grid[0].dataset.item || 'undefined',
    1: grid[1].dataset.item || 'undefined',
    2: grid[2].dataset.item || 'undefined',
    3: grid[3].dataset.item || 'undefined'
  })
  console.log('📋 Нормализованный паттерн:', pattern)
  
  return pattern
}


// === ПОИСК РЕЦЕПТА ===
function matchRecipe() {
  const pattern = getGridPattern()
  
  // Отладочный вывод
  console.log('🔍 Проверка рецепта. Паттерн:', pattern)

  // Собираем все не-null предметы из паттерна
  const gridItems = []
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      if (pattern[y][x]) {
        gridItems.push(pattern[y][x])
      }
    }
  }

  // Сначала проверяем базовые рецепты (они имеют приоритет)
  for (const rec of baseRecipes) {
    // Собираем все не-null предметы из рецепта
    const recipeItems = []
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        if (rec.pattern[y][x]) {
          recipeItems.push(rec.pattern[y][x])
        }
      }
    }

    // Проверяем точное совпадение паттерна (с учетом позиций)
    let exactMatch = true
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const recipeItem = rec.pattern[y][x]
        const gridItem = pattern[y][x]
        if (recipeItem !== gridItem) {
          exactMatch = false
          break
        }
      }
      if (!exactMatch) break
    }

    if (exactMatch) {
      console.log('✅ Найден базовый рецепт (точное совпадение):', rec.result.name)
      return rec
    }

    // Если точного совпадения нет, проверяем совпадение по набору предметов (для рецептов смешивания)
    // Это работает только если количество предметов совпадает
    if (gridItems.length === recipeItems.length && gridItems.length >= 2) {
      // Сортируем массивы для сравнения
      const sortedGrid = [...gridItems].sort()
      const sortedRecipe = [...recipeItems].sort()
      
      // Проверяем, что отсортированные массивы совпадают
      let allMatch = true
      for (let i = 0; i < sortedGrid.length; i++) {
        if (sortedGrid[i] !== sortedRecipe[i]) {
          allMatch = false
          break
        }
      }

      if (allMatch) {
        console.log('✅ Найден базовый рецепт (совпадение по набору):', rec.result.name)
        return rec
      }
    }
  }
  
  // Затем проверяем динамически сгенерированные рецепты
  for (const rec of generatedRecipes) {
    // Собираем все не-null предметы из рецепта
    const recipeItems = []
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        if (rec.pattern[y][x]) {
          recipeItems.push(rec.pattern[y][x])
        }
      }
    }

    // Проверяем точное совпадение паттерна (с учетом позиций)
    let exactMatch = true
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const recipeItem = rec.pattern[y][x]
        const gridItem = pattern[y][x]
        if (recipeItem !== gridItem) {
          exactMatch = false
          break
        }
      }
      if (!exactMatch) break
    }

    if (exactMatch) {
      console.log('✅ Найден динамический рецепт (точное совпадение):', rec.result.name)
      return rec
    }

    // Если точного совпадения нет, проверяем совпадение по набору предметов
    if (gridItems.length === recipeItems.length && gridItems.length >= 2) {
      // Сортируем массивы для сравнения
      const sortedGrid = [...gridItems].sort()
      const sortedRecipe = [...recipeItems].sort()
      
      // Проверяем, что отсортированные массивы совпадают
      let allMatch = true
      for (let i = 0; i < sortedGrid.length; i++) {
        if (sortedGrid[i] !== sortedRecipe[i]) {
          allMatch = false
          break
        }
      }

      if (allMatch) {
        console.log('✅ Найден динамический рецепт (совпадение по набору):', rec.result.name)
        return rec
      }
    }
  }

  console.log('❌ Рецепт не найден. Предметы в сетке:', gridItems)
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
resultSlot.onclick = async () => {
  if (!resultSlot.dataset.result) {
    console.log('❌ Нет результата для крафта')
    return
  }

  try {
    const resultData = JSON.parse(resultSlot.dataset.result)
    const { name, count } = resultData
    
    // Находим рецепт для проверки наличия textureMix
    const pattern = getGridPattern()
    const recipe = matchRecipe()
    
    console.log('🔨 Крафт предмета:', name, 'x', count)

    // Если рецепт требует смешивания текстур, генерируем текстуру
    if (recipe && recipe.textureMix) {
      console.log('🎨 Генерация смешанной текстуры для:', name)
      try {
        const { mixTextures } = await import('../texture_runtime_loader.js')
        const { texture1, texture2, ratio, resultName } = recipe.textureMix
        
        // Генерируем смешанную текстуру
        const mixedTexture = await mixTextures(texture1, texture2, ratio, resultName)
        
        // Сохраняем текстуру в глобальном хранилище для использования в materials.js
        // @ts-ignore
        if (!window.generatedTextures) {
          // @ts-ignore
          window.generatedTextures = {}
        }
        // @ts-ignore
        window.generatedTextures[resultName] = mixedTexture
        
        // Если это блок с несколькими сторонами (например, log), генерируем и top
        if (resultName.includes('_side')) {
          const topName = resultName.replace('_side', '_top')
          // Для top используем log_top если доступен, иначе используем ту же текстуру
          const topTexture1 = texture1.includes('_side') 
            ? texture1.replace('_side', '_top') 
            : (texture1.includes('log') ? 'log_top' : texture1)
          
          console.log(`🎨 Генерация top текстуры: ${topName} из ${topTexture1} + ${texture2}`)
          
          const topTexture = await mixTextures(
            topTexture1,
            texture2,
            ratio,
            topName
          )
          // @ts-ignore
          window.generatedTextures[topName] = topTexture
          
          console.log(`✅ Top текстура сгенерирована: ${topName}`)
          
          // Отправляем событие для top текстуры ПЕРВОЙ (чтобы блок зарегистрировался когда придет side)
          window.dispatchEvent(new CustomEvent('textureGenerated', {
            detail: { textureName: topName, textureData: topTexture }
          }))
        }
        
        console.log('✅ Смешанная текстура сгенерирована:', resultName)
        
        // Отправляем событие для обновления материалов (side текстура) ПОСЛЕДНЕЙ
        // Это важно, потому что блок регистрируется когда приходит последняя текстура
        window.dispatchEvent(new CustomEvent('textureGenerated', {
          detail: { textureName: resultName, textureData: mixedTexture }
        }))
        
        // Ждем немного, чтобы блок успел зарегистрироваться
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Проверяем, зарегистрирован ли блок
        // @ts-ignore
        const globalBlocksMap = window.blocksMap
        const blockName = resultName.replace('_side', '').replace('_top', '')
        if (globalBlocksMap && globalBlocksMap[blockName]) {
          console.log(`✅ Блок ${blockName} успешно зарегистрирован (ID: ${globalBlocksMap[blockName]})`)
        } else {
          console.warn(`⚠ Блок ${blockName} не найден в blocksMap после генерации текстур`)
          // @ts-ignore
          console.log('Доступные блоки:', Object.keys(globalBlocksMap || {}))
        }
      } catch (err) {
        console.error('❌ Ошибка при генерации смешанной текстуры:', err)
        // Продолжаем крафт даже если не удалось сгенерировать текстуру
      }
    }

    // добавляем в инвентарь
    const added = addItem(name, count)
    if (!added) {
      console.warn('⚠ Не удалось добавить предмет в инвентарь (инвентарь полон?)')
      return
    }

    // очищаем сетку
    grid.forEach(c => {
      // Удаляем data-атрибут вместо установки null (чтобы избежать строки "null")
      delete c.dataset.item
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
