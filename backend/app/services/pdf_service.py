"""
PDF processing utilities for extracting text from uploaded PDF files.
"""
import io
import logging
from typing import Optional

from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

# Max PDF size to process (5MB)
MAX_PDF_SIZE = 5 * 1024 * 1024
# Max pages to extract text from
MAX_PAGES = 10
# Max characters to extract
MAX_CHARS = 10000


async def extract_text_from_pdf(pdf_base64: str) -> Optional[str]:
    """
    Extract text from a base64-encoded PDF.
    
    Args:
        pdf_base64: Base64 string (with or without data: prefix)
        
    Returns:
        Extracted text or None if extraction fails
    """
    try:
        # Remove data: prefix if present
        if pdf_base64.startswith("data:"):
            # Find the comma separator
            comma_idx = pdf_base64.find(",")
            if comma_idx != -1:
                pdf_base64 = pdf_base64[comma_idx + 1:]
        
        # Decode base64
        import base64
        pdf_bytes = base64.b64decode(pdf_base64)
        
        # Check size
        if len(pdf_bytes) > MAX_PDF_SIZE:
            logger.warning(f"PDF too large: {len(pdf_bytes)} bytes")
            return f"[PDF too large to process: {len(pdf_bytes) / 1024 / 1024:.1f}MB. Max is {MAX_PDF_SIZE / 1024 / 1024}MB]"
        
        # Extract text
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        if len(reader.pages) == 0:
            return "[PDF has no pages]"
        
        text_parts = []
        total_chars = 0
        
        for i, page in enumerate(reader.pages):
            if i >= MAX_PAGES:
                text_parts.append(f"\n[... {len(reader.pages) - MAX_PAGES} more pages truncated ...]")
                break
            
            try:
                page_text = page.extract_text()
                if page_text:
                    # Limit characters per page
                    if total_chars + len(page_text) > MAX_CHARS:
                        remaining = MAX_CHARS - total_chars
                        if remaining > 100:
                            page_text = page_text[:remaining] + "... [truncated]"
                            text_parts.append(page_text)
                        break
                    text_parts.append(page_text)
                    total_chars += len(page_text)
            except Exception as e:
                logger.warning(f"Failed to extract text from page {i+1}: {e}")
                continue
        
        if not text_parts:
            return "[No extractable text found in PDF - may be scanned/images only]"
        
        return "\n\n".join(text_parts)
        
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return f"[PDF processing error: {str(e)}]"


def is_pdf_base64(data: str) -> bool:
    """Check if a base64 string is a PDF."""
    if data.startswith("data:application/pdf"):
        return True
    if data.startswith("data:") and ";base64," in data:
        # Try to detect PDF signature after decoding first few bytes
        try:
            import base64
            comma_idx = data.find(",")
            if comma_idx != -1:
                decoded = base64.b64decode(data[comma_idx + 1:comma_idx + 50])
                return decoded.startswith(b"%PDF")
        except Exception:
            pass
    # Check for PDF magic bytes in raw base64
    try:
        import base64
        decoded = base64.b64decode(data[:50])
        return decoded.startswith(b"%PDF")
    except Exception:
        pass
    return False