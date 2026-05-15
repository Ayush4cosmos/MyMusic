# app/services/playback_state_service.py

from typing import Dict
import json

try:
    import redis
except ImportError:
    redis = None


class PlaybackStateService:
    def __init__(self):
        self._memory_store: Dict[str, dict] = {}
        self.redis = None

        if redis:
            try:
                self.redis = redis.Redis(
                    host="localhost",
                    port=6379,
                    decode_responses=True,
                )
                self.redis.ping()
            except Exception:
                self.redis = None

    def _key(self, user_id: str) -> str:
        return f"playback:state:{user_id}"

    def _fresh_state(self) -> dict:
        return {
            "temp_list": [],
            "queue_snapshot": [],
            "history": [],
            "loop_mode": "off",
            "state": "stopped",
            "position_ms": 0,
            "can_play": False,  # 🔑 DEFAULT: NEVER AUTOPLAY
        }

    def get(self, user_id: str) -> dict:
        if self.redis:
            raw = self.redis.get(self._key(user_id))
            if raw:
                return json.loads(raw)

        if user_id not in self._memory_store:
            self._memory_store[user_id] = self._fresh_state()

        return self._memory_store[user_id]

    def save(self, user_id: str, state: dict):
        if self.redis:
            self.redis.set(self._key(user_id), json.dumps(state))
        else:
            self._memory_store[user_id] = state

    def clear(self, user_id: str):
        if self.redis:
            self.redis.delete(self._key(user_id))
        self._memory_store.pop(user_id, None)

    # -------------------------------------------------
    # 🔥 PLAY PERMISSION HELPERS (CRITICAL)
    # -------------------------------------------------
    def allow_play(self, user_id: str):
        state = self.get(user_id)
        state["can_play"] = True
        self.save(user_id, state)

    def deny_play(self, user_id: str):
        state = self.get(user_id)
        state["can_play"] = False
        self.save(user_id, state)


playback_state_service = PlaybackStateService()