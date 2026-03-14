# Brainstorming 05 : Liste des Écrans — Main App

Suite à l'onboarding (écrans 1–10 déjà implémentés), l'utilisateur entre dans l'application principale. Ce document décrit chaque écran, son rôle, ses éléments UI et les composants réutilisables mobilisés.

**Style : Pure Dark + Liquid Glass**
Fond #000000 pur, surfaces translucides (#0d0d0d), glow ambiant coloré par idée, typographie Space Grotesk / Inter, tab bar avec ligne de séparation glass (1px blanc, opacité 12%).

---

## Navigation globale

**3 tabs permanents :**
1. **Idea** — L'idée active, en pleine page. Segment control Blueprint / Market / Stack / Prompts. FAB mic toujours visible.
2. **Ideas** — Bibliothèque de toutes les idées, niveau de complétion visible.
3. **Me** — Profil, abonnement, historique des sessions vocales par idée.

**Philosophie "Idea First" :** on atterrit toujours dans l'idée active. Tab bar flottante (liquid glass) présente dans tous les écrans de la main app.

**Composants réutilisables clés :**
- `Component/TabBar/PureDark` — Tab bar avec glass highlight et état actif/inactif ✓
- `Component/Tag/Status` — Chip de statut (Blueprint, Market, Stack)
- `Component/Tag/Tech` — Badge technologie (Supabase, Vercel…)
- `Component/Button/Primary` — CTA principal
- `Component/Button/Secondary` — Action secondaire (Copy, Share…)

---

## Écran 11-A : Idea — Blueprint (déjà designé)

**Nom Pencil :** `11_Idea_Blueprint_PureDark`
**Tab actif :** Idea

**Rôle :** Présenter le pitch structuré de l'idée et ses features clés. C'est l'état de récompense post-onboarding.

