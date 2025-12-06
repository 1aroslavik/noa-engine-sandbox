// blocks.js
export let waterID = 0

export function registerBlocks(noa) {

    const reg = noa.registry
    let id = 1

    // ======================
    // 🟦 РЕГИСТРАЦИЯ ВОДЫ
    // ======================
    reg.registerMaterial("water_mat", {
        color: [0.2, 0.4, 0.9, 0.55],  // голубая полупрозрачная вода
    })

    waterID = reg.registerBlock(id++, {
        material: "water_mat",
        fluid: true,
        opaque: false
    })

    console.log("✔ Блок воды зарегистрирован ID:", waterID)

    return {
        waterID
    }
}
