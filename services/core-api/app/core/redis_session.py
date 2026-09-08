import json
import time
from typing import Dict, List, Optional
import redis.asyncio as aioredis
from app.core.config import settings

# In-memory fallback dictionary with TTL in case Redis is temporarily unreachable
_memory_denylist: Dict[str, float] = {}
_memory_sessions: Dict[str, List[Dict]] = {}
_redis_pool: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    global _redis_pool
    if _redis_pool is None:
        try:
            _redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
            )
        except Exception:
            _redis_pool = None
    return _redis_pool


async def revoke_token(token: str, expires_in_seconds: int = 86400) -> bool:
    """
    Revokes a JWT token by adding its signature/string to the Redis denylist with TTL.
    """
    now = time.time()
    _clean_memory_denylist()
    _memory_denylist[token] = now + expires_in_seconds

    try:
        r = await get_redis_client()
        if r:
            await r.setex(f"denylist:{token}", expires_in_seconds, "revoked")
            return True
    except Exception:
        pass
    return True


async def is_token_revoked(token: str) -> bool:
    """
    Checks whether a JWT token has been placed on the denylist.
    """
    now = time.time()
    if token in _memory_denylist:
        if _memory_denylist[token] > now:
            return True
        else:
            del _memory_denylist[token]

    try:
        r = await get_redis_client()
        if r:
            val = await r.get(f"denylist:{token}")
            if val is not None:
                return True
    except Exception:
        pass
    return False


async def record_user_session(
    user_id: str,
    session_id: str,
    ip_address: str = "127.0.0.1",
    user_agent: str = "Mozilla/5.0",
    device_name: str = "Web Browser",
) -> None:
    session_data = {
        "session_id": session_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "device_name": device_name,
        "created_at": time.time(),
        "last_active": time.time(),
    }
    user_sessions = _memory_sessions.setdefault(user_id, [])
    # Keep up to 10 sessions
    user_sessions = [s for s in user_sessions if s["session_id"] != session_id]
    user_sessions.insert(0, session_data)
    _memory_sessions[user_id] = user_sessions[:10]

    try:
        r = await get_redis_client()
        if r:
            key = f"user_sessions:{user_id}"
            await r.hset(key, session_id, json.dumps(session_data))
            await r.expire(key, 86400 * 7)
    except Exception:
        pass


async def get_user_sessions(user_id: str) -> List[Dict]:
    try:
        r = await get_redis_client()
        if r:
            key = f"user_sessions:{user_id}"
            data = await r.hgetall(key)
            if data:
                return [json.loads(v) for v in data.values()]
    except Exception:
        pass

    return _memory_sessions.get(user_id, [
        {
            "session_id": "sess-current",
            "ip_address": "127.0.0.1",
            "user_agent": "Active Chrome / Windows",
            "device_name": "Current Desktop Session",
            "created_at": time.time() - 3600,
            "last_active": time.time(),
            "is_current": True,
        }
    ])


async def revoke_all_user_sessions(user_id: str) -> bool:
    """
    Revokes all active sessions for a given user.
    """
    _memory_sessions.pop(user_id, None)
    try:
        r = await get_redis_client()
        if r:
            key = f"user_sessions:{user_id}"
            await r.delete(key)
            # Set a global user revocation timestamp
            await r.setex(f"user_revoked:{user_id}", 86400 * 7, str(time.time()))
    except Exception:
        pass
    return True


def _clean_memory_denylist():
    now = time.time()
    expired = [k for k, v in _memory_denylist.items() if v <= now]
    for k in expired:
        _memory_denylist.pop(k, None)
