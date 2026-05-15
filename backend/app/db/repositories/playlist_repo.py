# backend/app/db/repositories/playlist_repo.py
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session

from app.db.models.playlist import Playlist


class PlaylistRepository:
    """
    Playlist repository.

    Responsibilities:
    - Create playlists
    - Fetch user playlists
    - Fetch playlist by ID (user-scoped)
    - Delete playlists
    """

    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    def get_by_id(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Playlist]:
        return (
            db.query(Playlist)
            .filter(
                Playlist.id == playlist_id,
                Playlist.user_id == user_id,
            )
            .first()
        )

    def list_by_user(
        self,
        db: Session,
        *,
        user_id: uuid.UUID,
    ) -> List[Playlist]:
        return (
            db.query(Playlist)
            .filter(Playlist.user_id == user_id)
            .order_by(Playlist.created_at.desc())
            .all()
        )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------
    def create(
        self,
        db: Session,
        *,
        user_id: uuid.UUID,
        name: str,
        is_public: bool = False,
    ) -> Playlist:
        playlist = Playlist(
            user_id=user_id,
            name=name,
            is_public=is_public,
        )
        db.add(playlist)
        db.commit()
        db.refresh(playlist)
        return playlist

    # -------------------------------------------------
    # DELETE
    # -------------------------------------------------
    def delete(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        playlist = self.get_by_id(
            db,
            playlist_id=playlist_id,
            user_id=user_id,
        )
        if not playlist:
            return False

        db.delete(playlist)
        db.commit()
        return True