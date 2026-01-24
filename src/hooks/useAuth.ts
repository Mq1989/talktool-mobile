import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Clerk hooks
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn, signOut, getToken } = useClerkAuth();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();

  // Local store
  const { localUserData, isLoading, clearLocalData, setLoading } = useAuthStore();

  // Login with email/password
  const login = useCallback(async (email: string, password: string) => {
    if (!signIn || !isSignInLoaded) {
      throw new Error('Sign in not ready');
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        // Handle additional steps if needed (e.g., 2FA)
        console.log('Additional sign-in steps required:', result.status);
      }
    } finally {
      setLoading(false);
    }
  }, [signIn, isSignInLoaded, setSignInActive, router, setLoading]);

  // Register with email/password
  const register = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    if (!signUp || !isSignUpLoaded) {
      throw new Error('Sign up not ready');
    }

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        // Handle email verification or other steps
        console.log('Additional sign-up steps required:', result.status);
        // Typically need to verify email
        if (result.status === 'missing_requirements') {
          // Prepare email verification
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          // Return for UI to handle verification code input
          return { needsVerification: true };
        }
      }
    } finally {
      setLoading(false);
    }
  }, [signUp, isSignUpLoaded, setSignUpActive, router, setLoading]);

  // Verify email code during registration
  const verifyEmail = useCallback(async (code: string) => {
    if (!signUp) {
      throw new Error('Sign up not ready');
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }, [signUp, setSignUpActive, router, setLoading]);

  // Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut();
      clearLocalData();
      queryClient.clear();
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  }, [signOut, clearLocalData, queryClient, router, setLoading]);

  // OAuth sign in is handled by useOAuth hook in the login/register screens
  // This is just a placeholder for backwards compatibility
  const signInWithOAuth = useCallback(async (_provider: 'oauth_google' | 'oauth_apple') => {
    console.log('OAuth should be handled via useOAuth hook in the screen component');
  }, []);

  // Build user object combining Clerk user and local data
  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    name: clerkUser.fullName ?? clerkUser.firstName ?? 'User',
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    companyName: localUserData?.companyName,
    defaultLanguage: localUserData?.defaultLanguage ?? 'en',
    phoneNumbers: localUserData?.phoneNumbers,
    minutesBalance: localUserData?.minutesBalance,
    plan: localUserData?.plan,
  } : null;

  return {
    user,
    isAuthenticated: !!isSignedIn,
    isLoaded: isUserLoaded && isSignInLoaded && isSignUpLoaded,
    isLoading: isLoading || !isUserLoaded,
    login,
    register,
    verifyEmail,
    logout,
    signInWithOAuth,
    getToken,
  };
}
