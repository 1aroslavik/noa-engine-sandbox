from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
from cvae import CVAE
import json
from PIL import Image
from io import BytesIO
import base64
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== metadata =====
meta = json.load(open("metadata.json"))
CLASS_NAMES = meta["classes"]
NUM_CLASSES = meta["num_classes"]
Z_DIM = meta["z_dim"]
IMG = meta["img"]

name2id = {name: i for i, name in enumerate(CLASS_NAMES)}

# ===== model =====
model = CVAE(z_dim=Z_DIM, cond_dim=NUM_CLASSES, img_size=IMG)
model.load_state_dict(torch.load("cvae.pth", map_location="cpu"))
model.eval()


def gen(name):
    cid = name2id[name]
    c = torch.zeros(1, NUM_CLASSES)
    c[0, cid] = 1

    z = torch.randn(1, Z_DIM)
    with torch.no_grad():
        img = model.decode(z, c)[0].permute(1, 2, 0).numpy()

    img = (img * 255).astype(np.uint8)
    buf = BytesIO()
    Image.fromarray(img).save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ===========================================
#  Эндпоинт как раньше — /generate (все текстуры)
# ===========================================
@app.get("/generate")
def generate_all():
    res = {}
    for name in CLASS_NAMES:
        res[name] = gen(name)

    # создаём переход: трава → земля
    if "grass_top" in res and "dirt" in res:
        res["grass_side"] = mix_vertical(res["grass_top"], res["dirt"])
    if "snow_top" in res and "dirt" in res:
        res["snow_transition_side"] = mix_vertical(res["snow_top"], res["dirt"])
    if "grass_dry_top" in res and "dirt" in res:
        res["grass_dry_side"] = mix_vertical(res["grass_dry_top"], res["dirt"])
    if "tundra_grass_top" in res and "dirt" in res:
        res["tundra_grass_side"] = mix_vertical(res["tundra_grass_top"], res["dirt"])
    return res


def mix_vertical(top_b64, bottom_b64):
    top = Image.open(BytesIO(base64.b64decode(top_b64))).convert("RGB")
    bottom = Image.open(BytesIO(base64.b64decode(bottom_b64))).convert("RGB")

    top_np = np.array(top).astype(np.float32)
    bottom_np = np.array(bottom).astype(np.float32)

    h, w, _ = top_np.shape

    # ---- ВАЖНО ----
    # 0.3 = 30% трава / 70% земля
    cutoff = 0.3
    grad = np.linspace(1, 0, h).reshape(h, 1, 1)

    # Сдвигаем градиент
    grad = np.clip((grad - (1 - cutoff)) / cutoff, 0, 1)

    mixed = (top_np * grad + bottom_np * (1 - grad)).astype(np.uint8)

    buf = BytesIO()
    Image.fromarray(mixed).save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()

# ===========================================
#  Эндпоинт для одной текстуры
# ===========================================
@app.get("/tex/{name}")
def generate_one(name: str):
    if name not in name2id:
        return {"error": "Unknown texture"}
    return gen(name)


# ===========================================
#  Эндпоинт для смешивания двух текстур
# ===========================================
@app.post("/mix")
async def mix_textures(request: dict):
    """
    Смешивает две текстуры используя интерполяцию в латентном пространстве CVAE.
    
    Параметры:
    - texture1: имя первой текстуры
    - texture2: имя второй текстуры
    - ratio: коэффициент смешивания (0.0 = только texture1, 1.0 = только texture2, 0.5 = 50/50)
    - result_name: имя для результата (опционально)
    """
    texture1 = request.get("texture1")
    texture2 = request.get("texture2")
    ratio = request.get("ratio", 0.5)
    result_name = request.get("result_name", None)
    
    if not texture1 or not texture2:
        return {"error": "Both texture1 and texture2 are required"}
    
    if texture1 not in name2id or texture2 not in name2id:
        return {"error": "One or both textures not found"}
    
    # Получаем условия для обеих текстур
    cid1 = name2id[texture1]
    cid2 = name2id[texture2]
    
    c1 = torch.zeros(1, NUM_CLASSES)
    c1[0, cid1] = 1
    
    c2 = torch.zeros(1, NUM_CLASSES)
    c2[0, cid2] = 1
    
    # Интерполируем условия
    c_mixed = (1 - ratio) * c1 + ratio * c2
    
    # Генерируем случайный вектор z
    z = torch.randn(1, Z_DIM)
    
    # Декодируем смешанное условие
    with torch.no_grad():
        img = model.decode(z, c_mixed)[0].permute(1, 2, 0).numpy()
    
    img = (img * 255).astype(np.uint8)
    buf = BytesIO()
    Image.fromarray(img).save(buf, "PNG")
    result_b64 = base64.b64encode(buf.getvalue()).decode()
    
    return {
        "texture": result_b64,
        "texture1": texture1,
        "texture2": texture2,
        "ratio": ratio,
        "result_name": result_name or f"{texture1}_mixed_{texture2}"
    }
