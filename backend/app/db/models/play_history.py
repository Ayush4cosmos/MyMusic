from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class PlayHistory(Base):
    __tablename__ = "play_history"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(String, nullable=False)
    track_id = Column(UUID(as_uuid=True), ForeignKey("tracks.id"))
    played_at = Column(DateTime(timezone=True), server_default=func.now())