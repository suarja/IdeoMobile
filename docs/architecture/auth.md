# Authentication Architecture

## Stack

| Couche | Outil | Rôle |
|--------|-------|------|
| Auth provider | `@clerk/expo` v3 | Sessions, OAuth SSO, tokens |
| Bridge auth→backend | `ConvexProviderWithClerk` (`convex/react-clerk`) | Injecte le JWT Clerk dans chaque requête Convex |
| Persistence token | `expo-secure-store` v15 (SDK 54) | Keychain iOS / Keystore Android |
| Backend identity | `ctx.auth.getUserIdentity()` | Résout l'identité dans les fonctions Convex |

## Flux de connexion

```
App launch
  └─ (app)/_layout.tsx
       ├─ isLoaded = false → return null (splash natif visible)
       └─ isLoaded = true  → SplashScreen.hideAsync()
            ├─ isFirstTime  → /onboarding
            ├─ !isSignedIn  → /sign-in
            └─ isSignedIn   → Tabs
```

### SSO (sign-in.tsx)

Trois providers disponibles : **Google**, **Apple**, **GitHub**.

```ts
const { startSSOFlow } = useSSO();
const { createdSessionId, setActive } = await startSSOFlow({
  strategy: 'oauth_google' | 'oauth_apple' | 'oauth_github',
  redirectUrl: Linking.createURL('/'),
});
if (createdSessionId && setActive) await setActive({ session: createdSessionId });
```

Après `setActive` : Clerk sauvegarde le token dans SecureStore → `isSignedIn` devient `true` → redirect automatique vers les tabs.

### Logout (settings-screen.tsx)

```ts
const { signOut } = useAuth(); // @clerk/expo
onPress={() => { void signOut(); }}
```

`isSignedIn` passe à `false` → `(app)/_layout.tsx` redirige vers `/sign-in`.

## Persistence de session

Le `tokenCache` est branché sur `ClerkProvider` dans `src/app/_layout.tsx` :

```ts
const tokenCache = {
  getToken: (key) => SecureStore.getItemAsync(key),
  saveToken: (key, value) => SecureStore.setItemAsync(key, value),
  clearToken: (key) => SecureStore.deleteItemAsync(key),
};
<ClerkProvider publishableKey={...} tokenCache={tokenCache}>
```

**Important :** utiliser `expo-secure-store@~15.x` (SDK 54). La v55 est incompatible et échoue silencieusement.

## Règles Convex — identité utilisateur

- **Ne jamais** passer `userId` comme argument d'une fonction Convex.
- **Toujours** dériver l'identité côté serveur :

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error('Unauthenticated');
const userId = identity.subject; // ID Clerk : "user_xxx"
```

- `identity.subject` = identifiant stable et unique par utilisateur Clerk.
- Fonctionne dans `mutation` et `query`. Pas disponible dans `action` — utiliser `internalMutation` appelé depuis l'action si besoin.

## Fichiers clés

| Fichier | Responsabilité |
|---------|---------------|
| `src/app/_layout.tsx` | `ClerkProvider` + `ConvexProviderWithClerk` + `tokenCache` |
| `src/app/(auth)/_layout.tsx` | Guard : redirige vers `/` si déjà connecté |
| `src/app/(auth)/sign-in.tsx` | UI SSO — Google / Apple / GitHub |
| `src/app/(app)/_layout.tsx` | Guard : redirige vers `/sign-in` si non connecté, cache le splash |
| `convex/auth.config.ts` | Déclare Clerk comme provider Convex (domain + applicationID) |
| `convex/chat.ts` | Exemple d'usage de `ctx.auth.getUserIdentity()` dans `getOrCreateThread` |

## Stabilisation auth — défenses critiques

### Polyfill `navigator.onLine` (root cause fix)

React Native n'implémente pas `navigator.onLine`. Clerk l'utilise pour détecter la connectivité — `undefined` est interprété comme "offline". Résultat : `getToken({ skipCache: true })` échoue avec `ClerkOfflineError` après ~15s (3 tentatives × backoff exponentiel), ce qui déclenche `clearAuth()` dans Convex et efface toutes les données auth-dépendantes.

**Fix :** polyfill en tête de `src/app/_layout.tsx`, *avant* tout import Clerk :

```ts
if (typeof navigator !== 'undefined' && navigator.onLine === undefined) {
  Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
}
```

> Voir `docs/bugs/clerk-navigator-online-bug.md` pour la chaîne complète et les références dans node_modules.

### Stability wrapper `useAuth()` (native session sync)

Clerk v3 effectue un "native session sync" ~10-15s après login (`setActive()` interne). Pendant ce sync, plusieurs valeurs de `useAuth()` repassent brièvement à `undefined`, ce qui déclenche `clearAuth()` dans `ConvexAuthState` via 4 chemins distincts.

La stability wrapper dans `src/app/_layout.tsx` (lignes ~55-136) stabilise ces valeurs via `useRef` — une fois passée à une valeur définie, elle ne revient jamais à `undefined`. Elle est branchée sur `ConvexProviderWithClerk` via `useAuth={useAuth}`.

**Ne jamais supprimer ou contourner cette wrapper.** Sans elle, les données disparaissent même avec le polyfill.

### Pattern `'skip'` pour les queries auth-dépendantes

```ts
const { isAuthenticated } = useConvexAuth();
return useQuery(api.xxx.yyy, isAuthenticated ? { ...args } : 'skip');
```

Sans ce pattern, la query se subscribe avant que le token arrive sur le serveur → exécution sans auth → throw → la subscription meurt définitivement.

Les handlers Convex doivent retourner une valeur vide (jamais throw) pour les gaps transitoires :

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) return []; // Pas throw — la subscription reste vivante et se réévalue
```

## Dépendances natives — rebuild obligatoire si modifiées

Les packages suivants contiennent du code natif. Tout changement de version nécessite `npx expo prebuild --clean` + rebuild :

- `expo-secure-store`
- `expo-auth-session`
- `expo-web-browser`
- `expo-crypto`
