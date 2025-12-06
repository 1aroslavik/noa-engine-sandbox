import torch
import base64
import io
from vae.cvae import CVAE
from torchvision.utils import save_image

# Словарь классов, которые ты ХОЧЕШЬ генерировать
CLASS_MAP = {
    "grass_top": 0,
    "grass_side": 1,
    "dirt": 2,

    "grass_dry_top": 3,
    "grass_dry_side": 4,
    "tundra_grass_top": 5,
    "tundra_grass_side": 6,

    "log_side": 7,
    "log_top": 8,
    "leaves_oak": 9,
    "leaves_pine": 10,
    "leaves_savanna": 11,

    "snow_top": 12,
    "snow_side": 13,
    "ice": 14,

    "stone": 15,
    "andesite": 16,
    "granite": 17,
    "gravel": 18,

    "sand": 19,
    "red_sand": 20,
    "desert_rock": 21,
}

# Количество классов ОПРЕДЕЛЯЕТСЯ АВТОМАТИЧЕСКИ
NUM_CLASSES = max(CLASS_MAP.values()) + 1  

IMG_SIZE = 64
LATENT_DIM = 64

# === LOAD MODEL ===
model = CVAE(img_size=IMG_SIZE, latent_dim=LATENT_DIM, num_classes=NUM_CLASSES)
model.load_state_dict(torch.load(
    "C:/Users/hitle/OneDrive/Рабочий стол/noa-examples-master/vae/textures_cvae.pth",
    map_location="cpu"
))
model.eval()

def generate_texture(class_id):
    y = torch.zeros(1, NUM_CLASSES)
    y[0, class_id] = 1

    z = torch.randn(1, LATENT_DIM)
    img = model.decode(z, y).detach()

    buffer = io.BytesIO()
    save_image(img, buffer, format="png")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

# Генерация всех текстур
result = { name: generate_texture(cid) for name, cid in CLASS_MAP.items() }

import json
print(json.dumps(result))
