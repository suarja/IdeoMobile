# Multi-Agent Architecture

**Implémenté :** 2026-03-17 — Streaming : 2026-03-18
**Branch :** `feat/focus-screen`
**Statut :** Backend complet — router Haiku + 4 agents spécialisés + outils gamification + web search + streaming temps réel

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
thread.streamText(                                 ← remplace generateText
  { prompt, tools: commonTools + specializedTools },
  { saveStreamDeltas: true }                       ← écrit les deltas en DB temps réel
)
    ↓
await result.text                                  ← consomme le stream jusqu'à la fin
    ↓
insertMessage(threadId, 'assistant', responseText) ← table messages legacy
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
  2. processedMessage : retourne le message **verbatim** si ≤ 800 tokens ; compresse en première personne ("I want to…") si > 800 tokens
  3. Sélection mémoire : parmi tous les fragments, choisit les 3-5 les plus pertinents pour l'agent cible
- **Output JSON :** `{ specialist, processedMessage, selectedMemory }`
- **Fallback :** sur toute erreur (parsing, API), retourne `general` avec le message original

**Règle `processedMessage`** — critique pour l'affichage "Scope" dans l'UI :
- Message court (≤ 800 tokens) → verbatim, jamais reformulé → l'utilisateur voit ses propres mots
- Message long (> 800 tokens) → compression à la première personne ("I want to...", "I'm looking to...")
- Ne jamais reformuler à la troisième personne ("User wants to…") — l'UI affiche directement ce champ

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

## Streaming temps réel

### Architecture

Le streaming repose sur deux tables internes de `@convex-dev/agent` : les messages paginés et les deltas en cours. Le client fusionne les deux via `useUIMessages`.

```
[Convex action: thread.streamText + saveStreamDeltas: true]
    ↓ écrit des deltas progressifs dans les tables internes @convex-dev/agent
    ↓
[Query Convex: listThreadMessages]           ← listUIMessages + syncStreams + vStreamArgs
    ↓ fusionne messages paginés + deltas streaming
    ↓
[Hook client: useAgentThreadMessages]        ← useUIMessages(api.chat.listThreadMessages, { threadId }, { stream: true })
    ↓ résultats en temps réel : results[].status === 'streaming' pendant la génération
    ↓
[useIdeaSession]
    isSynthesizing = isSending || results.some(m.status === 'streaming')
    streamingText  = lastMsg avec status === 'streaming' → .text
    clarification  = parsé depuis rawAssistantText (marker %%CLARIFY%%
```

### Deux tables de messages — ne pas confondre

| Table | Accès | Usage |
|---|---|---|
| `messages` (Convex custom) | `api.chat.listMessages` → `useMessages` | Historique legacy, affiché dans Settings > Memory |
| Tables internes `@convex-dev/agent` | `api.chat.listThreadMessages` → `useAgentThreadMessages` | Streaming temps réel, UIMessages avec statuts |

Les deux coexistent : `sendMessage` insère dans les deux (agent stocke automatiquement, `insertMessage` pour le custom). Pour le streaming, **toujours utiliser `listThreadMessages`**.

### Query `listThreadMessages`

```typescript
// convex/chat.ts
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,           // ← requis pour le streaming
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };  // ← streams obligatoire pour useUIMessages
  },
});
```

Imports depuis `@convex-dev/agent` (package principal, pas `/react`) : `listUIMessages`, `syncStreams`, `vStreamArgs`.

### Hook client

```typescript
// src/features/idea/api.ts
export function useAgentThreadMessages(threadId: string | null) {
  return useUIMessages(
    api.chat.listThreadMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 30, stream: true },
  );
}
```

`useUIMessages` vient de `@convex-dev/agent/react`. Retourne `{ results, status, loadMore }` — chaque `result` est un `UIMessage` avec `status: 'streaming' | 'success' | 'failed'` et `text: string`.

---

## Clarification interactive — pattern %%CLARIFY%%

### Pourquoi pas un tool

La première implémentation utilisait `setClarification` comme tool AI SDK. Cela a provoqué une erreur critique :

```
messages.0.content.0: unexpected tool_use_id found in tool_result blocks
```

**Cause** : les tools créent des paires `tool_use`/`tool_result` dans l'historique du thread. Lors du step suivant (ou du prochain `continueThread`), si la reconstruction de contexte inclut le `tool_result` sans son `tool_use` précédent (à cause du windowing `recentMessages: 10`), Anthropic rejette la requête.

