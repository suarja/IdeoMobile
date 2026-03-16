# Gamification & Focus Screen Architecture

**Implémenté :** 2026-03-15
**Mis à jour :** 2026-03-16
**Branch :** `feat/focus-screen`
**Statut :** Backend complet, UI branchée — webhook Clerk actif, validation agent opérationnelle

---

## Vue d'ensemble

Le système de gamification alimente l'onglet **Focus** (tab 2). Il sert deux objectifs :
1. **Engagement quotidien** — streak, défis quotidiens avec validation IA, progression de niveau
2. **Avancement de projet** — radar chart sur 4 dimensions (Validation, Design, Development, Distribution)

---

## Schema Convex (6 tables gamification + threads augmenté)

| Table | Rôle | Index clés |
|---|---|---|
| `levels` | Référentiel statique des niveaux (1-5) | `by_level` |
| `userStats` | 1 ligne/utilisateur — points, streak, niveau | `by_userId` |
| `projectScores` | Scores radar par projet (threadId) | `by_threadId`, `by_userId` |
| `voiceSessions` | Time series — 1 ligne par message vocal envoyé | `by_userId`, `by_threadId` |
| `dailyChallenges` | Défis du jour (système + agent) | `by_userId_date` |
| `goals` | Objectifs par projet (agent ou user) | `by_threadId`, `by_userId` |

La table `threads` a reçu :
- Index `by_threadId` — lookup inverse threadId → userId
- Champ `title?: string` — nom court du projet, généré par Haiku après le premier message

---

## Système de points

| Action | Points |
|---|---|
| Message vocal envoyé (session) | +50 base |
| Bonus streak | +10/jour de streak, plafonné à +50 (= 5 jours max) |
| Défi quotidien complété | 25–200 (défini par défi) |
| Objectif complété | 50–500 (défini à la création) |

**Calcul streak :** fenêtre 48h (pas 24h) pour tolérer les décalages de fuseau horaire. Si `lastSessionAt` est dans les 48h → `streak += 1`, sinon reset à 1.

**Calcul de niveau :** après chaque attribution de points, on cherche le niveau max où `totalPoints >= minPoints`. Dénormalisé dans `userStats.currentLevel` pour les lectures rapides.

**Niveaux :**
| # | Nom | Points min | Icône |
|---|---|---|---|
| 1 | Dreamer | 0 | 🌱 |
| 2 | Thinker | 500 | 💡 |
| 3 | Builder | 1500 | 🔨 |
| 4 | Maker | 3500 | ⚡ |
| 5 | Founder | 7000 | 🚀 |

Les niveaux sont seedés une fois via `gamification:seedLevels` (déjà fait en dev).

---

## Fichiers créés / modifiés

### Nouveaux fichiers
- **`convex/gamification.ts`** — toutes les fonctions gamification :
  - Mutations publiques : `seedLevels`, `completeDailyChallenge`, `completeGoal`, `addGoal`
  - Mutations internes : `addSessionPoints`, `updateProjectScores`, `updateProjectWeights`, `addGoalInternal`, `insertDailyChallengesForUser`, `completeDailyChallengeInternal`, `initNewUser`, `initProjectScores`
  - Queries internes : `getDailyChallengeById`
  - Actions publiques : `validateAndCompleteDailyChallenge`
  - Queries : `getUserStats`, `getProjectScores`, `getDailyChallenges`, `getProjectGoals`
- **`convex/crons.ts`** — cron quotidien à 06:00 UTC pour générer les défis (`generateDailyChallenges`)
- **`convex/challenges.ts`** — helpers partagés : `SYSTEM_CHALLENGE_POOL`, `pickRandom`, `utcDateString` (extrait de `crons.ts` pour éviter la duplication avec `initNewUser`)
- **`convex/http.ts`** — webhook Clerk `user.created` : initialise `userStats` + défis du jour pour les nouveaux users
- **`src/features/focus/api.ts`** — hooks Convex pour le Focus screen : `useUserStats`, `useProjectScores`, `useDailyChallenges`, `useProjectGoals`, `useActiveThreadId`, `useCompleteDailyChallenge`, `useCompleteGoal`, `useAddGoal`, `useValidateAndCompleteDailyChallenge`

