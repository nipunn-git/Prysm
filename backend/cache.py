import time
import logging
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger("prompthub.cache")

class FastMemoryCache:
    """
    Ultra high-speed in-memory TTL cache for FastAPI endpoints.
    Eliminates remote PostgreSQL round-trips for read operations.
    """
    def __init__(self, default_ttl: int = 30):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if item is not None:
            val, expiry = item
            if time.time() < expiry:
                return val
            # Expired
            self._store.pop(key, None)
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        self._store[key] = (value, time.time() + (ttl or self._default_ttl))

    def invalidate(self, prefix: Optional[str] = None):
        if prefix:
            keys_to_del = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_del:
                self._store.pop(k, None)
        else:
            self._store.clear()

fast_cache = FastMemoryCache()
