from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.repositories.track_repo import TrackRepository
from app.services.playback_queue_service import playback_queue_service
from app.services.playback_state_service import playback_state_service
from app.services.playback_service import playback_service
from app.services.search_cache import search_cache
from app.services.catalog_metadata_service import catalog_metadata_service

router = APIRouter()
track_repo = TrackRepository()

# -----------------------------
# REQUEST MODELS
# -----------------------------
class AlbumMeta(BaseModel):
    id: str | None = None
    name: str | None = None
    year: int | None = None
    language: str | None = None
    explicit_content: bool | None = None
    image_url: str | None = None


class ArtistMeta(BaseModel):
    id: str | None = None
    name: str | None = None
    role: str | None = None
    image_url: str | None = None
    dominant_language: str | None = None


class QueueSourceRequest(BaseModel):
    source: str
    source_track_id: str
    title: str
    duration: int | None = None
    image_url: str | None = None
    album: AlbumMeta | None = None
    artists: list[ArtistMeta] | None = None


def _merge_meta(req: QueueSourceRequest) -> dict:
    cache_key = f"{req.source}:{req.source_track_id}"
    meta = search_cache.get(cache_key) or {}

    if req.album:
        meta["album"] = req.album.dict()
    if req.artists:
        meta["artists"] = [artist.dict() for artist in req.artists]

    meta.update({
        "source": req.source,
        "source_track_id": req.source_track_id,
        "title": req.title,
        "duration": req.duration,
    })

    if req.image_url:
        meta["image_url"] = req.image_url

    return meta

# -----------------------------
# GET QUEUE
# -----------------------------
@router.get("/queue")
def get_queue(user_id: str = Depends(get_current_user)):
    return playback_queue_service.get_queue(user_id)

# -----------------------------
# PLAY NOW (ASYNC)
# -----------------------------
@router.post("/queue/play-now")
async def play_now(
    req: QueueSourceRequest,
    user_id: str = Depends(get_current_user),
):
    db = next(get_db())
    try:
        meta = _merge_meta(req)
        track = catalog_metadata_service.upsert_from_meta(db, meta)
        if not track:
            track = track_repo.get_by_source_id(
                db,
                source=req.source,
                source_track_id=req.source_track_id,
            )
        if not track:
            track = track_repo.create(
                db,
                source=req.source,
                source_track_id=req.source_track_id,
                title=req.title,
                duration=req.duration,
            )
        track_id = str(track.id)
    finally:
        db.close()

    playback_state_service.allow_play(user_id)

    # 🔑 MUST AWAIT
    played_id = await playback_queue_service.play_now(user_id, track_id)

    return {"track_id": played_id}

# -----------------------------
# ADD TO QUEUE (ASYNC)
# -----------------------------
@router.post("/queue/add")
async def add_to_queue(
    req: QueueSourceRequest,
    user_id: str = Depends(get_current_user),
):
    db = next(get_db())
    try:
        meta = _merge_meta(req)
        track = catalog_metadata_service.upsert_from_meta(db, meta)
        if not track:
            track = track_repo.get_by_source_id(
                db,
                source=req.source,
                source_track_id=req.source_track_id,
            )
        if not track:
            track = track_repo.create(
                db,
                source=req.source,
                source_track_id=req.source_track_id,
                title=req.title,
                duration=req.duration,
            )
        track_id = str(track.id)
    finally:
        db.close()

    playback_queue_service.add_to_queue(user_id, track_id)
    return {"track_id": track_id}

# -----------------------------
# NEXT (ASYNC)
# -----------------------------
@router.post("/queue/next")
async def next_track(user_id: str = Depends(get_current_user)):
    playback_state_service.allow_play(user_id)
    track_id = await playback_queue_service.next(user_id)
    return {"track_id": track_id}

# -----------------------------
# PREVIOUS (ASYNC)
# -----------------------------
@router.post("/queue/previous")
async def previous_track(user_id: str = Depends(get_current_user)):
    playback_state_service.allow_play(user_id)
    track_id = await playback_queue_service.previous(user_id)
    return {"track_id": track_id}

# -----------------------------
# CLEAR
# -----------------------------
@router.post("/queue/clear")
def clear_queue(user_id: str = Depends(get_current_user)):
    playback_queue_service.clear(user_id)
    playback_state_service.deny_play(user_id)
    return {"status": "cleared"}

# -----------------------------
# REMOVE
# -----------------------------
@router.post("/queue/remove/{track_id}")
def remove_track(track_id: str, user_id: str = Depends(get_current_user)):
    playback_queue_service.remove(user_id, track_id)
    return {"status": "removed"}
