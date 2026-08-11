import pathlib
import logging
from pypdf import PdfReader
from io import BytesIO
import unicodedata 

logger = logging.getLogger(__name__)


class DocumentParser:
    """
    Extract text from the uploaded docs.
    Bytes in -> plain text out.
    """

    SUPPORTED_TYPES = {".pdf", ".txt", ".md"}
    
    def _normalize(self, text:str) -> str :
        if not text:
            return ""
        return unicodedata.normalize("NFC", text).strip()

    def parse(self, content: bytes, filename: str) -> str:

        # Get the file extension
        suffix = pathlib.Path(filename).suffix.lower()

        if suffix not in self.SUPPORTED_TYPES:
            raise ValueError(
                f"Unsupported file type '{suffix}'. "
                f"Supported: {', '.join(self.SUPPORTED_TYPES)}"
            )

        parser = {
            ".txt": self.parse_text,
            ".md": self.parse_text,
            ".pdf": self.parse_pdf,
        }[suffix]

        text = parser(content)
        logger.info("Parsed '%s' — extracted %d characters", filename, len(text))
        return text.strip()

    def parse_text(self, content: bytes) -> str:
        decoded_text = content.decode("utf-8", errors="replace")
        return self._normalize(decoded_text)

    def parse_pdf(self, content: bytes) -> str:
        reader = PdfReader(BytesIO(content))
        pages = []
        for page in reader.pages:
            raw_text = page.extract_text() or ""
            pages.append(self._normalize(raw_text))
        
        return "\n\n".join(pages)
    
