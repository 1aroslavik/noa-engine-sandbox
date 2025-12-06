up:
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

run-textures:
	CWD=$$(pwd); \
	cd src/hello-world/vae && \
	$$CWD/.venv/bin/python3 -m uvicorn server:app --reload --port 3001

start:
	npm start