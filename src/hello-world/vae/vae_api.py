import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from vae.cvae import CVAE
import base64
from io import BytesIO
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = CVAE()
model.load_state_dict(torch.load("textures_cvae.pth", map_location="cpu"))
model.eval()

def generate_for_class(cls_idx):
    y = torch.zeros(1,5)
    y[0,cls_idx] = 1
    z = torch.randn(1,64)
    with torch.no_grad():
        img = model.decode(z, y)[0]

    img = (img.permute(1,2,0).numpy() * 255).astype("uint8")
    im = Image.fromarray(img)

    buff = BytesIO()
    im.save(buff, format="PNG")
    return base64.b64encode(buff.getvalue()).decode()

@app.get("/generate")
def generate():
    return {
        "grass": generate_for_class(0),
        "dirt": generate_for_class(1),
        "sand": generate_for_class(2),
        "stone": generate_for_class(3),
        "tundragrass": generate_for_class(4),
    }
