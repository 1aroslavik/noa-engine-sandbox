# Руководство по животным в проекте

## 📋 Структура животных

Все животные находятся в файле `src/hello-world/world/animals.js`. 

### Текущая реализация (свиньи)

Каждый тип животного состоит из следующих компонентов:

1. **Массив для хранения** - `const pigs = []`
2. **Функция создания меша** - `buildPigMesh()` - создает 3D модель
3. **Функция создания материала** - `createPigMaterial()` в `materials.js`
4. **Функция создания сущности** - `createPig()` - создает животное в мире
5. **Логика движения** - в обработчике `tick` (строки 266-593)
6. **Функция урона** - `damagePig()` - обработка получения урона и смерти
7. **Генерация в чанках** - `generateAnimalsInChunk()` - спавн при генерации мира

---

## 🐄 Как добавить новое животное (пример: корова)

### Шаг 1: Добавить материал в `materials.js`

```javascript
export function createCowMaterial(noa) {
    const material = noa.rendering.makeStandardMaterial()
    material.diffuseColor = new Color3(0.4, 0.3, 0.2) // Коричневый цвет
    material.emissiveColor = new Color3(0.1, 0.05, 0.05)
    return material
}
```

### Шаг 2: Добавить массив и функции в `animals.js`

#### 2.1. Массив для хранения
```javascript
const cows = []

export function getCows() {
    return cows
}
```

#### 2.2. Функция создания меша
```javascript
function buildCowMesh(scene, material) {
    const body = BABYLON.MeshBuilder.CreateBox('cowBody', { width: 1.0, height: 0.8, depth: 1.4 }, scene)
    body.position.y = 0.4

    const head = BABYLON.MeshBuilder.CreateBox('cowHead', { width: 0.6, height: 0.6, depth: 0.6 }, scene)
    head.position.set(0, 0.5, 0.9)

    const legs = []
    const legPositions = [
        [-0.35, -0.4, 0.6], [0.35, -0.4, 0.6],
        [-0.35, -0.4, -0.6], [0.35, -0.4, -0.6],
    ]

    for (const [lx, ly, lz] of legPositions) {
        const leg = BABYLON.MeshBuilder.CreateBox('cowLeg', { width: 0.2, height: 0.4, depth: 0.2 }, scene)
        leg.position.set(lx, ly, lz)
        legs.push(leg)
    }

    const cow = BABYLON.Mesh.MergeMeshes([body, head, ...legs], true, true)
    cow.material = material
    return cow
}
```

#### 2.3. Функция создания сущности
```javascript
export function createCow(noa, scene, x, z, y = null) {
    const groundY = y !== null ? y : getHeightAt(x, z)
    
    // Параметры коровы
    const width = 0.8
    const height = 1.4
    const baseSpeed = 0.15 // Коровы медленнее свиней
    const speedVariation = 0.1
    const offsetY = height / 2
    
    // Поиск свободного места (копируем логику из createPig)
    // ... (та же логика поиска места)
    
    const material = createCowMaterial(noa)
    const mesh = buildCowMesh(scene, material)
    const spawnY = finalY + 1 + offsetY

    const id = noa.entities.add([finalX + 0.5, spawnY, finalZ + 0.5])

    noa.entities.addComponent(id, noa.entities.names.physics, {
        width: width,
        height: height,
        gravity: true,
        collideWithTerrain: true,
        collideWithEntities: false,
        solid: true,
        restitution: 0,
        friction: 0.3,
    })

    noa.entities.addComponent(id, noa.entities.names.mesh, {
        mesh: mesh,
        offset: [0, offsetY, 0]
    })

    const body = noa.entities.getPhysicsBody(id)
    body.mass = 1
    body.friction = 0.3

    const maxHealth = 7 // Коровы здоровее
    
    const initialAngle = Math.random() * Math.PI * 2
    const initialRotation = initialAngle - Math.PI / 2
    
    cows.push({
        id,
        mesh,
        body,
        angle: initialAngle,
        targetAngle: initialAngle,
        currentRotation: initialRotation,
        speed: baseSpeed + Math.random() * speedVariation,
        directionChangeTimer: 60 + Math.floor(Math.random() * 60),
        jumpCooldown: 0,
        health: maxHealth,
        maxHealth: maxHealth,
        material: material,
        originalEmissive: { r: 0.1, g: 0.05, b: 0.05 },
        isHighlighted: false,
        stuckCheckCounter: 0,
        lastPosition: [finalX + 0.5, spawnY, finalZ + 0.5],
    })
    
    mesh.rotation.y = initialRotation
    console.log(`🐄 Cow spawned at ${x} ${spawnY} ${z}`)
    return id
}
```