### Fichiers modifiés
- **`convex/schema.ts`** — 6 nouvelles tables + `title?: string` sur `threads`
- **`convex/chat.ts`** — `getActiveThread` retourne `{ threadId, title }` ; `getOrCreateThread` appelle `initProjectScores` ; `sendMessage` déclenche `generateThreadTitle` après le premier message ; nouvelles fonctions `listMessagesInternal`, `countMessages`, `updateThreadTitle`, `generateThreadTitle`
- **`src/features/focus/focus-screen.tsx`** — `ChallengeRow` avec spinner de validation IA + modal de rejet ; `DailyChallengesSection` avec état de rejet
- **`src/features/idea/api.ts`** — ajout de `useActiveThread()` retournant `{ threadId, title } | null`
- **`src/features/idea/idea-screen.tsx`** — titre du projet live depuis `threads.title`, fallback sur la traduction placeholder

---

## Flux d'exécution

### 1. Création d'un nouvel utilisateur (webhook Clerk)
```
Clerk user.created → POST /clerk-webhook (convex/http.ts)
  → vérification signature Svix
  → initNewUser (internalMutation)
      → insert userStats (si absent) avec valeurs à zéro
      → insertDailyChallengesForUser : 3-4 défis du jour générés immédiatement
```

### 2. Envoi d'un message vocal
```
IdeaScreen.handleSend()
  → sendMessage action (convex/chat.ts)
    → countMessages → mémorise si c'est le premier message
    → insertMessage (user)
    → chatAgent.continueThread(...).generateText()
      [l'agent peut appeler updateProjectScores ou addGoal via tool use]
    → insertMessage (assistant)
    → addSessionPoints (internalMutation)
        → calcule streak + bonus
        → insert voiceSessions
        → upsert userStats
    → si premier message : scheduler.runAfter(0, generateThreadTitle)
        → Haiku génère un nom de projet en 3-5 mots
        → updateThreadTitle patch threads.title
        → IdeaScreen reflète le titre en temps réel (subscription live)
```

### 3. Création d'un thread (projectScores auto-initialisé)
```
getOrCreateThread (mutation)
  → chatAgent.createThread
  → insert threads
  → initProjectScores (internalMutation)
      → insert projectScores avec scores à 0 si absent
```

### 4. Génération des défis quotidiens (cron)
```
cron 06:00 UTC → generateDailyChallenges (internalAction)
  → queryAllUserIds (lit tous les userStats)
  → pour chaque user : insertDailyChallengesForUser (internalMutation)
    → garde : skip si défis déjà présents pour cette date
    → insère 3–4 défis aléatoires du pool système
```

### 5. Validation IA d'un défi (client)
```
ChallengeRow onPress → useValidateAndCompleteDailyChallenge (action)
  → vérifie auth
  → getDailyChallengeById : lit le défi sans re-vérifier l'auth
  → si déjà complété : retourne { approved: true, message: "Already completed!" }
  → listMessagesInternal : récupère l'historique du thread
  → generateText (Haiku) : prompt JSON → { approved, message }
    → parse manuel avec fallback optimiste si le JSON est invalide
  → si approved : completeDailyChallengeInternal → grantPoints
  → retourne { approved, message } au client
```

**UX :**
- Spinner dans le cercle du défi pendant la validation
- Si rejet : modal avec le message de l'agent ("Got it" pour fermer)
- Si approuvé : le défi passe en état complété normalement

---

## Outils Agent (tool use)

L'agent peut appeler deux outils dans `sendMessage` via AI SDK (`tool` + `inputSchema`) :

```ts
updateProjectScores({ validation?, design?, development?, distribution? })
// → internal.gamification.updateProjectScores
// → met à jour les scores radar 0-100 du projet courant

addGoal({ title, points, dimension? })
// → internal.gamification.addGoalInternal
// → crée un objectif de projet sans dépendre de l'auth client
```

---

## Focus Screen — contrat UI

Le screen effectue **5 subscriptions Convex séparées** (fine-grained reactivity) :

