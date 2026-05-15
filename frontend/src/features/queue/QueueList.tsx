import React, { useEffect } from "react";
import GlassPanel from "../../components/GlassPanel";
import TrackRow from "../../components/TrackRow";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useQueueStore } from "../../stores/queueStore";

export default function QueueList() {
  const items = useQueueStore((state) => state.items);
  const loadQueue = usePlaybackStore((state) => state.loadQueue);
  const clearQueue = usePlaybackStore((state) => state.clearQueue);
  const playQueueItem = usePlaybackStore((state) => state.playQueueItem);
  const removeFromQueue = usePlaybackStore((state) => state.removeFromQueue);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = items.find((item) => item.is_playing);
  const upcoming = items.filter((item) => !item.is_playing);

  return (
    <GlassPanel className="flex h-full min-h-0 flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Queue</div>
        <button
          type="button"
          onClick={() => void clearQueue()}
          className="rounded-lg bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Clear
        </button>
      </div>

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-1 pb-5">
        {items.length === 0 ? (
          <div className="text-sm text-muted">Queue is empty.</div>
        ) : (
          <div className="space-y-4">
            {current ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Now playing
                </div>
                <TrackRow
                  key={current.track_id}
                  title={current.title}
                  subtitle={[current.artist, current.album?.name].filter(Boolean).join(" - ")}
                  imageUrl={current.image_url || current.album?.image_url}
                  isPlaying
                  actions={
                    <div className="equalizer" aria-hidden="true">
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                    </div>
                  }
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Up next</div>
              {upcoming.length === 0 ? (
                <div className="text-sm text-muted">No upcoming tracks.</div>
              ) : (
                upcoming.map((item, index) => (
                  <div key={item.track_id} className="space-y-2">
                    <TrackRow
                      title={item.title}
                      subtitle={[item.artist, item.album?.name].filter(Boolean).join(" - ")}
                      imageUrl={item.image_url || item.album?.image_url}
                      onClick={() => void playQueueItem(item)}
                      actions={
                        <button
                          type="button"
                          className="rounded-lg bg-white/60 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeFromQueue(item.track_id);
                          }}
                        >
                          Remove
                        </button>
                      }
                    />
                    {index < upcoming.length - 1 ? (
                      <div className="mx-auto h-px w-4/5 bg-white/30" />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
