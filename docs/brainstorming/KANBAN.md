# Backlog IdeoMobile

## EPIC H — Bugs UI
> P1

---


## EPIC E — GitHub Tracking & Primitives
> P3

---

### E-01 · Usage tracking web search [DONE] ✅

**État :** Implémenté. Comptabilisation en place.
- `webSearchLogs` table : specialist, query, resultCount, createdAt
- `validationSearchCount` par projet (incrémenté dans `convex/chat.ts`)
- `monthlySearchCount` + `searchMonthStart` sur `userStats`

**⚠️ Pas de quota enforcement en phase dev** — la data est collectée pour calibrer les plafonds des plans de paiement à partir de l'usage réel. Aucun blocage à implémenter tant que l'usage n'est pas mesuré.

---

### E-02 · Liens de monitoring par projet [DONE] ✅

**État :** Implémenté.
- `projectLinks.github` sur le schéma projet (`convex/schema.ts`)
- UI d'édition des liens dans les settings du projet
- Cron 23:00 UTC GitHub-only (`convex/crons.ts`) — déclenché uniquement si `githubUrl + githubToken` configurés
- Artefact de tracking sauvegardé dans la table `artifacts` (`convex/tracking.ts`)
- `validateGitHubToken` action disponible dans `convex/github.ts`

**Note :** Token GitHub = profil utilisateur (`userProfiles.githubToken`) — clé d'accès API. Lien GitHub = projet (`projects.projectLinks.github`) — URL du repo à tracker.

---

### E-04 · GitHub primitives pour agents [P3]

**En tant qu'** agent (tracking, chat, challenges)
**Je veux** interroger GitHub de façon ciblée via des primitives dédiées
**Afin de** récupérer des informations précises sans parser un bloc texte monolithique

**Critères d'acceptation**
- [ ] `convex/tools/scrape/github.ts` expose des primitives séparées :
  - `getRepoStats(owner, repo, token)` — stars, forks, open issues, default branch
  - `getActiveBranches(owner, repo, token)` — top 5 branches par dernière activité
  - `getCommitsByBranch(owner, repo, branch, token, limit)` — commits récents d'une branche
  - `getOpenPRs(owner, repo, token)` — PRs ouvertes avec titre + branche
- [ ] `githubFetch` est refactorisé pour appeler ces primitives (comportement identique)
- [ ] L'agent tracking dispose d'un tool `getGitHubCommits` pour requêter une branche précise
- [ ] Zéro régression sur `validateGitHubToken` et `debug:testGitHub`

**Notes techniques:** `convex/tools/scrape/github.ts` — actuellement 3 appels API inline dans `githubFetch`. Extraire en fonctions exportées réutilisables.

---

### E-03 · Market analysis approfondie [P4]

**En tant qu'** utilisateur qui veut valider son idée
**Je veux** lancer une market analysis complète (concurrents, TAM, tendances)
**Afin d'** obtenir un rapport structuré en quelques minutes

**Critères d'acceptation**
- [ ] Un workflow dédié orchestré par le `marketAgent` avec 3-5 recherches enchaînées
- [ ] Le rapport final inclut : concurrents directs, TAM estimé, tendances Google Trends, opportunités
- [ ] Le rapport est sauvegardé et accessible depuis l'onglet "Idea" (section Market)
- [ ] Le workflow utilise Convex workpool pour ne pas bloquer l'UI

**Notes techniques:** `convex/agents/marketAgent.ts` (à créer). Convex workpool pour orchestration longue durée.

---

## EPIC F — Mémoire
> P2–P4

---

### F-01 · Suppression d'une entrée mémoire [P2]

**En tant qu'** utilisateur qui consulte sa mémoire
**Je veux** pouvoir supprimer une entrée mémoire
**Afin de** corriger ou nettoyer ce que l'agent a retenu sur moi

**Critères d'acceptation**
- [ ] Long-press sur une entrée mémoire dans `memory-bottom-sheet.tsx` déclenche la suppression
- [ ] La mutation `deleteMemoryEntry` de `convex/memory.ts` est câblée dans l'UI
- [ ] Un feedback visuel confirme la suppression (haptic + disparition animée)

**Notes techniques:** `src/features/settings/components/memory-bottom-sheet.tsx` lignes 58 et 93 ont `onDelete={() => { /* TODO: wire deleteMemory mutation */ }}`. Mutation backend prête dans `convex/memory.ts`.

---

### F-02 · Format user-friendly des entrées mémoire [P3]

**En tant qu'** utilisateur qui consulte sa mémoire dans l'UI
**Je veux** voir des libellés lisibles au lieu de clés techniques brutes
**Afin de** comprendre ce que l'agent a retenu sur moi et mon projet

