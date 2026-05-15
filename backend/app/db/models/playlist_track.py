# backend/app/db/models/playlist_track.py
import uuid
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    playlist_id = Column(
        UUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
    )

    track_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tracks.id", ondelete="CASCADE"),
        nullable=False,
    )

    # 🔢 order inside playlist
    position = Column(Integer, nullable=False)

    __table_args__ = (
        # ❌ same track cannot appear twice in one playlist
        UniqueConstraint(
            "playlist_id",
            "track_id",
            name="uq_playlist_track_unique",
        ),
    )