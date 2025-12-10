FROM python:3.9-slim

WORKDIR /app

# Установка системных зависимостей для PyTorch и PIL
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Установка CPU-only версий PyTorch (без CUDA, намного легче)
# Это уменьшает размер образа с ~2-3GB до ~500MB-1GB
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision

# Установка остальных зависимостей (torch и torchvision уже установлены из CPU индекса)
RUN pip install --no-cache-dir \
    Pillow \
    matplotlib \
    numpy \
    uvicorn \
    fastapi

# Копирование файлов приложения
COPY src/hello-world/vae/server.py .
COPY src/hello-world/vae/cvae.py .
COPY src/hello-world/vae/cvae.pth .
COPY src/hello-world/vae/metadata.json .

# Открываем порт
EXPOSE 3001

# Запуск сервера
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3001"]
