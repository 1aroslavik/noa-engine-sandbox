
ifeq ($(OS),Windows_NT)
    PYTHON = python
    ACTIVATE = .venv/Scripts/Activate.ps1
else
    PYTHON = python3
    ACTIVATE = . .venv/bin/activate
endif


up:
	$(PYTHON) -m venv .venv

ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -Command ". .venv/Scripts/Activate.ps1; pip install -r requirements.txt"
else
	$(ACTIVATE) && pip install -r requirements.txt
endif


run-textures:
	powershell -ExecutionPolicy Bypass -Command ". .venv/Scripts/Activate.ps1; cd src/hello-world/vae; python -m uvicorn server:app --reload --port 3001"



start:
	npm start
