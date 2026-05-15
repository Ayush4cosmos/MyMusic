from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import require_user
from app.db.session import get_db
from app.db.models.track import Track
from app.db.models.track_artist import TrackArtist
from app.db.models.artist import Artist
from app.db.models.album import Album
from app.db.models.playlist import Playlist
from app.db.models.playlist_track import PlaylistTrack
from app.db.repositories.track_repo import TrackRepository

from app.services.playlist_service import playlist_service
from app.services.playback_queue_service import playback_queue_service
from app.services.playback_state_service import playback_state_service
from app.services.search_cache import search_cache
from app.services.catalog_metadata_service import catalog_metadata_service

router = APIRouter(prefix="/playlists", tags=["playlists"])
track_repo = TrackRepository()


# -------------------------
# SCHEMAS
# -------------------------

class PlaylistCreate(BaseModel):
    name: str
    is_public: bool = False


class PlaylistOut(BaseModel):
    id: UUID
    name: str
    is_public: bool

    class Config:
        from_attributes = True


class AddTrackFromSourceRequest(BaseModel):
    """Add track from search results using source metadata (with cache)"""
    source: str
    source_track_id: str
    title: str
    duration: int | None = None
    image_url: str | None = None
    album: dict | None = None
    artists: list[dict] | None = None


class ReorderRequest(BaseModel):
    track_ids: List[UUID]


# -------------------------
# PLAYLIST CRUD
# -------------------------

@router.post("", response_model=PlaylistOut)
def create_playlist(
    data: PlaylistCreate,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
    playlist = Playlist(
        user_id=user_id,
        name=data.name,
        is_public=data.is_public,
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


@router.get("", response_model=List[PlaylistOut])
def list_my_playlists(
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Playlist)
        .filter(Playlist.user_id == user_id)
        .order_by(Playlist.created_at.desc())
        .all()
    )


@router.get("/{playlist_id}", response_model=PlaylistOut)
def get_playlist(
    playlist_id: UUID,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
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
    
    return playlist


@router.delete("/{playlist_id}")
def delete_playlist(
    playlist_id: UUID,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
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

    db.delete(playlist)
    db.commit()
    return {"status": "deleted"}


# -------------------------
# PLAYLIST TRACKS
# -------------------------

@router.post("/{playlist_id}/add-track")
def add_track_to_playlist(
    playlist_id: UUID,
    data: AddTrackFromSourceRequest,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Add track from search (source-based) to playlist.
    Uses the same temporary cache pattern as queue/add.
    
    Flow:
    1. Verify track exists or create it (from cache metadata)
    2. Add to playlist
    3. Cache is NOT cleared (only clears on new /search)
    """
    
    # Verify playlist ownership
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

    # Merge metadata from cache + request
    cache_key = f"{data.source}:{data.source_track_id}"
    meta = search_cache.get(cache_key) or {}
    if data.album:
        meta["album"] = data.album
    if data.artists:
        meta["artists"] = data.artists
    if data.image_url:
        meta["image_url"] = data.image_url
    meta.update({
        "source": data.source,
        "source_track_id": data.source_track_id,
        "title": data.title,
        "duration": data.duration,
    })

    track = catalog_metadata_service.upsert_from_meta(db, meta)
    if not track:
        track = track_repo.get_by_source_id(
            db,
            source=data.source,
            source_track_id=data.source_track_id,
        )
    if not track:
        track = track_repo.create(
            db,
            source=data.source,
            source_track_id=data.source_track_id,
            title=data.title,
            duration=data.duration,
        )

    # Calculate next position
    max_pos = (
        db.query(PlaylistTrack.position)
        .filter(PlaylistTrack.playlist_id == playlist_id)
        .order_by(PlaylistTrack.position.desc())
        .first()
    )
    next_position = (max_pos[0] + 1) if max_pos else 0

    # Add track to playlist
    item = PlaylistTrack(
        playlist_id=playlist_id,
        track_id=track.id,
        position=next_position,
    )

    db.add(item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Track already exists in playlist",
        )

    return {
        "status": "added",
        "track_id": str(track.id),
    }


@router.get("/{playlist_id}/tracks")
def list_playlist_tracks(
    playlist_id: UUID,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
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
        db.query(PlaylistTrack, Track)
        .join(Track, Track.id == PlaylistTrack.track_id)
        .filter(PlaylistTrack.playlist_id == playlist_id)
        .order_by(PlaylistTrack.position.asc())
        .all()
    )

    track_ids = [track.id for _, track in items]
    artist_rows = (
        db.query(TrackArtist.track_id, Artist.name, TrackArtist.role)
        .join(Artist, Artist.id == TrackArtist.artist_id)
        .filter(TrackArtist.track_id.in_(track_ids))
        .all()
    )
    artist_map: dict[str, list[str]] = {}
    for track_id, name, _role in artist_rows:
        key = str(track_id)
        artist_map.setdefault(key, [])
        if name and name not in artist_map[key]:
            artist_map[key].append(name)

    album_ids = [track.album_id for _, track in items if track.album_id]
    album_rows = []
    if album_ids:
        album_rows = (
            db.query(Album.id, Album.title, Album.image_url)
            .filter(Album.id.in_(album_ids))
            .all()
        )
    album_map = {
        str(album_id): {"id": str(album_id), "name": title, "image_url": image_url}
        for album_id, title, image_url in album_rows
    }

    return [
        {
            "track_id": str(track.id),
            "title": track.title,
            "source": track.source,
            "source_track_id": track.source_track_id,
            "duration": track.duration,
            "image_url": track.image_url,
            "artist": ", ".join(artist_map.get(str(track.id), [])),
            "album": album_map.get(str(track.album_id)) if track.album_id else None,
            "position": item.position,
        }
        for item, track in items
    ]


@router.delete("/{playlist_id}/tracks/{track_id}")
def remove_track_from_playlist(
    playlist_id: UUID,
    track_id: UUID,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PlaylistTrack)
        .join(Playlist)
        .filter(
            Playlist.id == playlist_id,
            Playlist.user_id == user_id,
            PlaylistTrack.track_id == track_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Track not found in playlist")

    db.delete(item)
    db.commit()
    return {"status": "removed"}


@router.put("/{playlist_id}/tracks/reorder")
def reorder_playlist_tracks(
    playlist_id: UUID,
    data: ReorderRequest,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
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
        .all()
    )
    item_map = {item.track_id: item for item in items}

    for index, track_id in enumerate(data.track_ids):
        if track_id in item_map:
            item_map[track_id].position = index

    db.commit()
    return {"status": "reordered"}


# -------------------------
# 🔥 PLAY PLAYLIST (QUEUE = SINGLE AUTHORITY)
# When clicking individual track in playlist, use play-now
# Not play-by-id (since all tracks should be cataloged)
# -------------------------

@router.post("/{playlist_id}/play")
async def play_playlist(
    playlist_id: UUID,
    user_id: UUID = Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Play entire playlist.
    Replaces queue with playlist tracks.
    """
    track_ids = playlist_service.get_ordered_track_ids(
        db=db,
        playlist_id=playlist_id,
        user_id=user_id,
    )

    if not track_ids:
        raise HTTPException(
            status_code=400,
            detail="Playlist is empty",
        )

    first_track = await playback_queue_service.replace_queue(
        user_id=user_id,
        track_ids=track_ids,
    )

    return {
        "track_id": first_track,
        "status": "playing",
    }
