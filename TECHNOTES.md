# TECHNOTES — Procedural Algorithms Used in Generative Voxel Survival

This document describes the procedural generation systems implemented in the project, including terrain noise, runtime biome logic, neural texture generation, vegetation, and generative animals with AI behavior.

---

#  1. Terrain Generation

Terrain height is computed using **layered simplex noise**:

- **Continental noise** — large-scale landmasses  
- **Hill noise** — medium-scale variation  
- **Detail noise** — small features and micro-height  
- **Rivers & lakes** — low-value noise enforcing drops in height  
- **Caves** — inverted 3D noise thresholds

Combined height formula:

```
height = continentNoise * A
       + hillNoise * B
       + detailNoise * C
       – riverCut * D
```

Where A/B/C/D are scaling constants tuned for playability.

**Water level** is computed separately depending on biome humidity and proximity to rivers.

---

# 2. Runtime Biome Classification

Biomes are determined at **runtime during chunk generation**.

Three independent noise functions:

- `noiseTemp(x,z)` → temperature  
- `noiseMoist(x,z)` → moisture  
- `noiseHeight(x,z)` → elevation  

Biome is selected via combined thresholds:

```
if height < waterLevel → ocean
elif temp < low and moist > high → snow / tundra
elif temp > high and moist < low → desert / dry
elif moist > medium → forest
else → plains
```

Biomes control:

- ground blocks  
- vegetation type  
- animal spawning  
- snow layers  
- tundra grass  
- mushroom species  

---

# 3. Runtime Neural Texture Generation (CVAE)

Textures are generated **with no PNG assets**, using a **Conditional Variational Autoencoder (CVAE)**.

### 3.1 Training

Model inputs:

- 23 texture classes (grass, dirt, stone, logs, leaves, etc.)
- 64×64 training resolution
- Latent vector size: 32

Loss:
```
L = ReconstructionLoss + KLDivergence
```

Model outputs are **base64 PNG textures** used directly in NOA materials at runtime.

### 3.2 Runtime Server

A FastAPI server exposes:

```
GET /generate
```

It returns generated textures for every class:

- grass_top  
- grass_side  
- snow_top  
- dirt  
- stone  
- tundra grass  
- leaves (oak, pine, savanna)  
- logs: side + top  
- desert rocks, sands, gravel, granite  
- snow transition textures  
etc.
Textures load during game start and populate all NOA materials dynamically.

---

# 4. Procedural Trees (L-Systems)

Two species implemented:

## Oak (branching tree)
Grammar:

```
Axiom: F  
Rules:  
F → FF+[+F-F-F]-[-F+F+F]
```

Method:

- recursive L-system expansion
- angle variability based on random seed
- trunk height randomized per biome
- leaves clustering around endpoints

## Pine (conical)
Conical procedural shape:

- central trunk  
- layered circular branches  
- radius decreases with height  
- leaf density controlled by height ratio  

Both trees adjust to:

- biome (pine in cold, oak in forest/plains)
- heightmap (trees avoid slopes)

---

# 5. Procedural Animals & AI

Animals generated:

- pigs (small/normal)
- cows (small/normal)
- bears (brown, polar, small/normal)

## 5.1 Spawn Logic

Spawn depends on biome:

```
pigs, cows → plains, forest, dry  
brown bears → forest, mountains, dry  
polar bears → snow, tundra, ice  
```

## 5.2 Movement AI

Each animal has:

- random direction timer  
- smooth rotation interpolation  
- obstacle detection (feet/body/head levels)  
- jump over obstacles if possible  
- stuck-detection system:
  - checks if movement < threshold
  - relocates to nearest free position

# 6. Dynamic Block System

Blocks are created from CVAE textures:

- dirt  
- stone variants  
- sand, red sand  
- desert rocks  
- snow top  
- ice  
- 3 types of leaves  
- log (top/side)  

Grass and snow use **transition blocks**:

```
grass_side = mix(grass_top, dirt)
snow_transition_side = mix(snow_top, dirt)
```

This eliminates sharp edges between biomes.

---

# 7. Fluids

A runtime water block is created:

- semi-transparent  
- non-opaque  
- fluid = true  

Used for lakes, rivers, mountain meltwater.

---

# 8. Seed-Based Reproducibility

Before every worldgen step:

```
rng(seed)
noise(seed)
worldgen(seed)
```

Results:

- same world for same seed  
- same trees  
- reproducible CVAE texture classes  

# 9. Crafting System

A **2×2 grid recipe system** with **runtime texture mixing** via CVAE.

## 9.1 Recipe Matching

Base recipes (static, always available):
- `log → planks (×4)`
- `planks + planks → stick (×4)`
- `dirt + log → wood`
- `stone + log → brick` 
- `dirt + stone → coal` 
- `sand + log → glass`

Pattern matching:
1. Normalize item names: `dirt_plains, dirt_tundra → dirt`
2. Check base recipes first (exact position or sorted item set)
3. Dynamic recipe generation exists but is disabled

## 9.2 Runtime Texture Mixing

Recipes with `textureMix` trigger CVAE texture generation:

For multi-sided blocks (`_side` + `_top`), both textures are generated and block registration waits for both.

---

# 🏁 Summary

This system implements:

✔ procedural terrain  
✔ runtime biomes  
✔ neural runtime textures  
✔ procedural flora  
✔ generative animals  
✔ survival-style ecosystem  
✔ crafting with runtime texture mixing 


