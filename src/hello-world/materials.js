// materials.js
import { generateTextures } from "./texture_runtime_loader.js"
import { Color3 } from '@babylonjs/core'

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
    make3("snow_transition", "snow_top", "dirt", "snow_transition_side")

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

    return { blocks, materials, waterID }
}

// ------------------------------------------------------------
// Материал для свиней
// ------------------------------------------------------------
export function createPigMaterial(noa) {
    const material = noa.rendering.makeStandardMaterial()
    // Розовый цвет: RGB(1, 0.2, 0.2)
    material.diffuseColor = new Color3(1, 0.2, 0.2)
    // Добавляем эмиссию, чтобы цвет был виден даже в тени
    material.emissiveColor = new Color3(0.3, 0.06, 0.06)
    return material
}
