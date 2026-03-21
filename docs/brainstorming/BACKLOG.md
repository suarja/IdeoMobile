# Backlog IdeoMobile

> Priorités : **P0** bug bloquant · **P1** core loop/onboarding · **P2** polish feature existante · **P3** nouvelle feature · **P4** backlog futur

---

## EPIC A — Gamification Loop
> Cœur de l'engagement quotidien · P1

---

### A-01 · Banner animée points attribués [P1]

**En tant qu'** utilisateur qui vient d'accomplir une action valorisée
**Je veux** voir une banner slide-in afficher "+50 pts" en haut de l'écran
**Afin de** ressentir une récompense immédiate et comprendre ce qui rapporte des points

**Critères d'acceptation**
- [ ] La banner slide depuis le haut et reste visible ~2s puis disparaît avec un fade-out
- [ ] Elle affiche le nombre exact de points attribués (ex. "+50 pts")
- [ ] Elle se déclenche à chaque appel réussi à la mutation `addPoints`
- [ ] Si plusieurs attributions rapprochées, les banners se cumulent ou se regroupent

**Notes techniques:** mutation `addPoints` dans `convex/gamification.ts`. Créer un `PointsBanner` dans `src/features/gamification/components/`. Déclencher via un callback ou un `useQuery` réactif sur `userStats`.

---

### A-02 · Agent verbalise les points [P1]

**En tant qu'** utilisateur qui interagit avec l'agent
**Je veux** que l'agent mentionne les points qu'il m'attribue dans sa réponse
**Afin de** comprendre le lien direct entre mes actions et ma progression

**Critères d'acceptation**
- [ ] Le message de l'agent inclut une phrase du type "Je t'attribue X points car tu as [raison]"
- [ ] La verbalisation est contextuelle (pas un template générique)
- [ ] Les points verbalisés correspondent aux points réellement attribués en DB

**Notes techniques:** `convex/agents/chatAgent.ts` — modifier le system prompt ou le post-processing. L'agent a accès à l'outil `awardPoints` qui retourne le montant attribué.

---

### A-03 · Unification des modales rituelles [P2]

**En tant qu'** utilisateur qui commence sa journée
**Je veux** vivre un seul flow modal cohérent combinant Daily Standup + météo émotions + daily streak
**Afin de** ne pas être interrompu par 3 mécaniques séparées qui cassent le rythme

**Critères d'acceptation**
- [ ] Un seul bottom sheet / modal séquentiel en 3 étapes : streak → météo émotions → standup
- [ ] La progression est linéaire (étape 1 → 2 → 3 → fermeture)
- [ ] Chaque étape peut être skippée individuellement
- [ ] Le flow complet prend < 60 secondes

