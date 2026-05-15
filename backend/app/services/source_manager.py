# backend/app/services/source_manager.py
from typing import Dict
from app.sources.base import ExternalSourceAdapter
from app.sources.jiosaavn import JioSaavnAdapter


class SourceManager:
    def __init__(self):
        self._sources: Dict[str, ExternalSourceAdapter] = {}

    def get_source(self, source_name: str) -> ExternalSourceAdapter:
        """
        Return adapter for requested source.
        """
        if source_name not in self._sources:
            if source_name == "jiosaavn":
                self._sources[source_name] = JioSaavnAdapter()
            else:
                raise ValueError(f"Unsupported source: {source_name}")

        return self._sources[source_name]