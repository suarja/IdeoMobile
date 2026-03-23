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

## EPIC J — Challenges GitHub-Driven
> P3

---

### J-01 · Challenge templates GitHub [P3]

**En tant qu'** agent qui génère des défis quotidiens
**Je veux** proposer des challenges liés à l'activité GitHub
**Afin que** la progression soit mesurable objectivement

**Critères d'acceptation**
- [ ] Ajouter des templates GitHub dans `SYSTEM_CHALLENGE_POOL` de `convex/gamification.ts` :
  - "Push au moins 1 commit sur ta branche active aujourd'hui"
  - "Ouvre une PR ou mets à jour une PR existante"
  - "Ferme au moins 1 issue ouverte"
  - "Crée une nouvelle branche pour la prochaine feature"
- [ ] Le cron `generateDailyChallenges` sélectionne ces templates si le projet a un lien GitHub configuré
- [ ] Les challenges GitHub sont distingués par un champ `validationType: 'github' | 'conversation'` dans le schéma
- [ ] Maximum 10 challenges actifs par jour — dès qu'un challenge est accompli, un slot se libère

**Notes techniques:** `convex/gamification.ts` — `SYSTEM_CHALLENGE_POOL` (7 templates génériques actuellement). Ajouter champ `validationType` dans `convex/schema.ts` table `dailyChallenges`.

---

### J-02 · Validation des challenges via GitHub [P3]

**En tant qu'** utilisateur qui essaie de valider un challenge GitHub
**Je veux** que l'agent vérifie mon activité GitHub
**Afin que** la validation soit objective et non auto-déclarée

**Critères d'acceptation**
- [ ] `validateAndCompleteDailyChallenge` dans `convex/gamification.ts` : si `validationType === 'github'`, appeler l'API GitHub au lieu de lire la conversation
- [ ] Vérification : commit sur branche active dans les dernières 24h → challenge "commit" auto-complété
- [ ] Si le token GitHub n'est pas configuré → fallback sur la validation par conversation (comportement actuel)
- [ ] Cooldown 30 min conservé si la vérification GitHub échoue

**Notes techniques:** Réutiliser les primitives E-04. Déclenché depuis `convex/gamification.ts:validateAndCompleteDailyChallenge`.

---

### J-03 · Tracking cron → mise à jour des challenges [P3]

**En tant que** cron de tracking qui analyse l'activité GitHub
**Je veux** pouvoir marquer automatiquement des challenges comme complétés
**Afin que** l'utilisateur soit récompensé sans avoir à le déclarer manuellement

**Critères d'acceptation**
- [ ] L'agent tracking a accès à un tool `completeChallenge` (en plus de `scrapeUrl` et `saveReport`)
- [ ] L'agent compare les commits détectés avec les challenges GitHub actifs du jour
- [ ] Si un commit correspond à un challenge (ex. branche + message), il le complète automatiquement
- [ ] L'artefact de tracking mentionne les challenges auto-complétés dans la section "Signals"

**Notes techniques:** `convex/tracking.ts` — ajouter un 3e tool `completeChallenge` qui appelle `internal.gamification.completeDailyChallenge`. Passer les challenges du jour dans le prompt.

---

### J-04 · Modal in-app sur challenges auto-complétés [P3]

**En tant qu'** utilisateur qui ouvre l'application
**Je veux** voir un récapitulatif des challenges complétés automatiquement (par le cron GitHub) depuis ma dernière visite
**Afin d'** être félicité et de comprendre pourquoi j'ai reçu des points

**Critères d'acceptation**
- [ ] Chaque challenge complété par le cron dispose d'un champ `seenAt?: number` dans la table `dailyChallenges`
- [ ] À l'ouverture de l'app (`recordAppOpen`), vérifier s'il existe des challenges auto-complétés non vus
- [ ] Si oui → afficher un modal de félicitation (pattern identique à `DailyRitualModal` ou `LevelUpModal`) listant les challenges + points gagnés
- [ ] Si plusieurs challenges : liste groupée dans le même modal
- [ ] Marquer `seenAt` dès que le modal est affiché

**Hors scope :** push notifications (infrastructure à prévoir séparément)

**Notes techniques:** `convex/schema.ts` — ajouter `seenAt?: number` sur la table `dailyChallenges`. `convex/gamification.ts:recordAppOpen` — ajouter requête des challenges non vus. Pattern UI : `src/features/idea/components/daily-ritual-modal.tsx`.

---
