# app/db/models/track_storage.py

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class TrackStorage(Base):
    __tablename__ = "track_storage"

    track_id = Column(UUID(as_uuid=True), ForeignKey("tracks.id"), primary_key=True)

    is_available = Column(Boolean, nullable=False, default=False)
    storage_type = Column(String, nullable=False, default="external")  # "external" | "local"
    storage_path = Column(String, nullable=True)

    last_cached_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())