import React from "react";
import GlassPanel from "../../components/GlassPanel";
import { useAuthStore } from "../../stores/authStore";
import { usePlaylistStore } from "../../stores/playlistStore";

export default function PlaylistsPanel() {
  const token = useAuthStore((state) => state.token);
  const requireAuth = useAuthStore((state) => state.requireAuth);
  const playlists = usePlaylistStore((state) => state.playlists);
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  const openCreateModal = usePlaylistStore((state) => state.openCreateModal);
  const viewPlaylist = usePlaylistStore((state) => state.viewPlaylist);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);

  if (currentPlaylist) {
    return null;
  }

  return (
    <GlassPanel className="flex min-h-0 flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">My Playlists</div>
        <button
          type="button"
          onClick={() => {
            if (requireAuth("create playlists")) {
              openCreateModal();
            }
          }}
          className="rounded-lg bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          New
        </button>
      </div>

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-1 pb-5">
        {!token ? (
          <div className="text-sm text-muted">Sign up free to create playlists.</div>
        ) : playlists.length === 0 ? (
          <div className="text-sm text-muted">No playlists yet.</div>
        ) : (
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-slate-200/70"
              >
                <button
                  type="button"
                  onClick={() => void viewPlaylist(playlist.id)}
                  className="text-left text-sm font-semibold text-slate-900"
                >
                  {playlist.name}
                </button>
                <button
                  type="button"
                  onClick={() => void deletePlaylist(playlist.id)}
                  className="rounded-lg bg-white/60 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
