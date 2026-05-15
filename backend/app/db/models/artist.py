from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import uuid

class Artist(Base):
    __tablename__ = "artists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 🔑 source-aware identity
    source_artist_id = Column(String, nullable=False, unique=True)

    name = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    dominant_language = Column(String, nullable=True)
