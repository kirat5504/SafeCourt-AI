import os
import anthropic as _anthropic
from .config import settings

_client = None


def get_claude_client() -> _anthropic.Anthropic:
    global _client
    if _client is None:
        base_url = os.getenv("AI_INTEGRATIONS_ANTHROPIC_BASE_URL")
        api_key = os.getenv("AI_INTEGRATIONS_ANTHROPIC_API_KEY")
        if not base_url or not api_key:
            raise RuntimeError("Anthropic integration env vars not set")
        _client = _anthropic.Anthropic(api_key=api_key, base_url=base_url)
    return _client


def is_claude_available() -> bool:
    return bool(
        os.getenv("AI_INTEGRATIONS_ANTHROPIC_BASE_URL")
        and os.getenv("AI_INTEGRATIONS_ANTHROPIC_API_KEY")
    )


CLAUDE_MODEL = "claude-haiku-4-5"
CLAUDE_MAX_TOKENS = 2048
