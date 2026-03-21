# Usage Tracking Architecture

**Implémenté :** 2026-03-21
**Branch :** `feat/local-notifications`
**Statut :** Opérationnel — tokens LLM + web searches loggués, aucun quota/blocage

---

## Objectif

Comptabiliser l'utilisation réelle pour analyser les coûts et calibrer les allocations futures :
- **Tokens LLM** — `inputTokens` / `outputTokens` par message agent
- **Web searches** — chaque recherche de validation/distribution avec sa requête et son timestamp

> **Philosophie :** on ne bloque pas, on ne limite pas. On observe. Les données sont filtrables par date pour voir l'évolution dans le temps.

---

## Tables Convex

### `apiUsage`

Un enregistrement par message agent qui produit des tokens.

| Champ | Type | Rôle |
|---|---|---|
| `userId` | string | Utilisateur |
| `threadId` | string | Projet/thread concerné |
| `specialist` | string | Agent spécialiste (`general`, `validation`, `design`, etc.) |
| `model` | string | Modèle utilisé (`claude-sonnet-4-6`) |
| `inputTokens` | number | Tokens en entrée (prompt) |
| `outputTokens` | number | Tokens en sortie (completion) |
| `createdAt` | number | Timestamp ms — permet le filtrage par date |

Index : `by_userId`, `by_threadId`

### `webSearchLogs`

Un enregistrement par recherche web déclenchée par l'agent.

| Champ | Type | Rôle |
|---|---|---|
| `userId` | string | Utilisateur |
| `threadId` | string | Projet/thread concerné |
| `specialist` | string | Agent déclencheur (`validation` ou `distribution`) |
| `query` | string | Requête envoyée au moteur de recherche |
| `resultCount` | number | Nombre de résultats retournés |
| `createdAt` | number | Timestamp ms — permet le filtrage par date |

Index : `by_userId`, `by_threadId`

---

## Fonctions Convex (`convex/chat.ts`)

| Fonction | Type | Rôle |
|---|---|---|
| `insertApiUsage` | `internalMutation` | Insère un enregistrement tokens après chaque réponse agent |
| `getUsageSummary` | `internalQuery` | Somme tokens (30 derniers jours) pour un userId |

### Limites connues

`insertApiUsage` tente `(result as any).usage` — le SDK `@convex-dev/agent` n'expose pas garantit `usage` sur `StreamTextResult`. Best-effort : si absent ou `0`, l'enregistrement n'est pas créé.

---

## Fonctions Convex (`convex/projects.ts`)

| Fonction | Type | Rôle |
|---|---|---|
| `insertWebSearchLog` | `internalMutation` | Insère un log de recherche avec query + timestamp |
| `incrementValidationSearchCount` | `internalMutation` | Incrémente le compteur cumulatif sur `projects.validationSearchCount` |
| `getValidationSearchQuota` | `internalQuery` | Lit les compteurs (analytics uniquement — plus de blocage) |

---

## Flux d'enregistrement

### Tokens LLM
```
sendMessage(action)
    └─ thread.streamText(...)
    └─ await result.text  ← consomme le stream
    └─ (result as any).usage?.catch(() => null)
         ├─ Si tokens disponibles → insertApiUsage(threadId, specialist, model, tokens)
         └─ Sinon → silencieux
```

### Web searches
```
triggerValidationSearch(tool)
    └─ webSearch(query)   ← appel API
    └─ incrementValidationSearchCount(threadId)  ← compteur cumulatif projet
    └─ insertWebSearchLog(threadId, specialist, query, resultCount)  ← log horodaté
```

---

## Requêtes analytiques (dashboard Convex)

**Tokens du mois courant pour un utilisateur :**
```javascript
const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
db.query('apiUsage')
  .withIndex('by_userId', q => q.eq('userId', uid))
  .filter(q => q.gte(q.field('createdAt'), since))
  .collect()
```

**Recherches web par utilisateur sur une période :**
```javascript
db.query('webSearchLogs')
  .withIndex('by_userId', q => q.eq('userId', uid))
  .filter(q => q.gte(q.field('createdAt'), since))
  .collect()
```

**Répartition par agent spécialiste :**
```javascript
// group by specialist dans le résultat
rows.reduce((acc, r) => {
  acc[r.specialist] = (acc[r.specialist] ?? 0) + r.inputTokens + r.outputTokens;
  return acc;
}, {})
```

---

## Compteur `projects.validationSearchCount`

Compteur cumulatif sans reset sur chaque document `projects`. Sert d'indicateur rapide ("ce projet a lancé N recherches"). **Ne pas utiliser pour du quota/blocage** — utiliser `webSearchLogs` avec filtre `createdAt` pour une analyse temporelle précise.

---

## Langue agents (`detectedLanguage`)

Ajout connexe sur la même branch : le router Haiku détecte la langue du message original et l'injecte dans le prompt spécialiste via :

```
[SYSTEM: The user wrote in fr. You MUST respond ENTIRELY in fr.
All clarification options and labels MUST be in fr.]
```

`RouterDecision.detectedLanguage` — BCP-47 (`fr`, `en`, `ar`, `es`...), fallback `'en'`. Transmis de `routerAgent.ts` → `buildFullPrompt()` dans `chat.ts`.
