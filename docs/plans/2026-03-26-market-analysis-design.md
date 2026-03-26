# Design — E-03 · Market Analysis Approfondie

**Date :** 2026-03-26
**Epic :** E-03 (P4 → avancé à P3 avec cette spec)
**Statut :** Approuvé

---

## Contexte

L'agent de chat aide les vibe coders à affiner leur idée. Une fois que l'idée est suffisamment mûre, l'utilisateur mérite une analyse de marché approfondie (concurrents, TAM/SAM/SOM, tendances) similaire à ce que fait IdeaProof. Ce n'est pas automatique — c'est une récompense débloquée par l'agent puis lancée volontairement par l'utilisateur. Le résultat est un artefact persistant dans l'onglet Insights.

---

## Architecture

### 1. Schema

**`projects`** — nouveau champ :
```
marketAnalysisAvailable?: boolean
```

**`artifacts.type`** — union étendue :
```
'validation' | 'tracking' | 'market'
```

**Nouvelle table `marketAnalysisJobs`** :
```
projectId: Id<'projects'>
userId: string
status: 'pending' | 'running' | 'done' | 'error'
currentStep: string        // label affiché dans l'UI
stepsTotal: number         // 5
stepsDone: number          // 0→5
errorMessage?: string
artifactId?: Id<'artifacts'>
createdAt: number
```
Index : `by_project` (`projectId`), `by_user` (`userId`)

---

### 2. Unlock — Chat agent tool

**Fichier :** `convex/chat.ts` → `buildCommonTools`

Nouveau tool **`unlockMarketAnalysis`** :
- `inputSchema` : `{}` (pas de paramètre — contexte injecté par le closure)
- `execute` : `patch(projectId, { marketAnalysisAvailable: true })`
- Retourne : `"Market analysis unlocked. Tell the user they can now launch it from Insights."`

**Prompt update** (dans chaque agent specialist) :
> Call `unlockMarketAnalysis` when the user has refined their idea across at least 2 dimensions and you have enough context to run a meaningful market analysis.

---

### 3. Lancement — Mutation publique

**Fichier :** `convex/market.ts`

**`launchMarketAnalysis`** (public mutation) :
1. Auth guard
2. Guard : `project.marketAnalysisAvailable === true`
3. Idempotence : aucun job `pending` ou `running` déjà actif pour ce projet
4. Insert `marketAnalysisJobs` avec `status: 'pending'`
5. `ctx.scheduler.runAfter(0, internal.market.runMarketWorkflow, { projectId, jobId })`

---

### 4. Pipeline Workflow

**Installer :** `npx convex add workflow` → ajouter à `convex.config.ts`

**Fichier :** `convex/market.ts` — `runMarketWorkflow` (internal action)

5 steps séquentiels. Chaque step :
1. Patch job : `{ currentStep: "...", stepsDone: N, status: 'running' }`
2. Web search (Tavily/Perplexity — réutilise `convex/tools/webSearch/`)
3. Appel LLM (Claude Sonnet) pour analyser + produire le bloc markdown

| # | `currentStep` label | Recherche |
|---|---------------------|-----------|
| 1 | Concurrents directs | `[nom] competitors app 2025` |
| 2 | Alternatives & substituts | `[domaine] tools alternatives` |
| 3 | Taille de marché | `[domaine] market size TAM SAM SOM` |
| 4 | Tendances 2025-2026 | `[domaine] trends 2025 2026` |
| 5 | Synthèse & recommandations | LLM only (pas de search) |

**Fin du step 5 :**
- `saveArtifact({ type: 'market', title: 'Market Analysis — [nom]', content, tldr, projectId, userId })`
- `patch job → { status: 'done', artifactId }`

**Erreur :** `patch job → { status: 'error', errorMessage }` (Convex Workflow retrie avec backoff)

**Format artifact (markdown) :**
```
## Market Analysis — [nom idée]
### 1. Concurrents directs
### 2. Alternatives & substituts
### 3. Taille de marché (TAM/SAM/SOM)
### 4. Tendances 2025-2026
### 5. Synthèse
**Points forts** / **Points faibles** / **Recommandation**
```

---

### 5. UI — Insights Screen

**Fichier :** `src/features/insights/insights-screen.tsx`

Banner inséré **en haut de l'onglet Validation**, avant `<ArtifactList>`.

| État | Affichage |
|------|-----------|
| `!marketAnalysisAvailable` | Rien |
| `marketAnalysisAvailable && !job` | Card "Analyse de marché disponible" + bouton "Lancer" |
| `job.status === 'pending' \| 'running'` | Card progress : step label + indicateur stepsDone/stepsTotal |
| `job.status === 'done'` | Card disparaît (artifact visible dans la liste) |
| `job.status === 'error'` | Card "Erreur" + bouton "Réessayer" |

**Nouveau hook** `useMarketAnalysisJob(projectId)` dans `src/features/insights/api.ts`.

**Nouvelle mutation** `useLaunchMarketAnalysis()` câblée sur le bouton "Lancer".

Les artifacts `market` sont affichés dans la liste existante (`ArtifactList type='validation'`) car ils apparaissent dans l'onglet Validation. Alternativement, filtrer par `type` dans la query pour inclure `market` côté `listArtifacts`.

---

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `convex/schema.ts` | + champ `projects.marketAnalysisAvailable`, + table `marketAnalysisJobs`, + `'market'` dans artifacts.type |
| `convex/market.ts` | Nouveau fichier : `launchMarketAnalysis`, `runMarketWorkflow`, queries job |
| `convex/convex.config.ts` | + workflow component |
| `convex/artifacts.ts` | Extend type union `'market'`, add `listArtifacts` support |
| `convex/chat.ts` | + tool `unlockMarketAnalysis` dans `buildCommonTools` |
| `src/features/insights/api.ts` | + `useMarketAnalysisJob`, + `useLaunchMarketAnalysis` |
| `src/features/insights/insights-screen.tsx` | + banner conditionnel |
| `src/features/insights/components/market-analysis-banner.tsx` | Nouveau composant banner |
| Translations `en.json` + `ar.json` | Nouvelles clés UI |

---

## Vérification

1. Chat agent appelle `unlockMarketAnalysis` → `project.marketAnalysisAvailable = true`
2. Insights affiche le banner "Lancer"
3. Tap → `launchMarketAnalysis` → job créé, workflow schedulé
4. Banner passe en mode progress, steps s'incrémentent (~2-3 min)
5. Artifact `market` créé → banner disparaît → artifact visible dans la liste
6. Re-tap "Lancer" → bloqué (idempotence)
7. Crash au step 3 → Workflow retrie → job continue