**Notes techniques:** `StandupSplash`, composant météo émotions (à créer ou vérifier s'il existe), `streakDisplay`. Coordonner via un état machine dans un hook dédié.

---

## EPIC B — Focus Screen
> Déjà fonctionnel, amélioration UX · P2

---

### B-01 · Bar chart au lieu du radar chart [P2]

**En tant qu'** utilisateur qui consulte son Focus Screen
**Je veux** voir un bar chart vertical à la place du radar chart
**Afin de** lire clairement les gaps par dimension sans devoir interpréter une forme géométrique

**Critères d'acceptation**
- [ ] Remplacement du radar par des barres horizontales ou verticales par dimension
- [ ] Chaque barre affiche le score actuel vs le score max possible
- [ ] Les couleurs reflètent le niveau de complétion (rouge < 40%, orange < 70%, vert ≥ 70%)
- [ ] Le rendu est lisible en dark et light mode

**Notes techniques:** `src/features/focus/components/` — composant chart actuel. Évaluer `react-native-gifted-charts` ou `victory-native` déjà présents, sinon un composant custom Tailwind suffit.

---

### B-02 · Affichage des weights et score pondéré [P2]

**En tant qu'** utilisateur sur le Focus Screen
**Je veux** voir le poids (weight) de chaque dimension et le score global pondéré
**Afin de** comprendre pourquoi certaines dimensions comptent plus que d'autres

**Critères d'acceptation**
- [ ] Chaque dimension affiche son weight (ex. "×1.5")
- [ ] Un score global pondéré est visible en haut du screen
- [ ] Le calcul est cohérent avec la logique `convex/gamification.ts`

**Notes techniques:** `DIMENSION_WEIGHTS` dans `convex/gamification.ts`. Exposer via une query dédiée ou inclure dans `getUserStats`.

---

### B-03 · Vue tableau dimensions [P2]

**En tant qu'** utilisateur sur le Focus Screen
**Je veux** switcher entre la vue "Défis" et la vue "Avancement" dans la même zone
**Afin de** passer rapidement de "que dois-je faire ?" à "où en suis-je ?"

**Critères d'acceptation**
- [ ] Un segment control (2 tabs) permet de basculer entre les deux vues
- [ ] Vue "Défis" : liste des daily challenges actifs
- [ ] Vue "Avancement" : tableau des dimensions avec score, weight, dernière activité
- [ ] La tab sélectionnée est persistée en mémoire locale pendant la session

**Notes techniques:** `src/features/focus/screens/FocusScreen.tsx`. Segment control déjà disponible dans la bibliothèque de composants du projet.

---

## EPIC C — Daily Challenges Intelligence
> Système existant à affiner · P2

---

### C-01 · Défis personnalisés par l'agent [P2]

**En tant qu'** utilisateur avec un projet actif
**Je veux** que mes défis quotidiens soient générés par l'agent en fonction de mon projet
**Afin de** recevoir des défis pertinents plutôt qu'un pool générique

**Critères d'acceptation**
- [ ] L'agent génère 3 défis contextuels au lieu de piocher dans `SYSTEM_CHALLENGE_POOL`
- [ ] Les défis tiennent compte de l'état du projet (dimension la plus faible, dernières sessions)
- [ ] Les défis générés sont sauvegardés en DB via la même table `dailyChallenges`
- [ ] Un fallback sur le pool statique existe si l'agent échoue

**Notes techniques:** `convex/gamification.ts` — fonction `generateDailyChallenges`. Appeler le `chatAgent` (ou un agent dédié) avec le contexte projet pour générer les défis. Voir `docs/architecture/agents.md`.

---

### C-02 · Complétion automatique à l'échéance [P2]

**En tant qu'** utilisateur dont les défis du jour ont expiré
**Je veux** que les défis non complétés soient automatiquement marqués "échoués" à minuit
**Afin de** voir un historique propre sans défis zombies toujours "actifs"

**Critères d'acceptation**
- [ ] Le cron job de 06h UTC (ou minuit heure locale) traite les défis expirés
- [ ] Un défi expiré non complété passe au statut `failed`
- [ ] Un défi expiré complété reste `completed`
- [ ] Aucun point n'est retiré pour les défis échoués (malus optionnel en P4)

**Notes techniques:** `convex/crons.ts` — cron `generateDailyChallenges` à 06h UTC. Ajouter une étape de clôture avant la génération des nouveaux défis.

---

### C-03 · Politique de nettoyage des défis [P3]

**En tant qu'** administrateur du système
**Je veux** que les anciens défis soient archivés ou supprimés après N jours
**Afin d'** éviter une croissance illimitée de la table `dailyChallenges`

**Critères d'acceptation**
- [ ] Un cron hebdomadaire supprime ou archive les défis datant de plus de 30 jours
- [ ] Les données archivées peuvent être consultées (optionnel) ou sont définitivement supprimées
- [ ] La politique N est configurable via une variable d'env ou une constante

**Notes techniques:** Nouveau cron dans `convex/crons.ts`. Table `archivedChallenges` optionnelle si on veut conserver l'historique.

---

### C-04 · Agent communique la création des défis [P2]

**En tant qu'** utilisateur qui ouvre l'app le matin
**Je veux** que l'agent me notifie dans le chat quand il crée mes défis du jour
**Afin de** savoir que mes défis ont été générés et être invité à les consulter

**Critères d'acceptation**
- [ ] Après la génération des défis, un message agent apparaît dans le thread
- [ ] Le message liste les 3 défis créés avec leur valeur en points
- [ ] Un lien / CTA "Voir mes défis" redirige vers le Focus Screen

**Notes techniques:** `convex/crons.ts` — après `generateDailyChallenges`, appeler une mutation pour insérer un message system dans le thread actif de l'utilisateur.

---

## EPIC D — Améliorations Agent
> P2

---

### D-01 · Réglage heure du Daily Stand-Up [P2]

**En tant qu'** utilisateur
**Je veux** choisir l'heure à laquelle le Daily Stand-Up se déclenche
**Afin d'** adapter le rituel à mon emploi du temps (ex. 8h vs 10h)

**Critères d'acceptation**
- [ ] Le `StandupTimeBottomSheet` existant est accessible depuis les réglages ou le standup splash
- [ ] L'heure choisie est persistée dans le profil utilisateur (Convex ou MMKV)
- [ ] Le cron / trigger du standup respecte cette heure (ou le splash apparaît à l'heure correcte)
- [ ] Valeur par défaut : 09h00

**Notes techniques:** `StandupTimeBottomSheet` existe déjà. Wirer l'heure dans `convex/schema.ts` (champ `standupTime` sur `users`) et adapter le cron ou la logique d'affichage.

---

### D-02 · Usage tracking [P3]

**En tant qu'** équipe produit
**Je veux** suivre les tokens consommés par utilisateur et par session
**Afin de** préparer le billing et l'analytics des coûts LLM

**Critères d'acceptation**
- [ ] Table `usage` créée dans `convex/schema.ts` avec champs : userId, sessionId, inputTokens, outputTokens, model, createdAt
- [ ] `customUsage` de `@convex-dev/agent` intégré pour capturer la consommation réelle
- [ ] Un dashboard basique (ou query) permet de voir le total par utilisateur

**Notes techniques:** Doc `@convex-dev/agent` usage tracking : https://docs.convex.dev/agents/usage-tracking. Intégrer dans `convex/agents/chatAgent.ts`.

---

### D-03 · Détection type de session [P2]

**En tant qu'** agent
**Je veux** détecter si la session est de type ritual / casual / technical
**Afin d'** adapter mon ton, ma profondeur et mes suggestions sans que l'utilisateur le précise

**Critères d'acceptation**
- [ ] Le router Haiku classifie chaque message entrant en `ritual` | `casual` | `technical`
- [ ] Le type de session influence le spécialiste sélectionné et le system prompt injecté
- [ ] Le mot "session" n'est jamais utilisé dans les messages visibles par l'utilisateur
- [ ] Le type détecté est loggé pour analytics

**Notes techniques:** `convex/agents/router.ts` — ajouter une étape de classification avant le dispatch. Voir `docs/architecture/agents.md`.

---

### D-04 · Tone utilisateur direct ("tu") [P3]

**En tant qu'** utilisateur francophone
**Je veux** que l'agent me tutoie systématiquement
**Afin de** ressentir une relation plus proche, moins formelle

**Critères d'acceptation**
- [ ] Vérifier que le commit `1ee14ca` couvre bien tous les agents spécialistes
- [ ] Aucun agent ne vouvoie l'utilisateur (vérification dans les system prompts)
- [ ] Le tone "tu" est documenté dans les system prompts comme règle immuable

**Notes techniques:** Commit `1ee14ca` — vérifier `convex/agents/*.ts` system prompts. Ajouter une règle globale dans le prompt partagé si pas déjà présent.

---

## EPIC E — Web Search
> P3

---

### E-01 · Quota moins rigide pour la recherche ponctuelle [P3]

**En tant qu'** utilisateur qui demande une info ponctuelle
**Je veux** que l'agent puisse faire une recherche web même en dehors du workflow market analysis
**Afin de** ne pas être bloqué par les quotas quand j'ai besoin d'une info rapide

**Critères d'acceptation**
- [ ] Quota actuel (1/projet, 4/mois) assoupli ou segmenté (quota market vs ponctuel)
- [ ] L'utilisateur voit clairement combien de recherches il lui reste
- [ ] Un message d'erreur explicite est affiché quand le quota est atteint

**Notes techniques:** Logique quota dans `convex/webSearch.ts` ou similaire. Définir deux compteurs séparés.

---

### E-02 · Market analysis approfondie [P4]

**En tant qu'** utilisateur qui veut valider son idée
**Je veux** lancer une market analysis complète (concurrents, TAM, tendances)
**Afin d'** obtenir un rapport structuré en quelques minutes

**Critères d'acceptation**
- [ ] Un workflow dédié orchestré par le `marketAgent` avec 3-5 recherches enchaînées
- [ ] Le rapport final inclut : concurrents directs, TAM estimé, tendances Google Trends, opportunités
- [ ] Le rapport est sauvegardé et accessible depuis l'onglet "Idea" (section Market)
- [ ] Le workflow utilise Convex workpool pour ne pas bloquer l'UI

**Notes techniques:** `convex/agents/marketAgent.ts`. Convex workpool pour orchestration longue durée.

---

## EPIC F — Mémoire
> P3

---

### F-01 · Format user-friendly des entrées mémoire [P3]

**En tant qu'** utilisateur qui consulte sa mémoire dans l'UI
**Je veux** voir des libellés lisibles au lieu de clés techniques brutes
**Afin de** comprendre ce que l'agent a retenu sur moi et mon projet

**Critères d'acceptation**
- [ ] Les clés de mémoire (ex. `user_tech_stack`) sont affichées avec un label humain ("Stack technologique")
- [ ] Un mapping clé → label est maintenu dans un fichier de config
- [ ] L'UI de consultation mémoire (si elle existe) utilise ces labels

**Notes techniques:** Table mémoire dans `convex/schema.ts`. Créer `src/lib/memory-labels.ts` avec le mapping.

---

### F-02 · Embeddings mémoire [P4]

**En tant qu'** agent
**Je veux** retrouver les entrées mémoire pertinentes par similarité sémantique
**Afin de** fournir des réponses contextuelles sans avoir à charger toute la mémoire utilisateur

**Critères d'acceptation**
- [ ] Les entrées mémoire sont embeddings au moment de leur création
- [ ] Une recherche vectorielle retourne les K entrées les plus proches du message actuel
- [ ] La performance de retrieval est mesurée et acceptable (< 200ms)

**Notes techniques:** Convex vector search (`vectorSearch`). Modèle d'embedding : `text-embedding-3-small`. Voir documentation Convex vectors.

---

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
