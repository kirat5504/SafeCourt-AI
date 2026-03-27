import logging
from .config import settings

logger = logging.getLogger(__name__)

_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
            client.ping()
            _redis_client = client
            logger.info("Connected to Redis")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}), using fakeredis")
            try:
                import fakeredis
                _redis_client = fakeredis.FakeRedis(decode_responses=True)
                logger.info("Using fakeredis (in-memory)")
            except ImportError:
                logger.warning("fakeredis not installed, rate limiting disabled")
                _redis_client = None
    return _redis_client
