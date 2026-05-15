from sqlalchemy.orm import Session
from app.db.models.track_artist import TrackArtist


class TrackArtistRepository:
    def link(
        self,
        db: Session,
        *,
        track_id,
        artist_id,
        role: str,
    ):
        """
        Link an artist to a track.
        - One row per (track_id, artist_id)
        - If already linked, merge roles instead of inserting duplicate
        """

        link = (
            db.query(TrackArtist)
            .filter(
                TrackArtist.track_id == track_id,
                TrackArtist.artist_id == artist_id,
            )
            .first()
        )

        if link:
            # 🔹 Merge roles (e.g. "primary,singer")
            if link.role:
                existing_roles = set(r.strip() for r in link.role.split(","))
            else:
                existing_roles = set()

            existing_roles.add(role)
            link.role = ",".join(sorted(existing_roles))
            return

        # 🔹 First-time link
        db.add(
            TrackArtist(
                track_id=track_id,
                artist_id=artist_id,
                role=role,
            )
        )
        # ⚠️ NO commit here — service commits once