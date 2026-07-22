import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { SavedSermon } from './types';

// Firestore document shape at users/{uid}/sermons/{sermonId}
interface SermonDoc {
  title: string;
  verses: string[];
  interpretation: string;
  story: string;
  prayer: string;
  color: string;
  topic?: string;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function sermonsCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to manage sermons');
  }
  return collection(db, 'users', uid, 'sermons');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function mapDocToSavedSermon(id: string, data: SermonDoc): SavedSermon {
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

  return {
    id,
    title: data.title,
    verses: data.verses || [],
    interpretation: data.interpretation || '',
    story: data.story || '',
    prayer: data.prayer || '',
    date: formatDate(created),
    color: data.color || '1',
    is_public: data.isPublic || false,
  };
}

/**
 * Get all sermons for the authenticated user, newest first.
 */
export async function getSermons(): Promise<SavedSermon[]> {
  try {
    const snapshot = await getDocs(query(sermonsCollection(), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((d) => mapDocToSavedSermon(d.id, d.data() as SermonDoc));
  } catch (error: any) {
    console.error('Error fetching sermons:', error);
    throw new Error(error?.message || 'Failed to fetch sermons');
  }
}

/**
 * Save a new sermon.
 */
export async function saveSermon(
  sermon: Omit<SavedSermon, 'id' | 'date'> & { topic?: string }
): Promise<SavedSermon> {
  try {
    const payload = {
      title: sermon.title,
      verses: sermon.verses || [],
      interpretation: sermon.interpretation || '',
      story: sermon.story || '',
      prayer: sermon.prayer || '',
      color: sermon.color || '1',
      isPublic: false,
      ...(sermon.topic && { topic: sermon.topic }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(sermonsCollection(), payload);

    return {
      id: ref.id,
      title: payload.title,
      verses: payload.verses,
      interpretation: payload.interpretation,
      story: payload.story,
      prayer: payload.prayer,
      date: formatDate(new Date()),
      color: payload.color,
      is_public: false,
    };
  } catch (error: any) {
    console.error('Error saving sermon:', error);
    throw new Error(error?.message || 'Failed to save sermon');
  }
}

/**
 * Update an existing sermon.
 */
export async function updateSermon(sermon: SavedSermon): Promise<SavedSermon> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('You must be signed in to manage sermons');
    }

    await updateDoc(doc(db, 'users', uid, 'sermons', sermon.id), {
      title: sermon.title,
      verses: sermon.verses,
      interpretation: sermon.interpretation,
      story: sermon.story ?? '',
      prayer: sermon.prayer ?? '',
      color: sermon.color,
      updatedAt: serverTimestamp(),
    });

    return sermon;
  } catch (error: any) {
    console.error('Error updating sermon:', error);
    throw new Error(error?.message || 'Failed to update sermon');
  }
}

/**
 * Delete a sermon.
 */
export async function deleteSermon(id: string): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('You must be signed in to manage sermons');
    }

    await deleteDoc(doc(db, 'users', uid, 'sermons', id));
  } catch (error: any) {
    console.error('Error deleting sermon:', error);
    throw new Error(error?.message || 'Failed to delete sermon');
  }
}
