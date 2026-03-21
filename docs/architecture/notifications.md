# Notifications Architecture

**Implémenté :** 2026-03-21
**Branch :** `feat/local-notifications`
**Statut :** Notifications locales opérationnelles — préférences persistées en DB — push token stocké pour futures push notifications

---

## Vue d'ensemble

Le système de notifications gère deux périmètres :
1. **Notifications locales** — rappel quotidien du standup programmé sur l'appareil (expo-notifications)
2. **Push notifications (futur)** — token stocké en DB, infrastructure prête

---

## Architecture en couches

```
NotificationProvider  (src/lib/context/notification-context.tsx)
    └─ useNotifications  (src/lib/hooks/use-notifications.ts)
            ├─ Lit userStats.standupTime          (Convex)
            ├─ Lit userProfile.notificationPreferences  (Convex)
            ├─ Stocke userProfile.pushToken        (Convex mutation)
            └─ Programme/annule via expo-notifications

Settings Screen
    └─ SectionNotifications
            ├─ useNotificationContext()  → toggle standupEnabled
            └─ StandupTimeBottomSheet   → modifier l'heure
```

---

## Schema Convex

Champs ajoutés à la table `userProfiles` :

| Champ | Type | Rôle |
|---|---|---|
| `notificationPreferences` | `{ standupReminder: boolean }` (optionnel) | Préférences de l'utilisateur |
| `pushToken` | `string` (optionnel) | Token device APNs/FCM pour push notifications futures |

---

## Mutations Convex (`convex/userProfiles.ts`)

| Mutation | Args | Rôle |
|---|---|---|
| `setNotificationPreferences` | `{ standupReminder: boolean }` | Upsert des préférences |
| `setPushToken` | `{ token?: string }` | Upsert du push token device |

---

## Hook `useNotifications` — 3 effects

### Effect 1 — Permission + handler (deps: `[]`)
- `requestPermissionsAsync()` à chaque mount (idempotent si déjà accordé)
- Si accordé → `setIsPermissionGranted(true)` + configure `setNotificationHandler`
- ⚠️ Ne jamais supprimer cet effect — il est nécessaire à chaque lancement

### Effect 2 — Push token (deps: `[isPermissionGranted, isAuthenticated]`)
- Déclenché à chaque lancement une fois permission + auth prêtes
- `getDevicePushTokenAsync()` → `setPushToken` mutation
- **Le token est toujours frais** — il peut changer (réinstallation, changement d'appareil)
- Silencieux en cas d'échec (simulateur, Expo Go sans configuration)

### Effect 3 — Scheduling (deps: `[isPermissionGranted, standupEnabled, hour, minute]`)
- `cancelAllScheduledNotificationsAsync()` **avant toute replanification** → évite les doublons
- Si `standupEnabled === false` → annulation sans replanification
- Sinon → `scheduleNotificationAsync` avec trigger `DAILY` à l'heure configurée

---

## Contexte `NotificationProvider`

Placé à l'intérieur de `ConvexProviderWithClerk` dans `_layout.tsx` car le hook lit des queries Convex authentifiées.

```
ConvexProviderWithClerk
  └─ APIProvider
       └─ NotificationProvider   ← ici
            └─ BottomSheetModalProvider
```

Interface exposée :

```typescript
type NotificationContextType = {
  isPermissionGranted: boolean;
  notifPrefs: { standupReminder: boolean } | undefined;
  setStandupReminder: (value: boolean) => Promise<void>;
  sendTestNotification: () => Promise<void>;
};
```

---

## Section Notifications dans les Réglages

Remplace l'ancien bloc "my_profile" standup. Composants :

- `SettingsToggleItem` — Switch natif React Native avec couleurs brand
- `SettingsItem` — heure du standup (ouvre `StandupTimeBottomSheet`)

**Comportement du toggle :**
- **ON** → notification planifiée via trigger DAILY
- **OFF** → `cancelAllScheduledNotificationsAsync()` + pas de replanification
- La permission système n'est **pas** révoquée (impossible programmatiquement) — elle sera réutilisée pour les push notifications futures

---

## Push Notifications (futur)

Le `pushToken` stocké dans `userProfiles` est le token natif APNs (iOS) ou FCM (Android).

Pour activer les push notifications :
1. Choisir le provider : Expo Push Service (`getExpoPushTokenAsync({ projectId })`) ou direct APNs/FCM
2. Si Expo Push : remplacer `getDevicePushTokenAsync()` par `getExpoPushTokenAsync()` dans le hook
3. Référence composant Convex : https://www.convex.dev/components/push-notifications
4. Le token est déjà stocké en DB — aucune migration nécessaire

---

## Modal de debug (`NotificationModal`)

Visible uniquement en `__DEV__` via la section Developer dans les réglages.
- Affiche l'état de la permission
- Bouton "Send test" → `sendTestNotification()` → notification locale dans 1 seconde