**Critères d'acceptation**
- [ ] Les clés mémoire (ex. `workStyle`) sont affichées avec un label humain ("Style de travail")
- [ ] Un mapping clé → label est maintenu dans `src/lib/memory-labels.ts`
- [ ] `memory-bottom-sheet.tsx` utilise ces labels

**Notes techniques:** UI display existe déjà dans `memory-bottom-sheet.tsx` mais affiche les raw keys. Créer `src/lib/memory-labels.ts` avec le mapping.

---

### F-03 · Embeddings mémoire [P4]

**En tant qu'** agent
**Je veux** retrouver les entrées mémoire pertinentes par similarité sémantique
**Afin de** fournir des réponses contextuelles sans charger toute la mémoire utilisateur

**Critères d'acceptation**
- [ ] Les entrées mémoire sont embeddings au moment de leur création
- [ ] Une recherche vectorielle retourne les K entrées les plus proches du message actuel
- [ ] La performance de retrieval est mesurée et acceptable (< 200ms)

**Notes techniques:** Convex vector search (`vectorSearch`). Modèle d'embedding : `text-embedding-3-small`. Voir documentation Convex vectors.

---

## EPIC I — Agent Config & Customisation
> P3

---

### I-01 · Centraliser la config des agents [P3]

**En tant que** développeur
**Je veux** un fichier de config centralisé pour tous les agents
**Afin de** modifier le modèle, les options ou les instructions sans toucher à chaque fichier agent

**Critères d'acceptation**
- [ ] `convex/agents/config.ts` définit un registry : modèle, contextOptions, maxSteps par agent
- [ ] Tous les agents (`routerAgent`, `chatAgent`, `validationAgent`, `distributionAgent`, `designAgent`, `developmentAgent`) utilisent ce registry à l'instantiation
- [ ] Le modèle `claude-sonnet-4-6` n'est plus hardcodé dans chaque fichier

**Notes techniques:** Ref : https://docs.convex.dev/agents/agent-usage#customizing-the-agent. Actuellement `claude-sonnet-4-6` est répété 5× dans les fichiers agents.

---

### I-02 · Guard agent (router filtering) [P3]

**En tant qu'** application
**Je veux** filtrer les messages hors-scope ou inappropriés avant qu'ils atteignent les agents spécialistes
**Afin de** protéger l'expérience utilisateur et réduire les coûts de traitement inutile

**Critères d'acceptation**
- [ ] Une couche de validation précède le routeur Haiku dans `convex/chat.ts`
- [ ] Les messages manifestement hors-scope (spam, contenu explicite) sont rejetés avec un message explicatif
- [ ] La logique de guard ne ralentit pas le flux nominal de manière perceptible

**Notes techniques:** Peut être implémenté comme une vérification rapide dans `sendMessage` avant d'appeler `routerAgent`, ou comme un agent Haiku dédié. `convex/agents/routerAgent.ts` — aucune modération actuellement.

---

## EPIC J — Challenges "Move the Needle"
> P2–P4
> **Révisé 2026-03-25** — refonte complète : max 3 actifs, slot fill dynamique, validationType extensible, tracking agent enrichi, UX "pendant ton absence"

### Décisions techniques

**Workpool vs Workflow :**
- `@convex-dev/workpool` → fan-out (N utilisateurs en parallèle, concurrence contrôlée) — idéal pour la génération de challenges
- `@convex-dev/workflow` → pipeline séquentiel durable (chaque étape checkpointée) — idéal pour le tracking par projet
- **V1 :** pas de migration. L'agent `@convex-dev/agent` avec `maxSteps: 10` suffit. Workpool + Workflow = upgrade futur (J-07, J-08).

**Modèles IA :**
- Challenge generation : Haiku (prompt simple, JSON schema clair)
- Tracking + score analysis : `claude-sonnet-4-6` déjà en place, correct pour le raisonnement sur commits
- Slot refill temps-réel : Haiku one-shot

**validationType — méthode de validation (extensible) :**
`validationType` décrit **comment vérifier**, pas le contenu du challenge. Le même challenge "Push un commit" a `validationType: 'github'`. Demain "Dessine ton écran" pourrait avoir `validationType: 'figma'`. C'est indépendant du `dimension` (développement/validation/design/distribution).

---

### Schéma — nouveaux champs `dailyChallenges`

Fichier : `convex/schema.ts` ligne 68

```
validationType?: 'conversation' | 'github'   — comment vérifier (extensible)
completedByCron?: boolean                     — true = complété par le tracking agent
seenAt?: number                               — timestamp quand le modal l'a affiché
completionNote?: string                       — "Push détecté sur feat/api à 23:14" (du tracking agent)
```

---

### J-00 · Cap max 3 challenges actifs [P2]

