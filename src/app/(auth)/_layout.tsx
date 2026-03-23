import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { useRef } from 'react';

export default function AuthRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Stabilize against native session sync (undefined flicker)
  const stableIsSignedIn = useRef(isSignedIn);
  if (isSignedIn !== undefined) {
    stableIsSignedIn.current = isSignedIn;
  }

  if (!isLoaded) {
    return null;
  }

  if (stableIsSignedIn.current) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
