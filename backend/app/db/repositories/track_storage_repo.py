# app/db/repositories/track_storage_repo.py

from datetime import datetime
from sqlalchemy.orm import Session

from app.db.models.track_storage import TrackStorage


class TrackStorageRepository:
    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    def get_by_track_id(self, db: Session, track_id):
        return (
            db.query(TrackStorage)
            .filter(TrackStorage.track_id == track_id)
            .first()
        )

    # -------------------------------------------------
    # UPSERT (used by DownloadManager)
    # -------------------------------------------------
    def upsert(
        self,
        db: Session,
        *,
        track_id,
        is_available: bool,
        storage_type: str,
        storage_path: str,
        last_cached_at=None,
    ):
        storage = self.get_by_track_id(db, track_id)

        if not storage:
            storage = TrackStorage(
                track_id=track_id,
                is_available=is_available,
                storage_type=storage_type,
                storage_path=storage_path,
                last_cached_at=last_cached_at,
            )
            db.add(storage)
        else:
            storage.is_available = is_available
            storage.storage_type = storage_type
            storage.storage_path = storage_path
            storage.last_cached_at = last_cached_at or storage.last_cached_at
            storage.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(storage)
        return storage

    # -------------------------------------------------
    # DELETE (🔥 REQUIRED for failure cleanup)
    # -------------------------------------------------
    def delete_by_track_id(self, db: Session, track_id):
        storage = self.get_by_track_id(db, track_id)
        if storage:
            db.delete(storage)
            db.commit()