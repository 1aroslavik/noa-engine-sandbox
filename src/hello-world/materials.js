// materials.js
import { generateTextures } from "./texture_runtime_loader.js"
import { Color3 } from '@babylonjs/core'
import * as BABYLON from '@babylonjs/core'

// Глобальное хранилище для динамически созданных текстур
// @ts-ignore
window.generatedTextures = window.generatedTextures || {}

export async function initMaterialsAndBlocks(noa) {
    const tex = await generateTextures()
    const make = b64 => "data:image/png;base64," + b64

    const blocks = {}
    const materials = {}
    let blockIdCounter = 1
    
    // Сохраняем blockIdCounter глобально для использования при динамической регистрации
    // @ts-ignore
    window.blockIdCounter = blockIdCounter

    // ======================
    // 1. Регистрируем материалы CVAE
    // ======================
    for (const name of Object.keys(tex)) {
        const matName = "mat_" + name
        noa.registry.registerMaterial(matName, {
            textureURL: make(tex[name])
        })
        materials[name] = matName
    }
    
    // Регистрируем динамически созданные текстуры (из крафтинга)
    // @ts-ignore
    for (const [name, textureData] of Object.entries(window.generatedTextures)) {
        const matName = "mat_" + name
        noa.registry.registerMaterial(matName, {
            textureURL: make(textureData)
        })
        materials[name] = matName
        console.log("✔ Зарегистрирована динамическая текстура:", name)
    }

    // ======================
    // 2. Функции блоков
    // ======================

    function makeSimple(name) {
        if (!materials[name]) return
        blocks[name] = noa.registry.registerBlock(blockIdCounter++, {
            material: materials[name]
        })
    }

    function make3(name, top, bottom, side) {
        if (!materials[top] || !materials[bottom] || !materials[side]) return
        blocks[name] = noa.registry.registerBlock(blockIdCounter++, {
            material: [
                materials[top],     // top
                materials[bottom],  // bottom
                materials[side]     // sides
            ]
        })
    }

    function makeTransparent(name) {
        if (!materials[name]) return
        blocks[name] = noa.registry.registerBlock(blockIdCounter++, {
            material: materials[name],
            opaque: false
        })
    }

    // ======================
    // 3. Блоки
    // ======================

    makeSimple("dirt")
    makeSimple("stone")
    makeSimple("andesite")
    makeSimple("granite")
    makeSimple("gravel")

    makeSimple("sand")
    makeSimple("red_sand")
    makeSimple("desert_rock")

    makeSimple("snow_top")
    makeSimple("snow_side")
    makeSimple("ice")

    make3("grass", "grass_top", "dirt", "grass_side")
    make3("grass_dry", "grass_dry_top", "dirt", "grass_dry_side")
    make3("tundra_grass", "tundra_grass_top", "dirt", "tundra_grass_side")

    // ❄ ПЕРЕХОД СНЕГ → ЗЕМЛЯ (ТОЖЕ КАК ТРАВА)
    make3("snow", "snow_top", "dirt", "snow_transition_side")
// ❄ Обычный снеговый блок: все стороны snow_top
if (materials["snow_top"]) {
    blocks["snow_block"] = noa.registry.registerBlock(blockIdCounter++, {
        material: [
            materials["snow_top"], // top
            materials["snow_top"], // bottom
            materials["snow_top"]  // sides
        ]
    })
}

    // ЛОГИ
    if (materials["log_top"] && materials["log_side"]) {
        blocks["log"] = noa.registry.registerBlock(blockIdCounter++, {
            material: [
                materials["log_top"],
                materials["log_top"],
                materials["log_side"]
            ]
        })
    }

    makeTransparent("leaves_oak")
    makeTransparent("leaves_pine")
    makeTransparent("leaves_savanna")

    // ======================
    // ДИНАМИЧЕСКИ СОЗДАННЫЕ БЛОКИ (из крафтинга)
    // ======================
    // Темное дерево (dirt + log)
    if (materials["dark_log_side"] && materials["dark_log_top"]) {
        blocks["dark_log"] = noa.registry.registerBlock(blockIdCounter++, {
            material: [
                materials["dark_log_top"],
                materials["dark_log_top"],
                materials["dark_log_side"]
            ]
        })
        console.log("✔ Зарегистрирован блок: dark_log")
    }
    
    // Каменное дерево (stone + log)
    if (materials["stone_log_side"] && materials["stone_log_top"]) {
        blocks["stone_log"] = noa.registry.registerBlock(blockIdCounter++, {
            material: [
                materials["stone_log_top"],
                materials["stone_log_top"],
                materials["stone_log_side"]
            ]
        })
        console.log("✔ Зарегистрирован блок: stone_log")
    }
    
    // Грязный камень (dirt + stone)
    if (materials["mud_stone"]) {
        blocks["mud_stone"] = noa.registry.registerBlock(blockIdCounter++, {
            material: materials["mud_stone"]
        })
        console.log("✔ Зарегистрирован блок: mud_stone")
    }
    
    // Песчаное дерево (sand + log)
    if (materials["sandy_log_side"] && materials["sandy_log_top"]) {
        blocks["sandy_log"] = noa.registry.registerBlock(blockIdCounter++, {
            material: [
                materials["sandy_log_top"],
                materials["sandy_log_top"],
                materials["sandy_log_side"]
            ]
        })
        console.log("✔ Зарегистрирован блок: sandy_log")
    }

    // ======================
    // ВОДА
    // ======================
    noa.registry.registerMaterial("mat_water", {
        color: [0.4, 0.5, 0.9, 0.45],
    })

    materials["water"] = "mat_water"

    blocks["water"] = noa.registry.registerBlock(blockIdCounter++, {
        material: "mat_water",
        fluid: true,
        opaque: false
    })

    const waterID = blocks["water"]

    console.log("✔ Материалы:", Object.keys(materials))
    console.log("✔ Блоки:", Object.keys(blocks))
    // ======================
// 🍄 ГРИБЫ (временный вариант: текстура песка)
// ======================
if (materials["sand"]) {

    // Ножка гриба — песочная текстура
    blocks["mushroom_stem"] = noa.registry.registerBlock(blockIdCounter++, {
        material: materials["sand"]
    })

    // Шляпа гриба — тоже песок (временно)
    blocks["mushroom_cap"] = noa.registry.registerBlock(blockIdCounter++, {
        material: materials["sand"]
    })

    console.log("🍄 Грибные блоки зарегистрированы (временная текстура: sand)")
}

    // Слушаем события генерации новых текстур
    window.addEventListener('textureGenerated', async (event) => {
        // @ts-ignore - CustomEvent.detail поддерживается в браузере
        const detail = event.detail
        const textureName = detail.textureName
        const textureData = detail.textureData
        const matName = "mat_" + textureName
        const make = b64 => "data:image/png;base64," + b64
        
        console.log(`🎨 Регистрация материала для текстуры: ${textureName}`)
        
        // Регистрируем новый материал
        noa.registry.registerMaterial(matName, {
            textureURL: make(textureData)
        })
        materials[textureName] = matName
        
        console.log(`✅ Материал зарегистрирован: ${matName}`)
        
        // Функция для попытки регистрации блока (вызывается когда приходит любая текстура)
        const tryRegisterBlock = (blockName, topName, sideName) => {
            // Проверяем, есть ли обе текстуры (top и side)
            if (materials[topName] && materials[sideName]) {
                if (!blocks[blockName]) {
                    // Получаем текущий blockIdCounter из глобального хранилища или используем локальный
                    // @ts-ignore
                    let currentCounter = window.blockIdCounter || blockIdCounter
                    
                    blocks[blockName] = noa.registry.registerBlock(currentCounter, {
                        material: [
                            materials[topName],
                            materials[topName],
                            materials[sideName]
                        ]
                    })
                    
                    // Обновляем счетчик
                    currentCounter++
                    // @ts-ignore
                    window.blockIdCounter = currentCounter
                    blockIdCounter = currentCounter
                    
                    console.log(`✔ Динамически зарегистрирован блок: ${blockName} (ID: ${blocks[blockName]})`)
                    
                    // Обновляем глобальный blocksMap для доступа из других модулей
                    // @ts-ignore
                    if (window.blocksMap) {
                        // @ts-ignore
                        window.blocksMap[blockName] = blocks[blockName]
                        console.log(`✅ Обновлен глобальный blocksMap: ${blockName} -> ${blocks[blockName]}`)
                        // @ts-ignore
                        console.log(`📋 Всего блоков в blocksMap: ${Object.keys(window.blocksMap).length}`)
                    }
                    
                    // Отправляем событие о регистрации нового блока для обновления маппинга
                    window.dispatchEvent(new CustomEvent('blockRegistered', {
                        detail: { blockName: blockName, blockId: blocks[blockName] }
                    }))
                    
                    return true
                } else {
                    console.log(`ℹ️ Блок ${blockName} уже зарегистрирован (ID: ${blocks[blockName]})`)
                    return true
                }
            }
            return false
        }
        
        // Если это текстура для блока, пытаемся зарегистрировать блок
        if (textureName.includes('_side')) {
            const blockName = textureName.replace('_side', '').replace('_top', '')
            const topName = textureName.replace('_side', '_top')
            const sideName = textureName
            
            console.log(`🔍 Получена side текстура для блока ${blockName}`)
            console.log(`   Проверяем готовность: top=${topName} (${!!materials[topName]}), side=${sideName} (${!!materials[sideName]})`)
            
            // Пытаемся зарегистрировать блок сразу (если top уже готов)
            if (!tryRegisterBlock(blockName, topName, sideName)) {
                // Если не получилось, ждем немного и пробуем снова
                setTimeout(() => {
                    console.log(`🔄 Повторная попытка регистрации блока ${blockName}...`)
                    if (!tryRegisterBlock(blockName, topName, sideName)) {
                        console.log(`⚠ Не все текстуры готовы для блока ${blockName}: top=${!!materials[topName]}, side=${!!materials[sideName]}`)
                        // @ts-ignore
                        console.log(`   Доступные материалы:`, Object.keys(materials).filter(k => k.includes(blockName)))
                    }
                }, 150)
            }
        } else if (textureName.includes('_top')) {
            // Если это top текстура, извлекаем имя блока и пытаемся зарегистрировать
            const blockName = textureName.replace('_top', '').replace('_side', '')
            const topName = textureName
            const sideName = textureName.replace('_top', '_side')
            
            console.log(`🔍 Получена top текстура для блока ${blockName}`)
            console.log(`   Проверяем готовность: top=${topName} (${!!materials[topName]}), side=${sideName} (${!!materials[sideName]})`)
            
            // Пытаемся зарегистрировать блок сразу (если side уже готов)
            if (!tryRegisterBlock(blockName, topName, sideName)) {
                // Если не получилось, ждем немного и пробуем снова
                setTimeout(() => {
                    console.log(`🔄 Повторная попытка регистрации блока ${blockName}...`)
                    if (!tryRegisterBlock(blockName, topName, sideName)) {
                        console.log(`⚠ Не все текстуры готовы для блока ${blockName}: top=${!!materials[topName]}, side=${!!materials[sideName]}`)
                        // @ts-ignore
                        console.log(`   Доступные материалы:`, Object.keys(materials).filter(k => k.includes(blockName)))
                    }
                }, 150)
            }
        } else if (textureName && !textureName.includes('_top') && !textureName.includes('_side')) {
            // Простой блок (одна текстура)
            const blockName = textureName
            if (!blocks[blockName]) {
                // Получаем текущий blockIdCounter из глобального хранилища или используем локальный
                // @ts-ignore
                let currentCounter = window.blockIdCounter || blockIdCounter
                
                blocks[blockName] = noa.registry.registerBlock(currentCounter, {
                    material: materials[textureName]
                })
                
                // Обновляем счетчик
                currentCounter++
                // @ts-ignore
                window.blockIdCounter = currentCounter
                blockIdCounter = currentCounter
                
                console.log(`✔ Динамически зарегистрирован блок: ${blockName} (ID: ${blocks[blockName]})`)
                
                // Обновляем глобальный blocksMap для доступа из других модулей
                // @ts-ignore
                if (window.blocksMap) {
                    // @ts-ignore
                    window.blocksMap[blockName] = blocks[blockName]
                    console.log(`✅ Обновлен глобальный blocksMap: ${blockName} -> ${blocks[blockName]}`)
                }
                
                // Отправляем событие о регистрации нового блока
                window.dispatchEvent(new CustomEvent('blockRegistered', {
                    detail: { blockName: blockName, blockId: blocks[blockName] }
                }))
            }
        }
    })

    // Сохраняем финальный blockIdCounter
    // @ts-ignore
    window.blockIdCounter = blockIdCounter
    
    return { blocks, materials, waterID }
}

