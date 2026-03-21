

## EPIC G — Infrastructure Monétisation
> P3

---

### G-01 · Table `usage` pour billing [P3]

**En tant qu'** équipe produit
**Je veux** une table `usage` en DB qui trace chaque appel LLM
**Afin de** préparer le billing et de monitorer les coûts réels par utilisateur

**Critères d'acceptation**
- [ ] Table `usage` dans `convex/schema.ts` : userId, model, inputTokens, outputTokens, cost, createdAt
- [ ] Chaque appel agent insère une entrée dans `usage`
- [ ] Une query `getUsageSummary(userId)` retourne le total mensuel

**Notes techniques:** À combiner avec D-02 (usage tracking `@convex-dev/agent`).

---

### G-02 · RevenueCat — paiements in-app [P4]

**En tant qu'** utilisateur sur la paywall
**Je veux** pouvoir souscrire à un abonnement directement depuis l'app
**Afin d'** accéder aux features premium sans friction

**Critères d'acceptation**
- [ ] RevenueCat SDK intégré (iOS + Android)
- [ ] Produits configurés (mensuel + annuel)
- [ ] Webhook RevenueCat → Convex met à jour le statut subscription
- [ ] La paywall s'adapte au statut subscription actuel

**Notes techniques:** `react-native-purchases`. Créer un config plugin Expo si nécessaire. Ne pas modifier `android/` ou `ios/` directement.

---

### G-03 · PostHog — analytics produit [P3]

**En tant qu'** équipe produit
**Je veux** tracer les events clés (onboarding steps, agent interactions, feature usage)
**Afin de** mesurer les funnels et identifier les points de friction

**Critères d'acceptation**
- [ ] SDK PostHog intégré dans l'app React Native
- [ ] Events définis dans `src/lib/analytics/events.ts` (jamais de magic strings)
- [ ] Au minimum : onboarding_step_completed, agent_message_sent, challenge_completed, paywall_shown
- [ ] Les events respectent les règles RGPD (pas de PII sans consentement)

**Notes techniques:** `posthog-react-native`. Ajouter les constantes dans `src/lib/analytics/events.ts` et `types.ts` avant tout tracking (règle CLAUDE.md).

---

## EPIC H — Onboarding
> Actuellement stub · P1

---

### H-01 · Redesign complet onboarding 8 écrans [P1]

**En tant que** nouvel utilisateur
**Je veux** vivre un onboarding fluide en moins de 3 minutes
**Afin de** comprendre la valeur de l'app et arriver sur mon premier blueprint

**Critères d'acceptation**
- [ ] 8 écrans implémentés : Hook → Qualification → Promise → Whisper → Clarification → Aha → Review → Paywall
- [ ] Navigation linéaire avec possibilité de retour
- [ ] Whisper STT disponible dès l'écran de saisie de l'idée
- [ ] Aucun compte requis avant l'écran Paywall (progressive auth)
- [ ] Durée médiane du flow < 3 minutes

**Notes techniques:** `src/app/onboarding/` — actuellement stub. Réutiliser les composants `MicButton`, `TranscriptBox`, `ClarificationBlock` de `src/features/idea/`. Design reference : `docs/design-system/pencil-new.pen` (8 écrans Vintage Metal).

---

### H-02 · Aha moment — génération Blueprint à la fin de l'onboarding [P1]

**En tant que** nouvel utilisateur qui vient de décrire son idée
**Je veux** voir automatiquement mon Blueprint + Tech Stack + 3 défis personnalisés générés
**Afin de** ressentir que j'ai déjà commencé à construire quelque chose de réel

**Critères d'acceptation**
- [ ] À la fin du flow Whisper + Clarification, l'agent génère : Blueprint (5 items), Tech Stack (3-5 techs), 3 défis de démarrage
- [ ] La génération est streamée et visible en temps réel
- [ ] Le résultat est sauvegardé comme premier projet de l'utilisateur
- [ ] La sensation de "déjà en train de builder" est mesurable (partage dans les 5 min)

**Notes techniques:** Appeler le `chatAgent` avec un prompt system dédié "onboarding aha". Réutiliser le streaming pattern de `use-idea-session.ts`. Sauvegarder le projet via `convex/projects.ts`.

---

## EPIC I — Bugs
> À traiter en priorité

---

### I-01 · Warning React boucle infinie Whisper [P0]

**En tant que** développeur
**Je veux** éliminer le warning React sur la boucle infinie potentielle lors du téléchargement Whisper
**Afin de** ne pas masquer de vraies régressions derrière du bruit

**Critères d'acceptation**
- [ ] Le warning n'apparaît plus dans les logs
- [ ] L'absence de boucle infinie est vérifiée manuellement (téléchargement complet sans freeze)
- [ ] Un test ou un guard est ajouté pour prévenir la régression

**Notes techniques:** `src/lib/hooks/use-whisper-models.ts` — investiguer les dépendances `useEffect` / `useCallback`. Voir `docs/bugs/whisper-realtime-capturing-bug.md` pour le contexte.

---

### I-02 · Absence de prompt téléchargement Whisper [P1]

**En tant qu'** utilisateur qui ouvre l'app pour la première fois
**Je veux** être informé et consulté avant le téléchargement du modèle Whisper
**Afin de** ne pas consommer mes données mobiles sans consentement

**Critères d'acceptation**
- [ ] Un modal ou une alerte apparaît avant le premier téléchargement : "Le modèle de reconnaissance vocale (~X MB) doit être téléchargé. Continuer ?"
- [ ] L'utilisateur peut refuser et utiliser l'app sans la feature vocale
- [ ] Le téléchargement peut être relancé depuis les réglages
- [ ] Le consentement est persisté pour ne pas demander à chaque lancement

**Notes techniques:** `src/lib/hooks/use-whisper-models.ts` — ajouter une gate de consentement avant `downloadModel()`. Persister avec MMKV.

---

## EPIC J — Future Tools (Agent)
> Backlog futur · P4

---

### J-01 · generateHtmlMockup (designAgent) [P4]

**En tant qu'** utilisateur
**Je veux** que l'agent génère un mockup HTML de mon app
**Afin de** visualiser rapidement l'interface avant de coder

**Notes techniques:** Outil `generateHtmlMockup` pour `designAgent`. Output : fichier HTML inline sauvegardé en mémoire projet.

---

### J-02 · generateMarkdownDoc (developmentAgent) [P4]

**En tant qu'** utilisateur
**Je veux** que l'agent génère la documentation technique de mon projet en Markdown
**Afin d'** avoir une spec à partager avec un développeur ou Claude/Cursor

**Notes techniques:** Outil `generateMarkdownDoc` pour `developmentAgent`. Output : fichier Markdown sauvegardé dans le projet.

---

### J-03 · searchSocialProfile (distributionAgent) [P4]

**En tant qu'** utilisateur qui veut distribuer son app
**Je veux** que l'agent trouve les profils sociaux pertinents dans mon domaine
**Afin de** identifier des early adopters ou des canaux de distribution

**Notes techniques:** Outil `searchSocialProfile` pour `distributionAgent`. Utilise le web search existant.

---

### J-04 · createContentDraft (distributionAgent) [P4]

**En tant qu'** utilisateur qui lance son app
**Je veux** que l'agent génère des drafts de posts (Twitter/LinkedIn/Product Hunt)
**Afin de** accélérer ma mise en marché sans partir d'une page blanche

**Notes techniques:** Outil `createContentDraft` pour `distributionAgent`. Templates par plateforme.

---

*Dernière mise à jour : 2026-03-20*
