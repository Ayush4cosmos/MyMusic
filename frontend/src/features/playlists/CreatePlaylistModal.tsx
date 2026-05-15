import React, { useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import { usePlaylistStore } from "../../stores/playlistStore";

export default function CreatePlaylistModal() {
  const isOpen = usePlaylistStore((state) => state.isCreateModalOpen);
  const closeModal = usePlaylistStore((state) => state.closeCreateModal);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Enter a playlist name");
      return;
    }
    setError(null);
    await createPlaylist(name.trim(), isPublic);
    setName("");
    setIsPublic(false);
    closeModal();
  };

  return (
    <Modal
      open={isOpen}
      title="Create Playlist"
      onClose={() => {
        setError(null);
        closeModal();
      }}
      actions={
        <>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Playlist name"
          className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-slate-300"
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="h-4 w-4 rounded border-white/60"
          />
          Public playlist
        </label>
        {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      </div>
    </Modal>
  );
}