**Éléments UI :**
- Back nav "Ideas" + icône Share (top)
- Titre de l'idée (28px, bold, Space Grotesk)
- Status chip : "Blueprint ready" (dot vert + texte vert #22c55e)
- Segment control : [Blueprint] [Market 🔒] [Stack] [Prompts] — glass pill background
- Pitch card : label "YOUR PITCH" + texte (Inter, 15px, line-height 1.6)
- Feature tags : pills dark avec texte (#Chef profiles, Booking, Reviews…)
- Market Analysis card (locked, opacity 0.5) + CTA "Unlock with Pro" (violet)
- FAB mic (bottom right, #1a1a2e + border violet, icône #a78bfa) avec glow indigo
- `Component/TabBar/PureDark` : Idea actif (blanc)

**Glow ambiant :** ellipse indigo (#6366f1, blur 100)

---

## Écran 11-B : Idea — Market

**Nom Pencil :** `11_Idea_Market_PureDark`
**Tab actif :** Idea (segment : Market)

**Rôle :** Analyse de marché de l'idée — débloquée avec Pro. Répond à "Est-ce que quelqu'un paiera pour ça ?"

**Éléments UI :**
- Segment control : [Blueprint] [**Market**] [Stack] [Prompts]
- TAM / SAM / SOM : 3 métriques en cards horizontales
- Concurrent Map : liste de 3-4 concurrents avec score de menace (barres colorées)
- Insight card : "Why this market is ripe" (texte synthétique IA)
- Si non débloqué : état flouté avec paywall inline ("Unlock with Pro")
- FAB mic + `Component/TabBar/PureDark`

**Glow ambiant :** ellipse violet (#8b5cf6, blur 100)

---

## Écran 11-C : Idea — Stack

**Nom Pencil :** `11_Idea_Stack_PureDark`
**Tab actif :** Idea (segment : Stack)

**Rôle :** Recommandation de stack technique personnalisée. Répond à "Par où je commence concrètement ?"

**Éléments UI :**
- Segment control : [Blueprint] [Market 🔒] [**Stack**] [Prompts]
- Cards technos : icône + nom + rôle (ex : "Supabase — Database & Auth", "Expo — Mobile app", "Vercel — Web deploy")
- Utilise `Component/Tag/Tech` pour chaque brique
- Schéma d'architecture : icônes reliées par des lignes subtiles (optionnel v1)
- Bouton "Copy full stack" → `Component/Button/Secondary`
- FAB mic + `Component/TabBar/PureDark`

**Glow ambiant :** ellipse bleu (#3b82f6, blur 100)

---

## Écran 11-D : Idea — Prompts

**Nom Pencil :** `11_Idea_Prompts_PureDark`
**Tab actif :** Idea (segment : Prompts)

**Rôle :** Le Master Prompt prêt à coller dans Cursor / Claude. La récompense la plus actionnable.

**Éléments UI :**
- Segment control : [Blueprint] [Market 🔒] [Stack] [**Prompts**]
- Card "Master Prompt" : bloc de texte (monospace, fond #0d0d0d, border subtile)
- Bouton "Copy to Cursor" → `Component/Button/Secondary` avec animation sparkle au tap
- Bouton "Copy to Claude" (variante)
- Texte de contexte : "This prompt scaffolds your full project in one shot."
- FAB mic + `Component/TabBar/PureDark`

**Glow ambiant :** ellipse vert (#10b981, blur 100)

---

## Écran 11-E : Idea — Recording (Continuation)

**Nom Pencil :** `11_Idea_Recording_PureDark`
**Tab actif :** Idea (modal/overlay)

**Rôle :** Flow de continuation — l'utilisateur tape le FAB mic pour affiner son idée à la voix.
Réutilise exactement les composants de l'onboarding (Écran 4 — Whisper Flow).

**Éléments UI (réutilisés de l'onboarding) :**
- Fond Pure Dark + glow animé
- `Component/MicButton` : grand bouton central, pulsations douces
- Texte contextuel : "Update your idea. What's changed?" (versus "Tell me your idea" à l'onboarding)
- `Component/SocialProof` en bas (optionnel)
- Bouton fermer (×) pour revenir à l'écran Idea sans perdre de données

**Note :** Ce n'est pas un nouvel écran from scratch — c'est le même composant `MicButton` + layout de l'écran 4, avec un texte d'entrée différent. Réutilisation maximale.

---

## Écran 11-F : Idea — Synthesizing (Recalcul)

**Nom Pencil :** `11_Idea_Synthesizing_PureDark`
**Tab actif :** Idea (overlay de transition)

**Rôle :** L'IA met à jour l'idée en fonction de ce qui vient d'être dit. Réutilise l'Écran 5 (Agent System Display).

**Éléments UI (réutilisés de l'onboarding) :**
- `Component/ThoughtStep` : log de raisonnement de l'IA ("Updating market section...", "Refining features...")
- Bloc de confirmation contextuel : "Updated: Your pitch now includes the B2B angle."
- Transition automatique vers l'écran Blueprint quand terminé

**Note :** L'agent sait à quel stage l'idée en est (Blueprint complet ? Market en cours ?) et met à jour uniquement les sections concernées.

---

## Écran 12 : Ideas Library (déjà designé)

**Nom Pencil :** `12_Ideas_Library_PureDark`
**Tab actif :** Ideas

**Rôle :** Bibliothèque de toutes les idées créées. Chaque card montre le niveau de complétion.

**Éléments UI :**
- Titre "My Ideas" (28px) + bouton "+ New idea" (pill dark)
- Idea cards : nom, meta (nb sessions · date), status chips (Blueprint / Market / Stack)
- Card "Draft" : opacity 0.6 (état incomplet)
- `Component/Tag/Status` pour chaque état de complétion
- `Component/TabBar/PureDark` : Ideas actif (blanc)

**États de card :**
- Complet : chips colorés (vert, violet, bleu)
- Partiel : Blueprint vert + Market locked (gris)
- Draft : opacity réduite, chip "Draft" gris

**Glow ambiant :** ellipse ambre (#f59e0b, blur 100, opacity 0.08)

---

## Écran 13 : Me — Profil

**Nom Pencil :** `13_Me_Profile_PureDark`
**Tab actif :** Me

**Rôle :** Profil utilisateur, abonnement, et — point différenciant — l'historique des sessions vocales classées par idée.

**Éléments UI :**
- Avatar + nom (initiales) + plan actuel (Free / Pro)
- CTA upgrade si Free : "Unlock Full Validation" → `Component/Button/Primary`
- Section "Voice History" : timeline par idée
  - Chaque idée : accordéon dépliable listant les sessions (date, durée, résumé IA 1 ligne)
  - Icône mic + timestamp + "Updated: Market section"
  - Ceci est le "journal de naissance" de l'app
- Section "Settings" : langue, notifications, plan
- `Component/TabBar/PureDark` : Me actif (blanc)

**Glow ambiant :** ellipse blanc (#ffffff, blur 80, opacity 0.03) — très subtil

---

## Récapitulatif

| # | Écran | Statut | Réutilise |
|---|-------|--------|-----------|
| 11-A | Idea Blueprint | ✅ Designé | — |
| 11-B | Idea Market | 🔲 À faire | Component/Tag/Status |
| 11-C | Idea Stack | 🔲 À faire | Component/Tag/Tech |
| 11-D | Idea Prompts | 🔲 À faire | Component/Button/Secondary |
| 11-E | Idea Recording | 🔲 À faire | Component/MicButton (onboarding screen 4) |
| 11-F | Idea Synthesizing | 🔲 À faire | Component/ThoughtStep (onboarding screen 5) |
| 12 | Ideas Library | ✅ Designé | Component/Tag/Status |
| 13 | Me Profile | 🔲 À faire | Component/TabBar/PureDark |

**Total main app :** 8 écrans (2 designés, 6 à créer)
**Onboarding :** 10 écrans déjà implémentés (screens 1–10)
