import React from "react";
import { usePlaybackStore } from "../../stores/playbackStore";

export default function Controls() {
  const previousTrack = usePlaybackStore((state) => state.previousTrack);
  const nextTrack = usePlaybackStore((state) => state.nextTrack);
  const toggleLoop = usePlaybackStore((state) => state.toggleLoop);
  const loopMode = usePlaybackStore((state) => state.loopMode);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void previousTrack()}
        className="rounded-lg bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={() => void nextTrack()}
        className="rounded-lg bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        Next
      </button>
      <button
        type="button"
        onClick={() => void toggleLoop()}
        className="rounded-lg bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        Loop: {loopMode.toUpperCase()}
      </button>
    </div>
  );
}
