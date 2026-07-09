import { Stack, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    // The root index should have already loaded the user; this is a safety check
    // in case someone navigates directly to a protected route.
    if (!isAuthenticated && !isLoading) {
      loadUser().catch((error) => {
        console.error('Error loading user:', error);
      });
    }
  }, [isAuthenticated, isLoading, loadUser]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
