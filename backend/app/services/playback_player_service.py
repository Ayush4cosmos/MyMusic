# app/services/playback_player_service.py
from app.services.playback_state_service import playback_state_service


class PlaybackPlayerService:
    def play(self, user_id: str, track_id: str):
        state = playback_state_service.get(user_id)
        state["current_track_id"] = track_id
        state["state"] = "playing"
        state["position_ms"] = 0
        playback_state_service.save(user_id, state)

    def pause(self, user_id: str, position_ms: int):
        state = playback_state_service.get(user_id)
        state["state"] = "paused"
        state["position_ms"] = position_ms
        playback_state_service.save(user_id, state)

    def resume(self, user_id: str, position_ms: int):
        state = playback_state_service.get(user_id)
        state["state"] = "playing"
        state["position_ms"] = position_ms
        playback_state_service.save(user_id, state)

    def stop(self, user_id: str):
        state = playback_state_service.get(user_id)
        state["state"] = "stopped"
        state["current_track_id"] = None
        state["position_ms"] = 0
        playback_state_service.save(user_id, state)

    def progress(self, user_id: str, position_ms: int):
        state = playback_state_service.get(user_id)
        state["position_ms"] = position_ms
        playback_state_service.save(user_id, state)


playback_player_service = PlaybackPlayerService()