# Brainstorming 01: Application "Ideo" / "Déclic"

## 1. Scope et Intention (Le Problème & La Vision)
L'objectif est de créer une application mobile vitrine, esthétique et hautement qualitative. Elle s'adresse aux "vibe coders" et aux personnes non techniques qui ont une idée d'application mais ne savent pas par où commencer ni comment la structurer.

**L'intention fondamentale (Commander's Intent) :** 
Donner à l'utilisateur la sensation extrêmement satisfaisante d'avoir déjà commencé à construire quelque chose de tangible ("Aha! moment"), lui apportant de la clarté et l'envie irrépressible de partager son idée (viralité). 
Pour le créateur (toi), le but est de faire du "build in public", de créer une expérience utilisateur (UX/UI) si belle et fluide qu'elle vend d'elle-même (façon "Beto"), rompant avec le côté classique et "cheap" des prototypes générés par IA (l'anti "AI slope").

## 2. Les Différents Niveaux de Valeur (Parcours Utilisateur)

L'application est pensée pour offrir une valeur graduelle à l'utilisateur, en commençant par des outils entièrement gratuits.

### A. Le "Free Tier" (Préparation du Terrain)
Avant même de passer à l'analyse de marché ou de générer des assets complets, l'application offre gratuitement :
- **L'accouchement de l'idée :** L'agent AI converse avec l'utilisateur pour extraire et structurer son idée (via un fichier markdown récapitulatif).
- **Cartographie Technologique (Tech Stack Map) :** L'application utilise les "Skills" (comme ceux dispos dans `~/.agents/skills/`, ex: `vercel-react-native-skills`, `supabase-postgres-best-practices`) et le Model Context Protocol (MCP) pour recommander les briques technologiques adaptées au projet de l'utilisateur (ex: choix entre Web ou Mobile, choix de la base de données, etc.). 
- **Planification Basique :** Génération de fichiers de base (Markdown, prompts) pour préparer l'idée pour un outil comme Cursor ou Claude, permettant au développeur ou au "vibe coder" de démarrer avec des instructions claires.

*Ce premier palier vise à convertir l'utilisateur en douceur en lui prouvant immédiatement la valeur de l'outil.*

### B. Le "Pack Complet" (Validation & Matérialisation - Payant)
Pour aller plus loin, l'utilisateur peut débloquer le pack premium qui inclut :
- **L'Analyse de Marché & Concurrence :** Une étude de marché instantanée (via Deep Research, ex: Sonar/Perplexity) façon "IdeaProof" (TAM/SAM/SOM, KPIs).
- **La Matérialisation Visuelle :** Génération de maquettes, logos, ou "Cartes FIFA" illustrant les points forts/faibles de l'idée (via des modèles de génération d'images comme Banana Pro). Ce "Moodboard" donne l'illusion gratifiante que l'app existe déjà et facilite le travail de développement futur.

## 3. Horizon & Focus Actuel
- **Focus Immédiat : Le Onboarding.** Conformément aux meilleures pratiques, le développement (et le design Figma) commencera par un parcours d'onboarding extrêmement soigné, qui qualifie l'utilisateur (niveau technique, objectifs) et le charme visuellement.
- **Hors-Scope pour la V1 :** La création d'une marketplace intégrée pour mettre en relation avec des développeurs ou proposer du consulting/mentorat est écartée pour l'instant.

--- 

*Ce document intègre la stratégie de croissance via une offre freemium ("donner avant de recevoir") et la préparation technique de l'idée via les AI Skills existants.*