**En tant qu'** utilisateur
**Je veux** avoir toujours exactement 3 défis actifs (ni plus, ni moins)
**Afin de** rester focalisé sur ce qui fait avancer le projet

**Critères d'acceptation**
- [ ] `generateDailyChallenges` (crons.ts) : budget = `3 - carriedOverLabels.length`. Si 2 carry-overs → générer 1 seul nouveau.
- [ ] `generatePersonalizedChallenges` (challenges.ts) : accepter param `maxNew: number`, remplacer `slice(0, 4)` par `slice(0, maxNew)`.
- [ ] `getDailyChallenges` (gamification.ts) : remplacer `.take(10)` par filtre `!failed` + `.take(3)` sur les actifs.
- [ ] `getDailyChallengesInternal` : idem.

**Notes techniques:** `convex/crons.ts:generateDailyChallenges`, `convex/challenges.ts:generatePersonalizedChallenges`, `convex/gamification.ts:getDailyChallenges`.

---

### J-01 · Slot fill dynamique à la complétion [P2]

**En tant qu'** utilisateur qui vient de compléter un challenge
**Je veux** qu'un nouveau défi apparaisse automatiquement
**Afin d'** avoir toujours 3 défis actifs

**Critères d'acceptation**
- [ ] `completeDailyChallenge` (public) : après patch `completed: true`, appelle `ctx.scheduler.runAfter(0, internal.challenges.refillChallengeSlotsForUser, { userId, date })`.
- [ ] `completeDailyChallengeInternal` : idem, sauf si `completedByCron === true` (éviter double-trigger depuis le cron).
- [ ] Nouvelle action `refillChallengeSlotsForUser` (challenges.ts) :
  1. Compte challenges actifs du jour (`completed === false && failed !== true`)
  2. Si count < 3 → `generatePersonalizedChallenges(maxNew = 3 - count)`
  3. Insère via `createDailyChallengeInternal`
  4. Guard anti-doublon : exclure les labels déjà utilisés aujourd'hui

**Hors scope V1 :** slot fill via le chat agent (à prévoir : exposer `createDailyChallengeInternal` comme tool agent si besoin futur).

**Notes techniques:** `convex/gamification.ts:completeDailyChallenge`, `convex/challenges.ts` (nouvelle action).

---

### J-02 · validationType — méthode de validation extensible [P3]

**En tant qu'** agent qui génère des challenges
**Je veux** attribuer à chaque challenge comment il sera vérifié
**Afin que** le système de validation soit extensible à d'autres tools (Figma, screenshot, URL…)

**Critères d'acceptation**
- [ ] `generatePersonalizedChallenges` accepte `hasGitHub: boolean`. Si true → le prompt IA indique que des challenges GitHub-vérifiables sont possibles.
- [ ] Le JSON retourné par Haiku inclut `validationType: 'conversation' | 'github'` (optionnel, défaut `'conversation'`).
- [ ] `crons.ts` passe `hasGitHub: !!project.projectLinks?.github` depuis `getActiveProjectContextForUser`.
- [ ] `createDailyChallengeInternal` accepte et persiste `validationType`.
- [ ] Schéma migré (J-00 prérequis).

**Exemples :**
- `hasGitHub: true` + weakest=development → "Push un commit sur ta branche active" (`validationType: 'github'`)
- `hasGitHub: false` → "Décris le parcours utilisateur principal" (`validationType: 'conversation'`)

**Notes techniques:** `convex/challenges.ts:generatePersonalizedChallenges`, `convex/crons.ts`, `convex/gamification.ts:createDailyChallengeInternal`.

---

### J-03 · Tracking agent → mise à jour des scores projet [P3]

**En tant que** cron de tracking qui analyse l'activité GitHub
**Je veux** mettre à jour les scores radar du projet à partir des commits détectés
**Afin que** l'avancement du projet reflète l'activité réelle

**Critères d'acceptation**
- [ ] Nouveau tool `updateProjectScores` dans `convex/tracking.ts` :
  - `inputSchema`: `{ validation?, design?, development?, distribution? }` (0-100 chacun)
  - `execute`: appelle `internal.gamification.updateProjectScores({ threadId, scores })`
- [ ] TRACKING_SYSTEM_PROMPT mis à jour : step 3.5 — "Call updateProjectScores with estimated dimension scores based on GitHub activity (commits → development, issues closed → validation, etc.)"
- [ ] L'agent estime des **deltas** (pas des absolus) basés sur l'activité observée.
- [ ] Ordre tool calls dans le prompt : `scrapeUrl` → `getGitHubCommits?` → `updateProjectScores` → `completeChallenge*` → `saveReport`

**Notes techniques:** `convex/tracking.ts:buildScrapeUrlTool` zone, `convex/gamification.ts:updateProjectScores` déjà en place.

