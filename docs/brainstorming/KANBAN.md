# Backlog IdeoMobile

## EPIC H — Bugs UI
> P1

---

### H-01 · Fix PointsBanner safe area [P1]

**En tant qu'** utilisateur sur iPhone avec Dynamic Island ou notch
**Je veux** que la bannière de points s'affiche dans la zone visible
**Afin de** voir la récompense sans qu'elle soit masquée par le bord du téléphone

**Critères d'acceptation**
- [ ] La `PointsBanner` tient compte des insets de la safe area pour son positionnement vertical
- [ ] Le comportement est identique sur tous les modèles (Dynamic Island, encoche, bord droit)

**Notes techniques:** `src/features/idea/components/points-banner.tsx` — remplacer `top: 0` par `top: insets.top` via `useSafeAreaInsets()`. Pattern déjà correct dans `ChallengeToastStack` (`top: insets.top + 8`).

---

## EPIC G — Retour Haptique
> P2

---

### G-01 · Service haptique centralisé [P2]

**En tant que** développeur
**Je veux** un service centralisé pour déclencher les retours haptiques
**Afin de** garantir la cohérence des patterns vibratoires et faciliter les modifications globales

**Critères d'acceptation**
- [ ] `src/lib/services/haptics.ts` expose des fonctions sémantiques : `light`, `medium`, `heavy`, `success`, `warning`, `selection`
- [ ] Les 2 usages existants (`level-up-modal.tsx`, `focus-screen.tsx`) sont migrés vers ce service
- [ ] Le service gère silencieusement les erreurs (appareils non supportés)

**Notes techniques:** Wrapper autour de `expo-haptics` (déjà installé). Usages actuels : `Haptics.notificationAsync(Success)` dans `level-up-modal.tsx:50`, `Haptics.impactAsync(Light)` dans `focus-screen.tsx:157`.

---

### G-02 · Haptics sur interactions UI clés [P2]

**En tant qu'** utilisateur
**Je veux** ressentir un retour tactile sur les actions importantes
**Afin d'** avoir une sensation d'application native et réactive

**Critères d'acceptation**
- [ ] Taps sur les boutons CTA principaux déclenchent un `light` impact
- [ ] Navigation entre onglets déclenche un `light` impact
- [ ] Ouverture/fermeture de modales bottom-sheet déclenche un `light` impact
- [ ] Long-press (ex. suppression mémoire) déclenche un `medium` impact

**Notes techniques:** Utiliser le service G-01. Identifier les composants CTA dans `src/features/` et `src/components/`.

---

### G-03 · Haptics gamification [P2]

**En tant qu'** utilisateur qui reçoit des récompenses
**Je veux** ressentir un retour haptique différencié selon le type de récompense
**Afin que** la gamification soit plus immersive et satisfaisante

**Critères d'acceptation**
- [ ] Attribution de points (déclenchement `PointsBanner`) → `medium` impact
- [ ] Level-up (déjà en place dans `level-up-modal.tsx`) → migré vers service G-01, conserve `success`
- [ ] Création d'un nouveau challenge → `light` impact
- [ ] Streak atteint → `success` notification

**Notes techniques:** Utiliser le service G-01. Hook PointsBanner dans `src/features/idea/components/points-banner.tsx`.

---

### G-04 · Haptics agent/streaming [P3]

**En tant qu'** utilisateur qui attend une réponse de l'agent
**Je veux** un retour tactile quand l'agent commence à répondre
**Afin de** savoir que ma requête est en cours de traitement sans regarder l'écran

**Critères d'acceptation**
- [ ] Réception du premier token de streaming → `light` impact
- [ ] Fin du streaming → `light` impact (distinct du début)

**Notes techniques:** Utiliser le service G-01. Hook dans `useIdeaSession` au changement d'état `isSynthesizing`.

---

## EPIC E — Web Search
> P3

---

### E-01 · Usage tracking web search [DONE] ✅

**État :** Implémenté. Comptabilisation en place.
- `webSearchLogs` table : specialist, query, resultCount, createdAt
- `validationSearchCount` par projet (incrémenté dans `convex/chat.ts`)
- `monthlySearchCount` + `searchMonthStart` sur `userStats`

**⚠️ Pas de quota enforcement en phase dev** — la data est collectée pour calibrer les plafonds des plans de paiement à partir de l'usage réel. Aucun blocage à implémenter tant que l'usage n'est pas mesuré.

---

### E-02 · Liens de monitoring par projet [P3]

**En tant qu'** utilisateur ayant un projet actif
**Je veux** associer des liens (GitHub, site, réseaux sociaux) à mon projet
**Afin que** l'agent puisse surveiller automatiquement l'avancement et me faire des comptes-rendus

**Critères d'acceptation**
- [ ] Champs liens (GitHub, site web, Instagram, TikTok) sur le document projet dans `convex/schema.ts`
- [ ] UI d'édition des liens dans la fiche projet (ou section dédiée dans les settings du projet)
- [ ] Si aucun lien projet défini → fallback sur les liens du profil utilisateur (`userProfiles`) avec avertissement contextuel
- [ ] Le cron existant (`convex/crons.ts`) est étendu pour fetcher + résumer l'activité de ces URLs
- [ ] Le résumé est sauvegardé comme artefact accessible depuis la fiche projet

**Notes techniques:** Liens utilisateur déjà présents dans `userProfiles` (GitHub, Instagram, TikTok, site — settings screen). Créer un champ `projectLinks` ou table `projectLinks` liée aux projets. Cron existant : `'0 6 * * *'` dans `convex/crons.ts`.

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
