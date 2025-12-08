import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, datasets
from torch.utils.data import DataLoader
from cvae import CVAE
import json

# ==========================
#      ПАРАМЕТРЫ
# ==========================
DATASET = "dataset"
SAVE = "cvae.pth"
META = "metadata.json"

IMG = 32
Z_DIM = 64
EPOCHS = 1000
LR = 1e-3
BATCH = 32

device = "cuda" if torch.cuda.is_available() else "cpu"

# ==========================
#  Аугментации / загрузка
# ==========================
transform = transforms.Compose([
    transforms.Lambda(lambda img: img.convert("RGB")),
    transforms.Resize((IMG, IMG)),
    transforms.ToTensor(),
])

ds = datasets.ImageFolder(DATASET, transform=transform)
loader = DataLoader(ds, batch_size=BATCH, shuffle=True)

CLASS_NAMES = ds.classes
NUM_CLASSES = len(CLASS_NAMES)

print("Классов:", NUM_CLASSES, CLASS_NAMES)

# ==========================
#  СОХРАНЕНИЕ МЕТАДАННЫХ
# ==========================
json.dump({
    "classes": CLASS_NAMES,
    "num_classes": NUM_CLASSES,
    "z_dim": Z_DIM,
    "img": IMG
}, open(META, "w"))

def one_hot(i):
    v = torch.zeros(NUM_CLASSES)
    v[i] = 1
    return v

# ==========================
#     СОЗДАЁМ МОДЕЛЬ
# ==========================
model = CVAE(z_dim=Z_DIM, cond_dim=NUM_CLASSES, img_size=IMG).to(device)

# ==========================
#     ДООбучение
# ==========================
if os.path.exists(SAVE):
    print("🔄 Найден старый чекпоинт, загружаем...")
    model.load_state_dict(torch.load(SAVE, map_location=device))
    print("✔ Модель загружена — продолжаем обучение!")
else:
    print("⚠ Чекпоинт не найден — обучение с нуля.")

opt = optim.Adam(model.parameters(), lr=LR)

# ==========================
#     Функция потерь
# ==========================
def loss_fn(r, x, mu, logvar):
    mse = nn.functional.mse_loss(r, x)
    kld = -0.5 * torch.mean(1 + logvar - mu**2 - logvar.exp())
    return mse + kld * 0.01


# ==========================
#     ОБУЧЕНИЕ
# ==========================
for epoch in range(1, EPOCHS+1):
    total = 0

    for imgs, lbls in loader:
        imgs = imgs.to(device)
        cond = torch.stack([one_hot(i) for i in lbls]).to(device)

        rec, mu, logvar = model(imgs, cond)
        loss = loss_fn(rec, imgs, mu, logvar)

        opt.zero_grad()
        loss.backward()
        opt.step()

        total += loss.item()

    print(f"Epoch {epoch}: {total / len(loader):.6f}")

    if epoch % 5 == 0:
        torch.save(model.state_dict(), SAVE)
        print("💾 Checkpoint saved")

torch.save(model.state_dict(), SAVE)
print("🎉 TRAINING FINISHED")
