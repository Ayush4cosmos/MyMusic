import { create } from "zustand";
import type { Playlist, PlaylistTrack, Track } from "../types/api";
import { apiFetch } from "../services/api";
import { useAuthStore } from "./authStore";
import { usePlaybackStore } from "./playbackStore";

type PlaylistState = {
  playlists: Playlist[];
  tracks: PlaylistTrack[];
  currentPlaylist: Playlist | null;
  isCreateModalOpen: boolean;
  isAddModalOpen: boolean;
  pendingTrack: Track | null;
  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, isPublic: boolean) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  viewPlaylist: (playlistId: string) => Promise<void>;
  loadPlaylistTracks: (playlistId: string) => Promise<void>;
  playCurrentPlaylist: () => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openAddModal: (track: Track) => Promise<void>;
  closeAddModal: () => void;
  addSongToPlaylist: (playlistId: string) => Promise<void>;
  backToList: () => void;
  reset: () => void;
};

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  tracks: [],
  currentPlaylist: null,
  isCreateModalOpen: false,
  isAddModalOpen: false,
  pendingTrack: null,
  loadPlaylists: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ playlists: [] });
      return;
    }
    const data = await apiFetch<Playlist[]>("/me/playlists");
    set({ playlists: data || [] });
  },
  createPlaylist: async (name, isPublic) => {
    await apiFetch<Playlist>("/me/playlists", {
      method: "POST",
      json: { name, is_public: isPublic }
    });
    await get().loadPlaylists();
  },
  deletePlaylist: async (playlistId) => {
    await apiFetch<{ status: string }>(`/me/playlists/${playlistId}`, { method: "DELETE" });
    await get().loadPlaylists();

    if (get().currentPlaylist?.id === playlistId) {
      get().backToList();
    }
  },
  viewPlaylist: async (playlistId) => {
    const playlist = await apiFetch<Playlist>(`/me/playlists/${playlistId}`);
    set({ currentPlaylist: playlist });
    await get().loadPlaylistTracks(playlistId);
  },
  loadPlaylistTracks: async (playlistId) => {
    const tracks = await apiFetch<PlaylistTrack[]>(`/me/playlists/${playlistId}/tracks`);
    set({ tracks: tracks || [] });
  },
  playCurrentPlaylist: async () => {
    const current = get().currentPlaylist;
    if (!current) return;
    await apiFetch<{ track_id: string }>(`/me/playlists/${current.id}/play`, { method: "POST" });
    await usePlaybackStore.getState().syncAndPlay();
  },
  removeTrack: async (playlistId, trackId) => {
    await apiFetch<{ status: string }>(`/me/playlists/${playlistId}/tracks/${trackId}`, {
      method: "DELETE"
    });
    await get().loadPlaylistTracks(playlistId);
  },
  openCreateModal: () => {
    set({ isCreateModalOpen: true });
  },
  closeCreateModal: () => {
    set({ isCreateModalOpen: false });
  },
  openAddModal: async (track) => {
    set({ pendingTrack: track, isAddModalOpen: true });
    await get().loadPlaylists();
  },
  closeAddModal: () => {
    set({ isAddModalOpen: false, pendingTrack: null });
  },
  addSongToPlaylist: async (playlistId) => {
    const track = get().pendingTrack;
    if (!track) return;
    await apiFetch<{ status: string }>(`/me/playlists/${playlistId}/add-track`, {
      method: "POST",
      json: {
        source: track.source,
        source_track_id: track.id,
        title: track.title,
        duration: track.duration ?? null,
        image_url: track.image_url ?? null,
        album: track.album ?? null,
        artists: track.artists ?? null
      }
    });
    set({ isAddModalOpen: false, pendingTrack: null });
  },
  backToList: () => {
    set({ currentPlaylist: null, tracks: [] });
  },
  reset: () => {
    set({
      playlists: [],
      tracks: [],
      currentPlaylist: null,
      isCreateModalOpen: false,
      isAddModalOpen: false,
      pendingTrack: null
    });
  }
}));
