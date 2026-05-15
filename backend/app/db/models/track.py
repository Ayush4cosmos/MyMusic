import uuid
from sqlalchemy import Column, String, Integer, DateTime, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # External identity
    source = Column(String, nullable=False)
    source_track_id = Column(String, nullable=False)

    # Metadata
    title = Column(String, nullable=False)
    duration = Column(Integer)
    image_url = Column(String, nullable=True)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("source", "source_track_id", name="uq_track_source"),
    )
