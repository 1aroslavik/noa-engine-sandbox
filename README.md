# Generative Voxel Survival — Final Assessment Project

This project is a procedural voxel prototype built on the **NOA Engine** for the Procedural Content Generation course (UTM).  
It implements terrain generation, runtime biomes, neural runtime textures, procedural vegetation, and generative animals.

---

# 🧩 Features Implemented
- Procedural terrain using layered noise  
- Runtime biome classification (temperature + moisture + height)  
- CVAE neural runtime textures (no PNG assets)  
- L-system trees (oak & pine)  
- Procedural mushrooms  
- Generative animals (pigs, cows, bears) with movement AI and panic behavior  
- Dynamic blocks & crafting texture combinations  

This satisfies the requirements for **Grade 10 (Excellent)**.

---

# ▶ How to Run

## 1️⃣ Install Python virtual environment
```sh
make up
```

---

## 2️⃣ Start CVAE Runtime Texture Server
```sh
make run-textures
```

This launches:

* CVAE model  
* FastAPI server  
* Runtime texture generator  

Server runs at:
```
http://localhost:3001/generate
```

---

## 3️⃣ Start NOA Engine Client
```sh
make start
```

Open the game in:
```
http://localhost:5173
```
