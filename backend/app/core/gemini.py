from .config import settings

_client = None


def get_gemini_client():
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        from google import genai
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def is_gemini_available() -> bool:
    return bool(settings.gemini_api_key)
