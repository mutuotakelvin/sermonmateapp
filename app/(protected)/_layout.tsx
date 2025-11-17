import { Stack, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, loadUser, token } = useAuthStore();

  useEffect(() => {
    // Only load user if we're not authenticated and not already loading
    // The root index should have already loaded the user, but this is a safety check
    // in case someone navigates directly to a protected route
    if (!isAuthenticated && !isLoading && !token) {
      loadUser().catch((error) => {
        console.error('Error loading user:', error);
      });
    }
  }, [isAuthenticated, isLoading, token, loadUser]);

  if (isLoading) {
    // You might want to show a loading screen here
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}