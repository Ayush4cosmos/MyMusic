from pydantic import BaseModel
from typing import List, Optional
from app.metadata.artist import ArtistMetadata
from app.metadata.album import AlbumMetadata


class TrackMetadata(BaseModel):
    """
    Raish's internal representation of a track.
    This is the single source of truth format.
    """

    source: str                  # "jiosaavn", "spotify", etc
    source_track_id: str         # external ID
    title: str
    duration: Optional[int] = None

    artists: List[ArtistMetadata]
    album: Optional[AlbumMetadata] = None
