# Session & Ritual Flow — Architecture

Ce document décrit comment les sessions de travail et les rituels quotidiens fonctionnent dans Ideo, de la détection à l'affichage côté UI.

---

## Concepts clés

| Terme | Définition |
|-------|-----------|
| **Session** | Une période de travail délimitée dans le temps — commence au premier message de la période, se termine via `endSession` ou inactivité |
| **Rituel** | Le standup quotidien (heure configurée dans `standupTime`) — routine de démarrage de journée |
| **App open** | Chaque fois que l'utilisateur ouvre l'app après ≥3h d'inactivité |

---

## 1. Cycle de vie d'une session

```
App ouverte
    ↓
recordAppOpen()          ← Convex mutation
    ↓ si lastSessionAt < now - 3h
+5 pts, lastSessionAt = now
    ↓
IdeaScreen montée
    ↓
Utilisateur parle / écrit
    ↓
sendMessage() → agent répond
    ↓
addSessionPoints() AUTO (internalMutation)
    ├── Si même session (< 3h depuis lastSessionAt) → +15 pts, pas de streak
    └── Si nouvelle session (≥ 3h) → 50 pts base + streakBonus, streak++
    ↓
Session continue…
    ↓
Agent détecte fin naturelle → appelle endSession()
   OU utilisateur appuie sur bouton "Fin" → système envoie message → agent appelle endSession()
    ↓
endSession() retourne %%SESSION_END%%{summary, objectives, nextSteps}
    ↓
use-idea-session.ts parse → sessionEndData exposé
    ↓
SessionEndCard affichée dans le flux + PointsBanner
```

---

## 2. Points & gamification

### `recordAppOpen` (public mutation)
- Appelé au montage de `IdeaScreen`
- Cooldown : skip si `lastSessionAt < now - 3h`
- Récompense : +5 pts (pas de streak)
- Retourne `{ skipped: boolean, pointsEarned?: number }`

### `addSessionPoints` (internal mutation, appelé automatiquement)
- Appelé à la fin de chaque `sendMessage` dans `chat.ts`
- `basePoints` par défaut = 15 (auto) ; le tool `recordVoiceSession` peut appeler avec 50 (session signifiante)
- **Même session** (`now - lastSessionAt < 3h`) → `+basePoints` uniquement, streak inchangé
- **Nouvelle session** (`now - lastSessionAt ≥ 3h`) → `+basePoints + streakBonus` (10 pts/jour streak, max +50), streak incrémenté
- Streak reset si `now - lastSessionAt > 48h`

### Formule points
```
Même session  : pointsEarned = basePoints (15)
Nouvelle session : pointsEarned = basePoints + min(streak × 10, 50)
                 = 50 + min(streak × 10, 50) si appelé via recordVoiceSession
```

---

## 3. Détection de fin de session

### Côté agent
Le system prompt de chaque agent contient une section **Session Awareness** :
```
Infer the session type: quick | standup | deep
At the natural conclusion of a substantive session, call endSession().
Don't call it after quick single exchanges.
```

### Tool `endSession` (dans buildCommonTools, chat.ts)
```ts
endSession({ summary, objectives, nextSteps })
→ retourne `%%SESSION_END%%${JSON.stringify({ summary, objectives, nextSteps })}`
```

### Côté mobile
`use-idea-session.ts` → `parseSessionEndFromText()` → `sessionEndData: SessionEndData | null`

Le bouton "Fin" dans le header (`idea-screen.tsx`) envoie un message système à l'agent :
```
[SYSTEM: User requested session end. Please call endSession() with a summary.]
```
Le bouton n'est visible que si :
- Il y a au moins un message dans le thread (`hasActiveSession`)
- L'agent n'est pas en train de synthétiser
- Pas de `SessionEndCard` déjà ouverte (`!sessionEndData || sessionEndDismissed`)

---

## 4. Continuation chips (retour dans l'app)

Affichées dans `IdeaScreen` quand :
```
!isSynthesizing
&& lastMessageAt !== null
&& Date.now() - lastMessageAt > ONE_HOUR_MS   // 1h
&& hasActiveSession
```

**Note importante** : `lastMessageAt` vient de `_creationTime` sur les messages de l'agent thread (champ Convex automatique). En développement, réduire `ONE_HOUR_MS` à 5 minutes pour tester sans attendre.

### UX des chips
- **Continuer** → dismiss les chips, focus input (aucun message envoyé)
- **Autre sujet** → ouvre une `Modal` bottom sheet avec 5 options de topics
  - Chaque option envoie un message système qui force le routing vers l'agent spécialisé :
    ```
    [SYSTEM: Route to {hint} agent. User wants to discuss a new topic.]
    ```

---

## 5. Affichage des messages utilisateur

### Problème
`buildFullPrompt()` dans `chat.ts` injecte contexte mémoire + note système dans le prompt avant de l'envoyer à l'agent. Ce full prompt est stocké dans le thread agent. Sans traitement, l'UI afficherait :
```
[SYSTEM: Last interaction was 14h ago…]

Message de l'utilisateur

## User Profile Memory
- workStyle: early morning
## Project Memory
- currentPhase: MVP
```

### Solution
`getDisplayableUserContent()` dans `use-idea-session.ts` :
1. Détecte les messages 100% système (end session, routing) → label amical
2. Supprime le préfixe `[SYSTEM: …]\n\n`
3. Supprime tout ce qui suit le premier `\n\n## ` (sections mémoire)

---

## 6. Rituel standup

> État actuel : logique définie, UI non encore implémentée.

### Données
- `userStats.standupTime: string` — format `"HH:MM"` (UTC)
- Mutation `setStandupTime(time)` pour sauvegarder la préférence

### Logique prévue (à implémenter)
```
Au mount de IdeaScreen :
  1. Lire standupTime depuis userStats
  2. Si standupTime défini
     ET currentHour:currentMin >= standupTime
     ET MMKV['standupShownDate'] !== today
  → afficher StandupSplash (1.5s auto-dismiss)
  → MMKV.set('standupShownDate', today)
```

Le `StandupSplash` est un composant overlay simple (fade) — pas encore créé.

---

## 7. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `convex/gamification.ts` | `recordAppOpen`, `addSessionPoints`, `setStandupTime` |
| `convex/chat.ts` | `buildFullPrompt`, `sendMessage` (auto-points), tool `endSession` |
| `convex/agents/*.ts` | System prompt "Session Awareness" |
| `convex/schema.ts` | `userStats.standupTime`, `voiceSessions` |
| `src/features/idea/use-idea-session.ts` | Parsing `%%SESSION_END%%`, `getDisplayableUserContent`, `lastMessageAt` |
| `src/features/idea/idea-screen.tsx` | Bouton "Fin" conditionnel, chips, `recordAppOpen` au mount |
| `src/features/idea/components/session-end-card.tsx` | Card résumé fin de session |
| `src/features/idea/components/session-continuation-chips.tsx` | Chips Continuer + Autre → bottom sheet |
| `src/features/idea/components/points-banner.tsx` | Bannière animée +N pts |
