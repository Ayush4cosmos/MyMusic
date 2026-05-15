import React, { useEffect, useMemo, useRef, useState } from "react";
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

type AudioPlayerProps = {
  onOpenNowPlaying?: () => void;
};

export default function AudioPlayer({ onOpenNowPlaying }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attachAudio = usePlaybackStore((state) => state.attachAudio);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const nextTrack = usePlaybackStore((state) => state.nextTrack);
  const previousTrack = usePlaybackStore((state) => state.previousTrack);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const speed = usePlaybackStore((state) => state.speed);
  const toggleLoop = usePlaybackStore((state) => state.toggleLoop);
  const loopMode = usePlaybackStore((state) => state.loopMode);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [lastVolume, setLastVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    attachAudio(audioRef.current);
  }, [attachAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (!audio.loop) {
        void nextTrack();
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoaded = () => setDuration(audio.duration || 0);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
    };
  }, [nextTrack]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentTrack?.track_id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const subtitle = [currentTrack?.artist, currentTrack?.album?.name].filter(Boolean).join(" - ");
  const artwork = currentTrack?.image_url || currentTrack?.album?.image_url;
  const title = currentTrack?.title || "No track selected";
  const shouldMarquee = isPlaying && subtitle.length > 36;
  const loopEnabled = loopMode !== "off";

  const progressValue = useMemo(() => {
    if (!duration) return 0;
    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  const handlePlayToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // ignore
      }
    } else {
      audio.pause();
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    const safe = Math.min(1, Math.max(0, value));
    setVolume(safe);
    if (safe > 0) {
      setLastVolume(safe);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const handleToggleMute = () => {
    if (isMuted || volume === 0) {
      const restored = lastVolume > 0 ? lastVolume : 0.8;
      setVolume(restored);
      setIsMuted(false);
      return;
    }

    setLastVolume(volume);
    setIsMuted(true);
  };

  const showMutedIcon = isMuted || volume === 0;

  return (
    <div className="mx-auto h-[84px] w-full max-w-[930px] overflow-visible rounded-full border border-slate-300 bg-slate-100 px-5 py-2.5 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
      <div className="flex h-full items-center gap-4">
        <div className="flex min-w-0 basis-[24%] items-center gap-3">
          <button
            type="button"
            onClick={onOpenNowPlaying}
            disabled={!currentTrack || !onOpenNowPlaying}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
              currentTrack && onOpenNowPlaying
                ? "hover:bg-slate-200 cursor-pointer active:scale-95"
                : "cursor-default"
            }`}
          >
            <div
              className="h-10 w-10 rounded-lg border border-slate-300 bg-white bg-cover bg-center shadow-sm flex-shrink-0"
              style={artwork ? { backgroundImage: `url(\"${artwork}\")` } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-900 md:text-sm">{title}</div>
              <div className="relative h-4 w-full overflow-hidden">
                {shouldMarquee ? (
                  <span
                    key={`${currentTrack?.track_id || "none"}-${subtitle}`}
                    className="absolute left-0 top-0 marquee text-[11px] text-slate-600"
                  >
                    {subtitle || "Choose a song to start listening."}
                  </span>
                ) : (
                  <span className="block truncate text-[11px] text-slate-600">
                    {subtitle || "Choose a song to start listening."}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="flex min-w-0 basis-[52%] flex-col items-center gap-2 px-2">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void previousTrack()}
              className="rounded-full p-2 text-slate-700 transition hover:bg-slate-200"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M6 5h2v14H6z" />
                <path d="M18 6v12l-8.5-6L18 6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => void handlePlayToggle()}
              className="rounded-full bg-slate-900 p-2 text-white transition hover:bg-slate-700"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6 5h4v14H6z" />
                  <path d="M14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => void nextTrack()}
              className="rounded-full p-2 text-slate-700 transition hover:bg-slate-200"
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M16 5h2v14h-2z" />
                <path d="M6 6v12l8.5-6L6 6z" />
              </svg>
            </button>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="w-8 text-right text-[11px] text-slate-600">{formatTime(currentTime)}</span>
            <div className="relative h-1 flex-1 rounded-full bg-slate-300">
              <div
                className="absolute left-0 top-0 h-1 rounded-full bg-slate-600"
                style={{ width: `${progressValue * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => handleSeek(Number(event.target.value))}
                className="absolute left-0 top-0 h-1 w-full cursor-pointer opacity-0"
                aria-label="Seek"
              />
            </div>
            <span className="w-8 text-[11px] text-slate-600">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex min-w-0 basis-[24%] items-center justify-end gap-2 text-[11px] text-slate-700 md:text-xs">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-200"
            aria-label="Queue"
          >
            <QueueIcon size={18} />
          </button>

          <div className="group relative flex shrink-0 items-center">
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-200"
              aria-label={showMutedIcon ? "Unmute" : "Mute"}
            >
              {showMutedIcon ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M14 8.8V5l-4 4H6v4h4l4 4v-3.8l-1.8-1.8 1.8-1.6z" />
                  <path d="M16.5 9.5l-1.4 1.4 1.1 1.1-1.1 1.1 1.4 1.4 1.1-1.1 1.1 1.1 1.4-1.4-1.1-1.1 1.1-1.1-1.4-1.4-1.1 1.1z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M14 5l-4 4H6v6h4l4 4z" />
                  <path d="M16.5 8.5a5 5 0 010 7l1.5 1.5a7 7 0 000-10z" />
                </svg>
              )}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 h-28 w-10 -translate-x-1/2 rounded-xl border border-slate-300 bg-white opacity-0 shadow-sm transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                className="absolute left-1/2 top-1/2 h-1 w-20 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer accent-slate-700"
                aria-label="Volume"
              />
            </div>
          </div>

          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="h-10 w-10 shrink-0 appearance-none rounded-xl border border-slate-300 bg-white px-0 py-1 text-center text-[11px] font-semibold text-slate-800 transition hover:bg-slate-200 hover:text-slate-900 md:text-xs"
            aria-label="Speed"
          >
            {speeds.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void toggleLoop()}
            className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 transition ${
              loopEnabled
                ? "bg-slate-300 text-slate-900"
                : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
            aria-label={`Loop ${loopMode.toUpperCase()}`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M17 3l4 4-4 4V8H9a4 4 0 00-4 4v1H3v-1a6 6 0 016-6h8V3z" />
              <path d="M7 21l-4-4 4-4v3h8a4 4 0 004-4v-1h2v1a6 6 0 01-6 6H7v3z" />
            </svg>
            
            <span className="text-[11px] font-semibold">{loopMode.toUpperCase()}</span>
          </button>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
