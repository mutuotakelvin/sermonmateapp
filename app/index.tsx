import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to public index which handles onboarding check
  return <Redirect href="/(public)" />;
}

