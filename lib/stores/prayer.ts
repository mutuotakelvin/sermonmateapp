import { create } from 'zustand';

import { localDateKey } from '@/lib/localDate';
import { computeStreak, type StreakResult } from '@/lib/prayerStreak';
import {
  getPrayerLog,
  getPrayerSlots,
  logPrayer as logPrayerRemote,
  savePrayerSlots,
  updatePrayerNote as updateNoteRemote,
} from '@/lib/prayerApi';
import type { PrayerLogEntry, PrayerSlot } from '@/lib/types';

/** Enough history for the month view and any plausible streak. */
const HISTORY_DAYS = 400;

interface PrayerState {
  slots: PrayerSlot[];
  log: PrayerLogEntry[];
  streak: StreakResult;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setSlots: (slots: PrayerSlot[]) => Promise<void>;
  logPrayer: (slotId: string | null, note?: string) => Promise<PrayerLogEntry | null>;
  setNote: (entryId: string, note: string) => Promise<void>;
  todayEntries: () => PrayerLogEntry[];
}

function recompute(log: PrayerLogEntry[]): StreakResult {
  return computeStreak(log.map((entry) => entry.localDate), localDateKey(new Date()));
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  slots: [],
  log: [],
  streak: { current: 0, graceDates: [] },
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    try {
      const [slots, log] = await Promise.all([getPrayerSlots(), getPrayerLog(HISTORY_DAYS)]);
      set({ slots, log, streak: recompute(log), loading: false, loaded: true });
    } catch (error) {
      console.error('Failed to load prayer data', error);
      set({ loading: false });
    }
  },

  setSlots: async (slots) => {
    // Optimistic: the screen re-arms reminders off this list straight after.
    set({ slots });
    try {
      await savePrayerSlots(slots);
    } catch (error) {
      console.error('Failed to save prayer times', error);
      throw error;
    }
  },

  logPrayer: async (slotId, note) => {
    try {
      const entry = await logPrayerRemote({ slotId, note });
      const log = [entry, ...get().log];
      set({ log, streak: recompute(log) });
      return entry;
    } catch (error) {
      console.error('Failed to log prayer', error);
      return null;
    }
  },

  setNote: async (entryId, note) => {
    const log = get().log.map((entry) => (entry.id === entryId ? { ...entry, note } : entry));
    set({ log });
    try {
      await updateNoteRemote(entryId, note);
    } catch (error) {
      console.error('Failed to save note', error);
    }
  },

  todayEntries: () => {
    const today = localDateKey(new Date());
    return get().log.filter((entry) => entry.localDate === today);
  },
}));
