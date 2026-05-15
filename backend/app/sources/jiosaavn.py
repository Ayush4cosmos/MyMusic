# backend/app/sources/jiosaavn.py
import httpx
from typing import List, Dict, Any, Optional, AsyncIterator, Tuple
from fastapi import HTTPException
from .base import ExternalSourceAdapter


class JioSaavnAdapter(ExternalSourceAdapter):
    BASE_URL = "http://localhost:3000"

    def _pick_image_url(self, images: Any) -> Optional[str]:
        if isinstance(images, list) and images:
            url = images[-1].get("url")
            if isinstance(url, str):
                return url
        return None

    def _primary_artist_names(self, artists: Any) -> str:
        if not isinstance(artists, dict):
            return ""
        primary = artists.get("primary") or []
        if not primary:
            primary = artists.get("all") or []
        names = [a.get("name") for a in primary if a.get("name")]
        return ", ".join(names)

    def _flatten_artists(self, artists: Any) -> List[Dict[str, Any]]:
        if not isinstance(artists, dict):
            return []

        flattened: List[Dict[str, Any]] = []
        seen: set[str] = set()

        def add_artist(item: Dict[str, Any], role_override: Optional[str] = None):
            artist_id = item.get("id")
            if not artist_id or artist_id in seen:
                return
            seen.add(artist_id)
            flattened.append({
                "id": artist_id,
                "name": item.get("name"),
                "role": role_override or item.get("role"),
                "image_url": self._pick_image_url(item.get("image")),
            })

        for item in artists.get("primary", []) or []:
            add_artist(item, "primary")
        for item in artists.get("featured", []) or []:
            add_artist(item, "featured")
        for item in artists.get("all", []) or []:
            add_artist(item)

        return flattened

    def _normalize_song(self, item: Dict[str, Any]) -> Dict[str, Any]:
        raw_play_count = item.get("playCount")
        play_count = (
            int(raw_play_count)
            if isinstance(raw_play_count, (int, str))
            else 0
        )
        artist = self._primary_artist_names(item.get("artists") or {})
        if not artist:
            artist = item.get("primaryArtists") or item.get("singers") or ""

        album = item.get("album") or {}
        album_id = album.get("id")
        album_name = album.get("name")

        return {
            "id": item.get("id"),
            "title": item.get("name") or item.get("title"),
            "artist": artist,
            "duration": int(item["duration"]) if item.get("duration") else None,
            "playCount": play_count,
            "source": "jiosaavn",
            "image_url": self._pick_image_url(item.get("image")),
            "album": (
                {
                    "id": album_id,
                    "name": album_name,
                    "image_url": self._pick_image_url(item.get("image")),
                }
                if album_id or album_name
                else None
            ),
            "artists": self._flatten_artists(item.get("artists") or {}),
        }

    # -------------------------------------------------
    # SEARCH
    # -------------------------------------------------
    async def search(self, query: str, limit: int = 30) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/search/songs",
                params={
                    "query": query,
                    "page": 1,
                    "limit": limit,  # 🔥 IMPORTANT: default API returns only 10
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        results: List[Dict[str, Any]] = []

        for item in raw.get("data", {}).get("results", []):
            results.append(self._normalize_song(item))

        return results

    async def search_artists(
        self,
        query: str,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/search/artists",
                params={
                    "query": query,
                    "page": 1,
                    "limit": limit,
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        results: List[Dict[str, Any]] = []
        for item in raw.get("data", {}).get("results", []):
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "role": item.get("role"),
                "type": item.get("type"),
                "url": item.get("url"),
                "image_url": self._pick_image_url(item.get("image")),
            })

        return results

    async def search_albums(
        self,
        query: str,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/search/albums",
                params={
                    "query": query,
                    "page": 1,
                    "limit": limit,
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        results: List[Dict[str, Any]] = []
        for item in raw.get("data", {}).get("results", []):
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "year": item.get("year"),
                "type": item.get("type"),
                "language": item.get("language"),
                "explicit_content": item.get("explicitContent"),
                "artist": self._primary_artist_names(item.get("artists") or {}),
                "url": item.get("url"),
                "image_url": self._pick_image_url(item.get("image")),
            })

        return results

    async def get_album(self, album_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/albums",
                params={"id": album_id},
            )
            resp.raise_for_status()
            raw = resp.json()

        data = raw.get("data", {}) or {}
        album = {
            "id": data.get("id"),
            "name": data.get("name"),
            "year": data.get("year"),
            "type": data.get("type"),
            "language": data.get("language"),
            "explicit_content": data.get("explicitContent"),
            "songCount": data.get("songCount"),
            "artist": self._primary_artist_names(data.get("artists") or {}),
            "image_url": self._pick_image_url(data.get("image")),
        }
        songs = [
            self._normalize_song(item)
            for item in (data.get("songs") or [])
        ]

        return {"album": album, "songs": songs}

    async def get_artist(self, artist_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/artists/{artist_id}",
            )
            resp.raise_for_status()
            raw = resp.json()

        data = raw.get("data", {}) or {}
        artist = {
            "id": data.get("id"),
            "name": data.get("name"),
            "image_url": self._pick_image_url(data.get("image")),
            "language": data.get("dominantLanguage"),
            "is_verified": data.get("isVerified"),
            "url": data.get("url"),
        }

        return {"artist": artist}

    async def get_artist_songs(
        self,
        artist_id: str,
        page: int = 0,
        sort_by: str = "popularity",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        artist_payload = await self.get_artist(artist_id)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.BASE_URL}/api/artists/{artist_id}/songs",
                params={
                    "page": page,
                    "sortBy": sort_by,
                    "sortOrder": sort_order,
                },
            )
            resp.raise_for_status()
            raw = resp.json()

        data = raw.get("data", {}) or {}
        songs = [
            self._normalize_song(item)
            for item in (data.get("songs") or [])
        ]

        return {
            "artist": artist_payload.get("artist"),
            "songs": songs,
            "total": data.get("total"),
        }

    # -------------------------------------------------
    # STREAM (STRICT, SAFE, CONTRACT-CORRECT)
    # -------------------------------------------------
    async def stream(
        self,
        track_id: str,
        range_header: Optional[str] = None,
    ) -> Tuple[AsyncIterator[bytes], str]:

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{self.BASE_URL}/api/songs/{track_id}")
            resp.raise_for_status()
            data = resp.json()

        song = data["data"][0]
        downloads = song.get("downloadUrl", [])

        # 🔎 DEBUG VISIBILITY
        print("🎧 JioSaavn downloadUrl raw:", downloads)

        # -------------------------------------------------
        # HARD VALIDATION — PICK BEST AVAILABLE URL
        # -------------------------------------------------
        audio_url: Optional[str] = None
        for item in reversed(downloads):  # highest quality last
            url = item.get("url")
            if isinstance(url, str) and url.startswith("http"):
                audio_url = url
                break

        print("🎯 Selected audio_url:", audio_url)

        if not audio_url:
            raise HTTPException(
                status_code=502,
                detail="Track is not downloadable (no valid audio URL)",
            )

        # Detect extension (safe default)
        ext = "m4a" if ".m4a" in audio_url or ".mp4" in audio_url else "mp3"

        # -------------------------------------------------
        # BYTE STREAM GENERATOR
        # -------------------------------------------------
        async def byte_stream():
            headers = {}
            if range_header:
                headers["Range"] = range_header

            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", audio_url, headers=headers) as r:
                    r.raise_for_status()
                    async for chunk in r.aiter_bytes(64 * 1024):
                        if chunk:
                            yield chunk

        return byte_stream(), ext
