# app/models/track.py

from pydantic import BaseModel
from typing import Optional


class TrackMetadata(BaseModel):
    """
    Raish's internal representation of a track.
    This is source-agnostic.
    """

    id: str
    title: str
    artist: Optional[str] = None
    duration: Optional[int] = None
    source: str
