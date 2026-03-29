"""
Case input validation — fast heuristic gatekeeper.
Runs before any LLM calls to reject obviously invalid or trivial inputs.
"""
import re

LEGAL_SIGNALS = {
    'plaintiff', 'defendant', 'claimant', 'respondent', 'claim', 'claims',
    'dispute', 'disputed', 'contract', 'breach', 'breached', 'agreement',
    'damages', 'injury', 'injuries', 'alleges', 'alleged', 'allegation',
    'liability', 'liable', 'negligence', 'negligent', 'violation', 'violated',
    'eviction', 'lawsuit', 'litigation', 'sues', 'sued', 'action', 'proceedings',
    'court', 'legal', 'filed', 'filing', 'employment', 'termination', 'terminated',
    'harassment', 'discrimination', 'discriminatory', 'fraud', 'fraudulent',
    'misrepresentation', 'debt', 'payment', 'unpaid', 'settlement', 'compensatory',
    'compensation', 'wrongful', 'tort', 'statute', 'regulation', 'seeking',
    'relief', 'injunction', 'ruling', 'verdict', 'hearing', 'trial', 'appeal',
    'counsel', 'attorney', 'represented', 'representing', 'civil', 'criminal',
    'property', 'landlord', 'tenant', 'employer', 'employee', 'shareholders',
    'corporation', 'partnership', 'contract', 'obligations', 'terms', 'agreement',
    'notice', 'served', 'evidence', 'witness', 'testimony', 'deposition',
    'complaint', 'petition', 'motion', 'judgment', 'order', 'decree',
    'intellectual', 'patent', 'copyright', 'trademark', 'infringement',
    'defamation', 'libel', 'slander', 'assault', 'battery', 'trespass',
    'warranty', 'guarantee', 'indemnity', 'insurance', 'policy', 'coverage',
    'incident', 'accident', 'collision', 'malpractice', 'misconduct',
}

TRIVIAL_STARTERS = {
    'hey', 'hi', 'hello', 'test', 'testing', 'yo', 'sup', 'greetings',
    'what', 'why', 'how', 'lol', 'ok', 'okay', 'sure', 'hmm', 'um',
}

MIN_WORD_COUNT = 30
MIN_SIGNAL_COUNT = 2


def validate_case_input(text: str) -> tuple[bool, str]:
    """
    Validate that the provided text represents a genuine legal case.

    Returns:
        (True, '') if valid.
        (False, rejection_reason) if invalid.
    """
    if not text or not text.strip():
        return False, (
            "No input provided. Please submit a complete legal case description "
            "including the parties, facts, and nature of the dispute."
        )

    clean = text.strip()
    words = re.findall(r'\b\w+\b', clean)
    word_count = len(words)

    if word_count < MIN_WORD_COUNT:
        return False, (
            f"Case description too brief ({word_count} words). "
            f"Please provide at least {MIN_WORD_COUNT} words covering the parties, "
            "facts, and the nature of the dispute."
        )

    lower_words = {w.lower() for w in words}

    first_word = words[0].lower() if words else ''
    if first_word in TRIVIAL_STARTERS:
        return False, (
            "Input does not appear to be a legal case. "
            "Please provide a structured case description with parties, facts, and a legal dispute."
        )

    signal_count = len(lower_words & LEGAL_SIGNALS)
    if signal_count < MIN_SIGNAL_COUNT:
        return False, (
            "Input lacks legal context. "
            "Please include identifiable parties (plaintiff/defendant), relevant facts, "
            "and the nature of the legal dispute or claim."
        )

    alpha_words = [w for w in words if w.isalpha()]
    if len(alpha_words) < MIN_WORD_COUNT * 0.5:
        return False, (
            "Input appears to contain insufficient textual content. "
            "Please provide a readable case description in plain text."
        )

    return True, ''
