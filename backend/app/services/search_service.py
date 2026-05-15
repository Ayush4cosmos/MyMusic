# app/services/search_service.py

import math
from typing import List, Dict
from app.services.source_manager import SourceManager
from app.normalizers.search_normalizer import canonical_key
from app.services.search_cache import search_cache


class SearchService:
    def __init__(self):
        self.source_manager = SourceManager()

    # -------------------------------------------------
    # PUBLIC SEARCH API
    # -------------------------------------------------
    async def search(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Search songs (external-first).

        Guarantees:
        - No DB writes
        - No UUID creation
        - Ranked purely by popularity
        - Cache survives until NEXT search
        """

        # 🔥 NEW SEARCH = RESET SEARCH CONTEXT
        search_cache.clear()

        source = self.source_manager.get_source("jiosaavn")
        raw_results = await source.search(query)

        ranked = self._rank(raw_results)[:limit]

        # 🔐 Cache promotable metadata (session-scoped)
        for r in ranked:
            cache_key = f"{r['source']}:{r['id']}"
            search_cache.set(
                cache_key,
                {
                    "source": r["source"],
                    "source_track_id": r["id"],
                    "title": r["title"],
                    "duration": r["duration"],
                    "image_url": r.get("image_url"),
                    "album": r.get("album"),
                    "artists": r.get("artists"),
                },
            )

        return ranked

    # -------------------------------------------------
    # RANKING LOGIC (SIMPLE & FINAL)
    # -------------------------------------------------
    def _rank(self, results: List[Dict]) -> List[Dict]:
        """
        FINAL ranking rule:
        score = log10(playCount + 1)
        """

        buckets: Dict[str, Dict] = {}

        for r in results:
            title = r.get("title", "")
            artist = r.get("artist", "")
            play_count = r.get("playCount") or 0  # None-safe

            key = canonical_key(title, artist)
            score = math.log10(play_count + 1)

            if key not in buckets or score > buckets[key]["_score"]:
                r_copy = r.copy()
                r_copy["_score"] = score
                buckets[key] = r_copy

        ranked = sorted(
            buckets.values(),
            key=lambda x: x["_score"],
            reverse=True,
        )

        # Cleanup
        for r in ranked:
            r.pop("_score", None)

        return ranked

    async def search_artists(self, query: str, limit: int = 20) -> List[Dict]:
        source = self.source_manager.get_source("jiosaavn")
        return await source.search_artists(query, limit=limit)

    async def search_albums(self, query: str, limit: int = 20) -> List[Dict]:
        source = self.source_manager.get_source("jiosaavn")
        return await source.search_albums(query, limit=limit)

    async def get_album(self, album_id: str) -> Dict:
        source = self.source_manager.get_source("jiosaavn")
        return await source.get_album(album_id)

    async def get_artist_songs(self, artist_id: str) -> Dict:
        source = self.source_manager.get_source("jiosaavn")
        return await source.get_artist_songs(
            artist_id,
            page=0,
            sort_by="popularity",
            sort_order="desc",
        )
