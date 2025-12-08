# Generative Voxel Survival

This project is a procedural voxel prototype built on the **NOA Engine** for the Procedural Content Generation course (UTM).  
It implements terrain generation, runtime biomes, neural runtime textures, procedural vegetation, and generative animals.

---

# ▶ How to Run the Project

You can run the project **with make** (recommended)  
or **without make** (manual commands).  
Both options are provided below.

---

# OPTION 1 — Run with `make` (recommended)

##1 Create Python virtual environment
```sh
make up
```

##2 Start CVAE Runtime Texture Server
```sh
make run-textures
```

Server will run here:
```
http://localhost:3001/generate
```

##3 Start NOA Engine client
```sh
make start
```

Game opens at:
```
http://localhost:5173
```

---

# OPTION 2 — Run WITHOUT `make`

Use this if you're on **Windows without make**

---

#1 Create virtual environment

### Windows
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Linux / macOS
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

#2 Start CVAE Texture Server

### Windows
```powershell
cd src/hello-world/vae
python -m uvicorn server:app --reload --port 3001
```

### Linux / macOS
```bash
cd src/hello-world/vae
../../.venv/bin/python3 -m uvicorn server:app --reload --port 3001
```

Server will be available at:
```
http://localhost:3001/generate
```

---

#3 Start NOA Engine Client
```sh
npm install
npm start
```

Game opens at:
```
http://localhost:5173
```
---

