import React from "react";
import GlassPanel from "../../components/GlassPanel";
import { useAuthStore } from "../../stores/authStore";
import { usePlaylistStore } from "../../stores/playlistStore";

export type LibraryFilter = "all" | "playlists" | "artists" | "albums";

type LibraryPanelProps = {
  activeFilter: LibraryFilter;
  onFilterChange: (tab: LibraryFilter) => void;
  onPlaylistSelect: (playlistId: string) => void;
};

const tabs: Array<Exclude<LibraryFilter, "all">> = ["playlists", "artists", "albums"];

export default function LibraryPanel({ activeFilter, onFilterChange, onPlaylistSelect }: LibraryPanelProps) {
  const token = useAuthStore((state) => state.token);
  const requireAuth = useAuthStore((state) => state.requireAuth);
  const playlists = usePlaylistStore((state) => state.playlists);
  const openCreateModal = usePlaylistStore((state) => state.openCreateModal);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);

  return (
    <GlassPanel className="flex h-full min-h-0 flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Your Library</div>
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

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onFilterChange(tab)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              activeFilter === tab
                ? "bg-slate-900 text-white"
                : "bg-white/60 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
        {activeFilter !== "all" ? (
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className="rounded-xl bg-white/60 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            aria-label="Clear filter"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-1 pb-5">
        {(activeFilter === "all" || activeFilter === "playlists") && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Playlists</div>
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
                      onClick={() => onPlaylistSelect(playlist.id)}
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
        )}

        {(activeFilter === "all" || activeFilter === "artists") && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Artists</div>
            <div className="rounded-xl bg-white/30 px-3 py-2 text-sm text-muted">
              Followed artists will appear here.
            </div>
          </div>
        )}

        {(activeFilter === "all" || activeFilter === "albums") && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Albums</div>
            <div className="rounded-xl bg-white/30 px-3 py-2 text-sm text-muted">
              Liked albums will appear here.
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
