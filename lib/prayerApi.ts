import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import { addDays, localDateKey } from './localDate';
import type { PrayerLogEntry, PrayerSlot } from './types';

/**
 * Prayer slots and the prayer log live in Firestore, not AsyncStorage like the
 * mood log does. A streak has to survive a reinstall or a new phone — losing a
 * long one to a handset upgrade is the kind of thing people uninstall over.
 */

/**
 * Suggestions shown on first run. DISABLED deliberately: arming three daily
 * notifications because someone opened a screen is how apps get their
 * notification permission revoked.
 */
export const DEFAULT_SLOTS: PrayerSlot[] = [
  { id: 'morning', label: 'Morning', hour: 6, minute: 30, enabled: false },
  { id: 'midday', label: 'Midday', hour: 13, minute: 0, enabled: false },
  { id: 'evening', label: 'Evening', hour: 21, minute: 0, enabled: false },
];

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to manage prayer times');
  return uid;
}

function configDoc() {
  return doc(db, 'users', requireUid(), 'prayer', 'config');
}

function logCollection() {
  return collection(db, 'users', requireUid(), 'prayerLog');
}

export async function getPrayerSlots(): Promise<PrayerSlot[]> {
  const snapshot = await getDoc(configDoc());
  if (!snapshot.exists()) return DEFAULT_SLOTS;
  const slots = snapshot.data()?.slots;
  return Array.isArray(slots) ? (slots as PrayerSlot[]) : DEFAULT_SLOTS;
}

export async function savePrayerSlots(slots: PrayerSlot[]): Promise<void> {
  await setDoc(configDoc(), { slots, updatedAt: serverTimestamp() }, { merge: true });
}

export async function logPrayer(input: {
  slotId: string | null;
  note?: string;
}): Promise<PrayerLogEntry> {
  const now = new Date();
  const localDate = localDateKey(now);
  const ref = await addDoc(logCollection(), {
    slotId: input.slotId,
    localDate,
    loggedAt: serverTimestamp(),
    ...(input.note ? { note: input.note } : {}),
  });
  return { id: ref.id, slotId: input.slotId, loggedAt: now, localDate, note: input.note };
}

export async function updatePrayerNote(entryId: string, note: string): Promise<void> {
  await updateDoc(doc(db, 'users', requireUid(), 'prayerLog', entryId), { note });
}

export async function deletePrayerEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', requireUid(), 'prayerLog', entryId));
}

export async function getPrayerLog(sinceDays: number): Promise<PrayerLogEntry[]> {
  const since = addDays(localDateKey(new Date()), -sinceDays);
  const snapshot = await getDocs(
    query(
      logCollection(),
      where('localDate', '>=', since),
      orderBy('localDate', 'desc'),
      limit(500),
    ),
  );
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      slotId: data.slotId ?? null,
      // serverTimestamp() reads back null until the write lands, so an entry
      // logged offline still renders immediately with a sensible time.
      loggedAt: data.loggedAt instanceof Timestamp ? data.loggedAt.toDate() : new Date(),
      localDate: data.localDate,
      note: data.note,
    };
  });
}
