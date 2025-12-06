// ui/items.js — метаданные предметов для крафтинга

// Типы редкости
export const RARITY = {
  COMMON: 'common',      // Обычный (серый)
  UNCOMMON: 'uncommon',  // Необычный (зеленый)
  RARE: 'rare',          // Редкий (синий)
  EPIC: 'epic',          // Эпический (фиолетовый)
  LEGENDARY: 'legendary' // Легендарный (оранжевый)
}

// Типы материалов
export const MATERIAL_TYPE = {
  ORGANIC: 'organic',    // Органический
  MINERAL: 'mineral',    // Минеральный
  SYNTHETIC: 'synthetic'  // Синтетический
}

// Сложность крафта (1-10, где 1 - самый простой)
export const CRAFT_DIFFICULTY = {
  TRIVIAL: 1,    // Тривиальный
  EASY: 2,       // Легкий
  NORMAL: 3,     // Обычный
  MEDIUM: 4,     // Средний
  HARD: 5,       // Сложный
  EXPERT: 6,     // Экспертный
  MASTER: 7,     // Мастерский
  GRANDMASTER: 8,// Грандмастер
  LEGENDARY: 9,  // Легендарный
  MYTHIC: 10     // Мифический
}

// Цвета для редкости (для UI)
export const RARITY_COLORS = {
  [RARITY.COMMON]: '#9d9d9d',      // Серый
  [RARITY.UNCOMMON]: '#1eff00',    // Зеленый
  [RARITY.RARE]: '#0070dd',        // Синий
  [RARITY.EPIC]: '#a335ee',        // Фиолетовый
  [RARITY.LEGENDARY]: '#ff8000'    // Оранжевый
}

// Определения всех предметов с их метаданными
export const ITEM_DEFINITIONS = {
  // Органические материалы
  'meat': {
    name: 'meat',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.ORGANIC,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Сырое мясо'
  },
  'log': {
    name: 'log',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.ORGANIC,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Бревно'
  },
  'planks': {
    name: 'planks',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.ORGANIC,
    craftDifficulty: CRAFT_DIFFICULTY.EASY,
    description: 'Доски'
  },
  'stick': {
    name: 'stick',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.ORGANIC,
    craftDifficulty: CRAFT_DIFFICULTY.EASY,
    description: 'Палка'
  },
  
  // Минеральные материалы
  'stone': {
    name: 'stone',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Камень'
  },
  // Земля из разных биомов
  'dirt_plains': {
    name: 'dirt_plains',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Земля равнин'
  },
  'dirt_tundra': {
    name: 'dirt_tundra',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Земля тундры'
  },
  'dirt_desert': {
    name: 'dirt_desert',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Песчаная земля пустыни'
  },
  'dirt_mountain': {
    name: 'dirt_mountain',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Земля гор'
  },
  'sand': {
    name: 'sand',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Песок'
  },
  'gravel': {
    name: 'gravel',
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: 'Гравий'
  },
  'andesite': {
    name: 'andesite',
    rarity: RARITY.UNCOMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.NORMAL,
    description: 'Андезит'
  },
  'granite': {
    name: 'granite',
    rarity: RARITY.UNCOMMON,
    type: MATERIAL_TYPE.MINERAL,
    craftDifficulty: CRAFT_DIFFICULTY.NORMAL,
    description: 'Гранит'
  },
  
  // Синтетические материалы (примеры для будущего)
  'iron_ingot': {
    name: 'iron_ingot',
    rarity: RARITY.RARE,
    type: MATERIAL_TYPE.SYNTHETIC,
    craftDifficulty: CRAFT_DIFFICULTY.MEDIUM,
    description: 'Железный слиток'
  },
  'gold_ingot': {
    name: 'gold_ingot',
    rarity: RARITY.EPIC,
    type: MATERIAL_TYPE.SYNTHETIC,
    craftDifficulty: CRAFT_DIFFICULTY.HARD,
    description: 'Золотой слиток'
  }
}