**Décision** : ne jamais utiliser de tool pour une interaction purement client-side. Utiliser un marker textuel à la place.

> **Règle** : tout tool avec `execute: async () => JSON.stringify(args)` (sans side-effect réel en DB) est un candidat au problème. Préférer un marker texte.

### Format

Les agents écrivent le marker à la **toute fin** de leur réponse textuelle :

```
%%CLARIFY:{"type":"single_choice","question":"...","options":["A","B"]}%%
```

Types supportés :
- `single_choice` + `options: string[]`
- `multi_select` + `options: string[]`
- `confirm_cancel` + `confirmLabel: string` + `cancelLabel: string`

### Instructions agents (tous les 5)

Chaque agent a cette règle dans ses `instructions` :

```
CLARIFICATION RULE:
When you genuinely need user input to proceed, append a JSON block at the VERY END of your
response. Use this format at most ONCE per response:
%%CLARIFY:{"type":"single_choice","question":"...","options":["Option A","Option B"]}%%
Always write a brief explanation in your text BEFORE the %%CLARIFY block.
```

### Parsing côté client

```typescript
// use-idea-session.ts
const CLARIFY_REGEX = /%%CLARIFY:(\{.*?\})%%/s;

function parseClarificationFromText(text: string): Clarification | null {
  const match = CLARIFY_REGEX.exec(text);
  if (!match) return null;
  try { return JSON.parse(match[1]) as Clarification; }
  catch { return null; }
}

export function stripClarifyMarker(text: string): string {
  return text.replace(CLARIFY_REGEX, '').trimEnd();
}
```

Le texte affiché à l'utilisateur est toujours `stripClarifyMarker(rawText)` — le marker n'est jamais visible.

### Flow clarification

```
Agent génère texte + %%CLARIFY:{...}%%
    ↓ stream termine, message committed
    ↓
useIdeaSession.clarification = parsé depuis rawAssistantText
    ↓
ClarificationBlock route vers QuestionSingleChoice / QuestionMultiSelect / QuestionConfirmCancel
    ↓ user tape une option (QuestionSingleChoice : toggle + bouton "Valider" avant envoi)
handleClarificationSelect(option) → handleSend(option)
    ↓ nouveau message user avec la sélection → nouveau cycle synthesizing
```

---

## Rendu markdown agent (`AgentMarkdown`)

**Fichier :** `src/features/idea/components/agent-markdown.tsx`

Le composant `AgentMarkdown` remplace un simple `<Text>` pour afficher les réponses des agents. Il parse le texte en blocs puis rend chaque type nativement.

### Blocs supportés

| Syntaxe | Rendu |
|---------|-------|
| `---` / `***` / `___` | `<View>` avec `borderBottomWidth: 1` |
| `# Titre` / `## Titre` / `### Titre` | `<Text>` avec taille et graisse proportionnelles |
| `\| col \| col \|` (table markdown) | `<View>` grid avec header grisé + alternance lignes |
| Texte ordinaire | `InlineText` (bold + italic inline) |

### Inline markdown (InlineText)

`InlineText` est utilisé pour les paragraphes ET dans les cellules de tables. Supporte : `***bold italic***`, `**bold**`, `*italic*`, `_italic_`.

### Masque streaming (`truncateAtMarkerPrefix`)

Pendant le streaming, `stripClarifyMarker` appelle d'abord `truncateAtMarkerPrefix` qui coupe le texte dès que `%%CLARIFY:` ou `%%SESSION_END%%` apparaît (même partiellement). Résultat : les markers ne sont jamais visibles à l'écran, même en cours de génération.

```typescript
// use-idea-session.ts
function truncateAtMarkerPrefix(text: string): string {
  const indices = ['%%CLARIFY:', '%%SESSION_END%%']
    .map(p => text.indexOf(p)).filter(i => i !== -1);
  if (indices.length === 0) return text;
  return text.slice(0, Math.min(...indices)).trimEnd();
}
```

### Scroll automatique

`IdeaScreen` utilise `useSmoothText` de `@convex-dev/agent/react` pour animer le streaming caractère par caractère. Deux `useEffect` gèrent le scroll :
1. Pendant le streaming → `scrollToEnd({ animated: false })` à chaque caractère
2. À la fin du streaming (transition `true → false`) → `scrollToEnd({ animated: true })` avec délai 100ms

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
