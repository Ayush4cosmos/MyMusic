import React from "react";
import GlassPanel from "../../components/GlassPanel";
import TrackRow from "../../components/TrackRow";
import TrackActionIconButton from "../../components/TrackActionIconButton";
import { AddToQueueIcon } from "../../components/icons/PlaybackIcons";
import { usePlaylistStore } from "../../stores/playlistStore";
import { usePlaybackStore } from "../../stores/playbackStore";

export default function PlaylistView() {
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  const tracks = usePlaylistStore((state) => state.tracks);
  const backToList = usePlaylistStore((state) => state.backToList);
  const playCurrentPlaylist = usePlaylistStore((state) => state.playCurrentPlaylist);
  const removeTrack = usePlaylistStore((state) => state.removeTrack);
  const playNow = usePlaybackStore((state) => state.playNow);
  const addToQueue = usePlaybackStore((state) => state.addToQueue);

  if (!currentPlaylist) {
    return null;
  }

  return (
    <GlassPanel className="flex h-full min-h-0 flex-col gap-4 p-5">
      <button
        type="button"
        onClick={backToList}
        className="text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900"
      >
        Back to playlists
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/30 p-5 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">{currentPlaylist.name}</div>
            <div className="text-xs text-muted">{tracks.length} tracks</div>
          </div>
          <button
            type="button"
            onClick={() => void playCurrentPlaylist()}
            className="rounded-lg bg-white/70 px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Play
          </button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-1 pb-5">
        {tracks.length === 0 ? (
          <div className="text-sm text-muted">Playlist is empty.</div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track) => (
              <TrackRow
                key={track.track_id}
                title={track.title}
                subtitle={[track.artist, track.album?.name].filter(Boolean).join(" - ")}
                imageUrl={track.image_url || track.album?.image_url}
                onClick={() =>
                  void playNow({
                    source: track.source,
                    source_track_id: track.source_track_id,
                    title: track.title,
                    duration: track.duration ?? null,
                    image_url: track.image_url ?? null,
                    album: track.album ?? null,
                    artists: null
                  })
                }
                actions={
                  <>
                    <TrackActionIconButton
                      label="Add to queue"
                      onPress={() => {
                        void addToQueue({
                          source: track.source,
                          source_track_id: track.source_track_id,
                          title: track.title,
                          duration: track.duration ?? null,
                          image_url: track.image_url ?? null,
                          album: track.album ?? null,
                          artists: null
                        });
                      }}
                    >
                      <AddToQueueIcon size={14} />
                    </TrackActionIconButton>
                    <button
                      type="button"
                      className="rounded-lg bg-white/60 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeTrack(currentPlaylist.id, track.track_id);
                      }}
                    >
                      Remove
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
