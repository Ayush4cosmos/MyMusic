from pydantic import BaseModel


class ArtistMetadata(BaseModel):
    """
    Source-agnostic artist representation
    """
    name: str