// Получить метаданные предмета
export function getItemDefinition(itemName) {
  return ITEM_DEFINITIONS[itemName] || {
    name: itemName,
    rarity: RARITY.COMMON,
    type: MATERIAL_TYPE.ORGANIC,
    craftDifficulty: CRAFT_DIFFICULTY.TRIVIAL,
    description: itemName
  }
}

// Получить цвет редкости
export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS[RARITY.COMMON]
}

// Получить название сложности крафта
export function getDifficultyName(difficulty) {
  const names = {
    [CRAFT_DIFFICULTY.TRIVIAL]: 'Тривиальный',
    [CRAFT_DIFFICULTY.EASY]: 'Легкий',
    [CRAFT_DIFFICULTY.NORMAL]: 'Обычный',
    [CRAFT_DIFFICULTY.MEDIUM]: 'Средний',
    [CRAFT_DIFFICULTY.HARD]: 'Сложный',
    [CRAFT_DIFFICULTY.EXPERT]: 'Экспертный',
    [CRAFT_DIFFICULTY.MASTER]: 'Мастерский',
    [CRAFT_DIFFICULTY.GRANDMASTER]: 'Грандмастер',
    [CRAFT_DIFFICULTY.LEGENDARY]: 'Легендарный',
    [CRAFT_DIFFICULTY.MYTHIC]: 'Мифический'
  }
  return names[difficulty] || 'Неизвестно'
}

// Получить название типа материала
export function getMaterialTypeName(type) {
  const names = {
    [MATERIAL_TYPE.ORGANIC]: 'Органический',
    [MATERIAL_TYPE.MINERAL]: 'Минеральный',
    [MATERIAL_TYPE.SYNTHETIC]: 'Синтетический'
  }
  return names[type] || 'Неизвестно'
}

// Получить название редкости
export function getRarityName(rarity) {
  const names = {
    [RARITY.COMMON]: 'Обычный',
    [RARITY.UNCOMMON]: 'Необычный',
    [RARITY.RARE]: 'Редкий',
    [RARITY.EPIC]: 'Эпический',
    [RARITY.LEGENDARY]: 'Легендарный'
  }
  return names[rarity] || 'Неизвестно'
}

// Сократить название предмета для отображения в UI
export function getShortName(itemName) {
  // Маппинг полных названий на короткие версии
  const shortNames = {
    'iron_ingot': 'Iron',
    'gold_ingot': 'Gold',
    'andesite': 'Andes',
    'granite': 'Gran',
    'planks': 'Plank',
    'gravel': 'Grav',
    'tundra_grass': 'Tundra',
    'grass_dry': 'DryGr',
    'snow_transition': 'Snow',
    'snow_top': 'Snow',
    'snow_side': 'Snow',
    'desert_rock': 'Rock',
    'red_sand': 'RSand',
    'leaves_oak': 'Oak',
    'leaves_pine': 'Pine',
    'leaves_savanna': 'Sav',
    'log_top': 'Log',
    'log_side': 'Log',
    'grass_top': 'Grass',
    'grass_side': 'Grass',
    'tundra_grass_top': 'Tundra',
    'tundra_grass_side': 'Tundra',
    'grass_dry_top': 'DryGr',
    'grass_dry_side': 'DryGr',
    'snow_transition_side': 'Snow',
    // Земля из разных биомов
    'dirt_plains': 'DirtP',
    'dirt_tundra': 'DirtT',
    'dirt_desert': 'DirtD',
    'dirt_mountain': 'DirtM'
  }
  
  // Если есть короткое название, используем его
  if (shortNames[itemName]) {
    return shortNames[itemName]
  }
  
  // Иначе обрезаем до 6 символов
  if (itemName.length > 6) {
    return itemName.substring(0, 6)
  }
  
  return itemName
}

