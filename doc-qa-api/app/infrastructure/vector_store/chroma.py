from app.core.config import get_settings
from PIL.Image import logger
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.domain.models import Chunk, SearchResult
import uuid


class ChromaVectorStore:
    def __init__(self, persist_dir: str, collection_name: str) -> None:

        self._persist_dir = persist_dir
        self._collection_name = collection_name
        self._client: chromadb.ClientAPI | None = None
        self._collection = None

    def _get_collection(
        self,
    ):
        """
        Lazy initialization
        cconnects to chroma db
        """
        if self._collection is None:
            self._client = chromadb.PersistentClient(
                path=self._persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                "ChromaDB collection ready",
                extra={
                    "collection": self._collection_name,
                    "size": self._collection.count(),
                },
            )
        return self._collection

    def add_chunks(self, chunks: list[Chunk]):
        if not chunks:
            return
        collection = self._get_collection()
        collection.upsert(
            ids=[chunk.id for chunk in chunks],
            embeddings=[chunk.embedding for chunk in chunks],
            documents=[chunk.text for chunk in chunks],
            metadatas=[chunk.metadata for chunk in chunks],
        )
        logger.info("Upserted %d chunks into ChromaDB", len(chunks))

    def search(
        self, query_embedding: list[float], top_k: int = 5, document_ids: list[str] | None = None
    ) -> list[SearchResult]:
        """
        Finds the top_k most similar chunks using cosine similarity.
        """
        if document_ids is not None and len(document_ids) == 0:
            return []

        collection = self._get_collection()
        where_clause = None
        if document_ids is not None:
            if len(document_ids) == 1:
                where_clause = {"document_id": {"$eq": document_ids[0]}}
            else:
                where_clause = {"document_id": {"$in": document_ids}}

        query_kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, self.collection_size() or top_k),
            "include": ["documents", "metadatas", "distances"],
        }
        if where_clause is not None:
            query_kwargs["where"] = where_clause

        results = collection.query(**query_kwargs)
        search_results = []
        if not results or not results.get("documents") or not results["documents"][0]:
            return []

        for text, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            similarity = 1 - (distance / 2)
            chunk = Chunk(
                id=str(uuid.uuid4()),
                text=text,
                metadata=metadata or {},
            )
            search_results.append(SearchResult(chunk=chunk, score=similarity))
        return search_results

    def delete_document(self, document_id: str) -> None:
        """
        Deletes all chunks whose metadata contains this document_id.
        """
        collection = self._get_collection()
        collection.delete(where={"document_id": {"$eq": document_id}})
        logger.info("Deleted chunks for document_id=%s", document_id)

    def collection_size(self):
        return self._get_collection().count()


def make_vector_store() -> ChromaVectorStore:
    """
    Factory function that creates and returns a ChromaVectorStore instance.
    Called from lifespan
    """
    settings = get_settings()
    return ChromaVectorStore(
        persist_dir=settings.chroma_persist_dir,
        collection_name=settings.chroma_collection_name,
    )
