import { useAuth } from '@clerk/expo';
import { useConvexAuth } from 'convex/react';
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

import { ChallengeToastStack } from '@/components/challenge-toast-stack';
import { MetalOrangeTabBar } from '@/components/metal-orange-tab-bar';
import { localDateString, useDailyChallenges } from '@/features/focus/api';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';
import { useNewChallengeToasts } from '@/lib/hooks/use-new-challenge-toasts';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isFirstTime] = useIsFirstTime();

  // Track Convex auth state transitions — this is what controls query subscriptions
  const { isAuthenticated: convexAuth, isLoading: convexLoading } = useConvexAuth();
  useEffect(() => {
    console.log('[convex-auth]', { convexAuth, convexLoading }, 'at', new Date().toLocaleTimeString());
  }, [convexAuth, convexLoading]);

  // Stabilize isSignedIn against Clerk v3 native sync (undefined flicker)
  // Without this: !undefined === true → redirect to /sign-in → unmount → data loss
  const stableIsSignedIn = useRef(isSignedIn);
  if (isSignedIn !== undefined) {
    stableIsSignedIn.current = isSignedIn;
  }

  const today = localDateString();
  const challenges = useDailyChallenges(today);
  const hasPendingChallenges
    = Array.isArray(challenges)
      && challenges.length > 0
      && challenges.some(c => !c.completed);

  const [newChallenges, dismissChallenge] = useNewChallengeToasts(
    Array.isArray(challenges) ? challenges : undefined,
  );

  useEffect(() => {
    if (isLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }
  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }
  if (!stableIsSignedIn.current) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <>
      <Tabs
        tabBar={props => <MetalOrangeTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen
          name="focus"
          options={{ tabBarBadge: hasPendingChallenges ? '!' : undefined }}
        />
        <Tabs.Screen name="settings" />
      </Tabs>
      <ChallengeToastStack toasts={newChallenges} onDismiss={dismissChallenge} />
    </>
  );
}
