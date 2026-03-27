import io
import json
import logging
import time
from typing import Any
from .tokenizer import tokenize_text
from ..core.config import settings
from ..core.gemini import get_gemini_client, is_gemini_available

logger = logging.getLogger(__name__)


def sanitize_text_with_gemini(text: str) -> tuple[str, dict[str, str]]:
    if not is_gemini_available():
        logger.warning("Gemini not available, falling back to regex tokenizer")
        return tokenize_text(text)

    client = get_gemini_client()

    prompt = f"""You are a PII (Personally Identifiable Information) detection and tokenization system.

Your task: Replace all PII in the following text with unique tokens in the format TOKEN_XXXXXXXX (8 uppercase hex characters).

Rules:
- Replace: names, emails, phone numbers, addresses, SSNs, credit cards, dates of birth, IP addresses, URLs with personal info
- Keep: generic dates, general concepts, non-identifying information
- Use the SAME token for repeated occurrences of the same PII value
- Return ONLY a JSON object with two fields:
  1. "sanitized_text": the text with PII replaced by tokens
  2. "token_map": an object mapping each token to its original value

Example output format:
{{
  "sanitized_text": "Hello TOKEN_A1B2C3D4, your email TOKEN_E5F6G7H8 is verified.",
  "token_map": {{
    "TOKEN_A1B2C3D4": "John Doe",
    "TOKEN_E5F6G7H8": "john@example.com"
  }}
}}

Text to sanitize:
{text}"""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )

        response_text = response.text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        result = json.loads(response_text)
        sanitized_text = result.get("sanitized_text", text)
        token_map = result.get("token_map", {})

        for token_id, original in token_map.items():
            if not token_id.startswith("TOKEN_"):
                new_token = "TOKEN_" + token_id.upper()
                sanitized_text = sanitized_text.replace(token_id, new_token)
                token_map[new_token] = token_map.pop(token_id)

        return sanitized_text, token_map

    except Exception as e:
        logger.error(f"Gemini sanitization failed: {e}, falling back to regex")
        return tokenize_text(text)


def sanitize_pdf_with_gemini(pdf_bytes: bytes) -> tuple[bytes, dict[str, str], int, float, int]:
    start_time = time.time()
    gemini_calls = 0

    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)
    except Exception as e:
        raise ValueError(f"Failed to open PDF: {e}")

    all_tokens: dict[str, str] = {}

    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out_doc = fitz.open()

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()

            if text.strip():
                sanitized_text, tokens = sanitize_text_with_gemini(text)
                all_tokens.update(tokens)
                if is_gemini_available():
                    gemini_calls += 1

                for original, token in {v: k for k, v in tokens.items()}.items():
                    for rect in page.search_for(original):
                        page.add_redact_annot(rect, fill=(0.8, 0.8, 0.8))
                        page.add_redact_annot(rect, text=token, fontsize=6)
                page.apply_redactions()

            out_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

        sanitized_pdf_bytes = out_doc.write()
        out_doc.close()
        doc.close()

    except Exception as e:
        logger.error(f"PDF processing error: {e}")
        doc.close()
        sanitized_pdf_bytes = pdf_bytes

    processing_time = time.time() - start_time
    return sanitized_pdf_bytes, all_tokens, num_pages, processing_time, gemini_calls
