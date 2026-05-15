# backend/app/api/routes/playback_session.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from uuid import UUID

from app.db.session import get_db
from sqlalchemy.orm import Session
from app.services.playback_session_service import PlaybackSessionService

router = APIRouter(prefix="/session", tags=["Playback Session"])


class PositionPayload(BaseModel):
    position_ms: int


class PlayPayload(BaseModel):
    track_id: UUID


@router.get("")
def get_session(db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    s = service.get_state()
    return {
        "session_id": s.id,
        "current_track_id": s.current_track_id,
        "state": s.state,
        "position_ms": s.position_ms,
        "updated_at": s.updated_at,
    }


@router.post("/play")
def play(payload: PlayPayload, db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    s = service.play(payload.track_id)
    return {"status": "playing", "track_id": s.current_track_id}


@router.post("/pause")
def pause(payload: PositionPayload, db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    s = service.pause(payload.position_ms)
    return {"status": "paused", "position_ms": s.position_ms}


@router.post("/resume")
def resume(payload: PositionPayload, db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    s = service.resume(payload.position_ms)
    return {"status": "playing", "position_ms": s.position_ms}


@router.post("/seek")
def seek(payload: PositionPayload, db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    s = service.seek(payload.position_ms)
    return {"status": "ok", "position_ms": s.position_ms}


@router.post("/stop")
def stop(db: Session = Depends(get_db)):
    service = PlaybackSessionService(db)
    service.stop()
    return {"status": "stopped"}