export async function prewarmWorld(noa, radius = 2, y = 32) {
    const CS = noa.world._chunkSize

    for (let cx = -radius; cx <= radius; cx++) {
        for (let cz = -radius; cz <= radius; cz++) {
            const wx = cx * CS
            const wz = cz * CS

            try {
                noa.getBlock(wx, y, wz)
            } catch {}

            // 🔑 ДАЁМ КАДРУ ОТРИСОВАТЬСЯ
            await new Promise(resolve => requestAnimationFrame(resolve))
        }
    }
}
