import { create } from "zustand";
import type { QueueItem, QueueSourcePayload } from "../types/api";
import { apiFetch, apiUrl, getAuthHeaders } from "../services/api";
import { useQueueStore } from "./queueStore";
import { useAuthStore } from "./authStore";

type LoopMode = "off" | "one" | "queue";

const PREFETCH_DELAY_MS = 5000;
let prefetchedNext: { trackId: string; url: string } | null = null;
let prefetchController: AbortController | null = null;
let prefetchInFlightTrackId: string | null = null;
let prefetchRetryTimer: number | null = null;
let prefetchPlannedTrackId: string | null = null;
let currentObjectUrl: string | null = null;
let currentObjectTrackId: string | null = null;
let hasShownGuestPrompt = false;
let guestPromptTimer: number | null = null;

function revokeObjectUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function clearPrefetchTimer() {
  if (prefetchRetryTimer) {
    window.clearTimeout(prefetchRetryTimer);
    prefetchRetryTimer = null;
  }
}

function resetPrefetchState() {
  if (prefetchController) {
    prefetchController.abort();
    prefetchController = null;
  }
  clearPrefetchTimer();
  prefetchPlannedTrackId = null;
  prefetchInFlightTrackId = null;
  if (prefetchedNext && prefetchedNext.url) {
    revokeObjectUrl(prefetchedNext.url);
  }
  prefetchedNext = null;
}

function resetAudioSources() {
  resetPrefetchState();
  if (currentObjectUrl) {
    revokeObjectUrl(currentObjectUrl);
  }
  currentObjectUrl = null;
  currentObjectTrackId = null;
}

async function prefetchTrack(trackId: string) {
  if (!trackId) return;
  if (prefetchPlannedTrackId && prefetchPlannedTrackId !== trackId) return;
  if (currentObjectTrackId === trackId) return;
  if (prefetchedNext && prefetchedNext.trackId === trackId) return;
  if (prefetchController && prefetchInFlightTrackId === trackId) return;

  prefetchController = new AbortController();
  prefetchInFlightTrackId = trackId;
  clearPrefetchTimer();

  try {
    const res = await fetch(apiUrl(`/public/audio/${trackId}`), {
      headers: getAuthHeaders(),
      signal: prefetchController.signal
    });

    if (res.status === 404) {
      if (prefetchPlannedTrackId === trackId) {
        prefetchRetryTimer = window.setTimeout(() => prefetchTrack(trackId), PREFETCH_DELAY_MS);
      }
      return;
    }

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    prefetchedNext = { trackId, url };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    // ignore
  } finally {
    prefetchController = null;
    prefetchInFlightTrackId = null;
  }
}

function prefetchNextFromQueue(queue: QueueItem[]) {
  if (!Array.isArray(queue) || queue.length < 2) {
    resetPrefetchState();
    return;
  }

  const next = queue[1];
  if (!next || !next.track_id) {
    resetPrefetchState();
    return;
  }

  if (prefetchedNext && prefetchedNext.trackId === next.track_id) {
    prefetchPlannedTrackId = next.track_id;
    return;
  }

  if (prefetchController && prefetchInFlightTrackId === next.track_id) {
    prefetchPlannedTrackId = next.track_id;
    return;
  }

  if (prefetchRetryTimer && prefetchPlannedTrackId === next.track_id) {
    return;
  }

  if (prefetchPlannedTrackId && prefetchPlannedTrackId !== next.track_id) {
    resetPrefetchState();
  }

  prefetchPlannedTrackId = next.track_id;
  clearPrefetchTimer();
  prefetchRetryTimer = window.setTimeout(() => prefetchTrack(next.track_id), PREFETCH_DELAY_MS);
}

function setAudioSource(audioEl: HTMLAudioElement | null, trackId: string) {
  if (!audioEl) return;

  if (currentObjectUrl && currentObjectTrackId !== trackId) {
    revokeObjectUrl(currentObjectUrl);
    currentObjectUrl = null;
    currentObjectTrackId = null;
  }

  if (prefetchedNext && prefetchedNext.trackId === trackId) {
    audioEl.src = prefetchedNext.url;
    currentObjectUrl = prefetchedNext.url;
    currentObjectTrackId = trackId;
    prefetchedNext = null;
    return;
  }

  audioEl.src = apiUrl(`/public/audio/${trackId}`);
}

function promptGuestSignupOnce() {
  const { token, openAuthModal } = useAuthStore.getState();
  if (token || hasShownGuestPrompt) return;
  hasShownGuestPrompt = true;

  if (guestPromptTimer) {
    window.clearTimeout(guestPromptTimer);
  }

  guestPromptTimer = window.setTimeout(() => {
    if (!useAuthStore.getState().token) {
      openAuthModal("register", "Enjoying the music? Sign up free to save playlists and more.");
    }
  }, 30000);
}

