# Ideo — Design Charter (Mobile)

> Document vivant. Reflète l'état réel du code, pas les maquettes Pencil.
> Screens de référence : **DailyRitualModal** + **IdeaScreen** — les plus aboutis visuellement.
> Mis à jour en dernier : mars 2026

---

## Direction artistique

**Vintage Metal** — chaud, analogique, tactile. L'app doit évoquer un carnet de notes premium ou un appareil Braun vintage : autorité + accessibilité.

### Intention en un mot
> *Élégance par la retenue.*

### Ce qu'on évite
- Coins trop ronds → arrondi = digital, plastique. Ideo préfère le **carré raffiné**.
- Glassmorphism, gradients agressifs, couleurs arc-en-ciel
- Dividers partout → on sépare par **l'espace**, pas par des lignes
- Fond blanc pur pour les surfaces interactives — le cream fait le travail
- Emojis système non stylables — remplacés par **Phosphor Icons** (voir § Icônes)

---

## 1. Couleurs

### Palette brand (source : `src/components/ui/colors.js`)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand.bg` | `#FCFAEA` | Fond global — Vintage Cream |
| `brand.dark` | `#433831` | CTA, texte fort, badges sombres |
| `brand.selected` | `#FDF4CD` | État sélectionné (Egg Yolk) |
| `brand.border` | `#E8D88A` | Bordures actives |
| `brand.card` | `#FFFFFF` | Surfaces de carte sur cream |
| `brand.muted` | `#7D7D7D` | Texte secondaire, icônes neutres |

### Couleurs d'accent (hardcodées dans les composants)

| Rôle | Hex | Usage |
|------|-----|-------|
| Orange accent | `#C4773B` | Sélection, bordure active, streak |
| Orange vif | `#FF8A4C` | Streak circle fill, Fire icon |
| Orange streak halo | `#FFC8A8` | Bordure cercle streak actif |
| Texte titre italic | `#A08060` | Georgia italic headers (DailyRitualModal, IdeaScreen) |
| Fond cream | `#FCFAEA` | Identique à `brand.bg` |
| Opacité muted dark | `rgba(67,56,49,0.45)` | Icônes non-sélectionnées |

### Palette système (Tailwind, `src/global.css`)

Palette complète disponible : `primary` (orange), `charcoal`, `neutral`, `success`, `warning`, `danger`.
→ Dans les composants de l'app Ideo, **préférer les tokens brand** aux tokens Tailwind bruts.

---

## 2. Typographie

### Règle générale
- **Titres / headers émotionnels** → Georgia italic (serif display)
- **Tout le reste** → font système (Inter/SF Pro via NativeWind)

### Hiérarchie

| Rôle | Font | Size | Weight | Color | LineHeight |
|------|------|------|--------|-------|------------|
| Titre modal / section | Georgia italic | 28 | — | `#A08060` | 38 |
| Points total | Système | 28 | 800 | `#433831` | 38 |
| Streak count | Système | 20 | 800 | `#433831` | 28 |
| Section label | Système | 10 | 700 | `#A08060` | — |
| Body standard | Système | 14 | 600 | `#433831` | 20 |
| Sous-titre muted | Système | 12 | 400 | `#433831` 50% | — |
| Badge text | Système | 13 | 700 | `#FCFAEA` | — |
| Badge points pill | Système | 11 | 800 | `#FCFAEA` | — |

### Titres de section (composants)

```typescript
// Titres de sections utilisateurs (Daily Challenges, Goals, Progression...)
{ fontSize: 16, fontWeight: '600', color: brand.dark, letterSpacing: 1.2, textTransform: 'uppercase' }
// + effet sillon (voir § Effet Sillon)
```

### Section labels (petits labels d'en-tête)
Toujours : `fontSize: 10–12`, `fontWeight: '700'`, `letterSpacing: 0.5–2`, `textTransform: 'uppercase'`, `color: '#A08060'`.
+ Appliquer l'effet sillon sur fond cream/selected.

```typescript
// Pattern court
{ fontSize: 10, fontWeight: '700', color: '#A08060', letterSpacing: 2, textTransform: 'uppercase' }
```

