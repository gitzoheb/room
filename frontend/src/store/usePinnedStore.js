import { create } from 'zustand';
import { getPinnedMessages } from '../services/axios';

const usePinnedStore = create((set) => ({
  pinnedMessages: [],
  loading: false,
  error: null,

  fetchPinnedMessages: async () => {
    set({ loading: true });
    try {
      const res = await getPinnedMessages();
      set({ pinnedMessages: res.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  clearPinned: () => set({ pinnedMessages: [] }),
}));

export default usePinnedStore; 