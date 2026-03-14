# POC / MVP Scope — Ideo

> Document de réflexion et de décision. Sert de base au backlog.
> Mis à jour : mars 2026

---

## 1. Le Problème Réel

### Pain point #1 — Le vide après le premier prototype

Les vibe coders savent démarrer un projet. Ils ne savent pas comment le tenir dans la durée. La douleur n'est pas l'idée — c'est l'exécution sur la longueur. Après l'euphorie du premier prototype, la réalité s'installe : bugs à corriger, décisions à prendre, momentum qui s'érode.

### Pain point #2 — Les feedback loops trop longs

L'entrepreneuriat est dur à valider : les résultats arrivent lentement, il est difficile d'attribuer succès/échec à une décision précise. Sans feedback rapide et contextualisé, l'incertitude paralyse. Le builder se retrouve à tourner en rond ou à recommencer un nouveau projet plutôt qu'à terminer l'ancien.

### Pain point #3 — La solitude du builder solo

Absence d'un interlocuteur qui "connaît le projet" et peut donner un avis stratégique au bon moment. Les outils actuels (Linear, Notion) sont statiques et ne savent pas qui tu es. Un post X reçoit des likes mais pas de vraie guidance. Un ami dev n'a pas le contexte de tes décisions passées.

---

## 2. ICP — Ideal Customer Profile

**Qui :** L'indie hacker / solopreneur builder

- Utilise Cursor, Claude Code pour construire
- A 1-3 projets en cours / abandonnés
- Builder le soir et le week-end, emploi principal en journée ou freelance
- Entre 25 et 40 ans, technophile, consomme du contenu tech/startup

**Comportement :**

- Commence fort, perd momentum après 2-4 semaines
- Se retrouve paralysé par des décisions ("quelle stack ?", "faut-il pivoter ?")
- Cherche accountability mais sans rigidité corporate
- Suit des créateurs build-in-public pour s'inspirer / se sentir moins seul

**Ce qu'il veut vraiment :**

- Quelqu'un (ou quelque chose) qui connaît son projet et lui dit quoi faire ensuite
- La sensation de progresser même les mauvais jours
- Un outil qui s'adapte à lui, pas l'inverse

**Ce qu'il ne veut pas :**

- Un autre outil de gestion de projet à remplir
- Un chatbot générique qui ne connaît pas son contexte
- Une app qui le juge pour ses lenteurs

---

## 3. Hypothèse Core

> **Si un builder solo a un compagnon IA qui connaît profondément son projet (mémoire persistante) et qui compresse les feedback loops en posant les bonnes questions au bon moment — via un rituel vocal quotidien de <2 minutes — il progresse davantage et abandonne moins souvent.**

Ce qui est testé : la combinaison de **mémoire contextuelle** + **rituel vocal** + **réponse advisory** (pas juste un résumé, mais une vraie recommandation).

---

## 4. Core Feature : L'Agent Compagnon avec Mémoire

Ce n'est pas un chatbot. C'est un agent qui :

1. **Connaît le projet** — blueprint, phase actuelle, blocages récurrents, historique des sessions
2. **Connaît l'utilisateur** — style de travail, peurs, motivations, patterns d'abandon
3. **Pose les bonnes questions** — pas seulement écoute : challenge, recadre, propose
4. **Conseille stratégiquement** — "Quel est le meilleur outil pour X à l'heure actuelle ?", "Est-ce le bon moment pour pivoter ?"
5. **Célèbre les micro-victoires** — via la gamification (streaks, points)

**Interaction type :**

1. Utilisateur ouvre l'app → tape le FAB micro
2. Parle : ce qu'il a fait, ce qui le bloque (<2 min)
3. L'agent répond avec le contexte du projet + une question de recentrage ou une recommandation concrète
4. Session sauvegardée au journal du projet

---

## 5. Architecture Mémoire de l'Agent

Implémentée via `@convex-dev/agent` (v0.3.2) sur Convex. Le LLM provider est `@ai-sdk/anthropic`.

### Stack agent confirmé

- **Orchestration :** `@convex-dev/agent` — gère le threading, la compaction de contexte, et le RAG
- **LLM provider :** `@ai-sdk/anthropic` (adaptateur Vercel AI SDK) → Claude Sonnet 4.6
- **Note :** `testAgent` utilise actuellement GPT-4o — migration vers `@ai-sdk/anthropic` + Sonnet 4.6 à planifier

### 3 couches de mémoire (Convex-native)

| Type | Implémentation précédente | Nouvelle implémentation |
|---|---|---|
| **Session** | Context window + compaction Anthropic | Thread `@convex-dev/agent` — compaction de contexte auto-gérée |
| **Persistante** | `project_state.md`, `user_profile.md`, `progress_log.md` (JSON/MMKV) | Tables Convex : `projects`, `userProfiles`, `sessions` (typées, queryables) |
| **Archivale** | Summaries manuels + Anthropic memory tool | Convex vector search + RAG sur l'historique des messages de thread |

### Architecture RAG

- Les embeddings sont stockés dans un index vectoriel Convex (support natif)
- `@convex-dev/agent` peut être configuré pour récupérer le contexte passé pertinent avant chaque session
- Permet la récupération sémantique : "qu'est-ce qu'on avait décidé sur la tech stack la semaine dernière ?"

### Cycle d'une session standup

1. Démarrage → `@convex-dev/agent` récupère le thread existant + contexte RAG pertinent
2. Conversation vocale (<2 min) — transcription on-device via `expo-speech-recognition`
3. Fin → agent met à jour les tables Convex avec résumé + insights + prochaine étape recommandée

### Règles de mémoire (système prompt)