### Hiérarchie de poids

- **Titre section** : `fontWeight: '600'` (pas 800 — trop lourd)
- **Body / label de carte** : `fontWeight: '500'`
- **Badge text** : `fontWeight: '700'`
- **Points pill** : `fontWeight: '800'`

→ La hiérarchie passe par `letterSpacing` et `textTransform`, pas par le poids.

---

## 3. Border Radius

### Direction : moins de rondeur, plus de carré — élégance par la géométrie

| Token | Valeur | Usage |
|-------|--------|-------|
| `badge` | `6` | Badges niveau, streak, points, dimension — **valeur par défaut badge** |
| `card` | `12` | Cartes de contenu (challenge card, goal card, table, bar chart) |
| `button` | `16` | CTA pleine largeur |
| `tab-bar` | `14` | Barre de navigation flottante |
| `progress-track` | `6` | Piste de toutes les barres de progression (effet sillon) |
| `circle` | `999` | Cercles de streak/week-view uniquement |
| `avatar` | `28` | Cercles de profil |

**Règles clés :**
- Badges (niveau, streak, points, dimension) → `borderRadius: 6`
- Pill/999 réservé aux cercles parfaits (week-view)
- Jamais de `borderRadius: 999` sur des badges rectangulaires

---

## 3b. Effet Sillon (Gravure)

> Signature visuelle Ideo — donne un aspect taillé dans la matière, cousu main, premium.

### Principe

Simuler un creux dans la surface en ajoutant un reflet lumineux **1 pixel en dessous** du texte ou un bord asymétrique sur la piste d'une barre.

### Texte gravé

S'applique sur les fonds clairs (`brand.bg`, `brand.border`, `brand.selected`). Ne pas utiliser sur fonds sombres.

```typescript
// Style réutilisable — texte gravé sur cream
const ENGRAVED_TEXT = {
  color: 'rgba(67,56,49,0.55)',
  textShadowColor: 'rgba(255,255,255,0.7)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 0,   // net, pas flou
};
```

**Quand l'appliquer :**
- Sous-titres informatifs dans les cartes (points vers le niveau suivant)
- Titres de section (`fontSize: 12–16`)
- En-têtes de colonnes de tableau (`color: '#A08060'`)
- Texte muted secondaire

**Intensité variable selon le fond :**

