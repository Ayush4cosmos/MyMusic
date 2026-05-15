import React from "react";
import TrackRow from "../../components/TrackRow";
import TrackActionIconButton from "../../components/TrackActionIconButton";
import { AddToQueueIcon } from "../../components/icons/PlaybackIcons";
import type { Track } from "../../types/api";
import { cn } from "../../utils/cn";

type EntityState = {
  type: "artist" | "album";
  title: string;
  subtitle: string;
  imageUrl?: string;
  round?: boolean;
};

type EntityViewProps = {
  entity: EntityState;
  songs: Track[];
  loading: boolean;
  onBack: () => void;
  onPlay: (song: Track) => void;
  onQueue: (song: Track) => void;
  onAddToPlaylist: (song: Track) => void;
};

export default function EntityView({
  entity,
  songs,
  loading,
  onBack,
  onPlay,
  onQueue,
  onAddToPlaylist
}: EntityViewProps) {
  const isAlbum = entity.type === "album";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900"
      >
        Back to results
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/30 p-5 shadow-soft">
        {entity.imageUrl ? (
          <div
            className="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center opacity-60 md:block"
            style={{ backgroundImage: `url(\"${entity.imageUrl}\")` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
        <div className="relative flex items-center gap-4">
          <div
            className={cn(
              "h-20 w-20 flex-shrink-0 rounded-2xl bg-white/50 bg-cover bg-center",
              entity.round && "rounded-full"
            )}
            style={entity.imageUrl ? { backgroundImage: `url(\"${entity.imageUrl}\")` } : undefined}
          />
          <div>
            <div className="text-lg font-semibold text-slate-900">{entity.title}</div>
            <div className="text-sm text-muted">{entity.subtitle}</div>
            {isAlbum ? <div className="mt-2 text-xs text-muted">Album</div> : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading songs...</div>
      ) : songs.length === 0 ? (
        <div className="text-sm text-muted">No songs found.</div>
      ) : (
        <div className="space-y-2">
          {songs.map((song) => (
            <TrackRow
              key={song.id}
              title={song.title || "Untitled"}
              subtitle={[song.artist, song.album?.name].filter(Boolean).join(" - ")}
              imageUrl={song.image_url}
              onClick={() => onPlay(song)}
              actions={
                <>
                  <TrackActionIconButton label="Add to queue" onPress={() => onQueue(song)}>
                    <AddToQueueIcon size={14} />
                  </TrackActionIconButton>
                  <TrackActionIconButton
                    label="Playlist"
                    shape="circle"
                    onPress={() => onAddToPlaylist(song)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="7" x2="12" y2="17" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                    </svg>
                  </TrackActionIconButton>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
