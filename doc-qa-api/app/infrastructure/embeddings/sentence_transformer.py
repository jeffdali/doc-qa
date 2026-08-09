from sentence_transformers import SentenceTransformer
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class SentenceTransformerEmbeddings:
    def __init__(self, model_name: str, device: str = "cpu") -> None:
        self._model: SentenceTransformer | None = None
        self._model_name = model_name
        self._device = device
        logger.info(
            "EmbeddingService initialised",
            extra={
                "model": model_name,
                "device": device,
            },
        )

    def _get_model(self) -> SentenceTransformer:
        # Lazy load the model
        if self._model is None:
            logger.info("Loading embedding model: %s", self._model_name)
            self._model = SentenceTransformer(self._model_name, device=self._device)
            logger.info("Embedding model loaded — dimension: %d", self.dimension)
        return self._model

    def embed_text(self, text: str) -> list[float]:
        model = self._get_model()
        vector = model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        vectors = model.encode(
            texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False
        )
        return [v.tolist() for v in vectors]

    @property
    def dimension(self) -> int:
        return self._get_model().get_sentence_embedding_dimension()


def make_embedding_service() -> SentenceTransformerEmbeddings:
    """
    Factory function , returns a ready to use instance
    """
    settings = get_settings()
    return SentenceTransformerEmbeddings(
        model_name=settings.embedding_model, device=settings.embedding_device
    )
