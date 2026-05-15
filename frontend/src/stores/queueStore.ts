import { create } from "zustand";
import type { QueueItem } from "../types/api";

type QueueState = {
  items: QueueItem[];
  setQueue: (items: QueueItem[]) => void;
  clear: () => void;
};

export const useQueueStore = create<QueueState>((set) => ({
  items: [],
  setQueue: (items) => set({ items }),
  clear: () => set({ items: [] })
}));
