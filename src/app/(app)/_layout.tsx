import { useAuth } from '@clerk/expo';
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { MetalOrangeTabBar } from '@/components/metal-orange-tab-bar';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isFirstTime] = useIsFirstTime();

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
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
