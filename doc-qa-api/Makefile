.PHONY: dev test eval lint format

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

test:
	uv run pytest tests/unit tests/integration -v

eval:
	uv run pytest tests/eval -v

lint:
	uv run ruff check app/

format:
	uv run ruff format app/