# app/db/repositories/album_repo.py

from sqlalchemy.orm import Session

from app.db.models.album import Album


class AlbumRepository:
    def get_by_source_id(
        self,
        db: Session,
        source_album_id: str,
    ) -> Album | None:
        return (
            db.query(Album)
            .filter(Album.source_album_id == source_album_id)
            .first()
        )

    def get_or_create(
        self,
        db: Session,
        title: str,
        release_year: int | None = None,
        *,
        source_album_id: str | None = None,
        language: str | None = None,
        explicit_content: bool | None = None,
        image_url: str | None = None,
    ) -> Album:
        album = None
        if source_album_id:
            album = self.get_by_source_id(db, source_album_id)
        if not album:
            album = (
                db.query(Album)
                .filter(Album.title == title)
                .first()
            )

        if album:
            updated = False
            if source_album_id and not album.source_album_id:
                album.source_album_id = source_album_id
                updated = True
            if release_year and not album.release_year:
                album.release_year = release_year
                updated = True
            if language and not album.language:
                album.language = language
                updated = True
            if explicit_content is not None and album.explicit_content is None:
                album.explicit_content = explicit_content
                updated = True
            if image_url and not album.image_url:
                album.image_url = image_url
                updated = True
            if updated:
                db.commit()
                db.refresh(album)
            return album

        album = Album(
            title=title,
            release_year=release_year,
            source_album_id=source_album_id,
            language=language,
            explicit_content=explicit_content,
            image_url=image_url,
        )

        db.add(album)
        db.commit()
        db.refresh(album)
        return album