| Hook | Source | Données |
|---|---|---|
| `useUserStats()` | `userStats` | streak, level, totalPoints, progressToNextLevel |
| `useDailyChallenges(date)` | `dailyChallenges` | liste des défis du jour avec état completed |
| `useProjectGoals(threadId)` | `goals` | objectifs actifs + complétés |
| `useActiveThreadId()` | `threads` | threadId de l'utilisateur courant |
| `useProjectScores(threadId)` | `projectScores` | scores radar 4 dimensions |

L'**Idea Screen** s'abonne en plus à `useActiveThread()` pour afficher le titre du projet live.

Les 3 jauges circulaires sont mappées :
- **Streak** → `userStats.currentStreak`
- **Today** → `completedChallenges / totalChallenges`
- **Points** → `userStats.totalPoints / nextLevelMinPoints`

---

## Configuration webhook Clerk

1. Env Convex : `npx convex env set CLERK_WEBHOOK_SECRET <secret>`
2. Dashboard Clerk → Webhooks → ajouter `https://<deployment>.convex.cloud/clerk-webhook` avec l'event `user.created`

---

## Points d'attention

1. **Décalage UTC vs local pour les défis** : le cron génère les défis en date UTC, le client envoie sa date locale. Si l'utilisateur est en UTC+8, il peut demander des défis pour "2026-03-16" alors que le cron a généré pour "2026-03-15". La liste sera vide jusqu'au prochain cron. Acceptable pour le POC. Le webhook `initNewUser` génère en UTC également.

2. **`addSessionPoints` silencieux si non authentifié** : si `sendMessage` est appelé sans JWT valide, la fonction return silencieusement sans crash. Les points ne sont pas attribués.

3. **userId via `identity.subject`** : cohérent avec l'existant. Les règles Convex recommandent `tokenIdentifier` pour plus de robustesse multi-provider — à migrer si on ajoute d'autres providers d'auth.

4. **Validation IA — fallback optimiste** : si `generateText` retourne un JSON invalide (rare), le défi est approuvé automatiquement (`{ approved: true, message: "Challenge validated!" }`). On préfère ne pas bloquer l'utilisateur sur un bug de parsing.

5. **`generateObject` évité pour la validation** : `generateObject` avec Anthropic lève `AI_NoObjectGeneratedError` si la réponse dépasse les contraintes Zod (ex: message > 200 chars). On utilise `generateText` + parse manuel pour plus de robustesse.

6. **Pas de re-vérification ownership dans `completeDailyChallengeInternal`** : l'action appelante (`validateAndCompleteDailyChallenge`) vérifie l'auth et récupère l'identity. La mutation interne fait confiance à ces paramètres — ne jamais l'exposer en mutation publique.

---

## Tests

**Runner :** Vitest + `convex-test` (edge-runtime). Fichier : `convex/gamification.test.ts`.

```bash
pnpm test:convex        # run (CI)
pnpm test:convex:watch  # watch mode
```

**Couverture (12 tests) :**

| Suite | Cas testés |
|---|---|
| `addSessionPoints` | Première session (60 pts), streak 48h incrémente, streak reset >48h, bonus plafonné à 50 |
| `completeDailyChallenge` | Idempotence (2e complétion = 0 pts extra), rejet si non authentifié |
| `completeGoal` | Idempotence (2e complétion = 0 pts extra) |
| `insertDailyChallengesForUser` | Insertion 3 défis, anti-doublon (2e appel = rien) |
| `getUserStats` | Valeurs par défaut si user sans row |
| `getDailyChallenges` | Isolation par userId (pas les défis d'un autre user) |
| `getProjectGoals` | Isolation par threadId |

**Pattern :** chaque test crée un contexte isolé via `makeT()` (`convexTest(schema, modules)`). Les seeds se font via `t.run(async ctx => ...)`. L'auth est simulée via `t.withIdentity({ subject: "user_id" })`.

---

## Travail en cours / Prochaines étapes

- Indicateur badge sur le tab Focus si défis non complétés aujourd'hui
- Bouton "Ajouter un objectif" (appelle `useAddGoal`)
- Animation de complétion sur les défis/objectifs
- Section "Prochains défis" ou contexte du niveau suivant
