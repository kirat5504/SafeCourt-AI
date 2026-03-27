import logging
from ..core.claude import get_claude_client, is_claude_available, CLAUDE_MODEL, CLAUDE_MAX_TOKENS

logger = logging.getLogger(__name__)


DEFENSE_SYSTEM_PROMPT = """You are the Defense Counsel in a case review debate.
Your role: Based ONLY on the sanitized case document provided, argue IN FAVOR of the claims, 
position, or findings presented in the document. Support the position using specific facts 
and evidence referenced in the document.
Speak in 2-3 confident, technical sentences. Reference specific details from the case."""

PROSECUTION_SYSTEM_PROMPT = """You are the Prosecution Counsel in a case review debate.
Your role: Based ONLY on the sanitized case document provided, argue AGAINST the claims, 
position, or findings. Challenge the evidence, identify weaknesses, contradictions, or 
missing information in the document.
Speak in 2-3 assertive sentences. Be specific about what is weak or missing."""

JUDGE_SYSTEM_PROMPT = """You are the presiding Judge in a case review debate.
Your role: After hearing Defense and Prosecution arguments, issue a final balanced verdict.
Assess which side made the stronger case based on the evidence in the document.
State clearly which side prevails and why, referencing specific arguments made.
Speak in 3-4 authoritative sentences."""


def _ask(client, system: str, user: str) -> str:
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


def run_security_debate(
    session_id: str,
    context: str | None = None,
    sanitized_text: str | None = None,
    debate_history: list[dict] | None = None,
) -> tuple[list[dict], str | None]:
    """
    Run a 3-agent debate about the uploaded case.
    - sanitized_text: the full sanitized text of the uploaded document
    - debate_history: previous debate exchanges for this session
    - context: fallback metadata if no sanitized_text available
    """

    if not is_claude_available():
        transcript = [
            {
                "agent": "SYSTEM",
                "text": "Claude API not configured. Please check Replit Anthropic integration setup."
            }
        ]
        return transcript, None

    if not sanitized_text:
        transcript = [
            {
                "agent": "SYSTEM",
                "text": "No case document found. Please upload a case document first to start the debate."
            }
        ]
        return transcript, None

    client = get_claude_client()
    transcript = []

    history_section = ""
    if debate_history:
        lines = [f"{e['agent']}: {e['text']}" for e in debate_history[-6:]]
        history_section = "\n\nPrevious debate context:\n" + "\n".join(lines)

    case_section = f"\n\n--- CASE DOCUMENT (SANITIZED) ---\n{sanitized_text}\n--- END OF CASE DOCUMENT ---"

    defense_prompt = (
        f"You are reviewing the following sanitized case document."
        f"{case_section}"
        f"{history_section}"
        f"\n\nYour task: Argue IN FAVOR of the claims/position in this document."
    )

    try:
        defense_arg = _ask(client, DEFENSE_SYSTEM_PROMPT, defense_prompt)
        transcript.append({"agent": "DefenseCounsel", "text": defense_arg})
    except Exception as e:
        logger.error(f"Defense argument failed: {e}")
        transcript.append({"agent": "DefenseCounsel", "text": "Defense argument unavailable due to API error."})
        defense_arg = "The case document supports the claims made."

    prosecution_prompt = (
        f"You are reviewing the following sanitized case document."
        f"{case_section}"
        f"{history_section}"
        f"\n\nDefense Counsel just argued: \"{defense_arg}\""
        f"\n\nYour task: Argue AGAINST the claims/position in this document. Challenge the defense."
    )

    try:
        prosecution_arg = _ask(client, PROSECUTION_SYSTEM_PROMPT, prosecution_prompt)
        transcript.append({"agent": "ProsecutionCounsel", "text": prosecution_arg})
    except Exception as e:
        logger.error(f"Prosecution argument failed: {e}")
        transcript.append({"agent": "ProsecutionCounsel", "text": "Prosecution argument unavailable due to API error."})
        prosecution_arg = "The case document has significant weaknesses."

    rebuttal_prompt = (
        f"You are reviewing the following sanitized case document."
        f"{case_section}"
        f"{history_section}"
        f"\n\nProsecution Counsel argued: \"{prosecution_arg}\""
        f"\n\nYour task: Rebut the prosecution. Defend the document's position with additional reasoning."
    )

    try:
        rebuttal = _ask(client, DEFENSE_SYSTEM_PROMPT, rebuttal_prompt)
        transcript.append({"agent": "DefenseCounsel", "text": rebuttal})
    except Exception as e:
        logger.error(f"Rebuttal failed: {e}")
        transcript.append({"agent": "DefenseCounsel", "text": "Rebuttal unavailable due to API error."})
        rebuttal = defense_arg

    judge_prompt = (
        f"You have presided over a debate about the following sanitized case document."
        f"{case_section}"
        f"\n\nDefense argued: \"{defense_arg}\""
        f"\nProsecution argued: \"{prosecution_arg}\""
        f"\nDefense rebuttal: \"{rebuttal}\""
        f"\n\nIssue your final verdict:"
    )

    try:
        ruling = _ask(client, JUDGE_SYSTEM_PROMPT, judge_prompt)
        transcript.append({"agent": "Judge", "text": ruling})
    except Exception as e:
        logger.error(f"Judge ruling failed: {e}")
        transcript.append({"agent": "Judge", "text": "Verdict unavailable due to API error."})

    return transcript, sanitized_text
