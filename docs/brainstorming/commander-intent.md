# Commander's Intent — Ideo

## La mission en une phrase

Donner à n'importe quel vibe coder la sensation d'avoir déjà commencé à construire quelque chose de réel — en moins de 3 minutes.

---

## Pourquoi ça existe

La plupart des gens qui ont une idée d'app se perdent avant de commencer.
Pas par manque de talent. Par manque de clarté.

Ideo distille le bruit mental en signal : une idée structurée, validée, et prête à être buildée.
L'utilisateur repart avec la certitude d'être sur les bons rails — et l'envie irrépressible de le montrer à quelqu'un.

---

## L'utilisateur cible

**Le vibe coder.** Il sait qu'il peut builder avec l'IA (Cursor, Claude). Il a des idées. Mais il ne sait pas par où commencer, si son idée vaut quelque chose, ni quelle stack utiliser. Il a besoin de clarté, pas de complexité.

---

## Ce qu'on optimise

**La sensation de clarté et de validation** — pas la quantité de features.

Chaque écran doit répondre à l'une de ces questions implicites de l'utilisateur :
- "Est-ce que mon idée a du sens ?"
- "Est-ce que quelqu'un voudra payer pour ça ?"
- "Par où je commence concrètement ?"

Si un écran ne répond pas à l'une de ces questions, il n'a pas sa place.

---

## L'expérience recherchée

**Avant Ideo :** cerveau emmêlé, note vocale chaotique, idée floue.
**Après Ideo :** blueprint clair, stack recommandée, prompt prêt à coller dans Cursor.

La transformation doit être *palpable* — visuellement, émotionnellement.
L'utilisateur doit avoir la sensation qu'il a accompli quelque chose de tangible.

---

## L'esthétique comme promesse

Le design n'est pas un détail — c'est le produit.

Ideo doit être aussi beau et fluide que les meilleures apps natives iOS. Pas un "AI wrapper" cheap. Un produit premium qui donne envie d'être partagé.

**Le style : Liquid Glass + Pure Dark.**
Fond noir pur. Surfaces translucides qui laissent passer la lumière. Typographie claire et hiérarchisée. Animations douces. Zéro friction.

Référence directe : Inkigo — native feeling, simplicité, élégance, caractère épuré.

---

## L'idée comme objet vivant

Une idée dans Ideo n'est pas un document statique. C'est un objet qu'on affine dans le temps, par la voix.

**Le flow de continuation :**
Un bouton microphone flottant (FAB) est toujours visible dans le tab Idea. En le tapant, l'utilisateur rouvre le même flow qu'à l'onboarding — Whisper Flow puis Synthesizing — mais en contexte de l'idée existante. L'agent sait à quel stage l'idée en est, et met à jour uniquement ce qui a évolué : le pitch, les features, la stack, l'analyse de marché.

**Les composants d'onboarding (MicButton, ThoughtStep, SmallOption) sont réutilisés** tels quels dans ce flow de continuation. Pas de duplication — juste de la cohérence.

---

## Architecture de navigation (main app)

Après le onboarding et la génération du blueprint, l'utilisateur entre dans la main app :

**3 tabs :**
1. **Idea** — L'idée active, en pleine page. Segment control pour naviguer entre les sections (Blueprint, Market, Stack, Prompts). FAB mic toujours visible pour continuer l'idéation.
2. **Ideas** — La bibliothèque de toutes les idées créées. Chaque idée montre son niveau de complétion.
3. **Me** — Profil, abonnement, et historique des sessions vocales classées par idée.

**Philosophie "Idea First" :** on atterrit toujours dans l'idée active. C'est le cœur de l'app, pas la liste.

**Historique dans Me :** chaque idée a une timeline de toutes les sessions vocales qui lui ont contribué. C'est le journal de naissance de l'app.

---

## Ce qu'on ne fait pas (v1)

- Pas de marketplace de devs/consultants
- Pas de collaboration multi-utilisateurs
- Pas de chat générique (ce n'est pas ChatGPT)
- Pas d'onboarding interminable qui ne délivre pas de valeur

---

## Comment savoir si on a réussi

L'utilisateur montre l'app à quelqu'un d'autre dans les 5 minutes qui suivent.
Il revient créer une deuxième idée dans la semaine.
Il dit : "C'est exactement ce dont j'avais besoin."
