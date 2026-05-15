import asyncio

from app.services.playback_state_service import playback_state_service
from app.services.playback_player_service import playback_player_service
from app.services.playback_service import playback_service
from app.db.session import get_db
from app.db.repositories.track_repo import TrackRepository
from app.db.models.track_artist import TrackArtist
from app.db.models.artist import Artist
from app.db.models.album import Album

MAX_HISTORY = 10


class PlaybackQueueService:
    def __init__(self):
        self.track_repo = TrackRepository()

    def _next_track_id(self, temp_list: list[str]) -> str | None:
        if len(temp_list) > 1:
            return temp_list[1]
        return None

    def _schedule_prefetch(self, track_id: str | None) -> None:
        if not track_id:
            return
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return
        asyncio.create_task(playback_service.prefetch(track_id))

    def prefetch_next(self, user_id: str) -> None:
        state = playback_state_service.get(user_id)
        next_track_id = self._next_track_id(state["temp_list"])
        self._schedule_prefetch(next_track_id)

    # --------------------------------------------------
    # QUEUE VIEW (sync – safe)
    # --------------------------------------------------
    def get_queue(self, user_id: str):
        state = playback_state_service.get(user_id)
        temp = state["temp_list"]
        if not temp:
            return []

        db = next(get_db())
        try:
            tracks = self.track_repo.get_by_ids(db, temp)
            track_map = {str(t.id): t for t in tracks}

            artist_rows = (
                db.query(TrackArtist.track_id, Artist.name, TrackArtist.role)
                .join(Artist, Artist.id == TrackArtist.artist_id)
                .filter(TrackArtist.track_id.in_(temp))
                .all()
            )
            artist_map: dict[str, list[str]] = {}
            for track_id, name, _role in artist_rows:
                key = str(track_id)
                artist_map.setdefault(key, [])
                if name and name not in artist_map[key]:
                    artist_map[key].append(name)

            album_ids = [t.album_id for t in tracks if t.album_id]
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
                    "track_id": str(t.id),
                    "source": t.source,
                    "source_track_id": t.source_track_id,
                    "title": t.title,
                    "duration": t.duration,
                    "artist": ", ".join(artist_map.get(str(t.id), [])),
                    "image_url": t.image_url,
                    "album": album_map.get(str(t.album_id)) if t.album_id else None,
                    "is_playing": i == 0,
                }
                for i, tid in enumerate(temp)
                if (t := track_map.get(tid))
            ]
        finally:
            db.close()

    # --------------------------------------------------
    # PLAY NOW (single track, explicit intent)
    # --------------------------------------------------
    async def play_now(self, user_id: str, track_id: str):
        # 🔑 HARD GUARANTEE: audio exists
        await playback_service.prepare(track_id)

        state = playback_state_service.get(user_id)
        temp = state["temp_list"]

        if temp and temp[0] != track_id:
            state["history"].append(temp[0])
            state["history"] = state["history"][-MAX_HISTORY:]

        if track_id in temp:
            idx = temp.index(track_id)
            temp = temp[idx:]
        else:
            temp = ([track_id] + temp[1:]) if temp else [track_id]

        if not state["queue_snapshot"]:
            state["queue_snapshot"] = temp.copy()

        state["temp_list"] = temp
        playback_state_service.save(user_id, state)

        playback_player_service.play(user_id, temp[0])
        self._schedule_prefetch(self._next_track_id(temp))
        return temp[0]

    # --------------------------------------------------
    # 🔥 NEW: REPLACE QUEUE (playlist / album / bulk play)
    # --------------------------------------------------
    async def replace_queue(self, user_id: str, track_ids: list[str]):
        if not track_ids:
            self.clear(user_id)
            return None

        state = playback_state_service.get(user_id)

        # Reset queue state safely
        state["history"] = []
        state["queue_snapshot"] = track_ids.copy()
        state["temp_list"] = track_ids.copy()

        playback_state_service.save(user_id, state)

        first_track = track_ids[0]

        # 🔑 Prepare ONLY the first track
        await playback_service.prepare(first_track)

        playback_player_service.play(user_id, first_track)
        self._schedule_prefetch(self._next_track_id(track_ids))
        return first_track

    # --------------------------------------------------
    # ADD TO QUEUE (sync – no download)
    # --------------------------------------------------
    def add_to_queue(self, user_id: str, track_id: str):
        state = playback_state_service.get(user_id)

        if track_id not in state["temp_list"]:
            state["temp_list"].append(track_id)
            state["queue_snapshot"].append(track_id)

        playback_state_service.save(user_id, state)
        self.prefetch_next(user_id)
        return track_id

    # --------------------------------------------------
    # NEXT
    # --------------------------------------------------
    async def next(self, user_id: str):
        state = playback_state_service.get(user_id)
        temp = state["temp_list"]

        if not temp:
            return None

        current = temp.pop(0)
        state["history"].append(current)
        state["history"] = state["history"][-MAX_HISTORY:]

        if not temp:
            if state["loop_mode"] == "queue" and state["queue_snapshot"]:
                temp = state["queue_snapshot"].copy()
            else:
                self.clear(user_id)
                return None

        next_track_id = temp[0]

        # 🔑 HARD GUARANTEE
        await playback_service.prepare(next_track_id)

        state["temp_list"] = temp
        playback_state_service.save(user_id, state)

        playback_player_service.play(user_id, next_track_id)
        self._schedule_prefetch(self._next_track_id(temp))
        return next_track_id

    # --------------------------------------------------
    # PREVIOUS
    # --------------------------------------------------
    async def previous(self, user_id: str):
        state = playback_state_service.get(user_id)

        if not state["history"]:
            return None

        prev = state["history"].pop()
        state["temp_list"] = [prev] + state["temp_list"][1:]

        # 🔑 HARD GUARANTEE
        await playback_service.prepare(prev)

        playback_state_service.save(user_id, state)
        playback_player_service.play(user_id, prev)
        self._schedule_prefetch(self._next_track_id(state["temp_list"]))
        return prev

    # --------------------------------------------------
    # CLEAR
    # --------------------------------------------------
    def clear(self, user_id: str):
        playback_player_service.stop(user_id)
        playback_state_service.clear(user_id)

    # --------------------------------------------------
    # REMOVE
    # --------------------------------------------------
    def remove(self, user_id: str, track_id: str):
        state = playback_state_service.get(user_id)

        if state["temp_list"] and state["temp_list"][0] == track_id:
            return

        state["temp_list"] = [t for t in state["temp_list"] if t != track_id]
        state["queue_snapshot"] = [
            t for t in state["queue_snapshot"] if t != track_id
        ]

        playback_state_service.save(user_id, state)


playback_queue_service = PlaybackQueueService()
