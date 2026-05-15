from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.models.track import Track

from app.services.playback_service import playback_service
from app.services.playback_queue_service import playback_queue_service
from app.services.playback_state_service import playback_state_service
from app.services.search_cache import search_cache
from app.services.catalog_metadata_service import catalog_metadata_service

router = APIRouter()

# -------------------------------------------------
# SOURCE-BASED PLAY (SEARCH CLICK)
# NOW DELEGATES TO QUEUE (SINGLE CONTROLLER)
# -------------------------------------------------
@router.get("/play/{source}/{source_track_id}")
async def play_from_source(
    source: str,
    source_track_id: str,
    user_id: str = Depends(get_current_user),
):
    cache_key = f"{source}:{source_track_id}"
    meta = search_cache.get(cache_key)

    if not meta:
        raise HTTPException(
            status_code=400,
            detail="Track metadata not found. Call /search first.",
        )

    # 1️⃣ Catalog + prepare audio (download if needed)
    db = next(get_db())
    try:
        track = catalog_metadata_service.upsert_from_meta(db, meta)
    finally:
        db.close()

    if track:
        track_id = str(track.id)
        await playback_service.prepare(track_id)
    else:
        track_id = await playback_service.prepare_from_source(
            source=meta["source"],
            source_track_id=meta["source_track_id"],
            title=meta["title"],
            duration=meta["duration"],
        )

    # 2️⃣ Explicit user intent → allow playback
    playback_state_service.allow_play(user_id)

    # 3️⃣ Delegate playback to QUEUE (single authority)
    playback_queue_service.play_now(user_id, track_id)

    return {
        "track_id": track_id,
        "audio_url": f"/public/audio/{track_id}",
        "status": "playing",
    }

# -------------------------------------------------
# UUID-BASED PLAY (QUEUE / NEXT / PREVIOUS / AUTO-NEXT)
# -------------------------------------------------
@router.get("/play-by-id/{track_id}")
async def play_by_id(
    track_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # ensure audio exists locally
    await playback_service.prepare(track_id)

    # explicit user-driven playback
    playback_state_service.allow_play(user_id)

    playback_queue_service.play_now(user_id, track_id)

    return {
        "track_id": track_id,
        "audio_url": f"/public/audio/{track_id}",
        "status": "playing",
    }
