import logging
from ..core.claude import get_claude_client, is_claude_available, CLAUDE_MODEL, CLAUDE_MAX_TOKENS

logger = logging.getLogger(__name__)


DEFENSE_SYSTEM_PROMPT = """You are Defense Counsel in an adversarial courtroom debate.

ABSOLUTE RULES — VIOLATIONS WILL INVALIDATE YOUR ARGUMENT:
1. Argue EXCLUSIVELY in favor of the defendant/claimant. You must NEVER concede, agree with Prosecution, or soften your position.
2. Every argument must be EXACTLY 80–90 words. Count carefully. Do not exceed 90. Do not go below 80.
3. Each argument MUST contain ALL FOUR of these elements:
   a) CLAIM — your core legal assertion
   b) REASONING — supporting logic and case-specific facts
   c) LEGAL BASIS — cite a legal principle (e.g., burden of proof, breach of contract, natural justice, duty of care, equity)
   d) ATTACK — identify and directly counter a specific weakness in Prosecution's argument
4. Every new response MUST introduce at least one NEW legal argument or attack a NEW weakness not raised before.
5. NEVER repeat or rephrase a previous argument. NEVER agree or concede.
6. Use only facts from the provided sanitized case document.
7. Do NOT use bullet points, headers, or numbered lists. Write in continuous prose only."""


PROSECUTION_SYSTEM_PROMPT = """You are Prosecution Counsel in an adversarial courtroom debate.

ABSOLUTE RULES — VIOLATIONS WILL INVALIDATE YOUR ARGUMENT:
1. Argue EXCLUSIVELY against the defendant/claimant's position. You must NEVER concede, agree with Defense, or soften your position.
2. Every argument must be EXACTLY 80–90 words. Count carefully. Do not exceed 90. Do not go below 80.
3. Each argument MUST contain ALL FOUR of these elements:
   a) CLAIM — your core legal challenge
   b) REASONING — expose a specific weakness, gap, or contradiction in the case facts
   c) LEGAL BASIS — cite a legal principle (e.g., standard of proof, contributory negligence, foreseeability, causation, contra proferentem)
   d) ATTACK — directly counter a specific assertion made by Defense
4. Every new response MUST introduce at least one NEW legal argument or expose a NEW weakness not previously raised.
5. NEVER repeat or rephrase a previous argument. NEVER agree or concede.
6. Use only facts from the provided sanitized case document.
7. Do NOT use bullet points, headers, or numbered lists. Write in continuous prose only."""


JUDGE_SYSTEM_PROMPT = """You are the presiding Judge issuing a final verdict.

ABSOLUTE RULES:
1. Your entire verdict must be EXACTLY 50–70 words. Count carefully. No more. No less.
2. You must independently evaluate both sides — do NOT copy or paraphrase either agent's words.
3. Your verdict MUST include in order:
   a) One key strength from Defense
   b) One key strength from Prosecution
   c) A comparative evaluation of the two sides
   d) A final decision with clear justification
4. Remain completely neutral until the final decision. Be authoritative, precise, and direct.
5. No preamble, no filler phrases. Every word must serve the verdict."""


def _ask(client, system: str, user: str) -> str:
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


def _build_case_block(sanitized_text: str) -> str:
    return f"\n\n--- CASE DOCUMENT (SANITIZED) ---\n{sanitized_text}\n--- END OF CASE DOCUMENT ---"


def _build_history_block(exchanges: list[tuple[str, str]]) -> str:
    if not exchanges:
        return ""
    lines = [f"{role}: {text}" for role, text in exchanges]
    return "\n\n--- PRIOR DEBATE EXCHANGES ---\n" + "\n\n".join(lines) + "\n--- END OF PRIOR EXCHANGES ---"


