// React Native doesn't implement navigator.onLine (a standard browser API).
// Clerk checks it to determine network availability — undefined means "offline",
// which causes token refresh to fail with ClerkOfflineError after ~15s.
// This is not a patch: RN simply doesn't provide this Web API, so we polyfill it.
if (typeof navigator !== 'undefined' && navigator.onLine === undefined) {
  Object.defineProperty(navigator, 'onLine', {
    get: () => true,
    configurable: true,
  });
}
