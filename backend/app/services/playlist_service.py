# backend/app/services/playlist_service.py
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models.playlist import Playlist
from app.db.models.playlist_track import PlaylistTrack


class PlaylistService:
    """
    Internal API for playlist data.
    - No playback
    - No downloads
    - No queue logic
    """

    def get_ordered_track_ids(
        self,
        *,
        db: Session,
        playlist_id: UUID,
        user_id: UUID,
    ) -> list[str]:
        playlist = (
            db.query(Playlist)
            .filter(
                Playlist.id == playlist_id,
                Playlist.user_id == user_id,
            )
            .first()
        )

        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")

        items = (
            db.query(PlaylistTrack)
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .order_by(PlaylistTrack.position.asc())
            .all()
        )

        return [str(item.track_id) for item in items]


playlist_service = PlaylistService()