# Gamification & Focus Screen Architecture

**Implémenté :** 2026-03-15
**Branch :** `feat/focus-screen`
**Statut :** Backend complet, UI filaire branchée — webhook Clerk + polish UI en cours

---

## Vue d'ensemble

Le système de gamification alimente l'onglet **Focus** (tab 2). Il sert deux objectifs :
1. **Engagement quotidien** — streak, défis quotidiens, progression de niveau
2. **Avancement de projet** — radar chart sur 4 dimensions (Validation, Design, Development, Distribution)

---

## Schema Convex (6 nouvelles tables)

| Table | Rôle | Index clés |
|---|---|---|
| `levels` | Référentiel statique des niveaux (1-5) | `by_level` |
| `userStats` | 1 ligne/utilisateur — points, streak, niveau | `by_userId` |
| `projectScores` | Scores radar par projet (threadId) | `by_threadId`, `by_userId` |
| `voiceSessions` | Time series — 1 ligne par message vocal envoyé | `by_userId`, `by_threadId` |
| `dailyChallenges` | Défis du jour (système + agent) | `by_userId_date` |
| `goals` | Objectifs par projet (agent ou user) | `by_threadId`, `by_userId` |

La table `threads` a reçu un index `by_threadId` pour permettre le lookup inverse (threadId → userId), utilisé par `updateProjectScores` et `addGoalInternal`.

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
  - Mutations internes : `addSessionPoints`, `updateProjectScores`, `updateProjectWeights`, `addGoalInternal`, `insertDailyChallengesForUser`
  - Queries : `getUserStats`, `getProjectScores`, `getDailyChallenges`, `getProjectGoals`
- **`convex/crons.ts`** — cron quotidien à 06:00 UTC pour générer les défis (`generateDailyChallenges`)
- **`src/features/focus/api.ts`** — hooks Convex pour le Focus screen : `useUserStats`, `useProjectScores`, `useDailyChallenges`, `useProjectGoals`, `useActiveThreadId`, `useCompleteDailyChallenge`, `useCompleteGoal`, `useAddGoal`

### Fichiers modifiés
- **`convex/schema.ts`** — 6 nouvelles tables + index `by_threadId` sur `threads`
- **`convex/chat.ts`** — ajout de `getActiveThread` query + appel `addSessionPoints` après chaque `sendMessage` + outils agent inline (`updateProjectScores`, `addGoal`)
- **`src/features/focus/focus-screen.tsx`** — MOCK_DATA remplacé par queries Convex live

---

## Flux d'exécution

### 1. Envoi d'un message vocal
```
IdeaScreen.handleSend()
  → sendMessage action (convex/chat.ts)
    → chatAgent.continueThread(...).generateText()
      [l'agent peut appeler updateProjectScores ou addGoal via tool use]
    → insertMessage (assistant)
    → addSessionPoints (internalMutation)
        → calcule streak + bonus
        → insert voiceSessions
        → upsert userStats
```

### 2. Génération des défis quotidiens (cron)
```
cron 06:00 UTC → generateDailyChallenges (internalAction)
  → queryAllUserIds (lit tous les userStats)
  → pour chaque user : insertDailyChallengesForUser (internalMutation)
    → garde : skip si défis déjà présents pour cette date
    → insère 3–4 défis aléatoires du pool système
```

### 3. Complétion d'un défi (client)
```
TouchableOpacity onPress → completeDailyChallenge (mutation)
  → vérifie auth (userId du JWT)
  → vérifie ownership (challenge.userId === userId)
  → idempotent : si déjà completed, return early
  → patch completed + completedAt
  → grantPoints → upsert userStats
```

---

## Outils Agent (tool use)

L'agent peut appeler deux outils dans `sendMessage` via AI SDK v5 (`tool` + `inputSchema`) :

```ts
updateProjectScores({ validation?, design?, development?, distribution? })
// → internal.gamification.updateProjectScores
// → met à jour les scores radar 0-100 du projet courant

addGoal({ title, points, dimension? })
// → internal.gamification.addGoalInternal
// → crée un objectif de projet sans dépendre de l'auth client
```

**Attention AI SDK v5 :** utiliser `inputSchema` (pas `parameters`) dans la définition des outils. La fonction `tool()` de `ai` est le helper officiel.

---

## Focus Screen — contrat UI

Le screen effectue **4 subscriptions Convex séparées** (fine-grained reactivity) :

| Hook | Source | Données |
|---|---|---|
| `useUserStats()` | `userStats` | streak, level, totalPoints, progressToNextLevel |
| `useDailyChallenges(date)` | `dailyChallenges` | liste des défis du jour avec état completed |
| `useProjectGoals(threadId)` | `goals` | objectifs actifs + complétés |
| `useActiveThreadId()` | `threads` | threadId de l'utilisateur courant |

Les 3 jauges circulaires sont mappées :
- **Streak** → `userStats.currentStreak`
- **Today** → `completedChallenges / totalChallenges`
- **Points** → `userStats.totalPoints / nextLevelMinPoints`

---

## Points d'attention

1. **Décalage UTC vs local pour les défis** : le cron génère les défis en date UTC, le client envoie sa date locale. Si l'utilisateur est en UTC+8, il peut demander des défis pour "2026-03-16" alors que le cron a généré pour "2026-03-15". La liste sera vide jusqu'au prochain cron. Acceptable pour le POC.

2. **`addSessionPoints` silencieux si non authentifié** : si `sendMessage` est appelé sans JWT valide, la fonction return silencieusement sans crash. Les points ne sont pas attribués.

3. **userId via `identity.subject`** : cohérent avec l'existant (`getOrCreateThread`). Les règles Convex recommandent `tokenIdentifier` pour plus de robustesse multi-provider — à migrer si on ajoute d'autres providers d'auth.

4. **Le cron itère `userStats` pour trouver les users actifs** : un user n'apparaît dans `userStats` qu'après son premier `sendMessage`. → voir prochaine section.

---

## Travail en cours / Prochaines étapes

### 🔴 Prioritaire : Webhook Clerk → initialisation user

**Problème :** Actuellement, un user n'existe dans `userStats` (et donc ne reçoit pas de défis quotidiens) que s'il a déjà envoyé un message vocal. Les utilisateurs nouveaux n'ont pas de ligne dans `userStats`.

**Solution :** Ajouter un **HTTP endpoint Convex** (`convex/http.ts`) qui écoute le webhook Clerk `user.created` :
- Vérifie la signature Svix (header `svix-signature`)
- Crée une ligne `userStats` avec valeurs à zéro pour ce `userId`
- Optionnellement : crée les défis du jour pour ce nouvel utilisateur

**Pattern à implémenter :**
```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix"; // vérification signature Clerk

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // 1. Vérifier signature Svix
    // 2. Parser le body JSON
    // 3. Si type === "user.created" → ctx.runMutation(internal.gamification.initUserStats, { userId })
    return new Response(null, { status: 200 });
  }),
});

export default http;
```

À configurer dans le dashboard Clerk : ajouter l'URL `https://<deployment>.convex.cloud/clerk-webhook` avec l'event `user.created`.

### 🟡 Suivant : Polish UI Focus Screen

- Radar chart pour les scores de projet (4 dimensions, poids visuels)
- Indicateur badge sur le tab Focus si défis non complétés aujourd'hui
- Bouton "Ajouter un objectif" (appelle `useAddGoal`)
- Animation de complétion sur les défis/objectifs
- Section "Prochains défis" ou contexte du niveau suivant
