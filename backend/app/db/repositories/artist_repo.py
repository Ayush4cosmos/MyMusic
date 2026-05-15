# app/db/repositories/artist_repo.py
from sqlalchemy.orm import Session
from app.db.models.artist import Artist

class ArtistRepository:
    def get_by_source_id(self, db: Session, source_artist_id: str):
        return (
            db.query(Artist)
            .filter(Artist.source_artist_id == source_artist_id)
            .first()
        )

    def get_or_create(
        self,
        db: Session,
        *,
        source_artist_id: str,
        name: str,
        image_url: str | None = None,
        dominant_language: str | None = None,
    ) -> Artist:
        artist = self.get_by_source_id(db, source_artist_id)
        if artist:
            updated = False
            if image_url and not artist.image_url:
                artist.image_url = image_url
                updated = True
            if dominant_language and not artist.dominant_language:
                artist.dominant_language = dominant_language
                updated = True
            if updated:
                db.flush()
            return artist

        artist = Artist(
            source_artist_id=source_artist_id,
            name=name,
            image_url=image_url,
            dominant_language=dominant_language,
        )
        db.add(artist)
        db.flush()  # ⬅️ NOT commit
        return artist
