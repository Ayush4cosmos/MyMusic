import React, { useEffect, useMemo, useState } from "react";
import GlassPanel from "../../components/GlassPanel";
import { QueueIcon } from "../../components/icons/PlaybackIcons";
import { usePlaybackStore } from "../../stores/playbackStore";

const speeds = [1, 1.25, 1.5, 1.75, 2];

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type NowPlayingCardProps = {
  onClose: () => void;
};

export default function NowPlayingCard({ onClose }: NowPlayingCardProps) {
  const audioEl = usePlaybackStore((state) => state.audioEl);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const nextTrack = usePlaybackStore((state) => state.nextTrack);
  const previousTrack = usePlaybackStore((state) => state.previousTrack);
  const speed = usePlaybackStore((state) => state.speed);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const loopMode = usePlaybackStore((state) => state.loopMode);
  const toggleLoop = usePlaybackStore((state) => state.toggleLoop);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioEl) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audioEl.currentTime || 0);
    const onLoaded = () => setDuration(audioEl.duration || 0);

    setIsPlaying(!audioEl.paused);
    setCurrentTime(audioEl.currentTime || 0);
    setDuration(audioEl.duration || 0);

    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPause);
    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("loadedmetadata", onLoaded);
    audioEl.addEventListener("durationchange", onLoaded);

    return () => {
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPause);
      audioEl.removeEventListener("timeupdate", onTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", onLoaded);
      audioEl.removeEventListener("durationchange", onLoaded);
    };
  }, [audioEl]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(audioEl?.duration || 0);
  }, [audioEl, currentTrack?.track_id]);

  const title = currentTrack?.title || "No track selected";
  const subtitle = [currentTrack?.artist, currentTrack?.album?.name].filter(Boolean).join(" - ");
  const artwork = currentTrack?.image_url || currentTrack?.album?.image_url;
  const loopEnabled = loopMode !== "off";
  const shouldMarquee = isPlaying && subtitle.length > 36;

  const progressValue = useMemo(() => {
    if (!duration) return 0;
    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  const handlePlayToggle = async () => {
    if (!audioEl) return;
    if (audioEl.paused) {
      try {
        await audioEl.play();
      } catch {
        // ignore
      }
      return;
    }
    audioEl.pause();
  };

  const handleSeek = (value: number) => {
    if (!audioEl || !Number.isFinite(value)) return;
    audioEl.currentTime = value;
    setCurrentTime(value);
  };

  const handleCycleSpeed = () => {
    const currentIndex = speeds.findIndex((value) => value === speed);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % speeds.length : 0;
    setSpeed(speeds[nextIndex] ?? speeds[0] ?? 1);
  };

  return (
    <GlassPanel className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-slate-900 hover:bg-white/40 px-3 py-2 rounded-lg"
        >
          ← Back
        </button>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-700 bg-white/40 rounded-full px-3 py-1">Now Playing</div>
      </div>

      <div className="min-h-0 flex flex-1 justify-center pt-1">
        <div className="mx-auto flex h-full w-full max-w-[424px] min-h-0 flex-col">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-md">
            <div className="relative top-1 flex flex-col items-center gap-2">
              <div className="aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 shadow-lg border border-slate-200/50 group lg:max-w-[240px]">
              {artwork ? (
                <img src={artwork} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" className="text-slate-400">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                  </svg>
                </div>
              )}
              </div>
              <div className="w-full space-y-1 text-center">
                <div className="line-clamp-1 text-2xl font-bold text-slate-900 tracking-tight">{title}</div>
                <div className="relative mx-auto h-5 w-full max-w-[280px] overflow-hidden text-left">
                  {shouldMarquee ? (
                    <span
                      key={`${currentTrack?.track_id || "none"}-${subtitle}`}
                      className="absolute left-0 top-0 marquee text-sm text-slate-600"
                    >
                      {subtitle || "Choose a song to start listening."}
                    </span>
                  ) : (
                    <span className="block truncate text-sm text-slate-600">
                      {subtitle || "Choose a song to start listening."}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 shrink-0 p-3">
            <div className="relative -top-[10px] mb-3 flex items-center gap-2">
              <span className="w-9 text-right text-xs font-semibold text-slate-700">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-1.5 rounded-full bg-slate-300/50">
                <div
                  className="absolute left-0 top-0 h-1.5 rounded-full bg-gradient-to-r from-slate-700 to-slate-600"
                  style={{ width: `${progressValue * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="absolute left-0 top-0 h-1.5 w-full cursor-pointer opacity-0"
                  aria-label="Seek"
                />
              </div>
              <span className="w-9 text-xs font-semibold text-slate-700">{formatTime(duration)}</span>
            </div>

            <div className="mb-3 grid grid-cols-[120px_minmax(0,1fr)_120px] items-center gap-2">
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-200"
                  aria-label="Queue"
                >
                  <QueueIcon size={16} />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => void previousTrack()}
                  className="rounded-full p-2 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                  aria-label="Previous"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M6 5h2v14H6z" />
                    <path d="M18 6v12l-8.5-6L18 6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => void handlePlayToggle()}
                  className="rounded-full bg-slate-900 p-3 text-white transition-all hover:bg-slate-700 active:scale-95 shadow-lg"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M6 5h4v14H6z" />
                      <path d="M14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void nextTrack()}
                  className="rounded-full p-2 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M16 5h2v14h-2z" />
                    <path d="M6 6v12l8.5-6L6 6z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCycleSpeed}
                  className="flex h-9 min-w-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Speed"
                >
                  {speed}x
                </button>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
