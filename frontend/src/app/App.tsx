import React, { useEffect, useRef, useState } from "react";
import Button from "../components/Button";
import SearchTabs, { type SearchTab } from "../components/SearchTabs";
import AuthModal from "../features/auth/AuthModal";
import SearchPanel from "../features/search/SearchPanel";
import AudioPlayer from "../features/player/AudioPlayer";
import NowPlayingCard from "../features/player/NowPlayingCard";
import QueueList from "../features/queue/QueueList";
import PlaylistView from "../features/playlists/PlaylistView";
import CreatePlaylistModal from "../features/playlists/CreatePlaylistModal";
import AddToPlaylistModal from "../features/playlists/AddToPlaylistModal";
import LibraryPanel, { type LibraryFilter } from "../features/library/LibraryPanel";
import { useAuthStore } from "../stores/authStore";
import { usePlaybackStore } from "../stores/playbackStore";
import { usePlaylistStore } from "../stores/playlistStore";

const INTERNATIONAL_CATALOG_ALERT_KEY = "raish-dismissed-international-catalog-alert";

export default function App() {
  const token = useAuthStore((state) => state.token);
  const username = useAuthStore((state) => state.username);
  const initAuth = useAuthStore((state) => state.init);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const logout = useAuthStore((state) => state.logout);

  const loadQueue = usePlaybackStore((state) => state.loadQueue);
  const stopAndReset = usePlaybackStore((state) => state.stopAndReset);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const loadPlaylists = usePlaylistStore((state) => state.loadPlaylists);
  const resetPlaylists = usePlaylistStore((state) => state.reset);
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  const viewPlaylist = usePlaylistStore((state) => state.viewPlaylist);

  const prevToken = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSearchTabs, setShowSearchTabs] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState<SearchTab>("songs");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [showNowPlayingCard, setShowNowPlayingCard] = useState(false);
  const [showInternationalCatalogAlert, setShowInternationalCatalogAlert] = useState(false);
  const [isCatalogAlertDismissed, setIsCatalogAlertDismissed] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(INTERNATIONAL_CATALOG_ALERT_KEY) === "1";
    setIsCatalogAlertDismissed(dismissed);
    setShowInternationalCatalogAlert(!dismissed);
  }, []);

  useEffect(() => {
    void loadQueue();
    if (token) {
      void loadPlaylists();
    } else {
      resetPlaylists();
    }

    if (prevToken.current && !token) {
      stopAndReset();
    }

    prevToken.current = token;
  }, [token, loadQueue, loadPlaylists, resetPlaylists, stopAndReset]);

  const handleSearchChange = (value: string) => {
    setShowNowPlayingCard(false);
    setSearchQuery(value);
    if (value.trim()) {
      setIsSearchActive(true);
    } else {
      setIsSearchActive(false);
    }
  };

  const handleLibraryFilterChange = (filter: LibraryFilter) => {
    setLibraryFilter(filter);
    setShowNowPlayingCard(false);
    setIsSearchActive(false);
    setShowSearchTabs(false);
  };

  const handlePlaylistSelect = (playlistId: string) => {
    setShowNowPlayingCard(false);
    setIsSearchActive(false);
    setShowSearchTabs(false);
    void viewPlaylist(playlistId);
  };

  useEffect(() => {
    if (!currentTrack) {
      setShowNowPlayingCard(false);
    }
  }, [currentTrack]);

  const searchVisible = isSearchActive && searchQuery.trim().length > 0;

  const dismissInternationalCatalogAlert = () => {
    window.localStorage.setItem(INTERNATIONAL_CATALOG_ALERT_KEY, "1");
    setIsCatalogAlertDismissed(true);
    setShowInternationalCatalogAlert(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {showInternationalCatalogAlert ? (
        <div className="pointer-events-none fixed left-4 top-4 z-50 max-w-[360px]">
          <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v5" />
                <path d="M12 17h.01" />
                <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.5a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">International catalog is down</div>
              <div className="mt-0.5 text-xs leading-5 text-slate-600">
                International artists (Non-Indian) may not load right now. We're fixing it and also coming up with major changes and features in a month. Stay tuned for <b>Major updates!</b>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissInternationalCatalogAlert}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Dismiss catalog alert"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : isCatalogAlertDismissed ? (
        <button
          type="button"
          onClick={() => setShowInternationalCatalogAlert(true)}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur transition hover:bg-slate-50"
          aria-label="Show international catalog alert"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v5" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.5a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
            </svg>
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              1
            </span>
          </span>
          Catalog alert
        </button>
      ) : null}
      <div className="flex h-full w-full flex-col gap-2 px-2 pb-2 pt-2">
        <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,360px)]">
          <div className="hidden lg:block" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full max-w-[520px] items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-700 transition hover:bg-slate-200"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11l9-8 9 8" />
                  <path d="M5 10v10h5v-6h4v6h5V10" />
                </svg>
              </button>
              <div className="relative flex-1">
                <input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onFocus={() => {
                    setShowNowPlayingCard(false);
                    setIsSearchActive(true);
                    setShowSearchTabs(true);
                  }}
                  onBlur={() => {
                    setShowSearchTabs(false);
                    if (!searchQuery.trim()) {
                      setIsSearchActive(false);
                    }
                  }}
                  placeholder="Search songs, artists, albums"
                  className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-slate-300"
                />
                {showSearchTabs ? (
                  <div
                    className="absolute left-0 top-full z-20 mt-1.5 w-full"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <SearchTabs active={activeSearchTab} onChange={setActiveSearchTab} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {token ? (
              <>
                <Button variant="secondary">{username || "User"}</Button>
                <Button variant="secondary" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => openAuthModal("login")}>
                  Login
                </Button>
                <Button onClick={() => openAuthModal("register")}>Register</Button>
              </>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 pb-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,360px)]">
          <div className="min-h-0">
            <LibraryPanel
              activeFilter={libraryFilter}
              onFilterChange={handleLibraryFilterChange}
              onPlaylistSelect={handlePlaylistSelect}
            />
          </div>

          <div className="min-h-0">
            {showNowPlayingCard && currentTrack ? (
              <NowPlayingCard onClose={() => setShowNowPlayingCard(false)} />
            ) : searchVisible ? (
              <SearchPanel query={searchQuery} activeTab={activeSearchTab} />
            ) : currentPlaylist ? (
              <div className="h-full min-h-0">
                <PlaylistView />
              </div>
            ) : (
              <div className="glass-panel glass-inset flex h-full min-h-0 flex-col gap-4 rounded-2xl p-6">
                <div className="text-lg font-semibold text-slate-900">Browse your library</div>
                <div className="text-sm text-muted">
                  Use the search bar or pick a playlist from the left.
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0">
            <div className="flex h-full min-h-0 flex-col">
              <QueueList />
            </div>
          </div>
        </div>

        <div className="-mt-2 mb-2 flex shrink-0 justify-center">
          <AudioPlayer onOpenNowPlaying={() => setShowNowPlayingCard(true)} />
        </div>
      </div>

      <AuthModal />
      <CreatePlaylistModal />
      <AddToPlaylistModal />
    </div>
  );
}
