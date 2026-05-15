from abc import ABC, abstractmethod
from typing import List
from app.metadata.track import TrackMetadata


class BaseNormalizer(ABC):
    """
    Converts external API responses into internal metadata objects.
    """

    @abstractmethod
    def normalize_search_results(self, raw: dict) -> List[TrackMetadata]:
        pass
