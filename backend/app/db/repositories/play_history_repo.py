from sqlalchemy.orm import Session
from app.db.models.play_history import PlayHistory


class PlayHistoryRepository:
    def create(
        self,
        db: Session,
        track_id,
        user_id: str,
    ) -> PlayHistory:
        play = PlayHistory(
            track_id=track_id,
            user_id=user_id,
        )
        db.add(play)
        db.commit()
        db.refresh(play)
        return play