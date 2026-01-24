import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LoadingSpinner } from '../src/components/ui';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
