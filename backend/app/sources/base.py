from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class ExternalSourceAdapter(ABC):
    """
    Contract for any external music source.

    Raish backend MUST talk only to this interface.
    Any source (JioSaavn, Spotify, local files, etc.)
    must implement this.
    """

    @abstractmethod
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for tracks by query.

        Returns:
            A list of normalized track metadata dictionaries.
        """
        pass

    @abstractmethod
    async def stream(self, track_id: str, range_header: Optional[str]):
        """
        Stream audio bytes for a track.

        Args:
            track_id: Source-specific track identifier
            range_header: HTTP Range header from client (if any)

        Returns:
            An HTTP response-like object with audio bytes.
        """
        pass
