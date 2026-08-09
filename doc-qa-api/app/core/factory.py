from app.api.v1.router import api_router
import logging
import logging.config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.lifespan import lifespan


def configure_logging(debug: bool) -> None:
    "All loggers in this app inherit from this setup"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                },
            },
            "root": {
                "level": "DEBUG" if debug else "INFO",
                "handlers": ["console"],
            },
        }
    )


def create_app() -> FastAPI:
    """
    application factory
    returns a fully configured FastAPI application
    """
    settings = get_settings()
    configure_logging(settings.app_debug)
    app = FastAPI(
        title="Doc Q&A API",
        description="Production RAG service — document ingestion and semantic Q&A",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
        allow_origin_regex="http://(localhost|127.0.0.1):.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")
    return app
