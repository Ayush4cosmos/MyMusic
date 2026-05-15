# backend/app/normalizers/jiosaavn.py
from typing import List
from app.metadata.track import TrackMetadata
from app.metadata.artist import ArtistMetadata
from app.metadata.album import AlbumMetadata
from app.normalizers.base import BaseNormalizer


class JioSaavnNormalizer(BaseNormalizer):
    SOURCE_NAME = "jiosaavn"

    def normalize_search_results(self, raw: dict) -> List[TrackMetadata]:
        tracks: List[TrackMetadata] = []

        results = raw.get("data", {}).get("results", [])

        for item in results:
            # Artists
            artists: List[ArtistMetadata] = []
            artist_str = item.get("primaryArtists")

            if artist_str:
                for name in artist_str.split(","):
                    artists.append(
                        ArtistMetadata(name=name.strip())
                    )

            # Album
            album = None
            album_data = item.get("album")

            if isinstance(album_data, dict):
                album = AlbumMetadata(
                    title=album_data.get("name"),
                    release_year=album_data.get("year")
                )

            track = TrackMetadata(
                source=self.SOURCE_NAME,
                source_track_id=item.get("id"),
                title=item.get("name"),
                duration=int(item["duration"]) if item.get("duration") else None,
                artists=artists,
                album=album
            )

            tracks.append(track)

        return tracks
