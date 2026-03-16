import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/expo';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useThemeConfig } from '@/components/ui/use-theme-config';
import { APIProvider } from '@/lib/api';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import Env from '../../env';
import '@/lib/polyfills';
import '../global.css';

const convex = new ConvexReactClient(Env.EXPO_PUBLIC_CONVEX_URL, {
  verbose: __DEV__,
});
const publishableKey = Env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

// Stability wrapper for @clerk/expo v3 "native session sync" (~10-15s after startup).
//
// During native session sync, Clerk calls setActive() which triggers 4 clearAuth paths
// in ConvexAuthState (node_modules/convex/dist/cjs/react/ConvexAuthState.js:133-148):
//
//   The LastEffect cleanup (line 136: client.clearAuth()) fires when ANY dep changes:
//   [authProviderAuthenticated, fetchAccessToken, authProviderLoading, client, ...]
//
//   Path 1: isSignedIn → undefined  →  `undefined ?? false` → authProviderAuthenticated changes
//   Path 2: orgId → undefined       →  fetchAccessToken recreated (memo dep [orgId,orgRole])
//   Path 3: getToken replaced       →  old closure returns null → re-auth fails
//   Path 4: isLoaded → false        →  authProviderLoading (`!isLoaded`) changes ← MISSED BEFORE
//
// All 4 must be stabilized. If even ONE leaks through, clearAuth fires.
function useAuth() {
  const auth = useClerkAuth();

  // --- Stabilize isLoaded (blocks clearAuth path #4: authProviderLoading dep) ---
  // Once Clerk has loaded, it should never go back to "unloaded".
  const stableIsLoaded = React.useRef(auth.isLoaded);
  if (auth.isLoaded) {
    stableIsLoaded.current = true;
  }

  // --- Stabilize isSignedIn (blocks clearAuth path #1) ---
  const stableIsSignedIn = React.useRef<boolean | undefined>(auth.isSignedIn);
  if (auth.isSignedIn !== undefined) {
    stableIsSignedIn.current = auth.isSignedIn;
  }

  // --- Stabilize orgId/orgRole (blocks clearAuth path #2: fetchAccessToken memo dep) ---
  const stableOrgId = React.useRef<string | undefined | null>(auth.orgId);
  const stableOrgRole = React.useRef<string | undefined | null>(auth.orgRole);
  if (auth.orgId !== undefined)
    stableOrgId.current = auth.orgId;
  if (auth.orgRole !== undefined)
    stableOrgRole.current = auth.orgRole;

  // --- Stabilize getToken (blocks clearAuth path #3) ---
  // Stale closure: during native sync, Clerk replaces getToken. ConvexProviderWithClerk
  // captures the old closure in a useMemo → calls it → gets null → clearAuth.
  // Fix: always delegate to the latest getToken via ref.
  const getTokenRef = React.useRef(auth.getToken);
  getTokenRef.current = auth.getToken;

  const stableGetToken = React.useCallback(
    async (options?: { template?: string; skipCache?: boolean }) => {
      const token = await getTokenRef.current(options);
      if (__DEV__) {
        console.log('[auth-wrapper] getToken →', token ? `token(${token.length}ch)` : '⚠️ NULL', JSON.stringify(options));
      }
      return token;
    },
    [],
  );

  // --- Diagnostic: log transitions only ---
  const prevRaw = React.useRef({
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    orgId: auth.orgId,
    sessionId: auth.sessionId,
  });
  if (__DEV__) {
    const raw = {
      isLoaded: auth.isLoaded,
      isSignedIn: auth.isSignedIn,
      orgId: auth.orgId,
      sessionId: auth.sessionId,
    };
    const changed = raw.isLoaded !== prevRaw.current.isLoaded
      || raw.isSignedIn !== prevRaw.current.isSignedIn
      || raw.orgId !== prevRaw.current.orgId
      || raw.sessionId !== prevRaw.current.sessionId;
    if (changed) {
      console.log('[auth-wrapper] RAW Clerk transition:', prevRaw.current, '→', raw);
      if (!raw.isLoaded && stableIsLoaded.current) {
        console.log('[auth-wrapper] ⛔ BLOCKED isLoaded=false (would change authProviderLoading → clearAuth)');
      }
      if (raw.isSignedIn === undefined && stableIsSignedIn.current !== undefined) {
        console.log('[auth-wrapper] ⛔ BLOCKED isSignedIn=undefined (would set authProviderAuthenticated=false → clearAuth)');
      }
      if (raw.orgId === undefined && stableOrgId.current !== undefined) {
        console.log('[auth-wrapper] ⛔ BLOCKED orgId=undefined (would recreate fetchAccessToken → clearAuth)');
      }
    }
    prevRaw.current = raw;
  }

  return {
    ...auth,
    isLoaded: stableIsLoaded.current,
    isSignedIn: stableIsSignedIn.current,
    orgId: stableOrgId.current,
    orgRole: stableOrgRole.current,
    getToken: stableGetToken as typeof auth.getToken,
  };
}

const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  clearToken: (key: string) => SecureStore.deleteItemAsync(key),
};

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: '(app)',
};

loadSelectedTheme();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={theme.dark ? `dark` : undefined}
    >
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        {/* eslint-disable-next-line react-compiler/react-compiler -- ConvexProviderWithClerk API requires passing a hook as prop */}
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <KeyboardProvider>
            <ThemeProvider value={theme}>
              <APIProvider>
                <BottomSheetModalProvider>
                  {children}
                  <FlashMessage position="top" />
                </BottomSheetModalProvider>
              </APIProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
