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
