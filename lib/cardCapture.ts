import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type React from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Capture the referenced view to a PNG tmpfile at native pixel density
// (wallpaper-grade on modern devices). Returns the file uri.
export async function captureCardToFile(ref: React.RefObject<View | null>): Promise<string> {
  return await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
}

// Share an image file via the OS share sheet. Returns false if sharing is
// unavailable on this device (caller shows an info toast). A user-cancelled
// share resolves normally (no throw).
export async function shareCardImage(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share verse card' });
  return true;
}

// Save an image file to the photo library. Requests permission first.
export async function saveCardImage(uri: string): Promise<'saved' | 'denied'> {
  // Write-only: we only save cards to the gallery, never read the user's media.
  // Passing true avoids requesting the broad READ_MEDIA_* permissions.
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
