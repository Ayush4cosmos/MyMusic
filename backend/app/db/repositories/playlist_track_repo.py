# backend/app/db/repositories/playlist_track_repo.py
import uuid
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models.playlist_track import PlaylistTrack


class PlaylistTrackRepository:
    """
    PlaylistTrack repository.

    Responsibilities:
    - Add tracks to playlist (ordered)
    - Remove tracks
    - Reorder tracks
    - List playlist tracks
    """

    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    def list_tracks(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
    ) -> List[PlaylistTrack]:
        return (
            db.query(PlaylistTrack)
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .order_by(PlaylistTrack.position.asc())
            .all()
        )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------
    def add_track(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
        track_id: uuid.UUID,
    ) -> PlaylistTrack:
        """
        Adds track at the end of playlist.
        Duplicate tracks are prevented by DB constraint.
        """

        # Find next position
        max_position = (
            db.query(func.max(PlaylistTrack.position))
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .scalar()
        )
        next_position = (max_position or 0) + 1

        item = PlaylistTrack(
            playlist_id=playlist_id,
            track_id=track_id,
            position=next_position,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    # -------------------------------------------------
    # DELETE
    # -------------------------------------------------
    def remove_track(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
        track_id: uuid.UUID,
    ) -> bool:
        item = (
            db.query(PlaylistTrack)
            .filter(
                PlaylistTrack.playlist_id == playlist_id,
                PlaylistTrack.track_id == track_id,
            )
            .first()
        )

        if not item:
            return False

        db.delete(item)
        db.commit()
        return True

    # -------------------------------------------------
    # REORDER
    # -------------------------------------------------
    def reorder(
        self,
        db: Session,
        *,
        playlist_id: uuid.UUID,
        ordered_track_ids: List[uuid.UUID],
    ) -> None:
        """
        Reorders playlist tracks based on provided list.
        Assumes input list contains ALL tracks in playlist.
        """

        for index, track_id in enumerate(ordered_track_ids, start=1):
            (
                db.query(PlaylistTrack)
                .filter(
                    PlaylistTrack.playlist_id == playlist_id,
                    PlaylistTrack.track_id == track_id,
                )
                .update({"position": index})
            )

        db.commit()