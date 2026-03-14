# Brainstorming 03 : Mapping des Écrans (Onboarding Textuel)

Suite à la décision de se concentrer sur un unique persona (le **Vibe Coder** / Solo-founder non-technique voulant s'appuyer sur l'IA) et de fournir une cartographie technique gratuite, voici le brouillon textuel écran par écran. L'objectif est d'itérer sur ce texte avant de passer au design Figma.

*Ce parcours intègre les concepts de confiance (Trust), de transformation (Before/After), et de preuve sociale (Social Proof).*

---

## Écran 1 : L'Accroche & Le Bénéfice (First Impression)
*Objectif : Capter l'attention, rassurer sur l'effort, montrer le résultat.*

- **Titre (Hook) :** "Turn your messy thoughts into a validated startup idea in 3 minutes." *(Texte itératif)*
- **Visuel (Before/After) :**
  - *Before :* Une illustration d'un cerveau emmêlé ou d'une note vocale chaotique.
  - *After :* Un diagramme propre, un logo chic, un plan structuré.
- **Micro-copy (Confiance) :** "We use Claude & Perplexity to structure and validate your concepts."
- **Bouton Primaire (CTA) :** "Get Started"

---

## Écran 2 : Qualification (L'Ancrage Psychologique)
*Objectif : Montrer qu'on s'intéresse à eux et ancrer le persona "Vibe Coder". Cette data est primordiale pour le context de l'Agent Backend.*

- **Titre :** "What's holding you back from launching?"
- **Options (Boutons sélectionnables) :**
  - "I have ideas, but no technical skills."
  - "I don't know if people will pay for it."
  - "I get overwhelmed by where to start."
- **Bouton de validation :** "Continue" (qui s'active après sélection).

---

## Écran 3 : L'Engagement de Temps (Time to Result)
*Objectif : Créer la confiance par la transparence et l'urgence positive.*

- **Titre :** "Building your custom roadmap takes about 120 seconds."
- **UI Element :** Une petite barre de progression vide ou une animation subtile évoquant la vitesse.
- **Points de réassurance (Bullet points check) :**
  - ✅ No typing required (just speak).
  - ✅ Instant market analysis.
  - ✅ Actionable tech stack for AI coding.
- **Bouton :** "I'm ready"

---

## Écran 4 : Le "Whisper Flow" (L'Accouchement - Cœur du métier)
*Objectif : L'expérience interactive principale. Pas de clavier, que de la voix (ou switch clavier optionnel).*

- **Titre :** "Tell me about your idea. Don't worry about being organized, just brain dump."
- **UI Element :** Un très gros bouton "Microphone", design chaleureux, pulsations douces (pour rassurer).
- **Texte en bas (Social Proof / Gamification) :** "Over 10,000 ideas crystallized this week."
- *(Après l'enregistrement)* -> Écran de transition "Processing your thoughts..." (avec une icône de l'IA Ideo qui travaille).

---

## Écran 5 : L'Agent System Display (L'Itération Moderne)
*Objectif : Affiner l'idée s'il manque des éléments (B2B, cible, pricing). Fini les bulles de chat, place à une UI très structurée façon "Siri / Apple Intelligence".*

- **UI Element :** Un affichage épuré. En haut de l'écran on voit le log de pensée de l'IA (ex: "Analyzing target market...", "Extracting core features...").
- **L'Output de l'Agent :** Un bloc de texte synthétique affichant l'interprétation d'un extrait de l'audio de l'utilisateur. 
  - *Exemple visuel:* "It looks like you are building a marketplace for local chefs."
- **La Question de Clarification :** 
  - "Just one detail needed: Are you targeting busy professionals or event organizers?"
- **User input :** Des boutons de réponses prédictives, au design très élégant (glassmorphism/sleek), faciles à tapoter. (ex: [Busy Professionals] [Event Organizers] ou le [Microphone] pour préciser).

---

## Écran 6 : Le Cadau Gratuit (L'Aha! Moment)
*Objectif : La récompense émotionnelle (Hit dopaminergique) et le don gratuit avant la demande d'argent. Le Backend a tourné pour générer ces assets.*

- **Titre :** "Your Startup Blueprint is Ready."
- **Visuel :** Un badge, une médaille ("Première brique posée"), ou une petite animation de célébration.
- **Le Contenu Généré (Onglets ou scroll) :**
  - **The Blueprint :** Génération de fichiers concrets (ex: un résumé PRD (Product Requirements Document) clean, les spécifications principales).
  - **The Tailored Tech Stack :** En fonction du profil qualifié à l'Écran 2, le backend renvoie la liste précise des technos à utiliser (Ex: Supabase pour la DB, Vercel pour le web, Expo pour le mobile).
  - **The Master Prompt :** Un bloc de texte "Copy prompt" contenant tous les assets générés, prêt à être collé dans Cursor, Claude ou GitHub Copilot pour scafolder le projet instantanément.

---

## Écran 7 : La Fenêtre de Tir (Demande d'Avis)
*Objectif : Capitaliser sur l'euphorie d'avoir accompli quelque chose.*

- **Pop-up système ou in-app :** "Do you feel more clear about your idea now?"
  - Si oui -> "Would you mind leaving a quick rating? It takes 2 seconds." (App Store prompt).
  - Si non -> Feedback form privé.

---

## Écran 8 : La Phase de Validation & Le Upsell (Soft Paywall)
*Objectif : Monetiser avec la promesse IdeaProof (Marché, Image).*

- **Titre :** "Want to know if this idea will actually make money?"
- **UI Element :** Un visuel flouté d'analyses de marché (Graphiques) ou de "Cartes FIFA" générées par IA.
- **L'Offre (Copywriting) :** "Unlock the Full Validation Pack : 
  - Deep Market Analysis (TAM/SAM/SOM).
  - Secret Competitor mapping.
  - AI-generated Visual Mockups to visualize your app instantly."
- **Prix :** "Get the report for $X" ou "Start 3-Day Trial" (selon stratégie de pricing choisie).
- **Clause de sortie (Soft reject) :** Une croix très discrète ou "No thanks, I'll build blindly."

---

*Notes pour l'itération :*
* 1. Cette structure vous semble-t-elle assez robuste pour clore l'étape de Brainstorming et passer à la phase de Design (Figma) / Implémentation technique ?
