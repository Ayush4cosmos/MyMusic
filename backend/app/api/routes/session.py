# app/api/routes/session.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.playback_state_service import playback_state_service
from app.services.playback_player_service import playback_player_service
from app.core.auth import get_current_user

router = APIRouter()

class ProgressRequest(BaseModel):
    position_ms: int

@router.get("/session")
def get_session(user_id: str = Depends(get_current_user)):
    state = playback_state_service.get(user_id)

    return {
        "current_track_id": state.get("current_track_id"),
        "position_ms": state.get("position_ms", 0),
        "state": state.get("state", "stopped"),
        "loop_mode": state.get("loop_mode", "off"),
        "pointer": state.get("pointer", -1),
        "can_play": False,  # 🔒 ALWAYS FALSE ON LOAD
    }

@router.post("/session/loop")
def toggle_loop(user_id: str = Depends(get_current_user)):
    state = playback_state_service.get(user_id)
    mode = state.get("loop_mode", "off")

    if mode == "off":
        state["loop_mode"] = "one"
    elif mode == "one":
        state["loop_mode"] = "queue"
    else:
        state["loop_mode"] = "off"

    playback_state_service.save(user_id, state)
    return {"loop_mode": state["loop_mode"]}

@router.post("/session/progress")
def progress(req: ProgressRequest, user_id: str = Depends(get_current_user)):
    playback_player_service.progress(user_id, req.position_ms)
    return {"ok": True}

