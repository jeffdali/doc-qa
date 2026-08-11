from app.core.config import get_settings
from sentence_transformers import CrossEncoder
from app.domain.models import SearchResult
import logging
import torch

logger = logging.getLogger(__name__)
class CrossEncoderReranker:
    
    def __init__(self, model_name: str, device:str):
        self._model : CrossEncoder | None = None
        self._model_name =  model_name
        self._device = device
        
    
    def _get_model(self)-> CrossEncoder:
        if self._model is None:
            logger.info("Loading CrossEncoder model %r ...", self._model_name)
            
            kwargs = {}
            if self._device in ["mps", "cuda"]:
                kwargs["model_kwargs"] = {"torch_dtype": torch.float16}
                
            self._model = CrossEncoder(
                self._model_name, 
                device=self._device, 
                default_activation_function=torch.nn.Sigmoid(),
                **kwargs
            )
            logger.info("CrossEncoder model loaded.")   
        return self._model
    
    def rerank(self, query: str, results: list[SearchResult], top_k: int) -> list[SearchResult]:
        if not results:
            return []
        settings = get_settings()
        model = self._get_model()
        pairs = [(query, res.chunk.text) for res in results]
        
        scores = model.predict(pairs, batch_size=8, show_progress_bar=False)
        
        for result, score in zip(results, scores):
            result.score = score

        return sorted(results, key=lambda r:r.score, reverse=True)[:top_k]
    
    
def make_reranker() -> CrossEncoderReranker:
    """
    Instantiate the reranker
    """
    settings = get_settings()
    return CrossEncoderReranker(
        model_name=settings.reranker_model,
        device=settings.reranker_device,
    )