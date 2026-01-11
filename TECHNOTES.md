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
- same plants and decorations

## 9 Crafting System

The crafting system is based on a **2×2 crafting grid** and is fully **runtime-driven**.
It does not rely on predefined textures or static block assets.

The system is split into two parts:
- visual crafting interface (UI only)
- runtime logic for texture generation and block registration

This allows crafted results to be generated dynamically during gameplay.

---

### Crafting Interface

The crafting interface consists of:
- a 2×2 grid for placing items
- a result slot showing a preview of the crafted item
- a list of available recipes generated at runtime

Items can be placed into the grid by:
- dragging them from the inventory
- clicking to place or remove the selected item

Removing an item from the grid always returns it to the inventory.

The crafting window can be opened and closed during gameplay without stopping world simulation.

---

### Runtime Recipe Generation

Recipes are generated **every time the crafting window is opened**.

Recipe properties:
- 5–10 recipes per session
- each recipe combines exactly **two different materials**
- order-independent (A + B equals B + A)
- each recipe uses a **random mixing ratio** between 25% and 75%

Recipes exist only for the current session and are not stored permanently.

---

### Recipe Matching Logic

When items are placed in the grid:
- empty cells are ignored
- crafting is evaluated only when exactly two items are present
- item names are normalized
- order does not matter

If a matching recipe is found, the result slot displays a preview.
The crafted item is created only when the player clicks the result slot.

---

### Runtime Texture Mixing

Crafting a recipe triggers **runtime texture generation**.

For each crafted block:
- two textures are generated:
  - `<block>_top`
  - `<block>_side`
- textures are created by pixel-level mixing of the source materials
- generated textures are stored in `window.generatedTextures`

The same texture pipeline is used as for all other runtime-generated blocks,
ensuring visual consistency.

---

### Dynamic Block Registration

After textures are generated:
- new materials are registered at runtime
- a new block is registered using the same registry system as all other blocks
- the block uses:
  - top texture
  - side texture
  - solid and opaque properties

Crafted blocks are added to the global block map and behave exactly like native world blocks.

No special placement logic is required.

---

### Inventory Integration

Each crafted block is automatically registered as a standard inventory item:
- `type: "block"`
- normal placement behavior
- runtime metadata (rarity, crafting difficulty, description)

After crafting, blocks can be:
- placed in the world
- stored in inventory
- reused in further crafting

---



