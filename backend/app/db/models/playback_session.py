# app/db/models/playback_session.py

from sqlalchemy import Column, Integer, Enum, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class PlaybackSession(Base):
    __tablename__ = "playback_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 🔑 REQUIRED
    user_id = Column(Text, nullable=False)

    current_track_id = Column(UUID(as_uuid=True), nullable=True)

    position_ms = Column(Integer, default=0, nullable=False)

    state = Column(
        Enum("playing", "paused", "stopped", name="playback_state"),
        nullable=False,
        default="stopped",
    )

    # 🔁 ONLY loop toggle (logic handled elsewhere)
    loop_queue = Column(Boolean, nullable=False, default=False)

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )