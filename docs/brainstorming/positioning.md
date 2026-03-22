# Positionnement — Ideo vs interfaces chat génériques

**Date :** 2026-03-22
**Statut :** réflexion en cours

---

## Le vrai concurrent : l'habitude ChatGPT

Le problème de positionnement n'est pas "qu'est-ce qu'on fait que les autres ne font pas ?". C'est : **pourquoi quelqu'un quitterait son onglet ChatGPT pour ouvrir une app mobile ?**

La réponse ne peut pas être "parce qu'on fait la même chose en mieux". Il faut que ce soit structurellement différent.

---

## Ce que ChatGPT/Claude.ai ne font pas bien

### 1. La gestion du contexte multi-projet

Dans une interface chat générique, chaque conversation repart de zéro. L'utilisateur doit re-expliquer son projet, son audience, ses contraintes à chaque session. Ideo maintient :

- Une mémoire persistante par utilisateur (`userMemory`)
- Une mémoire par projet (`projectMemory`)
- Un thread persistant par projet et par agent (validation, tracking)

Ce n'est pas un détail UX. C'est une architecture fondamentalement différente. Le modèle "connaît" déjà le projet au moment où l'utilisateur ouvre l'app.

### 2. L'interface vocale comme mode primaire

ChatGPT a la voix. Mais c'est un mode secondaire — une surcouche sur une interface texte.

Ideo est pensé "voice-first" : le mic est le hero, le texte est le fallback. Ça change le profil d'utilisateur. Un fondateur qui marche, conduit, ou fait du sport peut valider une idée sans sortir le clavier. C'est le cas d'usage "WhatsApp pour fondateurs" : penser à haute voix, sans friction.

### 3. La verticalité — agent co-fondateur, pas assistant généraliste

Un LLM généraliste répond à tout. Ideo répond à une seule question : *est-ce que cette idée vaut la peine que je m'y consacre ?* Et il répond avec des outils spécialisés (recherche Tavily, GitHub API, framework de scoring).

La verticalité crée de la confiance. L'utilisateur sait ce qu'il va obtenir en ouvrant l'app.

---

## Ce qu'on a déjà, et qui différencie

| Feature | ChatGPT | Ideo |
|---------|---------|------|
| Mémoire persistante par projet | ❌ (limité, fragile) | ✅ Convex |
| Interface vocale native | ⚠️ mode secondaire | ✅ Whisper local, mic hero |
| Agents spécialisés | ❌ généraliste | ✅ Validation + Tracking |
| Scoring d'idée structuré | ❌ | ✅ IDEA SCORING FRAMEWORK |
| Gamification / ritual daily | ❌ | ✅ streaks, points, standup |
| Multi-projet avec contexte isolé | ❌ | ✅ thread par projet |

---

## Ce qui est pertinent d'ajouter (scope V1 étendu)

### Haute valeur, faible complexité

- **Résumé de session automatique** — après chaque échange, l'agent génère 2-3 lignes de recap sauvegardées dans les artifacts. L'utilisateur retrouve sa progression sans relire tout le thread.
- **"Reprendre où j'en étais"** — au lancement de l'app, afficher le dernier message agent + un CTA "Continuer". Élimine la friction du re-contexte.
- **Export blueprint** — PDF ou Markdown du blueprint complet (validation + stack + market). Partageable, imprimable. Crée de la valeur perçue immédiate.

### Haute valeur, complexité moyenne

- **Notifications proactives** — "Tu n'as pas parlé de [projet] depuis 3 jours. Ça avance ?" Push token déjà stocké, infra prête.
- **Détection de pivot** — si l'utilisateur contredit un insight mémoire, l'agent le flagge explicitement ("tu m'avais dit X, maintenant tu dis Y — on pivote ?").

---

## Ce qui est hors scope V1 (et pourquoi)

### Co-fondateur matching
Complexité réseau, cold start problem, modération. Aucun avantage compétitif évident face à LinkedIn ou Indie Hackers. À éviter tant que le core product n'est pas validé.

### Intégration GitHub / CI
Utile pour les devs, mais sort du rôle "co-fondateur buddy". Ideo n'est pas un outil de dev, c'est un outil de pensée stratégique.

### Social / communauté
Même problème que le matching. Complexité élevée, valeur incertaine au stade POC.

### Analytics avancés (TikTok/Instagram scraping)
Bloqué techniquement (anti-bot). Roadmap Apify V2 documentée dans `scraping-tools.md`. Ne pas débloquer avant que le tracking de base soit validé par des vrais utilisateurs.

---

## La thèse centrale

> Ideo est un **verbal processor pour fondateurs** — un espace structuré pour penser à haute voix, avec un agent qui retient tout, pose les bonnes questions, et traduit ça en décisions actionnables.

Ce n'est pas un meilleur ChatGPT. C'est un rituel quotidien de clarté stratégique.

Le différenciateur n'est pas l'IA. C'est la **continuité** : l'app qui te connaît, connaît ton projet, et reprend exactement là où tu t'es arrêté.
