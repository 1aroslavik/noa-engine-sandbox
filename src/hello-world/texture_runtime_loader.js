// texture_runtime_loader.js

// Определяет базовый URL для запросов к серверу текстур
function getTextureServerBaseUrl() {
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
        return 'http://localhost:3001'
    }
    return '/texture-gen' // относительный путь для продакшена
}

export async function generateTextures() {
    const baseUrl = getTextureServerBaseUrl()
    const url = `${baseUrl}/generate`
    console.log(`🔄 Запрос текстур с ${url}`)

    const res = await fetch(url)

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

    const baseUrl = getTextureServerBaseUrl()
    const url = `${baseUrl}/mix`
    const res = await fetch(url, {
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
export function mixPixels(aName, bName, ratio, resultName) {
  const tex = window.cvaeTextures
  if (!tex[aName] || !tex[bName]) return null

  const a = new Image()
  const b = new Image()

  a.src = "data:image/png;base64," + tex[aName]
  b.src = "data:image/png;base64," + tex[bName]

  return new Promise(resolve => {
    let loaded = 0
    const done = () => {
      loaded++
      if (loaded < 2) return

      const canvas = document.createElement("canvas")
      canvas.width = a.width
      canvas.height = a.height
      const ctx = canvas.getContext("2d")

      ctx.globalAlpha = 1
      ctx.drawImage(a, 0, 0)

      ctx.globalAlpha = ratio
      ctx.drawImage(b, 0, 0)

      const b64 = canvas.toDataURL("image/png").split(",")[1]
      resolve(b64)
    }

    a.onload = done
    b.onload = done
  })
}
