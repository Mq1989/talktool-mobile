import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LoadingSpinner } from '../../src/components/ui';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Don't redirect while still loading
  if (!isLoaded) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Redirect to main app if already authenticated
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
