# Brainstorming 02: Le Onboarding & L'Accouchement de l'Idée

L'objectif de ce document, tel qu'abordé dans les audios (où l'application de Beto a servi de référence de qualité), est de conceptualiser l'expérience d'onboarding, qui va bien au-delà d'une simple collecte d'informations. C'est la première étape d'apport de valeur ("Aha! moment"). Conformément aux meilleures pratiques de croissance (cf. document *25 Growth Tactics*), le onboarding ne doit pas être précipité s'il apporte de la valeur et de l'émotion.

## 1. L'Objectif du Onboarding : Confiance, Contexte et Transformation
Dès le premier écran, l'utilisateur ne doit pas juste voir un "Commencer". Il doit voir :
- **La confiance (Trust) :** "Pourquoi nous faire confiance ?"
- **La transformation (Before / After) :** "Idée floue / Brouhaha mental" ➔ "Idée de Startup claire et documentée".
- **Le temps nécessaire (Time to Result) :** "Votre idée cristallisée en moins de 3 minutes".
- **La preuve sociale (Social Proof) :** Combien d'idées "déclic" ont déjà été validées.

## 2. Le Flow d'Onboarding (La Préparation à l'Accouchement)
La qualification de l'utilisateur sert deux objectifs : amorcer la psychologie de l'engagement (commitment) et personnaliser l'analyse IA ultérieure. **Attention :** Le onboarding doit rester fluide et ne proposer des "Assets" techniques pointus qu'aux utilisateurs pour qui cela a du sens (le Vibe Coder vs l'utilisateur complètement non-technique).

### A. Les Profils Utilisateurs (Qualification)
On demande à l'utilisateur de s'identifier parmi quelques profils simples :
1. **L'Entrepreneur non-tech :** A l'idée, mais aucune idée de comment la construire. (Lui proposer un accompagnement plus global, éviter les détails techniques).
2. **Le "Vibe Coder" :** Utilise l'IA (Cursor, Claude) pour contourner ses lacunes techniques. (Lui proposer les *Tech Stacks* recommandées via les Skills).
3. **Le Développeur :** Cherche à valider rapidement un *side-project*. (Peut aller droit au but technique et à la validation marché).

*Ce choix conditionne la façon dont l'IA traitera l'accouchement de l'idée et les livrables finaux.*

### B. Le Recueil du Contexte
- Le secteur d'activité envisagé (B2B, B2C, Santé, Productivité...).
- Le problème qu'il essaie de résoudre avec cette idée.
- Le ton souhaité pour l'IA : Brutalement honnête, ou plutôt bienveillant et accompagnateur ?

## 3. "L'Accouchement" (L'Action Centrale - Free Tier)

Ce n'est pas un formulaire, c'est une "session de dictaphone augmentée" inspirée de *Whisper Flow* ou des agents vocaux.

- **Le Concept "Verbal Processor" :** L'utilisateur lance "l'enregistrement" (une interface simple, chaleureuse) et déverse son idée à voix haute, de manière totalement non structurée.
- **Rôle de l'Agent IA ('Ideo') :** 
  - Il écoute (transcription Whisper).
  - Il retourne "l'idée" structurée.
  - S'il manque des éléments cruciaux (modèle économique, cible), l'IA pose **une seule question de clarification** simple et précise.
  - On peut itérer ("aller-retour") 2 ou 3 fois grand maximum pour affiner sans épuiser la patience. L'idée est de rester Lean.

## 4. Le Cadeau Immédiat (La Récompense d'Onboarding)
Une fois ce petit aller-retour terminé, et **avant tout paywall**, l'application génère du *gratuit* (le Aha! moment) :
- **Le Concept Structuré :** L'idée réécrite en "Pitch de Startup" parfait avec les points forts/faibles initiaux.
- **La Cartographie Technologique (Tech Stack Map) - Conditionnelle :** Générée à partir des *MCP Skills* (ex: supabase, vercel). *Ceci n'est montré qu'aux profils Vibe Coder ou Dev.*
- **L'Étape d'Emotion (Gamification) :** Une image du produit ou une petite récompense visuelle ("Félicitations, vous venez de poser la première brique de votre startup").
- **Le Prompt pour demander des Avis :** C'est à ce moment de *high émotionnel* (l'utilisateur sent qu'il a accompli quelque chose) qu'on peut lui demander de noter l'application.

## 5. La Transition vers l'Upsell (Le Paywall)
C'est seulement après avoir reçu cette clarté que l'on introduit le Paywall (façon "Soft Paywall" avec psychologie de l'engagement) :
- "Votre idée est maintenant claire. Voulons-nous découvrir s'il y a un marché prêt à payer pour ça ?"
- **Ce que débloque le Premium (cf. IdeaProof) :** Analyse TAM/SAM/SOM, Audit concurrentiel (Sonar), Création de l'identité visuelle et Mockups générés par IA.