#### 2.4. Функция урона
```javascript
export function damageCow(noa, cow) {
    if (!cow || cow.health <= 0) return
    
    cow.health -= 1
    console.log(`🐄 Корова получила урон! Здоровье: ${cow.health}/${cow.maxHealth}`)
    
    if (cow.health <= 0) {
        console.log(`🐄 Корова исчезла!`)
        
        // Добавляем мясо и кожу в инвентарь
        addItem('meat', 3)
        addItem('leather', 1) // если есть такой предмет
        
        const index = cows.indexOf(cow)
        if (index > -1) {
            cows.splice(index, 1)
        }
        
        noa.entities.deleteEntity(cow.id)
    }
}
```

#### 2.5. Добавить движение в обработчик tick

В функции `registerTickHandler()` нужно добавить логику движения для коров. 
Можно скопировать логику из свиней (строки 351-591) и адаптировать:

```javascript
// В обработчике tick, после обработки свиней:
for (const cow of cows) {
    // ... та же логика движения, что и для свиней
}
```

#### 2.6. Добавить в генерацию чанков

В функции `generateAnimalsInChunk()`:

```javascript
export function generateAnimalsInChunk(noa, ids, x0, y0, z0) {
    const scene = noa.rendering.getScene()
    if (!scene) return

    const animalCount = Math.floor(Math.random() * 3)

    for (let i = 0; i < animalCount; i++) {
        const x = x0 + Math.floor(Math.random() * 32)
        const z = z0 + Math.floor(Math.random() * 32)
        const y = getHeightAt(x, z)
        const biome = getBiome(x, z)

        // Свиньи
        if (biome === "plains" || biome === "forest") {
            if (Math.random() < 0.3) {
                const size = Math.random() < 0.5 ? 'small' : 'normal'
                createPig(noa, scene, x, z, y, size)
            }
        }
        
        // Коровы - только на равнинах
        if (biome === "plains") {
            if (Math.random() < 0.2) { // 20% шанс
                createCow(noa, scene, x, z, y)
            }
        }
    }
}
```

---

## 🎯 Взаимодействие с игроком

Животные взаимодействуют с игроком через систему атаки в `index.js`:

1. **Поиск цели** - игрок ищет ближайшее животное в направлении взгляда (конус 45°)
2. **Нанесение урона** - при клике вызывается `damagePig()` (или `damageCow()` для коров)
3. **Множитель урона** - учитывается оружие в руках (меч увеличивает урон)

Чтобы новое животное можно было атаковать, нужно:

1. Экспортировать функцию получения массива: `export function getCows()`
2. Экспортировать функцию урона: `export function damageCow()`
3. В `index.js` добавить обработку нового животного в обработчике атаки (строки 442-496)

Пример для коровы в `index.js`:
```javascript
import { getPigs, damagePig, getCows, damageCow } from "./world/animals.js"

// В обработчике атаки (после обработки свиней):
const cows = getCows()
for (const cow of cows) {
    // ... та же логика поиска ближайшей коровы
}

if (closestCow) {
    // Наносим урон корове
    for (let i = 0; i < Math.floor(damageMultiplier); i++) {
        damageCow(noa, closestCow)
    }
}
```

---

## 📝 Ключевые моменты

1. **Массив животных** - хранит все экземпляры животного
2. **Меш** - 3D модель из примитивов (Box, Sphere и т.д.)
3. **Материал** - цвет и свойства поверхности
4. **Физика** - размеры, гравитация, коллизии
5. **Движение** - логика в обработчике `tick`
6. **Урон** - обработка получения урона и дропа предметов
7. **Генерация** - спавн при создании чанков

---

## 🔧 Настройки для разных животных

- **Скорость**: `baseSpeed` и `speedVariation`
- **Размер**: `width` и `height` в физике
- **Здоровье**: `maxHealth`
- **Биомы**: где спавнится в `generateAnimalsInChunk()`
- **Дроп**: что выпадает при смерти в функции урона

---

## 💡 Советы

1. Начните с копирования структуры свиньи
2. Измените размеры меша и цвета материала
3. Настройте параметры (скорость, здоровье)
4. Добавьте логику движения в `tick`
5. Настройте генерацию в нужных биомах
6. Протестируйте спавн и движение
