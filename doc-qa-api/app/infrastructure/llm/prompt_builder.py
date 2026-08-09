import glob
import logging
import os

from app.domain.models import SearchResult
from app.domain.schemas import PromptResult

logger = logging.getLogger(__name__)


def _resolve_filename(meta: dict) -> str:
    filename = meta.get("filename", "unknown")
    if filename and filename != "unknown":
        return filename
    doc_id = meta.get("document_id")
    if doc_id and os.path.exists("data"):
        matches = glob.glob(os.path.join("data", f"{doc_id}_*"))
        if matches:
            base = os.path.basename(matches[0])
            if base.startswith(f"{doc_id}_"):
                return base[len(doc_id) + 1 :]
    return "unknown"



RAG_SYSTEM_PROMPT = """
    You are a precise and trustworthy document assistant.
    Your job is to answer the user's question using ONLY the context provided below.
    
    Rules you must follow:
        - If the answer is clearly present in the context, answer it directly and concisely.
        - If the context only partially answers the question, answer what you can and explicitly state what is missing.
        - If the context does not contain the answer, respond exactly with "I don't have enough information in the provided documents to answer this question."
        - Never fabricate facts, statistics, names, dates or any other information.
        - Always be concise and avoid unnecessary words or explanation.
        - If the context contains contradictory information, point out the contradiction.
        - Use clean markdown formatting with bold headings (###) and bullet points (-) for lists.
        - Avoid excessive asterisks or redundant formatting symbols.
"""


class PromptBuilder:
    
    CHARS_PER_TOKEN = 4
    
    def __init__(self, max_context_tokens: int = 3000) -> None:
        self._max_context_tokens = max_context_tokens
        self._max_context_chars = max_context_tokens * self.CHARS_PER_TOKEN
        
    
    def build(self, question:str, results: list[SearchResult]) -> PromptResult:
        budgeted = self._apply_token_budget(results)
        context_block = self._format_context(budgeted)
        user_prompt = self._assemble_user_prompt(question, context_block)
        
        estimated_tokens = len(user_prompt) // self.CHARS_PER_TOKEN
        
        logger.debug(
            "Prompt built: %d/%d chunks used, ~%d tokens",
            len(budgeted),
            len(results),
            estimated_tokens,
        )
        return PromptResult(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            chunks_used=len(budgeted),
            chunks_available=len(results),
            estimated_tokens=estimated_tokens,
        )
        
    
    def _apply_token_budget(self, results: list[SearchResult]) -> list[SearchResult]:
        selected: list[SearchResult] = []
        chars_used = 0
        for result in results:
            chunk_chars = len(result.chunk.text)
            if chars_used + chunk_chars > self._max_context_chars:
                break
            selected.append(result)
            chars_used += chunk_chars
        logger.debug("selected: %d chunks", len(selected))
        return selected
 
    
    def _format_context(self, results: list[SearchResult]) -> str:
        if not results:
            return "No relevant context found."

        # Sort by document_id and chunk_index so the LLM reads chunks in logical document order
        sorted_results = sorted(
            results,
            key=lambda r: (
                r.chunk.metadata.get("document_id", ""),
                r.chunk.metadata.get("chunk_index", 0),
            ),
        )

        blocks = []
        for i, result in enumerate(sorted_results, start=1):
            source = _resolve_filename(result.chunk.metadata)
            score = result.score
            blocks.append(
                f"[Source {i} | file: {source} | relevance: {score:.2f}]\n"
                f"{result.chunk.text.strip()}"
            )
        
        logger.debug("Context block: %s", "\n\n---\n\n".join(blocks))

        return "\n\n---\n\n".join(blocks)
    
    
    def _assemble_user_prompt(self, question: str, context_block: str) -> str:
        return (
            f"CONTEXT:\n"
            f"{context_block}\n\n"
            f"---\n\n"
            f"QUESTION:\n"
            f"{question}\n\n"
            f"ANSWER:"
        )
        

        