export type ArtistMeta = {
  id?: string;
  name?: string;
  role?: string;
  type?: string;
  url?: string;
  image_url?: string;
  dominant_language?: string;
  language?: string;
  is_verified?: boolean;
};

export type AlbumMeta = {
  id?: string;
  name?: string;
  year?: number;
  type?: string;
  language?: string;
  explicit_content?: boolean;
  artist?: string;
  url?: string;
  image_url?: string;
  songCount?: number;
};

export type Track = {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  playCount?: number;
  source: string;
  image_url?: string;
  album?: AlbumMeta;
  artists?: ArtistMeta[];
};

export type SearchTracksResponse = { tracks: Track[] };
export type SearchArtistsResponse = { artists: ArtistMeta[] };
export type SearchAlbumsResponse = { albums: AlbumMeta[] };

export type AlbumDetailResponse = { album: AlbumMeta; songs: Track[] };
export type ArtistSongsResponse = { artist: ArtistMeta; songs: Track[]; total?: number };

export type QueueItem = {
  track_id: string;
  source: string;
  source_track_id: string;
  title: string;
  duration?: number;
  artist?: string;
  image_url?: string;
  album?: AlbumMeta;
  is_playing?: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  is_public: boolean;
};

export type PlaylistTrack = {
  track_id: string;
  title: string;
  source: string;
  source_track_id: string;
  duration?: number;
  image_url?: string;
  artist?: string;
  album?: AlbumMeta;
  position?: number;
};

export type SessionState = {
  current_track_id: string | null;
  position_ms: number;
  state: string;
  loop_mode: "off" | "one" | "queue";
  pointer: number;
  can_play: boolean;
};

export type QueueSourcePayload = {
  source: string;
  source_track_id: string;
  title: string;
  duration?: number | null;
  image_url?: string | null;
  album?: AlbumMeta | null;
  artists?: ArtistMeta[] | null;
};
