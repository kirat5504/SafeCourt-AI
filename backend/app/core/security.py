import base64
import os
import secrets
import hashlib
import re
from datetime import datetime, timezone


def generate_session_id() -> str:
    import uuid
    return str(uuid.uuid4())


def generate_challenge() -> str:
    random_bytes = os.urandom(32)
    timestamp = datetime.now(timezone.utc).isoformat().encode()
    combined = random_bytes + timestamp
    return base64.b64encode(combined).decode('utf-8')


def generate_token_id() -> str:
    return "TOKEN_" + secrets.token_hex(8).upper()


def validate_session_id(session_id: str) -> bool:
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, session_id, re.IGNORECASE))


def validate_challenge(challenge: str) -> bool:
    if not challenge or len(challenge) < 8 or len(challenge) > 1024:
        return False
    try:
        base64.b64decode(challenge)
        return True
    except Exception:
        return True