// ------------------------------------------------------------
// Материал для свиней
// ------------------------------------------------------------
export function createPigMaterial(noa, size = 'normal') {
    const material = noa.rendering.makeStandardMaterial()
    
    if (size === 'small') {
        // Маленькие свиньи - более яркий розовый
        // Увеличиваем красный компонент и эмиссию для более яркого вида
        material.diffuseColor = new Color3(1, 0.3, 0.3) // Более яркий розовый
        material.emissiveColor = new Color3(0.4, 0.12, 0.12) // Более яркая эмиссия
    } else {
        // Стандартные свиньи - обычный розовый
        material.diffuseColor = new Color3(1, 0.2, 0.2)
        material.emissiveColor = new Color3(0.3, 0.06, 0.06)
    }
    
    return material
}
// ------------------------------------------------------------
// Материал для медведей (коричневый или белый)
// ------------------------------------------------------------
export function createBearMaterial(scene, type = "brown") {
    const mat = new BABYLON.StandardMaterial("bearMat", scene)

    if (type === "polar") {
        // ❄ Белый медведь
        mat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 1.0)
        mat.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.2)
    } else {
        // 🟤 Коричневый медведь
        mat.diffuseColor = new BABYLON.Color3(0.45, 0.32, 0.22)
        mat.emissiveColor = new BABYLON.Color3(0.1, 0.07, 0.05)
    }

    return mat
}

