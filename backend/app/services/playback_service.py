# app/services/playback_service.py

from fastapi import HTTPException
from app.db.session import get_db
from app.db.repositories.track_repo import TrackRepository
from app.db.repositories.track_storage_repo import TrackStorageRepository
from app.services.download_manager import DownloadManager

class PlaybackService:
    def __init__(self):
        self.track_repo = TrackRepository()
        self.storage_repo = TrackStorageRepository()
        self.downloader = DownloadManager()

    # -------------------------------------------------
    # UUID-BASED PREPARE
    # -------------------------------------------------
    async def prepare(self, track_id: str) -> None:
        """
        Prepare an already-cataloged track for playback.
        Assumes metadata already exists (via /search).
        """

        db = next(get_db())
        try:
            track = self.track_repo.get_by_id(db, track_id)
            if not track:
                raise HTTPException(404, "Track not found")

            storage = self.storage_repo.get_by_track_id(db, track.id)
            if storage and storage.storage_type == "local":
                return
        finally:
            db.close()

        # Download audio if missing
        try:
            await self.downloader.ensure_download(track)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Playback preparation failed: {e}",
            )

        # Verify
        db = next(get_db())
        try:
            storage = self.storage_repo.get_by_track_id(db, track.id)
            if not storage or storage.storage_type != "local":
                raise HTTPException(
                    status_code=500,
                    detail="Track download did not complete",
                )
        finally:
            db.close()

    # -------------------------------------------------
    # PREFETCH (BEST-EFFORT)
    # -------------------------------------------------
    async def prefetch(self, track_id: str) -> None:
        """
        Best-effort prefetch for upcoming playback.
        Never raises to avoid blocking active playback.
        """
        if not track_id:
            return

        try:
            await self.prepare(track_id)
        except Exception:
            return

    # -------------------------------------------------
    # SOURCE-BASED PREPARE
    # -------------------------------------------------
    async def prepare_from_source(
        self,
        *,
        source: str,
        source_track_id: str,
        title: str,
        duration: int | None,
    ) -> str:
        """
        Promote external track into system.
        Metadata MUST already be cached via /search.
        """

        db = next(get_db())
        try:
            track = self.track_repo.get_by_source_id(
                db,
                source=source,
                source_track_id=source_track_id,
            )
            if not track:
                track = self.track_repo.create(
                    db,
                    source=source,
                    source_track_id=source_track_id,
                    title=title,
                    duration=duration,
                )
        finally:
            db.close()

        await self.prepare(str(track.id))
        return str(track.id)

# Singleton
playback_service = PlaybackService()
