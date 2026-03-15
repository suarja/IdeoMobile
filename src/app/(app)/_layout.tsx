import { useAuth } from '@clerk/expo';
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { MetalOrangeTabBar } from '@/components/metal-orange-tab-bar';
import { localDateString, useDailyChallenges } from '@/features/focus/api';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isFirstTime] = useIsFirstTime();

  const today = localDateString();
  const challenges = useDailyChallenges(today);
  const hasPendingChallenges
    = Array.isArray(challenges)
      && challenges.length > 0
      && challenges.some(c => !c.completed);

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
  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
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
  );
}