// ------------------------------------------------------------
// Материал для коров (белый с черными пятнами)
// ------------------------------------------------------------
export function createCowMaterial(noa) {
    const material = noa.rendering.makeStandardMaterial()
    const scene = noa.rendering.getScene()
    
    if (scene) {
        // Создаем canvas для текстуры с черными пятнами
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        
        // Белый фон
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, 256, 256)
        
        // Черные пятна - большие, редкие и далеко друг от друга (как у настоящей коровы)
        ctx.fillStyle = '#000000'
        const spots = [
            // Очень большие пятна, расположенные далеко друг от друга
            { x: 50, y: 50, w: 120, h: 130 },      // Верхний левый угол
            { x: 200, y: 80, w: 110, h: 125 },     // Верхний правый угол
            { x: 30, y: 200, w: 125, h: 135 },     // Нижний левый угол
            { x: 180, y: 180, w: 105, h: 115 },   // Нижний правый угол
        ]
        
        for (const spot of spots) {
            ctx.beginPath()
            // Используем более плавные края для более естественного вида
            ctx.ellipse(spot.x, spot.y, spot.w / 2, spot.h / 2, 0, 0, Math.PI * 2)
            ctx.fill()
        }
        
        // Создаем текстуру из canvas
        const texture = new BABYLON.Texture(canvas.toDataURL(), scene)
        material.diffuseTexture = texture
    }
    
    // Базовый белый цвет
    material.diffuseColor = new Color3(0.95, 0.95, 0.95)
    material.emissiveColor = new Color3(0.1, 0.1, 0.1)
    
    return material
}