def run_security_debate(
    session_id: str,
    context: str | None = None,
    sanitized_text: str | None = None,
    debate_history: list[dict] | None = None,
) -> tuple[list[dict], str | None]:
    """
    Run a strict 3-round adversarial debate with 6 lawyer turns + 1 judge verdict.

    Round 1: Defense opening → Prosecution rebuttal
    Round 2: Defense counter-rebuttal → Prosecution counter-rebuttal
    Round 3: Defense final argument → Prosecution final argument
    Verdict: Judge (50–70 words)
    """

    if not is_claude_available():
        return [{"agent": "SYSTEM", "text": "Claude API not configured. Please check Replit Anthropic integration setup."}], None

    if not sanitized_text:
        return [{"agent": "SYSTEM", "text": "No case document found. Please upload a case document first to start the debate."}], None

    client = get_claude_client()
    transcript: list[dict] = []
    exchanges: list[tuple[str, str]] = []

    case_block = _build_case_block(sanitized_text)

    def defense_turn(instruction: str) -> str:
        history_block = _build_history_block(exchanges)
        prompt = (
            f"You are reviewing the following sanitized case document.{case_block}"
            f"{history_block}"
            f"\n\n{instruction}"
            f"\n\nRemember: Your argument MUST be EXACTLY 80–90 words — no more, no less. "
            f"It MUST include: Claim, Reasoning, Legal Basis, and an Attack on Prosecution. "
            f"Write in continuous prose. Do NOT agree or concede under any circumstances."
        )
        try:
            text = _ask(client, DEFENSE_SYSTEM_PROMPT, prompt)
            transcript.append({"agent": "DefenseCounsel", "text": text})
            exchanges.append(("Defense", text))
            return text
        except Exception as e:
            logger.error(f"Defense turn failed: {e}")
            fallback = "Defense upholds the claims in the document. The evidence on record supports the plaintiff's position under established contract law. Prosecution has not demonstrated any material breach by the defense or identified a single procedural defect. The burden of proof rests with Prosecution, which it has failed to discharge. Defense stands firm."
            transcript.append({"agent": "DefenseCounsel", "text": fallback})
            exchanges.append(("Defense", fallback))
            return fallback

    def prosecution_turn(instruction: str) -> str:
        history_block = _build_history_block(exchanges)
        prompt = (
            f"You are reviewing the following sanitized case document.{case_block}"
            f"{history_block}"
            f"\n\n{instruction}"
            f"\n\nRemember: Your argument MUST be EXACTLY 80–90 words — no more, no less. "
            f"It MUST include: Claim, Reasoning, Legal Basis, and a direct Attack on Defense. "
            f"Write in continuous prose. Do NOT agree or concede under any circumstances."
        )
        try:
            text = _ask(client, PROSECUTION_SYSTEM_PROMPT, prompt)
            transcript.append({"agent": "ProsecutionCounsel", "text": text})
            exchanges.append(("Prosecution", text))
            return text
        except Exception as e:
            logger.error(f"Prosecution turn failed: {e}")
            fallback = "Prosecution challenges the sufficiency of evidence presented. The case document reveals material gaps and contradictions that Defense has conveniently ignored. Under the principle of strict proof, the claimant must establish each element with specificity, which has not occurred here. Defense's narrative selectively omits key facts that undermine the very claims being advanced before this court."
            transcript.append({"agent": "ProsecutionCounsel", "text": fallback})
            exchanges.append(("Prosecution", fallback))
            return fallback

    # ── ROUND 1 ──────────────────────────────────────────────────────────────
    logger.info(f"[{session_id}] Debate Round 1 — Opening Arguments")

    defense_turn(
        "ROUND 1 — OPENING ARGUMENT: Present your strongest opening argument in favor of the claims "
        "in the case document. This is your first statement — establish your core legal position clearly."
    )

    prosecution_turn(
        "ROUND 1 — REBUTTAL: Defense has just made their opening argument (shown above). "
        "Directly rebut Defense's opening position and advance your own challenge to the document's claims. "
        "You must introduce a new angle not merely mirroring what Defense said."
    )

    # ── ROUND 2 ──────────────────────────────────────────────────────────────
    logger.info(f"[{session_id}] Debate Round 2 — Counter-Rebuttals")

    defense_turn(
        "ROUND 2 — COUNTER-REBUTTAL: Prosecution has responded (shown above). "
        "You must counter their rebuttal directly and introduce at least one NEW legal argument "
        "that was not raised in Round 1. Do NOT repeat Round 1 points."
    )

    prosecution_turn(
        "ROUND 2 — COUNTER-REBUTTAL: Defense has responded to your Round 1 rebuttal (shown above). "
        "Counter Defense's new argument and expose a NEW weakness not addressed in Round 1. "
        "Do NOT repeat Round 1 points."
    )

    # ── ROUND 3 ──────────────────────────────────────────────────────────────
    logger.info(f"[{session_id}] Debate Round 3 — Final Arguments")

    defense_turn(
        "ROUND 3 — FINAL ARGUMENT: This is your closing statement. Synthesize your strongest position "
        "from both prior rounds and introduce one final decisive legal point that Prosecution cannot easily refute. "
        "End with a forceful assertion of why the court must rule in your favor."
    )

    prosecution_turn(
        "ROUND 3 — FINAL ARGUMENT: This is your closing statement. Synthesize your strongest challenges "
        "from both prior rounds and introduce one final decisive point that destroys Defense's position. "
        "End with a forceful assertion of why the court must rule against the defendant."
    )

    # ── JUDGE VERDICT ─────────────────────────────────────────────────────────
    logger.info(f"[{session_id}] Judge issuing verdict")

    history_block = _build_history_block(exchanges)
    judge_prompt = (
        f"You have presided over the following three-round adversarial debate about a sanitized case document.{case_block}"
        f"{history_block}"
        f"\n\nAll six arguments above have been heard. Now issue your final verdict."
        f"\n\nYour verdict MUST be EXACTLY 50–70 words. It MUST cover: "
        f"(1) one key Defense strength, (2) one key Prosecution strength, "
        f"(3) a comparative evaluation, (4) a final decision with justification. "
        f"Be completely independent — do not copy either side's phrasing."
    )

    try:
        ruling = _ask(client, JUDGE_SYSTEM_PROMPT, judge_prompt)
        transcript.append({"agent": "Judge", "text": ruling})
    except Exception as e:
        logger.error(f"Judge verdict failed: {e}")
        transcript.append({"agent": "Judge", "text": "Verdict unavailable due to API error."})

    logger.info(f"[{session_id}] Debate complete — {len(transcript)} transcript entries")
    return transcript, sanitized_text
