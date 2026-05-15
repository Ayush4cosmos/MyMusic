import React from "react";
import { usePlaybackStore } from "../../stores/playbackStore";

const speeds = [1, 1.25, 1.5, 1.75, 2];

export default function SpeedSelect() {
  const speed = usePlaybackStore((state) => state.speed);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-semibold">Speed</span>
      <select
        value={speed}
        onChange={(event) => setSpeed(Number(event.target.value))}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
      >
        {speeds.map((value) => (
          <option key={value} value={value}>
            {value}x
          </option>
        ))}
      </select>
    </div>
  );
}
