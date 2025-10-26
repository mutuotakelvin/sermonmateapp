import { Stack, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser().catch((error) => {
      console.error('Error loading user:', error);
    });
  }, []);

  if (isLoading) {
    // You might want to show a loading screen here
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}