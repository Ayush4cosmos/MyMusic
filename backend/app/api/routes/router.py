# backend/app/api/routes/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes.playback import router as playback_router
from app.api.routes.audio import router as audio_router
from app.api.routes.session import router as session_router
from app.api.routes.queue import router as queue_router
from app.api.routes.auth import router as auth_router
from app.api.routes.playlists import router as playlists_router

from app.services.search_service import SearchService
from app.core.auth import require_user
from app.db.session import get_db
from app.db.repositories.album_repo import AlbumRepository
from app.db.repositories.artist_repo import ArtistRepository

router = APIRouter()
search_service = SearchService()
album_repo = AlbumRepository()
artist_repo = ArtistRepository()

public_router = APIRouter(prefix="/public", tags=["public"])
me_router = APIRouter(prefix="/me", tags=["me"], dependencies=[Depends(require_user)])


@public_router.get("/health")
def health():
    return {"status": "ok"}


@public_router.get("/search")
async def search(q: str):
    results = await search_service.search(q)
    return {
        "tracks": results
    }

@public_router.get("/search/artists")
async def search_artists(q: str):
    results = await search_service.search_artists(q)
    return {
        "artists": results
    }


@public_router.get("/search/albums")
async def search_albums(q: str):
    results = await search_service.search_albums(q)
    return {
        "albums": results
    }


@public_router.get("/albums/{album_id}")
async def get_album(album_id: str, db: Session = Depends(get_db)):
    payload = await search_service.get_album(album_id)
    album = payload.get("album") or {}
    if album.get("name"):
        album_repo.get_or_create(
            db,
            title=album.get("name"),
            release_year=album.get("year"),
            source_album_id=album.get("id"),
            language=album.get("language"),
            explicit_content=album.get("explicit_content"),
            image_url=album.get("image_url"),
        )
    return payload


@public_router.get("/artists/{artist_id}/songs")
async def get_artist_songs(artist_id: str, db: Session = Depends(get_db)):
    payload = await search_service.get_artist_songs(artist_id)
    artist = payload.get("artist") or {}
    if artist.get("id") and artist.get("name"):
        artist_repo.get_or_create(
            db,
            source_artist_id=artist.get("id"),
            name=artist.get("name"),
            image_url=artist.get("image_url"),
            dominant_language=artist.get("language"),
        )
        db.commit()
    return payload


# -------------------------
# ROUTES
# -------------------------
router.include_router(auth_router)

public_router.include_router(playback_router)
public_router.include_router(audio_router)
public_router.include_router(session_router)
public_router.include_router(queue_router)

me_router.include_router(playlists_router)

router.include_router(public_router)
router.include_router(me_router)
