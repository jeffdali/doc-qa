import pathlib
import logging
from pypdf import PdfReader
from io import BytesIO

logger = logging.getLogger(__name__)


class DocumentParser:
    """
    Extract text from the uploaded docs.
    Bytes in -> plain text out.
    """

    SUPPORTED_TYPES = {".pdf", ".txt", ".md"}

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
        return content.decode("utf-8", errors="replace")

    def parse_pdf(self, content: bytes) -> str:
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)
