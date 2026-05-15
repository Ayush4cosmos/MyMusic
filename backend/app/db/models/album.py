import uuid
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Album(Base):
    __tablename__ = "albums"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_album_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    release_year = Column(Integer)
    language = Column(String, nullable=True)
    explicit_content = Column(Boolean, nullable=True)
    image_url = Column(String, nullable=True)