- Sauvegarder proactivement sans être demandé
- Sauvegarder systématiquement quand l'utilisateur fait une correction
- Mémoire persistante : garder <1000 tokens (épurer régulièrement via compaction auto)

### Modèle et coûts

**Modèle :** Claude Sonnet 4.6 via `@ai-sdk/anthropic` (pas Opus — coût ~$2-3/message avec Opus vs ~$0.05-0.15 avec Sonnet pour usage consumer)

**Coût estimé par session standup :** ~$0.05-0.15 avec Sonnet → viable à $10-20/mois en prix utilisateur final

---

## 6. Périmètre POC (dogfooding interne)

**Objectif :** Valider que le loop vocal → réponse contextuelle → sentiment de progrès est assez puissant pour que l'utilisateur revienne le lendemain.

### In scope

- [ ] Un seul projet actif (profil projet hard-codé au lancement)
- [ ] Capture vocale → transcription on-device via `expo-speech-recognition` (Whisper local, zéro coût)
- [ ] Agent avec mémoire persistante basique (`@convex-dev/agent` + tables Convex `projects` / `sessions`)
- [ ] Réponse de l'agent : résumé + une recommandation ou question
- [ ] Journal de sessions (liste chronologique des standups)
- [ ] Streak counter + points basiques
- [ ] UI : Expo UI + Liquid Glass, très épuré, pas de mascotte

### Hors scope POC

- Onboarding complet
- GitHub integration
- Idea validation
- Build-in-public auto-posts
- Multi-projets (switch uniquement via settings — friction volontaire)
- Matching cofondateur
- Mascotte / personnalité visuelle poussée
- Notifications push
- Paywall

---

## 6b. Stratégie Speech / Voice Processing

**STT (Speech-to-Text) :**
- **Primaire :** On-device Whisper via `expo-speech-recognition`
  - Référence d'implémentation : https://github.com/betomoedano/whisper-speech-recognition
  - Zéro coût, faible latence (inférence locale), capable de fonctionner hors ligne
  - Réduit les allers-retours réseau avant que l'agent reçoive le texte
- **Futur (MVP) :** Apple Intelligence pour classification d'intention avant STT

**TTS (Text-to-Speech) :**
- À décider : 11Labs (~500ms latence, qualité premium) vs `AVSpeechSynthesizer` natif iOS (gratuit, instantané)
- Explorer l'intégration 11Labs native Convex vs appel direct depuis le client mobile

---

## 7. Périmètre MVP (v1 shippable)

Ajouter au POC :

- Onboarding voice (Whisper Flow → Blueprint minimal → premier projet créé)
- Paywall (sessions illimitées = premium, 3 sessions gratuites)
- Notifications push pour le rituel quotidien
- Profil / historique des projets
- Mascotte et personnalité visuelle (polishing — type LunaGotchi)
- Mémoire archivale avec recherche (au lieu de JSON plat)

**Design MVP :** Liquid Glass + mascotte personnalisée

---

## 8. Questions à Valider Avant de Builder Plus

### Sur le produit

- Le rituel tient-il si l'agent ne fait que résumer ? Ou faut-il impérativement qu'il pose une question de challenge ?
- Quelle est la durée max acceptable d'attente de réponse de l'agent (latence) pour que l'UX reste fluide ?
- Est-ce qu'une session <2 min est suffisante pour créer de la valeur réelle, ou faut-il 5 min minimum ?

### Sur la mémoire et le backend

- RAG natif Convex vs pipeline d'embeddings custom (ex. OpenAI embeddings) — lequel offre le meilleur rapport qualité/effort pour le POC ?
- Quand ajouter `@ai-sdk/anthropic` à `package.json` et migrer `testAgent` depuis GPT-4o vers Sonnet 4.6 ?
- Comment structurer la mémoire persistante pour rester sous 1000 tokens via la compaction auto de `@convex-dev/agent` ?
- Est-ce que l'agent doit pouvoir faire des recherches web en temps réel pendant le standup ? (coût vs valeur)

### Sur la voix

- Apple Intelligence : prétraitement à quel moment dans le flux vocal (avant STT, après, ou pour la classification d'intention) ?
- TTS output : 11Labs (~500ms latence, qualité premium) vs `AVSpeechSynthesizer` natif iOS (gratuit, instantané) ?

### Sur la distribution

- Le "dogfooding" (utiliser Ideo pour builder Ideo) génère-t-il assez de contenu organique ?
- Quel réseau / communauté cibler en premier : X/Twitter, Reddit (r/indiedev), Discord indie hackers ?

---

## 9. Current Backend Stack

| Composant | Technologie | Statut |
|-----------|------------|--------|
| Hosting | Convex cloud (EU West) | ✅ Actif |
| Agent framework | `@convex-dev/agent` 0.3.2 | ✅ Configuré |
| LLM | Claude Sonnet 4.6 (`@ai-sdk/anthropic`) | 🔲 Nécessite `@ai-sdk/anthropic` |
| Database | Convex (pas de schema encore) | 🔲 `schema.ts` à créer |
| Auth | Non configuré | 🔲 `convex/auth.config.ts` à créer |
| Speech (STT) | `expo-speech-recognition` (on-device) | 🔲 À implémenter |
| Speech (TTS) | TBD : 11Labs ou iOS natif | 🔲 À décider |

---

## 10. Stratégie de Distribution POC

- **Dogfooding** : chaque standup vocal devient potentiellement du contenu X/Twitter
- **Build in public** : documenter le développement d'Ideo avec Ideo lui-même (preuve d'usage)
- **Batch initial** : 5-10 builders du réseau pour feedback intensif avant MVP public
