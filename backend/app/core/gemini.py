import google.generativeai as genai
from .config import settings

_model = None


def get_gemini_client():
    global _model
    if _model is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel(settings.gemini_model)
    return _model


def is_gemini_available() -> bool:
    return bool(settings.gemini_api_key)
