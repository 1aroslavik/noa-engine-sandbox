// texture_runtime_loader.js

export async function generateTextures() {
    console.log("🔄 Запрос текстур с http://localhost:3001/generate")

    const res = await fetch("http://localhost:3001/generate")

    if (!res.ok) {
        throw new Error("❌ Ошибка ответа от сервера текстур: " + res.status)
    }

    const data = await res.json()

    console.log("✔ Текстуры получены:", Object.keys(data))

    return data // объект: {grass_top: "...", stone: "...", ...}
}

/**
 * Смешивает две текстуры через сервер CVAE
 * @param {string} texture1 - имя первой текстуры
 * @param {string} texture2 - имя второй текстуры
 * @param {number} ratio - коэффициент смешивания (0.0-1.0, по умолчанию 0.5)
 * @param {string} resultName - имя для результата (опционально)
 * @returns {Promise<string>} base64 строка с изображением
 */
export async function mixTextures(texture1, texture2, ratio = 0.5, resultName = null) {
    console.log(`🔄 Смешивание текстур: ${texture1} + ${texture2} (ratio: ${ratio})`)

    const res = await fetch("http://localhost:3001/mix", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            texture1: texture1,
            texture2: texture2,
            ratio: ratio,
            result_name: resultName
        })
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`❌ Ошибка смешивания текстур: ${res.status} - ${errorText}`)
    }

    const data = await res.json()
    console.log(`✔ Текстура смешана: ${data.result_name}`)

    return data.texture // base64 строка
}
