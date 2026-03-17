# Multi-Agent Architecture

**Implémenté :** 2026-03-17
**Branch :** `feat/focus-screen`
**Statut :** Backend complet — router Haiku + 4 agents spécialisés + outils gamification + web search

---

## Vue d'ensemble

Le système multi-agent remplace l'agent monolithique (`chatAgent`) par une architecture router + spécialistes. Le routing est **transparent pour l'user** — même `threadId`, même interface, mais l'agent qui répond est sélectionné selon le contexte.

```
sendMessage(threadId, content)
    ↓
routerAgent (Haiku — internalAction, sans continueThread)
    ├─ Route vers le bon spécialiste
    ├─ Compresse le message si trop long (> ~800 tokens)
    └─ Sélectionne les fragments mémoire les plus pertinents
    ↓
{ specialist, processedMessage, selectedMemory }
    ↓
selectedAgent.continueThread(ctx, { threadId })   ← même threadId partagé
    ↓
thread.generateText({ prompt, tools: commonTools + specializedTools })
```

---

## Agents

| Agent | Fichier | Modèle | Instructions Focus |
|---|---|---|---|
| `generalAgent` | `agents/chatAgent.ts` | Sonnet 4.6 | Co-founder stratégique, motivation, blocages |
| `validationAgent` | `agents/validationAgent.ts` | Sonnet 4.6 | Validation marché, concurrents, target users |
| `designAgent` | `agents/designAgent.ts` | Sonnet 4.6 | UX/UI, flows, structure d'écrans |
| `developmentAgent` | `agents/developmentAgent.ts` | Sonnet 4.6 | Stack technique, architecture, données |
| `distributionAgent` | `agents/distributionAgent.ts` | Sonnet 4.6 | GTM, contenu, canaux, growth |

### Router Agent (Haiku)

- **Fichier :** `agents/routerAgent.ts`
- **Modèle :** `claude-haiku-4-5-20251001` (~0.25$/M tokens input — 10x moins cher que Sonnet)
- **Pattern :** `internalAction` — appelle `generateText` directement, **pas** `continueThread`
- **Rôles :**
  1. Routing : choisit le spécialiste selon le message + scores radar faibles (< 30 boostés)
  2. Compression : si message > ~800 tokens, résumé en conservant l'intention + faits clés
  3. Sélection mémoire : parmi tous les fragments, choisit les 3-5 les plus pertinents pour l'agent cible
- **Output JSON :** `{ specialist, processedMessage, selectedMemory }`
- **Fallback :** sur toute erreur (parsing, API), retourne `general` avec le message original

---

## Outils

### Outils communs (tous les agents)

| Outil | Description |
|---|---|
| `updateProjectScores` | Met à jour les scores radar 0-100 par dimension |
| `addGoal` | Crée un objectif de projet |
| `saveUserMemory` | Sauvegarde un insight sur l'utilisateur |
| `saveProjectMemory` | Sauvegarde un insight sur le projet |
| `deleteMemory` | Supprime un fragment mémoire incorrect |
| `recordVoiceSession` | Enregistre la fin d'une session vocale (points + streak) |
| `readDailyChallenges` | Lit les défis du jour de l'utilisateur |
| `completeDailyChallenge` | Marque un défi comme complété |
| `createDailyChallenge` | Crée un défi personnalisé pour la session |
| `readUserStats` | Lit les stats de l'utilisateur (points, niveau, streak) |
| `readProjectScores` | Lit les scores radar du projet courant |

### Outils spécialisés

| Outil | Agents | Description |
|---|---|---|
| `triggerValidationSearch` | `validation`, `distribution` | Recherche web avec quota (1/projet, 4/mois) |

---

## Web Search

### Implémentation

Trois providers benchmarkables, sélection via `WEB_SEARCH_PROVIDER` env var :

