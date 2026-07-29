import { create } from 'zustand';

import { localDateKey } from '@/lib/localDate';
import { computeStreak, type StreakResult } from '@/lib/prayerStreak';
import {
  getPrayerLog,
  getPrayerSlots,
  logPrayer as logPrayerRemote,
  savePrayerSlots,
  updatePrayerNote as updateNoteRemote,
  updatePrayerText as updatePrayerTextRemote,
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
  setPrayer: (entryId: string, prayer: string) => Promise<void>;
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
      const { entry, committed } = logPrayerRemote({ slotId, note });
      const log = [entry, ...get().log];
      set({ log, streak: recompute(log) });

      // Deliberately NOT awaited. Offline this stays queued inside the Firestore
      // client and flushes on reconnect; awaiting it is what made "I prayed" a
      // silent no-op in aeroplane mode.
      committed.catch((error) => console.error('Prayer log write failed', error));

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

  setPrayer: async (entryId, prayer) => {
    const log = get().log.map((entry) => (entry.id === entryId ? { ...entry, prayer } : entry));
    set({ log });
    try {
      await updatePrayerTextRemote(entryId, prayer);
    } catch (error) {
      // Local state keeps the prayer deliberately. The user has already spent a
      // followUp quota unit on it, so they get to read, copy and share it; it
      // just will not survive a reload. Hiding it would waste the spend twice.
      console.error('Failed to save prayer', error);
    }
  },

  todayEntries: () => {
    const today = localDateKey(new Date());
    return get().log.filter((entry) => entry.localDate === today);
  },
}));
