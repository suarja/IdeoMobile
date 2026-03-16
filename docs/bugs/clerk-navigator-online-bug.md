# Bug : Données Convex disparaissent ~15s après login (ClerkOfflineError)

**Créé le :** 2026-03-16
**Statut :** Résolu
**Fichiers concernés :** `src/app/_layout.tsx`

---

## Symptômes

- Après login SSO (Google/Apple/GitHub), toutes les données Convex disparaissent brutalement ~10-15 secondes après.
- Recharger l'app restaure les données, puis elles disparaissent à nouveau au bout de ~15s.
- Les logs Metro affichent : `getToken THREW: clerk_offline` puis `[Convex] refetching token failed` et `setting auth state to noAuth`.
- Les données des queries *sans auth* (ex: messages d'index) restent affichées — seules les données *auth-dépendantes* disparaissent.

## Cause racine

**`navigator.onLine` n'est pas implémenté dans React Native.**

Clerk vérifie cette API Web standard pour déterminer si le device est en ligne. Dans `clerk.native.js` :

```js
function o() {
  let e = n() ? window?.navigator : null;
  return !!e && !!e.onLine;  // !!undefined === false → toujours "offline"
}
function d() { return o() && a(); }  // d() = isOnline → toujours false
```

`navigator.onLine` est `undefined` en React Native → Clerk croit que le device est hors ligne en permanence.

**Chaîne complète :**

1. Convex `authentication_manager` appelle `refetchToken()` pour renouveler le JWT (~15s après login, quand le token approche de l'expiration ou lors du "native session sync" de Clerk v3).
2. `refetchToken()` appelle `getToken({ skipCache: true })` — un token frais est exigé.
3. Clerk voit `isOnline() === false` → renvoie `ClerkOfflineError` après 3 tentatives avec backoff exponentiel (3s + 4.65s + 7.2s ≈ 15s total).
4. `ConvexProviderWithClerk` intercepte l'erreur → retourne `null`.
5. `authentication_manager` voit un token `null` → `client.clearAuth()`.
6. Le serveur Convex re-évalue toutes les subscriptions sans auth → les queries auth-dépendantes retournent vide/null.
7. Les données disparaissent de l'UI.

## Fix appliqué

Polyfill `navigator.onLine` **avant** l'import de Clerk, en tête de `src/app/_layout.tsx` :

```ts
// React Native doesn't implement navigator.onLine (a standard browser API).
// Clerk checks it to determine network availability — undefined means "offline",
// which causes token refresh to fail with ClerkOfflineError after ~15s.
if (typeof navigator !== 'undefined' && navigator.onLine === undefined) {
  Object.defineProperty(navigator, 'onLine', {
    get: () => true,
    configurable: true,
  });
}
```

Ce n'est pas un patch de la librairie : React Native n'implémente tout simplement pas cette API Web standard. Le polyfill la fournit, comme React Native le fait déjà pour d'autres APIs Web (`URL`, `fetch`, etc.).

## Défenses complémentaires (toujours en place)

La stability wrapper `useAuth()` dans `src/app/_layout.tsx` (lignes 55-136) stabilise les valeurs Clerk transitoires lors du "native session sync" de Clerk v3 (~10-15s après login). Sans elle, 4 chemins distincts déclenchent `clearAuth()` :

| Path | Transition | Effet dans ConvexAuthState |
|------|-----------|--------------------------|
| #1 | `isSignedIn → undefined` | `undefined ?? false` → `authProviderAuthenticated` change |
| #2 | `orgId → undefined` | `fetchAccessToken` recrée (dep `[orgId, orgRole]`) |
| #3 | `getToken` remplacé | Vieux closure retourne null → re-auth échoue |
| #4 | `isLoaded → false` | `!isLoaded` → `authProviderLoading` change |

La wrapper stabilise les 4 via `useRef`. Si l'une d'elles "passe à travers", `clearAuth()` se déclenche même avec le polyfill.

## Pattern de guard pour les queries auth-dépendantes

Toutes les queries Convex qui nécessitent l'auth doivent utiliser le pattern `'skip'` :

```ts
export function useUserStats() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.gamification.getUserStats, isAuthenticated ? {} : 'skip');
}
```

Sans ce pattern, la query se subscribe avant que Convex ait reçu le token → le serveur l'exécute sans auth → throw → la subscription meurt.

Les queries Convex côté serveur doivent retourner une valeur vide (jamais throw) pour les gaps d'auth transitoires :

```ts
handler: async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return []; // Ne jamais throw ici — la subscription reste vivante
  ...
}
```

## Références

- `src/app/_layout.tsx` — polyfill + stability wrapper
- `node_modules/@clerk/clerk-js/dist/clerk.native.js` — fonction `o()` (isOnline check)
- `node_modules/convex/dist/cjs/browser/sync/authentication_manager.js` — `refetchToken()` + backoff
- `node_modules/convex/dist/cjs/react/ConvexAuthState.js` — `clearAuth()` effect (lines 133-148)
