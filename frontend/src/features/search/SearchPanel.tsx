import React, { useEffect, useMemo, useRef, useState } from "react";
import GlassPanel from "../../components/GlassPanel";
import TrackRow from "../../components/TrackRow";
import TrackActionIconButton from "../../components/TrackActionIconButton";
import { AddToQueueIcon } from "../../components/icons/PlaybackIcons";
import EntityView from "./EntityView";
import { apiFetch } from "../../services/api";
import { usePlaybackStore } from "../../stores/playbackStore";
import { usePlaylistStore } from "../../stores/playlistStore";
import { useAuthStore } from "../../stores/authStore";
import type { SearchTab } from "../../components/SearchTabs";
import type {
  AlbumDetailResponse,
  AlbumMeta,
  ArtistMeta,
  ArtistSongsResponse,
  SearchAlbumsResponse,
  SearchArtistsResponse,
  SearchTracksResponse,
  Track
} from "../../types/api";

type SearchPanelProps = {
  query: string;
  activeTab: SearchTab;
  showInput?: boolean;
  onQueryChange?: (value: string) => void;
};

type EntityState = {
  type: "artist" | "album";
  title: string;
  subtitle: string;
  imageUrl?: string;
  round?: boolean;
};

const emptyResults = {
  songs: [] as Track[],
  artists: [] as ArtistMeta[],
  albums: [] as AlbumMeta[]
};

type CachedResult = Track[] | ArtistMeta[] | AlbumMeta[];

function songToPayload(song: Track) {
  return {
    source: song.source,
    source_track_id: song.id,
    title: song.title,
    duration: song.duration ?? null,
    image_url: song.image_url ?? null,
    album: song.album ?? null,
    artists: song.artists ?? null
  };
}

