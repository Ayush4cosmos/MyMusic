import React from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import { usePlaylistStore } from "../../stores/playlistStore";

export default function AddToPlaylistModal() {
  const isOpen = usePlaylistStore((state) => state.isAddModalOpen);
  const closeModal = usePlaylistStore((state) => state.closeAddModal);
  const playlists = usePlaylistStore((state) => state.playlists);
  const pendingTrack = usePlaylistStore((state) => state.pendingTrack);
  const addSongToPlaylist = usePlaylistStore((state) => state.addSongToPlaylist);

  return (
    <Modal
      open={isOpen}
      title="Add to Playlist"
      onClose={closeModal}
      actions={
        <Button variant="ghost" onClick={closeModal}>
          Cancel
        </Button>
      }
    >
      {!pendingTrack ? (
        <div className="text-sm text-muted">Select a track first.</div>
      ) : playlists.length === 0 ? (
        <div className="text-sm text-muted">No playlists found.</div>
      ) : (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              className="w-full rounded-xl bg-white/60 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
              onClick={() => void addSongToPlaylist(playlist.id)}
            >
              {playlist.name}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