---

### J-04 · Tracking agent → auto-validation des challenges [P3]

**En tant que** cron de tracking qui détecte des commits
**Je veux** pouvoir compléter automatiquement les challenges dont la condition est remplie
**Afin que** l'utilisateur soit récompensé sans déclaration manuelle

**Critères d'acceptation**
- [ ] Nouveau tool `completeChallenge` dans `convex/tracking.ts` :
  - `inputSchema`: `{ challengeId: string, completionNote: string }` (1 phrase du type "Push on feat/api at 22:14")
  - `execute`: appelle `internal.gamification.completeDailyChallengeFromCron({ challengeId, userId, completionNote })`
- [ ] Nouvelle mutation `completeDailyChallengeFromCron` (gamification.ts) : même logique que `completeDailyChallengeInternal` + `completedByCron: true` + `completionNote`. Ne déclenche **pas** de slot refill.
- [ ] `buildTrackingPrompt` injecte les challenges actifs `validationType === 'github'` du jour dans le prompt :
  ```
  Active challenges today (validationType: github):
  - [id: xxx] "Push un commit sur ta branche active"
  ```
  Requête : `getDailyChallengesInternal` filtré `validationType === 'github' && !completed`
- [ ] L'artefact de tracking mentionne les challenges auto-complétés dans la section "Signals".

**Notes techniques:** `convex/tracking.ts:buildTrackingPrompt` + nouveaux tool builders, `convex/gamification.ts`.

---

### J-05 · Unseen completions — queries + mutations [P3]

**En tant qu'** utilisateur qui rouvre l'app après le cron de 23h
**Je veux** savoir que le tracking agent a complété des challenges pendant mon absence
**Afin d'** être informé et récompensé

**Critères d'acceptation**
- [ ] Query publique `getUnseenCronCompletions` (gamification.ts) : retourne les challenges où `completed === true && completedByCron === true && seenAt === undefined` pour la date du jour.
- [ ] Mutation publique `markChallengesAsSeen(challengeIds)` : patch `seenAt: Date.now()` sur chaque id.
- [ ] `recordAppOpen` retourne `unseenCount: number` (count des completions non vues) en plus de l'existant.
- [ ] Hook React `useUnseenCronCompletions()` dans `src/features/focus/api.ts`.

**Notes techniques:** `convex/gamification.ts:recordAppOpen` (ligne 843), `src/features/focus/api.ts`.

---

### J-06 · DailyRitualModal — section "Pendant ton absence" [P3]

**En tant qu'** utilisateur qui ouvre l'app après le cron
**Je veux** voir une section dédiée dans la Daily Ritual Modal listant les challenges complétés automatiquement
**Afin d'** être félicité et de comprendre ce qui s'est passé

**Critères d'acceptation**
- [ ] `DailyRitualModal` accepte une nouvelle prop `unseenCompletions: ChallengeDoc[]`.
- [ ] Section **"Pendant ton absence"** (label uppercase, en haut avant streak) — visible seulement si `unseenCompletions.length > 0` :
  - Pour chaque challenge : label, badge `+{points}` vert, `completionNote` en italique si présente
- [ ] Section existante "challenges" renommée **"Prochains défis"** — filtrée sur `!completed && !failed`.
- [ ] À la fermeture du modal (`onClose`) : appelle `markChallengesAsSeen(unseenCompletions.map(c => c._id))`.
- [ ] `idea-screen.tsx` : si `recordAppOpen` retourne `unseenCount > 0` → déclenche l'ouverture du modal (réutilise `setShowStandupSplash(true)` ou setter dédié).

**Hors scope :** push notifications.

**Notes techniques:** `src/features/idea/components/daily-ritual-modal.tsx` (l.87), `src/features/idea/idea-screen.tsx` (l.116 `useStandupTrigger`).

---

### J-07 · Workpool fan-out pour génération challenges [P4]

**Future upgrade** — Remplacer le for-loop séquentiel de `generateDailyChallenges` par `@convex-dev/workpool` pour traiter N utilisateurs en parallèle avec concurrence contrôlée (éviter les rate limits LLM).

**Notes techniques:** `@convex-dev/workpool` — `pool.enqueueAction(ctx, fn, args)`. Installer : `npx convex add workpool`.

---

### J-08 · Workflow pipeline pour tracking [P4]

**Future upgrade** — Refactorer `generateDailyTrackingReports` en pipeline `@convex-dev/workflow` : step 1 fetchGitHub → step 2 updateProjectScores → step 3 completeChallenge → step 4 saveReport. Chaque étape est checkpointée et retryable indépendamment.

**Notes techniques:** `@convex-dev/workflow`. Installer : `npx convex add workflow`.

---
