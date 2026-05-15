# backend/app/services/download_manager.py
import asyncio
from datetime import datetime
from pathlib import Path
from fastapi import HTTPException

from app.db.session import get_db
from app.db.repositories.track_storage_repo import TrackStorageRepository
from app.services.source_manager import SourceManager

# -------------------------------------------------
# Local storage only
# -------------------------------------------------
STORAGE_ROOT = Path("storage/audio").resolve()
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


class DownloadManager:
    def __init__(self):
        self.source_manager = SourceManager()
        self.storage_repo = TrackStorageRepository()
        self._locks: dict[str, asyncio.Lock] = {}

    def get_path(self, track_id: str) -> Path:
        return STORAGE_ROOT / f"{track_id}.mp3"

    async def ensure_download(self, track) -> None:
        """
        LOCAL ONLY:
        - Download full file from source
        - Save to disk
        - No cloud interaction
        """

        lock = self._locks.setdefault(str(track.id), asyncio.Lock())
        async with lock:

            # ---------- FAST PATH ----------
            db = next(get_db())
            storage = self.storage_repo.get_by_track_id(db, track.id)
            if storage and storage.storage_type == "local":
                db.close()
                return
            db.close()

            # ---------- VALIDATE SOURCE ----------
            if not track.source or not track.source_track_id:
                raise HTTPException(
                    status_code=500,
                    detail="Track source metadata incomplete",
                )

            source = self.source_manager.get_source(track.source)
            if not source:
                raise HTTPException(
                    status_code=500,
                    detail=f"No source handler for {track.source}",
                )

            byte_stream, _ = await source.stream(track.source_track_id)
            if not byte_stream:
                raise HTTPException(
                    status_code=500,
                    detail="Source returned empty audio stream",
                )

            path = self.get_path(track.id)
            filename = path.name

            # ---------- MARK DOWNLOADING ----------
            db = next(get_db())
            self.storage_repo.upsert(
                db,
                track_id=track.id,
                storage_type="downloading",
                storage_path=filename,
                is_available=False,
            )
            db.close()

            try:
                # ---------- WRITE FILE ----------
                with open(path, "wb") as f:
                    async for chunk in byte_stream:
                        if chunk:
                            f.write(chunk)

                # ---------- MARK AVAILABLE ----------
                db = next(get_db())
                self.storage_repo.upsert(
                    db,
                    track_id=track.id,
                    storage_type="local",
                    storage_path=filename,
                    is_available=True,
                    last_cached_at=datetime.utcnow(),
                )
                db.close()

                print(f"✅ Local download complete → {filename}")

            except Exception as e:
                if path.exists():
                    path.unlink()

                db = next(get_db())
                self.storage_repo.delete_by_track_id(db, track.id)
                db.close()

                print("❌ Local download failed:", e)
                raise