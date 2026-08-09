from app.core.config import get_settings
import logging
import httpx
from typing import AsyncGenerator
import json

logger = logging.getLogger(__name__)

class OllamaClient:
    
    def __init__(self, base_url:str, model:str, timeout:int= 120)-> None:
        self._base_url = base_url
        self._model = model
        self._complete_timeout = httpx.Timeout(timeout=timeout,connect=10.0)
        self._stream_timeout = httpx.Timeout(None, connect=10.0)
        logger.info("Ollama Client Initialised", extra={"base_url": base_url, "model": model})
        
    
    async def complete(self, prompt:str, system_prompt:str | None=None, temperature: float=0.0)-> str:
        payload = self._build_payload(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            stream=False,
        )
        try:
            async with httpx.AsyncClient(timeout=self._complete_timeout) as client:
                response = await client.post(f"{self._base_url}/api/generate", json=payload)
                response.raise_for_status()
                data = response.json()
                return data["response"]
            
        except httpx.TimeoutException as tex:
            raise RuntimeError(f"Ollama request timed out after {self._complete_timeout}s") from tex
        except httpx.HTTPStatusError as exc:
                logger.error(
                    "Ollama returned HTTP %d: %s",
                    exc.response.status_code,
                    exc.response.text,
                )
                raise RuntimeError(
                    f"Ollama request failed with status {exc.response.status_code}."
                ) from exc
        except Exception as exc:
                logger.error("Unexpected error calling Ollama: %s", exc)
                raise RuntimeError("Unexpected error calling LLM") from exc
        

    async def stream(self, prompt:str, system_prompt:str | None=None, temperature: float=0.0) -> AsyncGenerator[str, None]:
        payload = self._build_payload(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            stream=True,
        )
        
        async with httpx.AsyncClient(timeout=self._stream_timeout) as client:
            try: 
                async with client.stream(
                    "POST",
                    f"{self._base_url}/api/generate",
                    json= payload
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            logger.warning("Unparseable line from Ollama: %r", line)
                            continue
                        
                        token = chunk.get("response", "")
                        if token:
                            yield token
                            
                        if chunk.get("done", False):
                            break

                    
                
            except httpx.TimeoutException as exc:
                logger.error("Ollama stream timed out: %s", exc)
                raise RuntimeError("LLM stream timed out.") from exc

            except httpx.HTTPStatusError as exc:
                logger.error(
                    "Ollama returned HTTP %d: %s",
                    exc.response.status_code,
                    exc.response.text,
                )
                raise RuntimeError(
                    f"Ollama request failed with status {exc.response.status_code}."
                ) from exc
            except Exception as exc:
                logger.error("Unexpected error calling Ollama: %s", exc)
                raise RuntimeError("Unexpected error calling LLM") from exc
    
    
    def _build_payload(self, prompt:str, system_prompt:str|None, temperature: float, stream:bool):
        payload: dict = {
            "model":self._model,
            "prompt":prompt,
            "stream":stream,
            "options":{
                "temperature": temperature,
                "num_predict": 4096,
                "num_ctx": 8192,
            }   
        }
        if system_prompt:
            payload["system"] = system_prompt
        return payload
    
    async def health_check(self):
        """
        Ping ollama to check if it is ready
        """
        
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                response.raise_for_status()
                models = [m["name"] for m in response.json().get("models", [])]
                available = any(self._model in m for m in models)
                if not available:
                    logger.warning(
                        "Model '%s' not found in Ollama. Available: %s",
                        self._model, models,
                    )
                return available
        except Exception as exc:
            logger.error("Ollama health check failed: %s", exc)
            return False
    

def make_llm_client() -> OllamaClient:
    settings = get_settings()
    return OllamaClient(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout=settings.ollama_timeout,
    )