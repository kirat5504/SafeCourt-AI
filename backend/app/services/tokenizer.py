import json
import re
import uuid
from typing import Any
from ..core.security import generate_token_id


PII_PATTERNS: list[tuple[str, str, int]] = [
    ("email", r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 0),
    ("phone", r'(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', 0),
    ("ssn", r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b', 0),
    ("credit_card", r'\b(?:\d{4}[-\s]?){3}\d{4}\b', 0),
    ("ip_address", r'\b(?:\d{1,3}\.){3}\d{1,3}\b', 0),
    ("date", r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', 0),
    ("name", r'\b(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+[A-Z][a-z]+ [A-Z][a-z]+\b', 0),
    ("url", r'https?://[^\s<>"{}|\\^`\[\]]+', 0),
]


def tokenize_text(text: str) -> tuple[str, dict[str, str]]:
    tokens: dict[str, str] = {}
    result = text

    for pii_type, pattern, flags in PII_PATTERNS:
        matches = list(re.finditer(pattern, result, flags | re.IGNORECASE))
        for match in reversed(matches):
            original = match.group()
            if not original.strip():
                continue

            existing_token = next(
                (tok for tok, val in tokens.items() if val == original), None
            )
            if existing_token:
                token_id = existing_token
            else:
                token_id = generate_token_id()
                tokens[token_id] = original

            start, end = match.start(), match.end()
            result = result[:start] + token_id + result[end:]

    return result, tokens


def detokenize_text(text: str, tokens: dict[str, str]) -> str:
    result = text
    for token_id, original in tokens.items():
        result = result.replace(token_id, original)
    return result
