import logging
from ..core.claude import get_claude_client, is_claude_available, CLAUDE_MODEL, CLAUDE_MAX_TOKENS

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


def _ask(client, system: str, user: str) -> str:
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


def run_security_debate(session_id: str, context: str | None = None) -> tuple[list[dict], str | None]:
    if not is_claude_available():
        transcript = [
            {
                "agent": "SYSTEM",
                "text": "Claude API not configured. Please check Replit Anthropic integration setup."
            }
        ]
        return transcript, None

    client = get_claude_client()
    transcript = []

    context_note = f"\nContext about the session being evaluated: {context}" if context else ""

    defense_user = f"""You are in a security debate about a tokenization system.
{context_note}
Opening argument: Why is this tokenization system secure?"""

    try:
        defense_arg = _ask(client, DEFENSE_SYSTEM_PROMPT, defense_user)
        transcript.append({"agent": "DefenseLawyer", "text": defense_arg})
    except Exception as e:
        logger.error(f"Defense argument failed: {e}")
        transcript.append({"agent": "DefenseLawyer", "text": "Defense argument unavailable due to API error."})
        defense_arg = "The system uses strong encryption and tokenization."

    prosecution_user = f"""You are in a security debate about a tokenization system.
{context_note}
The defense just said: "{defense_arg}"
Respond with your counter-argument: What are the vulnerabilities?"""

    try:
        prosecution_arg = _ask(client, PROSECUTION_SYSTEM_PROMPT, prosecution_user)
        transcript.append({"agent": "ProsecutionLawyer", "text": prosecution_arg})
    except Exception as e:
        logger.error(f"Prosecution argument failed: {e}")
        transcript.append({"agent": "ProsecutionLawyer", "text": "Prosecution argument unavailable due to API error."})
        prosecution_arg = "The system may have vulnerabilities in key management."

    rebuttal_user = f"""You are in a security debate about a tokenization system.
{context_note}
Prosecution said: "{prosecution_arg}"
Provide a rebuttal defending the system's security."""

    try:
        rebuttal = _ask(client, DEFENSE_SYSTEM_PROMPT, rebuttal_user)
        transcript.append({"agent": "DefenseLawyer", "text": rebuttal})
    except Exception as e:
        logger.error(f"Rebuttal failed: {e}")
        transcript.append({"agent": "DefenseLawyer", "text": "Rebuttal unavailable due to API error."})
        rebuttal = defense_arg

    judge_user = f"""You are the judge in a security debate about a tokenization system.
{context_note}
Defense argued: "{defense_arg}"
Prosecution argued: "{prosecution_arg}"
Defense rebuttal: "{rebuttal}"
Issue your ruling:"""

    try:
        ruling = _ask(client, JUDGE_SYSTEM_PROMPT, judge_user)
        transcript.append({"agent": "Judge", "text": ruling})
    except Exception as e:
        logger.error(f"Judge ruling failed: {e}")
        transcript.append({"agent": "Judge", "text": "Judgment unavailable due to API error."})

    masked_content = context if context else None
    return transcript, masked_content
