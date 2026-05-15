# backend/app/services/catalog_service.py
from sqlalchemy.orm import Session

from app.db.models.track import Track
from app.db.models.artist import Artist
from app.db.models.album import Album
from app.db.models.track_artist import TrackArtist
from app.db.models.track_storage import TrackStorage

from app.db.repositories.track_repo import TrackRepository
from app.db.repositories.artist_repo import ArtistRepository
from app.db.repositories.album_repo import AlbumRepository
from app.db.repositories.track_storage_repo import TrackStorageRepository


class CatalogService:
    """
    Responsible for:
    - Creating / updating track metadata (catalog)
    - Maintaining stable UUID identity
    - Managing artist & album relations
    - Initializing storage state (EXTERNAL by default)
    """

    def __init__(self):
        self.track_repo = TrackRepository()
        self.artist_repo = ArtistRepository()
        self.album_repo = AlbumRepository()
        self.storage_repo = TrackStorageRepository()

    def catalog_track(self, db: Session, raw: dict) -> Track:
        """
        Catalog a track using SOURCE + SOURCE_TRACK_ID as identity.

        Expected raw format:
        {
            "source": "jiosaavn",
            "source_track_id": "pizXlfUB",
            "title": "Blinding Lights",
            "duration": 201,
            "artists": ["The Weeknd"],
            "album": {
                "title": "After Hours",
                "release_year": 2020
            }
        }
        """

        # 1️⃣ Track identity (UPSERT by source + source_track_id)
        track = self.track_repo.get_by_source(
            db,
            source=raw["source"],
            source_track_id=raw["source_track_id"],
        )

        if not track:
            track = Track(
                source=raw["source"],
                source_track_id=raw["source_track_id"],
                title=raw["title"],
                duration=raw.get("duration"),
            )
            db.add(track)
            db.commit()
            db.refresh(track)

        # 2️⃣ Album (optional)
        album_data = raw.get("album")
        if album_data:
            album = self.album_repo.get_or_create(
                db,
                title=album_data["title"],
                release_year=album_data.get("release_year"),
                source_album_id=album_data.get("id"),
                language=album_data.get("language"),
                explicit_content=album_data.get("explicit_content"),
                image_url=album_data.get("image_url"),
            )
            track.album_id = album.id
            db.commit()

        # 3️⃣ Artists (many-to-many)
        for artist_name in raw.get("artists", []):
            artist = self.artist_repo.get_or_create(db, name=artist_name)

            exists = (
                db.query(TrackArtist)
                .filter_by(track_id=track.id, artist_id=artist.id)
                .first()
            )

            if not exists:
                db.add(
                    TrackArtist(
                        track_id=track.id,
                        artist_id=artist.id,
                    )
                )

        db.commit()

        # 4️⃣ Storage state (default = EXTERNAL)
        storage = self.storage_repo.get_by_track_id(db, track.id)

        if not storage:
            storage = TrackStorage(
                track_id=track.id,
                is_available=False,
                storage_type="external",
                storage_path=None,
            )
            db.add(storage)
            db.commit()

        return track
