import apiClient from './api';
import type { SavedSermon } from './types';

// Backend sermon response type
interface BackendSermon {
  id: number;
  user_id: number;
  title: string;
  verses: string[];
  interpretation: string;
  story: string;
  color: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  topic?: string | null;
  scripture_focus?: string | null;
  tone?: string | null;
  generated_content?: string | null;
}

interface SermonsResponse {
  success: boolean;
  sermons: {
    data: BackendSermon[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface SermonResponse {
  success: boolean;
  sermon: BackendSermon;
}

// Convert backend sermon to SavedSermon format
function mapBackendToSavedSermon(sermon: BackendSermon): SavedSermon {
  // Format date from created_at
  const date = new Date(sermon.created_at).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return {
    id: sermon.id.toString(),
    title: sermon.title,
    verses: sermon.verses || [],
    interpretation: sermon.interpretation || '',
    story: sermon.story || '',
    date: date,
    color: sermon.color || '1',
    is_public: sermon.is_public || false,
  };
}

/**
 * Get all sermons for the authenticated user
 */
export async function getSermons(): Promise<SavedSermon[]> {
  try {
    const response = await apiClient.get<SermonsResponse>('/v1/sermons');
    
    if (response.data.success && response.data.sermons.data) {
      return response.data.sermons.data.map(mapBackendToSavedSermon);
    }
    
    return [];
  } catch (error: any) {
    console.error('Error fetching sermons:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch sermons');
  }
}

/**
 * Save a new sermon
 */
export async function saveSermon(sermon: Omit<SavedSermon, 'id' | 'date'>): Promise<SavedSermon> {
  try {
    const response = await apiClient.post<SermonResponse>('/v1/sermons', {
      title: sermon.title,
      verses: sermon.verses,
      interpretation: sermon.interpretation,
      story: sermon.story,
      color: sermon.color || '1',
      is_public: false, // Default to false, can be updated later
    });

    if (response.data.success) {
      return mapBackendToSavedSermon(response.data.sermon);
    }

    throw new Error('Failed to save sermon');
  } catch (error: any) {
    console.error('Error saving sermon:', error);
    throw new Error(error.response?.data?.message || 'Failed to save sermon');
  }
}

/**
 * Update an existing sermon
 */
export async function updateSermon(sermon: SavedSermon): Promise<SavedSermon> {
  try {
    const response = await apiClient.put<SermonResponse>(`/v1/sermons/${sermon.id}`, {
      title: sermon.title,
      verses: sermon.verses,
      interpretation: sermon.interpretation,
      story: sermon.story,
      color: sermon.color,
    });

    if (response.data.success) {
      return mapBackendToSavedSermon(response.data.sermon);
    }

    throw new Error('Failed to update sermon');
  } catch (error: any) {
    console.error('Error updating sermon:', error);
    throw new Error(error.response?.data?.message || 'Failed to update sermon');
  }
}

/**
 * Delete a sermon
 */
export async function deleteSermon(id: string): Promise<void> {
  try {
    await apiClient.delete(`/v1/sermons/${id}`);
  } catch (error: any) {
    console.error('Error deleting sermon:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete sermon');
  }
}

