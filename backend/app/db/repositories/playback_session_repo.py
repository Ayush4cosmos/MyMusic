from sqlalchemy.orm import Session
from uuid import UUID

from app.db.models.playback_session import PlaybackSession


class PlaybackSessionRepository:
    """
    ONE active playback session (user-scoped later).
    """

    def get_active(self, db: Session) -> PlaybackSession:
        session = db.query(PlaybackSession).first()
        if not session:
            session = PlaybackSession()
            db.add(session)
            db.commit()
            db.refresh(session)
        return session

    def set_track(self, db: Session, track_id: UUID) -> PlaybackSession:
        session = self.get_active(db)
        session.current_track_id = track_id
        session.position_ms = 0
        session.state = "playing"
        db.commit()
        db.refresh(session)
        return session

    def set_state(
        self,
        db: Session,
        *,
        state: str,
        position_ms: int | None = None,
    ) -> PlaybackSession:
        session = self.get_active(db)
        session.state = state
        if position_ms is not None:
            session.position_ms = position_ms
        db.commit()
        db.refresh(session)
        return session

    def stop(self, db: Session) -> PlaybackSession:
        session = self.get_active(db)
        session.state = "stopped"
        session.position_ms = 0
        session.current_track_id = None
        db.commit()
        db.refresh(session)
        return session
    
    def set_loop(self, db: Session, enabled: bool):
        session = self.get_active(db)
        session.loop_queue = enabled
        db.commit()
        db.refresh(session)
        return session

    def is_loop_enabled(self, db: Session) -> bool:
        session = self.get_active(db)
        return bool(session.loop_queue)