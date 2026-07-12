import { create } from 'zustand';
import { getIsPro } from '@/lib/purchases';

interface PurchasesState {
  isPro: boolean;
  setPro: (v: boolean) => void;
  refresh: () => Promise<void>;
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  isPro: false,
  setPro: (v) => set({ isPro: v }),
  refresh: async () => {
    try {
      set({ isPro: await getIsPro() });
    } catch (err) {
      console.warn('Failed to refresh Pro status', err);
    }
  },
}));
