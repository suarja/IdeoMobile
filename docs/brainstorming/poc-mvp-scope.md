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

Inspiré de `chris-app-agent.md` + Anthropic Memory Tool (`memory_20250818`) + Vercel AI SDK.

### Approche recommandée : Anthropic Native Memory Tool

- L'outil `memory_20250818` est client-side : c'est le backend Ideo qui implémente le handler (lit/écrit dans une DB)
- L'agent appelle automatiquement cet outil en début de session (`view` du répertoire mémoire) et en fin de session (`create` / `str_replace`)
- Tout est en fichiers structurés (Markdown) dans un répertoire `/memories/` virtuel par utilisateur

### 3 couches de mémoire

| Type | Fichiers | Chargé quand |
|---|---|---|
| **Session** | Conversation en cours (context window) | Toujours |
| **Persistante** | `project_state.md`, `user_profile.md`, `progress_log.md` | Début de chaque session (auto) |
| **Archivale** | Summaries de sessions passées, décisions passées | À la demande (si pertinent) |

### Cycle d'une session standup

1. Démarrage → agent appelle `view /memories` → lit `progress_log.md` + `project_state.md`
2. Conversation vocale (<2 min)
3. Fin → agent met à jour `progress_log.md` avec résumé + insights + prochaine étape recommandée

### Règles de mémoire (système prompt)

- Sauvegarder proactivement sans être demandé
- Sauvegarder systématiquement quand l'utilisateur fait une correction
- Mémoire persistante : garder <1000 tokens (épurer régulièrement)
- Préférer `str_replace` (mise à jour) à `create` (nouveau fichier) pour éviter la fragmentation

### Modèle et coûts

**Modèle recommandé :** Claude Sonnet 4.6 (pas Opus — coût ~$2-3/message avec Opus vs ~$0.05-0.15 avec Sonnet pour usage consumer)

**Coût estimé par session standup :** ~$0.05-0.15 avec Sonnet → viable à $10-20/mois en prix utilisateur final

---

## 6. Périmètre POC (dogfooding interne)

**Objectif :** Valider que le loop vocal → réponse contextuelle → sentiment de progrès est assez puissant pour que l'utilisateur revienne le lendemain.

### In scope

- [ ] Un seul projet actif (profil projet hard-codé au lancement)
- [ ] Capture vocale → transcription (Expo Speech / Whisper API)
- [ ] Agent avec mémoire persistante basique (fichier JSON → MMKV local pour POC)
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

### Sur la mémoire

- MMKV local (POC) vs backend DB (MVP) : quand migrer ?
- Comment structurer la mémoire persistante pour rester sous 1000 tokens ?
- Est-ce que l'agent doit pouvoir faire des recherches web en temps réel pendant le standup ? (coût vs valeur)

### Sur la distribution

- Le "dogfooding" (utiliser Ideo pour builder Ideo) génère-t-il assez de contenu organique ?
- Quel réseau / communauté cibler en premier : X/Twitter, Reddit (r/indiedev), Discord indie hackers ?

---

## 9. Stratégie de Distribution POC

- **Dogfooding** : chaque standup vocal devient potentiellement du contenu X/Twitter
- **Build in public** : documenter le développement d'Ideo avec Ideo lui-même (preuve d'usage)
- **Batch initial** : 5-10 builders du réseau pour feedback intensif avant MVP public
