from app.db.session import get_db
from app.db.models.playback_session import PlaybackSession
from app.services.playback_state_service import playback_state_service


class PlaybackSessionService:
    """
    Represents:
    - current track
    - play / pause state
    - playback position

    IMPORTANT:
    This service is the ONLY place that unlocks autoplay
    via playback_state.can_play
    """

    def get_or_create(self, db, user_id: str) -> PlaybackSession:
        session = (
            db.query(PlaybackSession)
            .filter(PlaybackSession.user_id == user_id)
            .first()
        )

        if not session:
            session = PlaybackSession(
                user_id=user_id,
                state="stopped",
                position_ms=0,
                current_track_id=None,
            )
            db.add(session)
            db.flush()

        return session

    # -------------------------------------------------
    # ▶️ USER INTENT: PLAY
    # -------------------------------------------------
    def play(self, user_id: str, track_id: str):
        state = playback_state_service.get(user_id)
        state["can_play"] = True
        playback_state_service.save(user_id, state)

        db = next(get_db())
        try:
            session = self.get_or_create(db, user_id)
            session.current_track_id = track_id
            session.state = "playing"
            session.position_ms = 0
            db.commit()
            return session
        finally:
            db.close()

    # -------------------------------------------------
    # ⏸ PAUSE (DOES NOT LOCK AUTOPLAY)
    # -------------------------------------------------
    def pause(self, user_id: str, position_ms: int):
        db = next(get_db())
        try:
            session = self.get_or_create(db, user_id)
            session.state = "paused"
            session.position_ms = position_ms
            db.commit()
            return session
        finally:
            db.close()

    # -------------------------------------------------
    # ▶️ RESUME (USER INTENT)
    # -------------------------------------------------
    def resume(self, user_id: str, position_ms: int):
        # 🔓 Resume is also explicit intent
        state = playback_state_service.get(user_id)
        state["can_play"] = True
        playback_state_service.save(user_id, state)

        db = next(get_db())
        try:
            session = self.get_or_create(db, user_id)
            session.state = "playing"
            session.position_ms = position_ms
            db.commit()
            return session
        finally:
            db.close()

    # -------------------------------------------------
    # ⏹ STOP (LOCK AUTOPLAY AGAIN)
    # -------------------------------------------------
    def stop(self, user_id: str):
        """
        Stop resets autoplay permission.
        """
        state = playback_state_service.get(user_id)
        state["can_play"] = False
        playback_state_service.save(user_id, state)

        db = next(get_db())
        try:
            session = self.get_or_create(db, user_id)
            session.state = "stopped"
            session.current_track_id = None
            session.position_ms = 0
            db.commit()
            return session
        finally:
            db.close()


# Singleton
playback_session_service = PlaybackSessionService()