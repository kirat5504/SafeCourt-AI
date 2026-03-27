import logging
import json
from typing import Any
from ..core.config import settings
from ..core.gemini import get_gemini_client, is_gemini_available

logger = logging.getLogger(__name__)


DEFENSE_SYSTEM_PROMPT = """You are the Defense Lawyer AI in a security debate.
Your role: Argue that the tokenized data system is SECURE and cannot be exploited.
You defend the privacy-preserving properties of the tokenization approach.
Be specific about WHY the system is secure.
Speak in 2-3 sentences. Be confident and technical."""

PROSECUTION_SYSTEM_PROMPT = """You are the Prosecution Lawyer AI in a security debate.
Your role: Argue that the tokenized data system has VULNERABILITIES that could be exploited.
You identify weaknesses in the privacy approach.
Be specific about potential attack vectors or information leakage.
Speak in 2-3 sentences. Be aggressive and technical."""

JUDGE_SYSTEM_PROMPT = """You are the Judge AI in a security debate.
Your role: Evaluate the arguments from both Defense and Prosecution.
Give a fair, technical assessment of the security properties.
Issue a brief ruling on which side made the stronger case.
Speak in 3-4 sentences. Be impartial and authoritative."""


def run_security_debate(session_id: str, context: str | None = None) -> tuple[list[dict], str | None]:
    if not is_gemini_available():
        transcript = [
            {
                "agent": "SYSTEM",
                "text": "Gemini API not configured. Please set GEMINI_API_KEY to run the security debate."
            }
        ]
        return transcript, None

    client = get_gemini_client()
    transcript = []

    context_note = f"\nContext about the session being evaluated: {context}" if context else ""

    defense_prompt = f"""You are in a security debate about a tokenization system.
{DEFENSE_SYSTEM_PROMPT}
{context_note}
Opening argument: Why is this tokenization system secure?"""

    try:
        response = client.generate_content(defense_prompt)
        defense_arg = response.text.strip()
        transcript.append({"agent": "DefenseLawyer", "text": defense_arg})
    except Exception as e:
        logger.error(f"Defense argument failed: {e}")
        transcript.append({"agent": "DefenseLawyer", "text": "Defense argument unavailable due to API error."})
        defense_arg = "The system uses strong encryption and tokenization."

    prosecution_prompt = f"""You are in a security debate about a tokenization system.
{PROSECUTION_SYSTEM_PROMPT}
{context_note}
The defense just said: "{defense_arg}"
Respond with your counter-argument: What are the vulnerabilities?"""

    try:
        response = client.generate_content(prosecution_prompt)
        prosecution_arg = response.text.strip()
        transcript.append({"agent": "ProsecutionLawyer", "text": prosecution_arg})
    except Exception as e:
        logger.error(f"Prosecution argument failed: {e}")
        transcript.append({"agent": "ProsecutionLawyer", "text": "Prosecution argument unavailable due to API error."})
        prosecution_arg = "The system may have vulnerabilities in key management."

    rebuttal_prompt = f"""You are in a security debate about a tokenization system.
{DEFENSE_SYSTEM_PROMPT}
{context_note}
Prosecution said: "{prosecution_arg}"
Provide a rebuttal defending the system's security."""

    try:
        response = client.generate_content(rebuttal_prompt)
        rebuttal = response.text.strip()
        transcript.append({"agent": "DefenseLawyer", "text": rebuttal})
    except Exception as e:
        logger.error(f"Rebuttal failed: {e}")
        transcript.append({"agent": "DefenseLawyer", "text": "Rebuttal unavailable due to API error."})
        rebuttal = defense_arg

    judge_prompt = f"""You are the judge in a security debate about a tokenization system.
{JUDGE_SYSTEM_PROMPT}
{context_note}
Defense argued: "{defense_arg}"
Prosecution argued: "{prosecution_arg}"
Defense rebuttal: "{rebuttal}"
Issue your ruling:"""

    try:
        response = client.generate_content(judge_prompt)
        ruling = response.text.strip()
        transcript.append({"agent": "Judge", "text": ruling})
    except Exception as e:
        logger.error(f"Judge ruling failed: {e}")
        transcript.append({"agent": "Judge", "text": "Judgment unavailable due to API error."})

    masked_content = None
    if context:
        masked_content = context

    return transcript, masked_content