| Fond | `textShadowColor` |
|------|-------------------|
| `brand.bg` (#FCFAEA) | `rgba(255,255,255,0.7)` |
| `brand.selected` (#FDF4CD) | `rgba(255,255,255,0.65)` |
| `white` (#FFFFFF) | `rgba(180,160,120,0.2)` — chaud, très subtil |

### Barre de progression — piste gravée

```typescript
// Track — sillon creusé
{
  borderRadius: 6,
  backgroundColor: 'rgba(67,56,49,0.18)',
  borderWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.18)',    // bord ombre (haut = ombre)
  borderLeftColor: 'rgba(0,0,0,0.12)',
  borderBottomColor: 'rgba(255,255,255,0.22)', // bord reflet (bas = lumière)
  borderRightColor: 'rgba(255,255,255,0.16)',
}

// Fill bar (dans la track)
{ borderRadius: 4, height: '100%' }
```

Ce pattern simule un sillon de couture : bord supérieur sombre (ombre), bord inférieur clair (reflet de lumière), comme une rainure creusée dans la matière.

---

## 4. Iconographie

### Librairies

| Librairie | Package | Usage |
|-----------|---------|-------|
| **Phosphor** | `phosphor-react-native` | Icons expressifs / émotionnels |
| **Ionicons** | `@expo/vector-icons` | Navigation, actions système |

### Phosphor — poids par état

| État | Weight | Color |
|------|--------|-------|
| Repos | `light` | `rgba(67,56,49,0.45)` |
| Sélectionné | `fill` | `#C4773B` |
| Accent (streak) | `fill` | `#FF8A4C` |

### Mapping mood picker

| Score | Icône Phosphor | Émotion |
|-------|---------------|---------|
| 1 | `SmileySad` | Très mal |
| 2 | `SmileyNervous` | Anxieux |
| 3 | `SmileyMeh` | Neutre |
| 4 | `Smiley` | Bien |
| 5 | `SmileyWink` | Top |

### Mapping niveaux (DB emoji → Phosphor)

Les emojis de niveau sont stockés en DB (`levelIcon` field). Le composant fait la traduction côté client.

```typescript
// src/features/focus/components/level-header.tsx
const LEVEL_ICON_MAP: Record<string, Icon> = {
  '🌱': Plant,
  '💡': Lightbulb,
  '🔨': Hammer,
  '⚡': Lightning,
  '🚀': Rocket,
};
```

**Règle** : Ne plus utiliser d'emojis pour les éléments UI rendus. Les emojis restent en DB comme identifiants — toujours mapper vers Phosphor côté composant.

---

## 5. Espacement & Layout

- **Padding horizontal écran** : `24px`
- **Padding vertical section** : `20px`
- **Gap standard** : `8px` (row items), `16px` (éléments de liste)
- **Séparation de sections** : `marginBottom` seul — **zéro divider** (`borderBottomWidth`)
- **Fond CTA sticky** : toujours `backgroundColor: brand.bg` + `useSafeAreaInsets` pour `paddingBottom`

---

## 6. Composants récurrents

### Badge dark (niveau, streak)
```typescript
// Container — icon + texte uppercase
{
  flexDirection: 'row', alignItems: 'center', gap: 6,
  backgroundColor: '#433831', borderRadius: 6,
  paddingHorizontal: 10, paddingVertical: 5,
  elevation: 3,
}
// Text — uppercase + letterSpacing
{ fontSize: 11, fontWeight: '700', color: '#FCFAEA', letterSpacing: 1.2 }
// Icon — toujours Phosphor weight="fill"
<PhosphorIcon size={13} weight="fill" color="#FCFAEA" />
```

### Badge points pill (défis, goals)
```typescript
// Container
{ backgroundColor: '#433831', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, elevation: 2 }
// Text
{ fontSize: 11, fontWeight: '800', color: '#FCFAEA' }
```

### Badge dimension (inline dans les cartes)
```typescript
// Container
{
  borderRadius: 6, borderWidth: 1, borderColor: `${brand.border}60`,
  backgroundColor: brand.selected, paddingHorizontal: 8, paddingVertical: 3,
  elevation: 2,
}
// Text
{ fontSize: 10, fontWeight: '700', color: brand.dark }
```

### CTA pleine largeur
```typescript
{ backgroundColor: '#433831', borderRadius: 16, paddingVertical: 18, alignItems: 'center' }
// Text
{ color: '#FCFAEA', fontSize: 16, fontWeight: '700' }
```

### Cercle streak actif
```typescript
{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF8A4C', borderWidth: 2, borderColor: '#FFC8A8' }
```

### Progress bar
Composant : `AnimatedProgressBar` (`src/components/ui/animated-progress-bar.tsx`)
- `height={10}` en contexte modal/section
- `animateOnMount={true}` pour sparks à l'ouverture
- `showSpark={true}` par défaut
- Piste avec **effet sillon** (bords asymétriques, voir § 3b)
- Fill bar : `borderRadius: 4` (légèrement moins arrondi que la piste)

---

## 7. Screens de référence

### `DailyRitualModal` — meilleure incarnation du style
`src/features/idea/components/daily-ritual-modal.tsx`
- Zéro divider, tout séparé par espace
- Titre Georgia italic `#A08060`
- Badge + points sur même ligne (space-between)
- Section labels small-caps `#A08060`
- Phosphor icons pour moods (light/fill selon état)
- Fire icon + texte pour le streak
- Safe area insets sur le CTA

### `IdeaScreen` — référence pour le flow principal
`src/features/idea/idea-screen.tsx`
- Même palette cream/dark
- `cardLabel` pattern (identique aux section labels ci-dessus)
- FAB mic comme héros de l'interface
- `AgentMarkdown` pour tout texte AI
