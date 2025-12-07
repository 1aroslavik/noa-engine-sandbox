// materials.js
import { generateTextures } from "./texture_runtime_loader.js"
import { Color3 } from '@babylonjs/core'
import * as BABYLON from '@babylonjs/core'

export async function initMaterialsAndBlocks(noa) {
    const tex = await generateTextures()
    const make = b64 => "data:image/png;base64," + b64

    const blocks = {}
    const materials = {}
    let blockIdCounter = 1

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
