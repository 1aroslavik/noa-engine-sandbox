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
    result: { name: "wood", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание земли с деревом - дерево",
    textureMix: { texture1: "log_side", texture2: "dirt", ratio: 0.3, resultName: "wood_side" }
  },
  {
    pattern: [
      ["log", "dirt"],
      [null, null]
    ],
    result: { name: "wood", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с землей - дерево",
    textureMix: { texture1: "log_side", texture2: "dirt", ratio: 0.3, resultName: "wood_side" }
  },
  {
    pattern: [
      ["stone", "log"],
      [null, null]
    ],
    result: { name: "brick", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание камня с деревом - кирпич",
    textureMix: { texture1: "log_side", texture2: "stone", ratio: 0.4, resultName: "brick_side" }
  },
  {
    pattern: [
      ["log", "stone"],
      [null, null]
    ],
    result: { name: "brick", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с камнем - кирпич",
    textureMix: { texture1: "log_side", texture2: "stone", ratio: 0.4, resultName: "brick_side" }
  },
  {
    pattern: [
      ["dirt", "stone"],
      [null, null]
    ],
    result: { name: "coal", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание земли с камнем - уголь",
    textureMix: { texture1: "stone", texture2: "dirt", ratio: 0.35, resultName: "coal" }
  },
  {
    pattern: [
      ["stone", "dirt"],
      [null, null]
    ],
    result: { name: "coal", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание камня с землей - уголь",
    textureMix: { texture1: "stone", texture2: "dirt", ratio: 0.35, resultName: "coal" }
  },
  {
    pattern: [
      ["sand", "log"],
      [null, null]
    ],
    result: { name: "glass", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание песка с деревом - стекло",
    useIceTexture: true // Используем текстуру ice вместо генерации
  },
  {
    pattern: [
      ["log", "sand"],
      [null, null]
    ],
    result: { name: "glass", count: 1 },
    difficulty: CRAFT_DIFFICULTY.NORMAL,
    description: "Смешивание дерева с песком - стекло",
    useIceTexture: true // Используем текстуру ice вместо генерации
  }
  // Инструменты временно отключены
]

// === ДИНАМИЧЕСКИ ГЕНЕРИРУЕМЫЕ РЕЦЕПТЫ ===
let generatedRecipes = []
// Базовые рецепты идут ПЕРВЫМИ, чтобы иметь приоритет
export let recipes = [...baseRecipes, ...generatedRecipes]

// === ГЕНЕРАЦИЯ РЕЦЕПТОВ НА ОСНОВЕ ИНВЕНТАРЯ ===
// Отключена - используем только базовые рецепты
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
      // Используем нормальное название вместо синтетического
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
        // Используем нормальное название вместо синтетического
        const resultName = generateResultName(`${item1}_${item2}`, def1.type, def1.rarity)
        const nextRarity = getNextRarity(def1.rarity)
        
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
  
  // Правило 3: 2 разных предмета разных типов = смешанный предмет
  for (let i = 0; i < availableItems.length && generated.size < targetRecipeCount; i++) {
    for (let j = i + 1; j < availableItems.length && generated.size < targetRecipeCount; j++) {
      const item1 = availableItems[i]
      const item2 = availableItems[j]
      const def1 = getItemDefinition(item1)
      const def2 = getItemDefinition(item2)
      
      // Пропускаем комбинации, которые уже есть в базовых рецептах
      const comboKey = [item1, item2].sort().join('+')
      if (baseRecipePatterns.has(comboKey)) {
        continue
      }
      
      if (def1.type !== def2.type && 
          def1.rarity === def2.rarity &&
          itemCounts.get(item1) >= 1 && itemCounts.get(item2) >= 1) {
        // Используем нормальное название
        const resultName = generateResultName(`${item1}_${item2}`, MATERIAL_TYPE.SYNTHETIC, def1.rarity)
        
        if (!generated.has(`${item1}+${item2}_synth`) && !generated.has(`${item2}+${item1}_synth`)) {
          generatedRecipes.push({
            pattern: [
              [item1, item2],
              [null, null]
            ],
            result: { name: resultName, count: 1 },
            difficulty: getDifficultyFromRarity(def1.rarity) + 1,
            description: `Смешивание ${def1.description} и ${def2.description}`
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
          // Используем нормальное название
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
  
  // Обновляем список рецептов в UI
  updateRecipesList()
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

// Маппинг известных комбинаций на нормальные названия блоков
const knownCombinations = {
  'log_dirt': 'wood',
  'dirt_log': 'wood',
  'log_stone': 'brick',
  'stone_log': 'brick',
  'dirt_stone': 'coal',
  'stone_dirt': 'coal',
  'log_sand': 'glass',
  'sand_log': 'glass',
  // Дополнительные комбинации
  'dirt_planks': 'dirty_planks',
  'planks_dirt': 'dirty_planks',
  'stone_planks': 'stone_planks',
  'planks_stone': 'stone_planks',
  'sand_planks': 'sandy_planks',
  'planks_sand': 'sandy_planks'
}

// Генерировать имя результата на основе входных данных
function generateResultName(baseName, type, rarity) {
  // Нормализуем базовое имя (сортируем части для унификации)
  const parts = baseName.split('_')
  const sortedParts = [...parts].sort()
  const normalizedBase = sortedParts.join('_')
  
  // Проверяем, есть ли известная комбинация
  for (const [key, value] of Object.entries(knownCombinations)) {
    const sortedKey = key.split('_').sort().join('_')
    if (normalizedBase === sortedKey) {
      console.log(`✅ Используем известное название: ${baseName} -> ${value}`)
      return value
    }
  }
  
  // Если это известная комбинация из двух частей, создаем простое название
  if (parts.length === 2) {
    const [part1, part2] = parts
    const sorted = [part1, part2].sort()
    
    // Создаем простое название без префиксов syn/org/min
    // Например: log_dirt -> dark_log, stone_dirt -> mud_stone
    const simpleName = `${sorted[1]}_${sorted[0]}` // Обратный порядок для читаемости
    
    // Если это не известная комбинация, создаем улучшенную версию первого предмета
    if (type === MATERIAL_TYPE.ORGANIC && part1 === 'log') {
      return `enhanced_${part1}` // enhanced_log
    } else if (type === MATERIAL_TYPE.MINERAL) {
      return `mixed_${part1}` // mixed_stone, mixed_dirt
    }
    
    return simpleName
  }
  
  // Для одиночных предметов создаем улучшенную версию
  if (parts.length === 1) {
    const raritySuffix = rarity === RARITY.UNCOMMON ? 'refined' :
                         rarity === RARITY.RARE ? 'enhanced' :
                         rarity === RARITY.EPIC ? 'superior' :
                         rarity === RARITY.LEGENDARY ? 'legendary' : 'improved'
    return `${raritySuffix}_${baseName}`
  }
  
  // Для сложных комбинаций создаем простое название
  const mainPart = parts[0] // Берем первую часть
  return `mixed_${mainPart}`
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
const gridContainer = document.createElement("div")
gridContainer.style.display = "flex"
gridContainer.style.flexWrap = "wrap"
gridContainer.style.width = "108px" // 2 ячейки по 48px + 12px gap
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
  
  gridContainer.appendChild(cell)
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

// === СЛОТ ДЛЯ ВОССТАНОВЛЕНИЯ ЗДОРОВЬЯ ===
export const healSlot = document.createElement("div")
healSlot.id = "heal-slot"
healSlot.style.width = "48px"
healSlot.style.height = "48px"
healSlot.style.border = "2px dashed #666"
healSlot.style.background = "rgba(100, 0, 0, 0.3)"
healSlot.style.margin = "8px auto 0"
healSlot.style.display = "flex"
healSlot.style.alignItems = "center"
healSlot.style.justifyContent = "center"
healSlot.style.color = "#fff"
healSlot.style.fontSize = "20px"
healSlot.style.fontFamily = "'Courier New', 'Monaco', monospace"
healSlot.style.cursor = "pointer"
healSlot.style.transition = "all 0.2s"
healSlot.title = "Drag meat here to restore health"
healSlot.innerHTML = "❤️"
craftDiv.appendChild(healSlot)

// Метка для слота восстановления здоровья
const healSlotLabel = document.createElement("div")
healSlotLabel.id = "heal-slot-label"
healSlotLabel.style.color = "rgba(255, 255, 255, 0.7)"
healSlotLabel.style.fontSize = "9px"
healSlotLabel.style.textAlign = "center"
healSlotLabel.style.marginTop = "2px"
healSlotLabel.textContent = "Drop meat"
craftDiv.appendChild(healSlotLabel)

// === ПОДСКАЗКА О ЗАКРЫТИИ ===
const closeHint = document.createElement("div")
closeHint.style.color = "rgba(255, 255, 255, 0.5)"
closeHint.style.fontSize = "10px"
closeHint.style.textAlign = "center"
closeHint.style.marginTop = "8px"
closeHint.style.paddingTop = "8px"
closeHint.style.borderTop = "1px solid #444"
closeHint.textContent = "Press E or ESC to close"
craftDiv.appendChild(closeHint)

// === СПИСОК РЕЦЕПТОВ ===
export const recipesListDiv = document.createElement("div")
recipesListDiv.style.width = "100%"
recipesListDiv.style.maxHeight = "200px"
recipesListDiv.style.overflowY = "auto"
recipesListDiv.style.overflowX = "hidden"
recipesListDiv.style.background = "#1a1a1a"
recipesListDiv.style.border = "1px solid #444"
recipesListDiv.style.padding = "8px"
recipesListDiv.style.marginTop = "8px"
recipesListDiv.style.color = "#ccc"
recipesListDiv.style.fontSize = "11px"
recipesListDiv.style.fontFamily = "monospace"
recipesListDiv.style.lineHeight = "1.4"
craftDiv.appendChild(recipesListDiv)

// Функция для форматирования рецепта в текст
function formatRecipeText(recipe) {
  const items = []
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      if (recipe.pattern[y][x]) {
        items.push(recipe.pattern[y][x])
      }
    }
  }
  
  // Сортируем предметы для унификации (чтобы dirt + log и log + dirt выглядели одинаково)
  const sortedItems = [...items].sort()
  
  // Убираем дубликаты и считаем количество каждого
  const itemCounts = new Map()
  sortedItems.forEach(item => {
    itemCounts.set(item, (itemCounts.get(item) || 0) + 1)
  })
  
  // Формируем текст с учетом количества
  const itemsText = Array.from(itemCounts.entries())
    .map(([item, count]) => count > 1 ? `${item} x${count}` : item)
    .join(' + ')
  
  const resultName = recipe.result.name
  const resultCount = recipe.result.count || 1
  const resultText = resultCount > 1 ? `${resultName} x${resultCount}` : resultName
  
  return `${itemsText} → ${resultText}`
}

// Функция для получения уникального ключа рецепта (для группировки)
function getRecipeKey(recipe) {
  const items = []
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      if (recipe.pattern[y][x]) {
        items.push(recipe.pattern[y][x])
      }
    }
  }
  
  // Сортируем и создаем ключ
  const sortedItems = [...items].sort().join('+')
  const resultName = recipe.result.name
  return `${sortedItems}→${resultName}`
}

// Фunction to update recipes list
export function updateRecipesList() {
  // Clear the list
  recipesListDiv.innerHTML = ''
  
  // Title
  const title = document.createElement("div")
  title.textContent = "📋 Available Recipes:"
  title.style.fontWeight = "bold"
  title.style.marginBottom = "6px"
  title.style.color = "#fff"
  title.style.borderBottom = "1px solid #444"
  title.style.paddingBottom = "4px"
  recipesListDiv.appendChild(title)
  
  // Base recipes - группируем одинаковые рецепты
  if (baseRecipes.length > 0) {
    const baseTitle = document.createElement("div")
    baseTitle.textContent = "Base:"
    baseTitle.style.fontWeight = "bold"
    baseTitle.style.marginTop = "6px"
    baseTitle.style.marginBottom = "4px"
    baseTitle.style.color = "#aaffaa"
    recipesListDiv.appendChild(baseTitle)
    
    // Группируем рецепты по ключу (игнорируя порядок предметов)
    const recipeMap = new Map()
    baseRecipes.forEach((recipe) => {
      const key = getRecipeKey(recipe)
      if (!recipeMap.has(key)) {
        recipeMap.set(key, recipe)
      }
    })
    
    // Отображаем уникальные рецепты
    Array.from(recipeMap.values()).forEach((recipe) => {
      const recipeItem = document.createElement("div")
      recipeItem.textContent = `  ${formatRecipeText(recipe)}`
      recipeItem.style.marginBottom = "2px"
      recipeItem.style.paddingLeft = "4px"
      
      // Highlight recipes with textureMix
      if (recipe.textureMix) {
        recipeItem.style.color = "#ffaa44"
        recipeItem.textContent = `  ${recipeItem.textContent} 🎨`
      }
      
      recipesListDiv.appendChild(recipeItem)
    })
  }
  
  // Dynamic recipes - отключены
  // if (generatedRecipes.length > 0) { ... }
  
  // If no recipes
  if (baseRecipes.length === 0) {
    const noRecipes = document.createElement("div")
    noRecipes.textContent = "  No available recipes"
    noRecipes.style.color = "#666"
    noRecipes.style.fontStyle = "italic"
    recipesListDiv.appendChild(noRecipes)
  }
}



// === ПОЛУЧЕНИЕ ПАТТЕРНА ИЗ 2x2 ===
// Нормализация названий предметов для рецептов
// dirt_plains, dirt_tundra, dirt_desert, dirt_mountain -> dirt
function normalizeItemNameForRecipe(itemName) {
  if (!itemName) return null
  
  // Нормализуем варианты dirt
  if (itemName.startsWith('dirt_')) {
    return 'dirt'
  }
  
  // Нормализуем варианты stone (если есть stone_*)
  if (itemName.startsWith('stone_')) {
    return 'stone'
  }
  
  // Нормализуем варианты sand (если есть sand_*)
  if (itemName.startsWith('sand_')) {
    return 'sand'
  }
  
  // Нормализуем варианты log (если есть log_*)
  if (itemName.startsWith('log_')) {
    return 'log'
  }
  
  // Для остальных возвращаем как есть
  return itemName
}

function getGridPattern() {
  const gridCells = [
    grid[0], // [0,0]
    grid[1], // [0,1]
    grid[2], // [1,0]
    grid[3]  // [1,1]
  ]
  
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
  
  // Получаем сырые значения
  const rawPattern = [
    [normalizeItem(gridCells[0]), normalizeItem(gridCells[1])],
    [normalizeItem(gridCells[2]), normalizeItem(gridCells[3])]
  ]
  
  // Нормализуем названия для рецептов (dirt_tundra -> dirt и т.д.)
  const pattern = [
    [normalizeItemNameForRecipe(rawPattern[0][0]), normalizeItemNameForRecipe(rawPattern[0][1])],
    [normalizeItemNameForRecipe(rawPattern[1][0]), normalizeItemNameForRecipe(rawPattern[1][1])]
  ]
  
  // Отладочный вывод для диагностики
  console.log('📋 getGridPattern вызван. Ячейки:', {
    0: gridCells[0].dataset.item || 'undefined',
    1: gridCells[1].dataset.item || 'undefined',
    2: gridCells[2].dataset.item || 'undefined',
    3: gridCells[3].dataset.item || 'undefined'
  })
  console.log('📋 Сырой паттерн:', rawPattern)
  console.log('📋 Нормализованный паттерн для рецептов:', pattern)
  
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

    // Если рецепт использует текстуру ice (для glass)
    if (recipe && recipe.useIceTexture && name === 'glass') {
      console.log('🔷 Используем текстуру ice для glass')
      // Отправляем событие для регистрации блока glass с текстурой ice
      window.dispatchEvent(new CustomEvent('textureGenerated', {
        detail: { 
          textureName: 'glass', 
          textureData: null, // null означает использовать ice
          useIceTexture: true 
        }
      }))
    }
    // Если рецепт требует смешивания текстур, генерируем текстуру
    // Только для базовых рецептов с явным textureMix
    else if (recipe && recipe.textureMix) {
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
        } else {
          // Если нет _side, значит это простой блок - генерируем только одну текстуру
          console.log('✅ Смешанная текстура сгенерирована (простой блок):', resultName)
          
          // Отправляем событие для простого блока
          window.dispatchEvent(new CustomEvent('textureGenerated', {
            detail: { textureName: resultName, textureData: mixedTexture }
          }))
        }
        
        // Для блоков с _side отправляем событие после генерации top
        if (resultName.includes('_side')) {
          // Событие уже отправлено выше для top текстуры
          // Отправляем событие для side текстуры
          window.dispatchEvent(new CustomEvent('textureGenerated', {
            detail: { textureName: resultName, textureData: mixedTexture }
          }))
        }
        
        // Ждем больше времени, чтобы блок успел зарегистрироваться
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Проверяем, зарегистрирован ли блок
        // @ts-ignore
        const globalBlocksMap = window.blocksMap
        const blockName = resultName.replace('_side', '').replace('_top', '')
        console.log(`🔍 Проверка регистрации блока: ${blockName} (из resultName: ${resultName})`)
        if (globalBlocksMap && globalBlocksMap[blockName]) {
          console.log(`✅ Блок ${blockName} успешно зарегистрирован (ID: ${globalBlocksMap[blockName]})`)
        } else {
          console.warn(`⚠ Блок ${blockName} не найден в blocksMap после генерации текстур`)
          // @ts-ignore
          console.log('Доступные блоки:', Object.keys(globalBlocksMap || {}))
          console.log('Попробуем еще раз через 500ms...')
          // Пробуем еще раз
          await new Promise(resolve => setTimeout(resolve, 500))
          // @ts-ignore
          if (globalBlocksMap && globalBlocksMap[blockName]) {
            console.log(`✅ Блок ${blockName} найден после повторной проверки (ID: ${globalBlocksMap[blockName]})`)
          } else {
            console.error(`❌ Блок ${blockName} все еще не найден в blocksMap`)
          }
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


// === ФУНКЦИЯ ЗАКРЫТИЯ ОКНА КРАФТА ===
function closeCraftingWindow() {
  // @ts-ignore
  const noa = window.noa
  craftDiv.style.display = "none"
  console.log("❌ Окно крафта закрыто")
  // Скрываем курсор - pointer lock будет активирован при клике на canvas
  // (обработчик клика уже есть в index.js)
  if (noa && noa.container && noa.container.canvas) {
    noa.container.canvas.style.cursor = "none"
  }
}

// === ОТКРЫТИЕ/ЗАКРЫТИЕ ИНТЕРФЕЙСА ===
// Используем capture phase, чтобы перехватить E до других обработчиков
document.addEventListener("keydown", e => {
  // @ts-ignore
  const noa = window.noa
  const isOpen = craftDiv.style.display === "flex"
  
  // Закрываем крафт по ESC (только если окно открыто)
  if (e.code === "Escape" && isOpen) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    closeCraftingWindow()
    return
  }
  
  // Открываем крафт по E
  if (e.code === "KeyE" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation() // Предотвращаем обработку E в noa
    
    console.log("🔧 E нажата - открываем/закрываем крафт")
    
    const isOpening = craftDiv.style.display === "none" || craftDiv.style.display === ""
    
    if (isOpening) {
      // Открываем окно крафта
      craftDiv.style.display = "flex"
      console.log("✅ Окно крафта открыто")
      // Генерируем рецепты на основе текущего инвентаря
      generateRecipes()
      // Обновляем список рецептов
      updateRecipesList()
      // Обновляем крафт при открытии
      updateCrafting()
      // Отключаем pointer lock, чтобы курсор был виден для перетаскивания
      if (noa && noa.container && noa.container.canvas) {
        document.exitPointerLock()
        noa.container.canvas.style.cursor = "default"
      }
    } else {
      closeCraftingWindow()
    }
  }
}, true) // Используем capture phase для раннего перехвата
