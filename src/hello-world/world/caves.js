import { createNoise3D, createNoise2D } from "simplex-noise";

// 3D шум — круглые пещеры
const caveNoise = createNoise3D(() => Math.random());

// 3D шум — извилистые узкие туннели
const tunnelNoise = createNoise3D(() => Math.random());

// 2D шум — входы
const entranceNoise = createNoise2D(() => Math.random());


// ================================
//       СУПЕР-РЕДКИЕ ПЕЩЕРЫ
// ================================

export function isCave(x, y, z) {

    // пещеры почти не поднимаются наверх
    if (y > 60) return false;

    // --- маленькие сферические карманы ---
    const cave = Math.abs(caveNoise(x * 0.03, y * 0.03, z * 0.03));
    if (cave < 0.06) return true;  // раньше 0.12, теперь в 2 раза реже

    // --- узкие короткие туннели ---
    const tunnel = Math.abs(tunnelNoise(x * 0.02, y * 0.02, z * 0.02));
    if (tunnel < 0.03) return true; // раньше 0.055, теперь в 2 раза реже

    return false;
}



// ================================
//     СУПЕР-РЕДКИЕ ВХОДЫ
// ================================

export function isSurfaceCave(x, y, z, surfaceHeight) {

    // входы только на самой поверхности
    if (y < surfaceHeight - 4) return false;

    const n = Math.abs(entranceNoise(x * 0.05, z * 0.05));

    // ГЛАВНОЕ УМЕНЬШЕНИЕ:  
    // вместо 0.005–0.015 → фиксированное 0.003
    // это ~1 вход на 200–300 блоков
    return n < 0.003;
}