| Provider | Fichier | Env var | Notes |
|---|---|---|---|
| Tavily | `tools/web-search/tavily.ts` | `TAVILY_API_KEY` | Default, JSON structuré |
| Perplexity | `tools/web-search/perplexity.ts` | `PERPLEXITY_API_KEY` | Sonar API, citations |
| Anthropic native | `tools/web-search/anthropic-native.ts` | (aucune) | `webSearch_20250305` built-in tool |

**Setup :**
```bash
npx convex env set TAVILY_API_KEY <key>
npx convex env set WEB_SEARCH_PROVIDER tavily   # ou perplexity, anthropic
```

### UX — 2 tours obligatoires avant la recherche

La recherche n'est **pas déclenchée automatiquement**. L'agent doit :
1. Comprendre l'idée (vérifier que `ideaSummary` existe en mémoire projet)
2. Demander confirmation explicite à l'utilisateur
3. Appeler `triggerValidationSearch` seulement après confirmation

L'outil vérifie le quota avant d'exécuter :
- **Max 1 recherche par projet** (`validationSearchCount` dans la table `projects`)
- **Max 4 recherches par mois** (somme sur tous les projets de l'utilisateur)

---

## Outils Futurs (Roadmap)

### `generateHtmlMockup` (designAgent)
- Génère HTML/CSS pour une maquette d'écran
- Store dans Convex file storage, retourne URL publique temporaire
- Déclenchement : l'user demande "montre-moi à quoi ça ressemblerait"

### `generateMarkdownDoc` (developmentAgent)
- Génère fichier Markdown (ADR, tech stack, architecture)
- Store dans table Convex `projectFiles` (threadId, fileName, content, createdAt)
- Déclenchement : l'user demande "documente notre architecture"

### `searchSocialProfile` (distributionAgent)
- Analyse les posts Twitter/TikTok récents de l'user pour cerner son style éditorial
- Nécessite OAuth tokens dans `userMemory`
- Déclenchement : avant de créer du contenu

### `createContentDraft` (distributionAgent)
- Génère tweet/script TikTok aligné avec le style de l'user + stade du projet
- Store dans table `contentDrafts`
- Déclenchement : l'user demande "aide-moi à écrire un post"

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `convex/agents/chatAgent.ts` | `generalAgent` (co-founder stratégique) |
| `convex/agents/routerAgent.ts` | Router Haiku (internalAction) |
| `convex/agents/validationAgent.ts` | Validation marché |
| `convex/agents/designAgent.ts` | UX/UI |
| `convex/agents/developmentAgent.ts` | Architecture technique |
| `convex/agents/distributionAgent.ts` | Growth & distribution |
| `convex/tools/web-search/tavily.ts` | Provider Tavily |
| `convex/tools/web-search/perplexity.ts` | Provider Perplexity |
| `convex/tools/web-search/anthropic-native.ts` | Provider Anthropic natif |
| `convex/tools/web-search/index.ts` | Router de provider |
| `convex/chat.ts` | `sendMessage` — orchestration complète |

---

## Points d'attention

1. **Fallback router :** si le routeur Haiku échoue (réseau, parsing JSON), le fallback est `generalAgent` avec le message original. Le user ne voit aucune différence.

2. **Mémoire filtrée :** le routeur injecte seulement 3-5 fragments dans le spécialiste, réduisant les tokens. Si le filtering est trop agressif (fragments importants filtrés), augmenter à 7-8.

3. **Thread partagé :** tous les agents appellent `continueThread` sur le même `threadId`. L'historique est unifié — l'agent spécialisé voit les messages précédents de tous les agents.

4. **Quota web search :** le quota est compté par projet (champ `validationSearchCount` dans `projects`). Le compteur mensuel est la somme de tous les projets de l'user — approximatif mais suffisant pour le POC.

5. **`triggerValidationSearch` : retour gracieux** si la clé API est absente — l'outil retourne un message d'erreur lisible au lieu de faire crasher le thread.