type PlaybackState = {
  audioEl: HTMLAudioElement | null;
  currentTrack: QueueItem | null;
  currentTrackId: string | null;
  speed: number;
  loopMode: LoopMode;
  attachAudio: (el: HTMLAudioElement | null) => void;
  loadQueue: () => Promise<QueueItem[]>;
  syncAndPlay: () => Promise<void>;
  playNow: (payload: QueueSourcePayload) => Promise<void>;
  addToQueue: (payload: QueueSourcePayload) => Promise<void>;
  playQueueItem: (item: QueueItem) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  toggleLoop: () => Promise<void>;
  clearQueue: () => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  setSpeed: (speed: number) => void;
  stopAndReset: () => void;
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  audioEl: null,
  currentTrack: null,
  currentTrackId: null,
  speed: 1,
  loopMode: "off",
  attachAudio: (el) => {
    if (el) {
      el.controls = false;
    }
    set({ audioEl: el });
    const currentId = get().currentTrackId;
    if (el && currentId) {
      setAudioSource(el, currentId);
    }
  },
  loadQueue: async () => {
    const queue = await apiFetch<QueueItem[]>("/public/queue");
    useQueueStore.getState().setQueue(queue || []);
    prefetchNextFromQueue(queue || []);
    return queue || [];
  },
  syncAndPlay: async () => {
    const queue = await apiFetch<QueueItem[]>("/public/queue");
    useQueueStore.getState().setQueue(queue || []);

    const current = (queue || []).find((item) => item.is_playing);
    if (!current) return;

    const audioEl = get().audioEl;
    set({ currentTrack: current, currentTrackId: current.track_id });

    setAudioSource(audioEl, current.track_id);

    if (audioEl) {
      audioEl.playbackRate = 1;
    }
    set({ speed: 1 });

    try {
      await audioEl?.play();
    } catch {
      // ignore
    }

    promptGuestSignupOnce();
    prefetchNextFromQueue(queue || []);
  },
  playNow: async (payload) => {
    await apiFetch<{ track_id: string }>("/public/queue/play-now", {
      method: "POST",
      json: payload
    });
    await get().syncAndPlay();
  },
  addToQueue: async (payload) => {
    await apiFetch<{ track_id: string }>("/public/queue/add", {
      method: "POST",
      json: payload
    });
    await get().loadQueue();
  },
  playQueueItem: async (item) => {
    await apiFetch<{ track_id: string }>("/public/queue/play-now", {
      method: "POST",
      json: {
        source: item.source,
        source_track_id: item.source_track_id,
        title: item.title,
        duration: item.duration ?? null,
        image_url: item.image_url ?? null,
        album: item.album ?? null,
        artists: null
      }
    });
    await get().syncAndPlay();
  },
  nextTrack: async () => {
    await apiFetch<{ track_id: string }>("/public/queue/next", { method: "POST" });
    await get().syncAndPlay();
  },
  previousTrack: async () => {
    await apiFetch<{ track_id: string }>("/public/queue/previous", { method: "POST" });
    await get().syncAndPlay();
  },
  toggleLoop: async () => {
    const data = await apiFetch<{ loop_mode: LoopMode }>("/public/session/loop", { method: "POST" });
    const audioEl = get().audioEl;
    if (audioEl) {
      audioEl.loop = data.loop_mode === "one";
    }
    set({ loopMode: data.loop_mode });
  },
  clearQueue: async () => {
    await apiFetch<{ status: string }>("/public/queue/clear", { method: "POST" });
    const audioEl = get().audioEl;
    if (audioEl) {
      audioEl.pause();
      audioEl.src = "";
    }
    resetAudioSources();
    useQueueStore.getState().clear();
    set({ currentTrack: null, currentTrackId: null });
  },
  removeFromQueue: async (trackId) => {
    await apiFetch<{ status: string }>(`/public/queue/remove/${trackId}`, { method: "POST" });
    await get().loadQueue();
  },
  setSpeed: (speed) => {
    const audioEl = get().audioEl;
    if (audioEl) {
      audioEl.playbackRate = speed;
    }
    set({ speed });
  },
  stopAndReset: () => {
    const audioEl = get().audioEl;
    if (audioEl) {
      audioEl.pause();
      audioEl.src = "";
    }
    resetAudioSources();
    set({ currentTrack: null, currentTrackId: null, speed: 1, loopMode: "off" });
    useQueueStore.getState().clear();
  }
}));