export default function SearchPanel({ query, activeTab, showInput = false, onQueryChange }: SearchPanelProps) {
  const [results, setResults] = useState(emptyResults);
  const [entity, setEntity] = useState<EntityState | null>(null);
  const [entitySongs, setEntitySongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityLoading, setEntityLoading] = useState(false);

  const requestIdRef = useRef(0);
  const searchCacheRef = useRef<Record<string, CachedResult>>({});
  const debounceTimer = useRef<number | null>(null);

  const playNow = usePlaybackStore((state) => state.playNow);
  const addToQueue = usePlaybackStore((state) => state.addToQueue);
  const openAddModal = usePlaylistStore((state) => state.openAddModal);
  const requireAuth = useAuthStore((state) => state.requireAuth);

  const activeResults = useMemo(() => {
    if (activeTab === "artists") return results.artists;
    if (activeTab === "albums") return results.albums;
    return results.songs;
  }, [activeTab, results]);

  useEffect(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      void runSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [query, activeTab]);

  const setTabResults = (tab: SearchTab, data: CachedResult) => {
    setResults((prev) => {
      if (tab === "songs") {
        return { ...prev, songs: data as Track[] };
      }
      if (tab === "artists") {
        return { ...prev, artists: data as ArtistMeta[] };
      }
      return { ...prev, albums: data as AlbumMeta[] };
    });
  };

  const runSearch = async (value: string) => {
    const trimmed = value.trim();
    const requestId = ++requestIdRef.current;

    if (!trimmed) {
      setLoading(false);
      setResults(emptyResults);
      setEntity(null);
      return;
    }

    const cacheKey = `${activeTab}:${trimmed.toLowerCase()}`;
    const cached = searchCacheRef.current[cacheKey];
    if (cached) {
      setEntity(null);
      setTabResults(activeTab, cached);
      setLoading(false);
      return;
    }

    setEntity(null);
    setLoading(true);

    try {
      if (activeTab === "artists") {
        const data = await apiFetch<SearchArtistsResponse>(
          `/public/search/artists?q=${encodeURIComponent(trimmed)}`
        );
        if (requestId !== requestIdRef.current) return;
        const items = data.artists || [];
        searchCacheRef.current[cacheKey] = items;
        setTabResults("artists", items);
      } else if (activeTab === "albums") {
        const data = await apiFetch<SearchAlbumsResponse>(
          `/public/search/albums?q=${encodeURIComponent(trimmed)}`
        );
        if (requestId !== requestIdRef.current) return;
        const items = data.albums || [];
        searchCacheRef.current[cacheKey] = items;
        setTabResults("albums", items);
      } else {
        const data = await apiFetch<SearchTracksResponse>(
          `/public/search?q=${encodeURIComponent(trimmed)}`
        );
        if (requestId !== requestIdRef.current) return;
        const items = data.tracks || [];
        searchCacheRef.current[cacheKey] = items;
        setTabResults("songs", items);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const openArtistView = async (artist: ArtistMeta) => {
    if (!artist?.id) return;
    setEntity({
      type: "artist",
      title: artist.name || "Unknown artist",
      subtitle: artist.role || "Artist",
      imageUrl: artist.image_url,
      round: true
    });
    setEntitySongs([]);
    setEntityLoading(true);

    const data = await apiFetch<ArtistSongsResponse>(`/public/artists/${artist.id}/songs`);
    const subtitleParts: string[] = [];
    if (data.artist?.language) subtitleParts.push(`Language: ${data.artist.language}`);
    if (artist.role) subtitleParts.push(artist.role);

    setEntity({
      type: "artist",
      title: data.artist?.name || artist.name || "Unknown artist",
      subtitle: subtitleParts.join(" - ") || artist.role || "Artist",
      imageUrl: data.artist?.image_url || artist.image_url,
      round: true
    });
    setEntitySongs(data.songs || []);
    setEntityLoading(false);
  };

  const openAlbumView = async (album: AlbumMeta) => {
    if (!album?.id) return;
    setEntity({
      type: "album",
      title: album.name || "Unknown album",
      subtitle: [album.year, album.artist].filter(Boolean).join(" - "),
      imageUrl: album.image_url,
      round: false
    });
    setEntitySongs([]);
    setEntityLoading(true);

    const data = await apiFetch<AlbumDetailResponse>(`/public/albums/${album.id}`);
    const info = data.album || album;
    const subtitleParts: Array<string | number> = [];
    if (info.year) subtitleParts.push(info.year);
    if (info.artist) subtitleParts.push(info.artist);
    if (info.language) subtitleParts.push(info.language);
    if (info.explicit_content) subtitleParts.push("Explicit");

    setEntity({
      type: "album",
      title: info.name || album.name || "Unknown album",
      subtitle: subtitleParts.join(" - "),
      imageUrl: info.image_url || album.image_url,
      round: false
    });
    setEntitySongs(data.songs || []);
    setEntityLoading(false);
  };

  const handleAddToPlaylist = async (song: Track) => {
    if (!requireAuth("add to playlists")) return;
    await openAddModal(song);
  };

  const renderSongActions = (song: Track) => (
    <>
      <TrackActionIconButton
        label="Add to queue"
        onPress={() => {
          void addToQueue(songToPayload(song));
        }}
      >
        <AddToQueueIcon size={14} />
      </TrackActionIconButton>
      <TrackActionIconButton
        label="Playlist"
        shape="circle"
        onPress={() => {
          void handleAddToPlaylist(song);
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="7" x2="12" y2="17" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      </TrackActionIconButton>
    </>
  );

  const renderSongs = (songs: Track[]) => {
    if (entityLoading) {
      return <div className="text-sm text-muted">Loading songs...</div>;
    }

    if (!songs.length) {
      return <div className="text-sm text-muted">No songs found.</div>;
    }

    return (
      <div className="space-y-2">
        {songs.map((song, index) => (
          <div key={song.id} className="space-y-2">
            <TrackRow
              title={song.title || "Untitled"}
              subtitle={[song.artist, song.album?.name].filter(Boolean).join(" - ")}
              imageUrl={song.image_url}
              onClick={() => void playNow(songToPayload(song))}
              actions={renderSongActions(song)}
            />
            {index < songs.length - 1 ? <div className="mx-auto h-px w-4/5 bg-white/30" /> : null}
          </div>
        ))}
      </div>
    );
  };

  const renderArtists = (artists: ArtistMeta[]) => {
    if (!artists.length) {
      return <div className="text-sm text-muted">No artists found.</div>;
    }

    return (
      <div className="space-y-2">
        {artists.map((artist, index) => (
          <div key={artist.id || artist.name} className="space-y-2">
            <TrackRow
              title={artist.name || "Unknown artist"}
              subtitle={artist.role || "Artist"}
              imageUrl={artist.image_url}
              roundThumb
              onClick={() => void openArtistView(artist)}
            />
            {index < artists.length - 1 ? <div className="mx-auto h-px w-4/5 bg-white/30" /> : null}
          </div>
        ))}
      </div>
    );
  };

  const renderAlbums = (albums: AlbumMeta[]) => {
    if (!albums.length) {
      return <div className="text-sm text-muted">No albums found.</div>;
    }

    return (
      <div className="space-y-2">
        {albums.map((album, index) => (
          <div key={album.id || album.name} className="space-y-2">
            <TrackRow
              title={album.name || "Unknown album"}
              subtitle={[album.year, album.artist].filter(Boolean).join(" - ")}
              imageUrl={album.image_url}
              onClick={() => void openAlbumView(album)}
            />
            {index < albums.length - 1 ? <div className="mx-auto h-px w-4/5 bg-white/30" /> : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <GlassPanel className="flex h-full min-h-0 flex-col gap-4 p-5">
      {showInput ? (
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="Search songs, artists, albums"
          className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-slate-300"
        />
      ) : null}

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-1 pb-5">
        {entity ? (
          <EntityView
            entity={entity}
            songs={entitySongs}
            loading={entityLoading}
            onBack={() => setEntity(null)}
            onPlay={(song) => void playNow(songToPayload(song))}
            onQueue={(song) => void addToQueue(songToPayload(song))}
            onAddToPlaylist={(song) => void handleAddToPlaylist(song)}
          />
        ) : loading ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : query.trim().length === 0 ? (
          <div className="text-sm text-muted">Start typing to search the catalog.</div>
        ) : activeTab === "artists" ? (
          renderArtists(activeResults as ArtistMeta[])
        ) : activeTab === "albums" ? (
          renderAlbums(activeResults as AlbumMeta[])
        ) : (
          renderSongs(activeResults as Track[])
        )}
      </div>
    </GlassPanel>
  );
}
