// materials.js
import { generateTextures } from "./texture_runtime_loader.js"
import { Color3 } from '@babylonjs/core'
import * as BABYLON from '@babylonjs/core'

// Глобальное хранилище для динамически созданных текстур
// @ts-ignore
window.generatedTextures = window.generatedTextures || {}

export async function initMaterialsAndBlocks(noa) {
    const tex = await generateTextures()
    // @ts-ignore
window.cvaeTextures = tex
window.dispatchEvent(new Event("texturesReady"))

    const make = b64 => "data:image/png;base64," + b64

    const blocks = {}
    const materials = {}
    let blockIdCounter = 1
    
    // Сохраняем blockIdCounter глобально для использования при динамической регистрации
    // @ts-ignore
    window.blockIdCounter = blockIdCounter
    
    // Сохраняем URL текстуры ice глобально для использования в glass
    // @ts-ignore
    window.iceTextureURL = null

    // ======================
    // 1. Регистрируем материалы CVAE
    // ======================
    for (const name of Object.keys(tex)) {
        const matName = "mat_" + name
        const textureURL = make(tex[name])
        noa.registry.registerMaterial(matName, {
            textureURL: textureURL
        })
        materials[name] = matName
        
        // Сохраняем URL текстуры ice глобально
        if (name === 'ice') {
            // @ts-ignore
            window.iceTextureURL = textureURL
            console.log('💾 Сохранен URL текстуры ice для glass')
        }
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
    makeSimple("andesite")
    makeSimple("boards_wood")
    makeSimple("brown_mashroom_top")
    makeSimple("cactus")
    makeSimple("desert_rock")
    makeSimple("dirt")
    makeSimple("granite")
    makeSimple("gravel")
    makeSimple("ice")
    makeSimple("leaves_oak")
    makeSimple("leaves_pine")
    makeSimple("leaves_savanna")
    makeSimple("mushroom_leg")
    makeSimple("red_mushroom_top")
    makeSimple("red_sand")
    makeSimple("sand")
    makeSimple("snow_top")
    makeSimple("stone")
    makeSimple("tundra_grass_top")
    makeSimple("snow_side")
    makeSimple("pumpkin")
  

    make3("grass", "grass_top", "dirt", "grass_side")
    make3("grass_dry", "grass_dry_top", "dirt", "grass_dry_side")
    make3("tundra_grass", "tundra_grass_top", "dirt", "tundra_grass_side")
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
if (materials["grass_top"]) {
    blocks["grass_block"] = noa.registry.registerBlock(blockIdCounter++, {
        material: [
            materials["grass_top"], // top
            materials["grass_top"], // bottom
            materials["grass_top"]  // sides
        ]
    })
}
if (materials["tundra_grass_top"]) {
    blocks["tundra_grass_block"] = noa.registry.registerBlock(blockIdCounter++, {
        material: [
            materials["tundra_grass_top"], // top
            materials["tundra_grass_top"], // bottom
            materials["tundra_grass_top"]  // sides
        ]
    })
}
if (materials["grass_dry_top"]) {
    blocks["grass_dry_block"] = noa.registry.registerBlock(blockIdCounter++, {
        material: [
            materials["grass_dry_top"], // top
            materials["grass_dry_top"], // bottom
            materials["grass_dry_top"]  // sides
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
    // 🍄 ГРИБЫ
    // ======================
    if (materials["mashroom_leg"] && materials["red_mashroom_top"]) {

        // Ножка гриба — своя текстура mashroom_leg
        blocks["mushroom_stem"] = noa.registry.registerBlock(blockIdCounter++, {
            material: materials["mashroom_leg"]
        })

        // Шляпа гриба — красная шляпка red_mashroom_top
        blocks["mushroom_cap"] = noa.registry.registerBlock(blockIdCounter++, {
            material: materials["red_mashroom_top"]
        })

        console.log("🍄 Грибные блоки зарегистрированы (ножка: mashroom_leg, шляпа: red_mashroom_top)")
    }

    // Слушаем события генерации новых текстур
    window.addEventListener('textureGenerated', async (event) => {
        // @ts-ignore - CustomEvent.detail поддерживается в браузере
        const detail = event.detail
        const textureName = detail.textureName
        const textureData = detail.textureData
        const useIceTexture = detail.useIceTexture
        
        // Если это glass и нужно использовать текстуру ice
        if (textureName === 'glass' && useIceTexture) {
            console.log('🔷 Регистрация glass с текстурой ice (синеватый оттенок)')
            
            // Получаем сохраненный URL текстуры ice
            // @ts-ignore
            const iceTextureURL = window.iceTextureURL
            
            if (iceTextureURL) {
                const matName = "mat_glass"
                
                // Регистрируем новый материал glass с синеватым оттенком
                // Используем color для добавления синего оттенка к текстуре ice
                // [R, G, B, Alpha] - синеватый оттенок: увеличиваем синий канал, уменьшаем красный и зеленый
                noa.registry.registerMaterial(matName, {
                    textureURL: iceTextureURL,
                    color: [0.5, 0.6, 1.0, 0.75] // Синеватый оттенок с прозрачностью (более синий чем ice)
                })
                
                materials['glass'] = matName
                console.log('✅ Glass использует материал ice с синеватым оттенком')
                
                // Регистрируем блок glass как прозрачный
                if (!blocks['glass']) {
                    // @ts-ignore
                    let currentCounter = window.blockIdCounter || blockIdCounter
                    
                    blocks['glass'] = noa.registry.registerBlock(currentCounter, {
                        material: materials['glass'],
                        opaque: false
                    })
                    
                    currentCounter++
                    // @ts-ignore
                    window.blockIdCounter = currentCounter
                    blockIdCounter = currentCounter
                    
                    console.log(`✔ Блок glass зарегистрирован (ID: ${blocks['glass']}) с текстурой ice, синеватый, прозрачный`)
                    
                    // Обновляем глобальный blocksMap
                    // @ts-ignore
                    if (window.blocksMap) {
                        // @ts-ignore
                        window.blocksMap['glass'] = blocks['glass']
                        console.log(`✅ Обновлен глобальный blocksMap: glass -> ${blocks['glass']}`)
                    }
                    
                    // Отправляем событие о регистрации
                    window.dispatchEvent(new CustomEvent('blockRegistered', {
                        detail: { blockName: 'glass', blockId: blocks['glass'] }
                    }))
                }
            } else {
                console.warn('⚠ URL текстуры ice не найден для glass. Убедитесь, что ice зарегистрирован.')
            }
            return
        }
        
        const matName = "mat_" + textureName
        const make = b64 => "data:image/png;base64," + b64
        
        console.log(`🎨 Регистрация материала для текстуры: ${textureName}`)
        
        // Определяем, нужно ли сделать материал прозрачным (для glass)
        const isGlass = textureName.includes('glass')
        const materialOptions = {
            textureURL: make(textureData)
        }
        
        // Если это glass, добавляем прозрачность к материалу
        if (isGlass) {
            // Используем альфа-канал для прозрачности (аналогично water)
            // Можно также использовать color с альфа-каналом
            console.log('🔷 Материал glass будет прозрачным')
        }
        
        // Регистрируем новый материал
        noa.registry.registerMaterial(matName, materialOptions)
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
                    
                    // Настройки блока
                    const blockOptions = {
                        material: [
                            materials[topName],
                            materials[topName],
                            materials[sideName]
                        ]
                    }
                    
                    // Если это glass, делаем его прозрачным
                    if (blockName === 'glass') {
                        blockOptions.opaque = false
                        console.log('🔷 Блок glass будет прозрачным')
                    }
                    
                    blocks[blockName] = noa.registry.registerBlock(currentCounter, blockOptions)
                    
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
                
                // Настройки блока
                const blockOptions = {
                    material: materials[textureName]
                }
                
                // Если это glass, делаем его прозрачным
                if (blockName === 'glass') {
                    blockOptions.opaque = false
                    console.log('🔷 Блок glass будет прозрачным (простой блок)')
                }
                
                blocks[blockName] = noa.registry.registerBlock(currentCounter, blockOptions)
                
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
export function createPigMaterial(noa) {
    return createAnimalCVAETextureMaterial(noa, "pig")
}
// ------------------------------------------------------------
// Материал для медведей (коричневый или белый)
// ------------------------------------------------------------
export function createBearMaterial(noa, type = "brown") {
    const texName =
        type === "polar"
            ? "bear_white"
            : "bear_brown"

    return createAnimalCVAETextureMaterial(noa, texName)
}

// ------------------------------------------------------------
// Материал для коров (белый с черными пятнами)
// ------------------------------------------------------------
export function createCowMaterial(noa) {
    return createAnimalCVAETextureMaterial(noa, "cow")
}
// ------------------------------------------------------------
// 🎨 Материал животного из CVAE-текстуры (как у блоков)
// ------------------------------------------------------------
export function createAnimalCVAETextureMaterial(noa, textureName) {
    const scene = noa.rendering.getScene()
    if (!scene) return null

    // @ts-ignore
    const texMap = window.cvaeTextures
    if (!texMap || !texMap[textureName]) {
        console.warn(`⚠ CVAE текстура не найдена: ${textureName}`)
        return null
    }

    const mat = new BABYLON.StandardMaterial(
        `animal_${textureName}`,
        scene
    )

    mat.diffuseTexture = new BABYLON.Texture(
        "data:image/png;base64," + texMap[textureName],
        scene
    )

    mat.specularColor = new BABYLON.Color3(0, 0, 0)
    mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1)

    return mat
}
// @ts-ignore
window.blockSideMap = {
  grass: "grass_side",
  snow: "snow_transition_side",
  tundra_grass: "tundra_grass_side",
  grass_dry: "grass_dry_side",
  oak_log: "log_side",
}
