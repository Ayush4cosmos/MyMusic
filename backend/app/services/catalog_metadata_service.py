# app/services/catalog_metadata_service.py
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.db.repositories.track_repo import TrackRepository
from app.db.repositories.album_repo import AlbumRepository
from app.db.repositories.artist_repo import ArtistRepository
from app.db.repositories.track_artist_repo import TrackArtistRepository


class CatalogMetadataService:
    """
    Persist metadata for cataloged tracks only.

    Expected meta shape (best-effort):
    {
        "source": "jiosaavn",
        "source_track_id": "abc123",
        "title": "Song",
        "duration": 200,
        "image_url": "https://...",
        "album": {
            "id": "123",
            "name": "Album",
            "year": 2020,
            "language": "english",
            "explicit_content": False,
            "image_url": "https://..."
        },
        "artists": [
            {"id": "1", "name": "Artist", "role": "primary", "image_url": "https://..."}
        ]
    }
    """

    def __init__(self):
        self.track_repo = TrackRepository()
        self.album_repo = AlbumRepository()
        self.artist_repo = ArtistRepository()
        self.track_artist_repo = TrackArtistRepository()

    def _flatten_artists(self, artists: Any) -> List[Dict[str, Any]]:
        if not artists:
            return []

        flattened: list[dict] = []
        seen_ids: set[str] = set()

        def add_artist(item: Dict[str, Any], role_override: str | None = None):
            artist_id = item.get("id")
            if not artist_id or artist_id in seen_ids:
                return
            seen_ids.add(artist_id)
            flattened.append({
                "id": artist_id,
                "name": item.get("name"),
                "role": role_override or item.get("role"),
                "image_url": item.get("image_url") or (
                    item.get("image", [{}])[-1].get("url")
                    if item.get("image")
                    else None
                ),
            })

        if isinstance(artists, dict):
            for item in artists.get("primary", []) or []:
                add_artist(item, "primary")
            for item in artists.get("featured", []) or []:
                add_artist(item, "featured")
            for item in artists.get("all", []) or []:
                add_artist(item)
        elif isinstance(artists, list):
            for item in artists:
                if isinstance(item, dict):
                    add_artist(item)

        return flattened

    def upsert_from_meta(self, db: Session, meta: Dict[str, Any]):
        if not meta:
            return None

        source = meta.get("source") or "jiosaavn"
        source_track_id = meta.get("source_track_id") or meta.get("id")
        title = meta.get("title") or meta.get("name")
        duration = meta.get("duration")
        image_url = meta.get("image_url")

        if not source_track_id or not title:
            return None

        album_meta = meta.get("album") or {}
        album_id = None
        if album_meta and (album_meta.get("id") or album_meta.get("name")):
            album = self.album_repo.get_or_create(
                db,
                title=album_meta.get("name") or album_meta.get("title") or "Unknown album",
                release_year=album_meta.get("year"),
                source_album_id=album_meta.get("id"),
                language=album_meta.get("language"),
                explicit_content=album_meta.get("explicit_content"),
                image_url=album_meta.get("image_url"),
            )
            album_id = album.id

        track = self.track_repo.get_by_source_id(
            db,
            source=source,
            source_track_id=source_track_id,
        )

        if not track:
            track = self.track_repo.create(
                db=db,
                source=source,
                source_track_id=source_track_id,
                title=title,
                duration=duration,
                image_url=image_url,
                album_id=album_id,
            )
        else:
            self.track_repo.update_metadata(
                db=db,
                track=track,
                title=title,
                duration=duration,
                image_url=image_url,
                album_id=album_id,
            )

        artists = self._flatten_artists(meta.get("artists"))
        for artist in artists:
            if not artist.get("id") or not artist.get("name"):
                continue
            artist_row = self.artist_repo.get_or_create(
                db,
                source_artist_id=artist["id"],
                name=artist["name"],
                image_url=artist.get("image_url"),
                dominant_language=artist.get("dominant_language"),
            )
            role = artist.get("role") or "unknown"
            self.track_artist_repo.link(
                db=db,
                track_id=track.id,
                artist_id=artist_row.id,
                role=role,
            )

        db.commit()
        return track


catalog_metadata_service = CatalogMetadataService()
