# Bug : `tool_use_id` dans les tool_result — @convex-dev/agent

**Découvert :** 2026-03-18
**Branch :** `feat/focus-screen`
**Statut :** Résolu — workaround en place

---

## Symptôme

L'agent échoue avec `status: "failed"` et l'erreur :

```
messages.0.content.0: unexpected `tool_use_id` found in `tool_result` blocks:
toolu_01Ry22A5ms3P55rWKSL2i443.
Each `tool_result` block must have a corresponding `tool_use` block in the previous message.
```

Visible dans les tables internes de `@convex-dev/agent` (Convex dashboard) sur un message avec `content: []` et `role: "assistant"`.

---

## Cause

### Pattern dangereux

Un tool défini avec `execute` mais sans side-effect réel en DB :

```typescript
// ❌ NE PAS FAIRE — crée un tool_use/tool_result orphelin
setClarification: tool({
  inputSchema: z.object({ question: z.string(), ... }),
  execute: async (args) => JSON.stringify(args),  // juste retourner les args
}),
```

### Mécanisme de l'erreur

1. L'agent appelle `setClarification` → le framework stocke un `tool_use` (message assistant) + un `tool_result` (message user synthétique).
2. Lors du **step suivant** dans la même génération (ou lors du prochain `continueThread`), le framework reconstruit le contexte à envoyer à Anthropic.
3. Si la reconstruction inclut le `tool_result` mais pas son `tool_use` précédent (boundary du `recentMessages: 10`, ou problème de reconstruction inter-steps), Anthropic rejette.

L'erreur `messages.0.content.0` confirme que le `tool_result` est au tout début du tableau de messages — sans `tool_use` précédent dans le contexte.

### Pourquoi cela arrive avec `@convex-dev/agent`

- `recentMessages: 10` peut couper l'historique entre un `tool_use` et son `tool_result` si la paire est proche du bord de la fenêtre.
- En mode multi-step (`maxSteps: 10`), la reconstruction du contexte entre steps peut ne pas inclure correctement les paires de l'étape précédente.

---

## Solution — marker textuel `%%CLARIFY%%`

Ne jamais utiliser de tool pour une interaction purement client-side (pas de write en DB, pas de side-effect réel). Utiliser un marker texte à la place.

```
Agent output : "Texte explicatif... %%CLARIFY:{"type":"single_choice","options":["A","B"]}%%"
```

Parsé côté client avec un regex, jamais stocké comme tool_use/tool_result.

Voir : `docs/architecture/agents.md` → section **Clarification interactive — pattern %%CLARIFY%%**

---

## Règle à retenir

> **Un tool dont `execute` ne fait que retourner ses arguments (`JSON.stringify(args)`) est à haut risque.** Si son seul rôle est d'informer le client, utiliser un format texte injecté dans la réponse de l'agent.

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `convex/chat.ts` | Suppression du tool `setClarification` |
| `convex/agents/*.ts` (×5) | Instruction CLARIFICATION RULE → format `%%CLARIFY%%` |
| `src/features/idea/use-idea-session.ts` | `parseClarificationFromText` + `stripClarifyMarker` |
