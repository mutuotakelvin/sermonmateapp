import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import BootSplash from '@/components/ui/BootSplash';
import { useAuthStore } from '@/lib/stores/auth';

export default function Index() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    // Check for stored authentication token on app load
    loadUser()
      .catch((error) => {
        console.error('Error loading user:', error);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  if (isCheckingAuth) {
    return <BootSplash />;
  }

  // If authenticated, go to protected routes, otherwise check onboarding
  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  // Redirect to public index which handles onboarding check
  return <Redirect href="/(public)" />;
}

