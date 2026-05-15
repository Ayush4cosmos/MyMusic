# app/services/search_cache.py

from typing import Dict

class SearchCache:
    """
    Search-session cache.
    - Cleared ONLY when a new /search happens
    - No TTL
    - No DB writes
    """

    def __init__(self):
        self._store: Dict[str, dict] = {}

    def clear(self):
        self._store.clear()

    def set(self, key: str, value: dict):
        self._store[key] = value

    def get(self, key: str) -> dict | None:
        return self._store.get(key)

    def delete(self, key: str):
        self._store.pop(key, None)


search_cache = SearchCache()