# backend/app/services/music_service.py
from collections import defaultdict
from typing import Dict, Set, Optional

from app.db.session import get_db
from app.services.source_manager import SourceManager
from app.models.track import TrackMetadata
from app.db.models.artist import Artist
from app.db.models.track import Track
from app.db.repositories.artist_repo import ArtistRepository
from app.db.repositories.track_repo import TrackRepository
from app.db.repositories.track_artist_repo import TrackArtistRepository
from app.db.repositories.search_history_repo import SearchHistoryRepository

artist_repo = ArtistRepository()
track_repo = TrackRepository()
track_artist_repo = TrackArtistRepository()
search_repo = SearchHistoryRepository()


class MusicService:
    """
    Handles search + metadata persistence.
    NEVER streams audio.
    """

    def __init__(self):
        self.source_manager = SourceManager()

    # -------------------------------------------------
    # HELPERS
    # -------------------------------------------------

    def _normalize_artists(
        self,
        db,
        raw_artists: Optional[dict],
    ) -> Dict[Artist, Set[str]]:
        """
        Normalize JioSaavn artist payload.
        Returns:
            { Artist : {roles} }
        """
        artist_role_map: Dict[Artist, Set[str]] = defaultdict(set)

        if not raw_artists:
            return artist_role_map

        def handle(group, role_override: Optional[str] = None):
            for item in group:
                artist = artist_repo.get_or_create(
                    db,
                    source_artist_id=item.get("id"),
                    name=item.get("name"),
                    image_url=(
                        item.get("image", [{}])[-1].get("url")
                        if item.get("image")
                        else None
                    ),
                )
                role = role_override or item.get("role", "unknown")
                artist_role_map[artist].add(role)

        handle(raw_artists.get("primary", []), "primary")
        handle(raw_artists.get("featured", []), "featured")
        handle(raw_artists.get("all", []))

        return artist_role_map

    def _upsert_track(self, db, raw_track: dict) -> Track:
        """
        Insert track if it does not exist.
        Tracks are unique by (source, source_track_id).
        """
        track = track_repo.get_by_source_id(
            db,
            source="jiosaavn",
            source_track_id=raw_track["id"],
        )
        if track:
            return track

        return track_repo.create(
            db=db,
            source="jiosaavn",
            source_track_id=raw_track["id"],
            title=raw_track["name"],
            duration=raw_track.get("duration"),
        )

    # -------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------

    async def search(self, query: str, user_id: str):
        """
        Search music from external source.
        Persist tracks + artists + roles.
        """
        db = next(get_db())

        try:
            # 1️⃣ Log search
            search_repo.create(
                db=db,
                user_id=user_id,
                query=query,
            )

            # 2️⃣ External search
            source = self.source_manager.get_source("jiosaavn")
            raw_results = await source.search(query)

            results: list[TrackMetadata] = []

            for raw in raw_results:
                artist_role_map = self._normalize_artists(
                    db,
                    raw.get("artists"),
                )

                track = self._upsert_track(db, raw)

                # 🔗 Persist artist ↔ track links
                for artist, roles in artist_role_map.items():
                    track_artist_repo.link(
                        db=db,
                        track_id=track.id,
                        artist_id=artist.id,
                        role=",".join(sorted(roles)),
                    )

                # 🎧 Response (visible artists only)
                display_artists = [
                    artist.name
                    for artist, roles in artist_role_map.items()
                    if {"primary", "featured", "singer"} & roles
                ]

                results.append(
                    TrackMetadata(
                        id=str(track.id),
                        title=track.title,
                        artist=", ".join(display_artists),
                        duration=track.duration,
                        source=track.source,
                    )
                )

            db.commit()
            return results

        finally:
            db.close()