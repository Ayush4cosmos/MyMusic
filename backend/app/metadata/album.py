from pydantic import BaseModel
from typing import Optional


class AlbumMetadata(BaseModel):
    """
    Source-agnostic album representation
    """
    title: str
    release_year: Optional[int] = None
