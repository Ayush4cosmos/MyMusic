from uuid import UUID
from typing import Optional, List
from sqlalchemy.orm import Session

from app.db.models.track import Track
from app.db.models.track_storage import TrackStorage


class TrackRepository:
    """
    Track repository.

    Responsibilities:
    - Read tracks by UUID
    - Read tracks by (source, source_track_id)
    - Create new track entries (catalog only)
    """

    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    def get_by_id(
        self,
        db: Session,
        track_id: str | UUID,
    ) -> Optional[Track]:
        return (
            db.query(Track)
            .filter(Track.id == track_id)
            .first()
        )

    def get_by_ids(
        self,
        db: Session,
        track_ids: List[str],
    ) -> list[Track]:
        if not track_ids:
            return []

        return (
            db.query(Track)
            .filter(Track.id.in_(track_ids))
            .all()
        )

    def get_by_source_id(
        self,
        db: Session,
        source: str,
        source_track_id: str,
    ) -> Optional[Track]:
        return (
            db.query(Track)
            .filter(
                Track.source == source,
                Track.source_track_id == source_track_id,
            )
            .first()
        )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------
    def create(
        self,
        db: Session,
        *,
        source: str,
        source_track_id: str,
        title: str,
        duration: Optional[int],
        image_url: Optional[str] = None,
        album_id: Optional[str] = None,
    ) -> Track:
        """
        Create a catalog entry.

        IMPORTANT:
        - This does NOT mean audio exists
        - Storage availability is tracked separately
        - Always creates a TrackStorage entry with default values (external, not available)
        """
        track = Track(
            source=source,
            source_track_id=source_track_id,
            title=title,
            duration=duration,
            image_url=image_url,
            album_id=album_id,
        )
        db.add(track)
        db.commit()
        db.refresh(track)
        
        # Create default storage entry (external, not available)
        storage = TrackStorage(
            track_id=track.id,
            storage_type="external",
            is_available=False,
        )
        db.add(storage)
        db.commit()
        
        return track

    def update_metadata(
        self,
        db: Session,
        *,
        track: Track,
        title: Optional[str] = None,
        duration: Optional[int] = None,
        image_url: Optional[str] = None,
        album_id: Optional[str] = None,
    ) -> Track:
        updated = False

        if title and (not track.title):
            track.title = title
            updated = True

        if duration and not track.duration:
            track.duration = duration
            updated = True

        if image_url and not track.image_url:
            track.image_url = image_url
            updated = True

        if album_id and not track.album_id:
            track.album_id = album_id
            updated = True

        if updated:
            db.commit()
            db.refresh(track)

        return track
