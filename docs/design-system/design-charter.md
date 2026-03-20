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

### Section labels
Toujours : `fontSize: 10`, `fontWeight: '700'`, `letterSpacing: 2`, `textTransform: 'uppercase'`, `color: '#A08060'`, `marginBottom: 16`.

```typescript
// Pattern à réutiliser partout
{ fontSize: 10, fontWeight: '700', color: '#A08060', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }
```

---

## 3. Border Radius

### Direction : moins de rondeur, plus de carré — élégance par la géométrie

| Token | Valeur | Usage |
|-------|--------|-------|
| `sharp` | `8` | Composants très structurés (futur) |
| `card` | `12` | Badges, boutons, cartes principales — **valeur par défaut** |
| `button` | `16` | CTA pleine largeur |
| `circle` | `999` | Cercles de streak/week-view uniquement |
| `avatar` | `28` | Cercles de profil |

**Règle** : Par défaut → `borderRadius: 12`. Pill/999 uniquement pour les cercles parfaits (week-view). Les badges type "niveau" → `12`, pas `999`.

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

**Règle** : Ne plus utiliser d'emojis pour les éléments UI interactifs. Les emojis restent acceptables uniquement dans les strings stockées en DB (levelIcon).

---

## 5. Espacement & Layout

- **Padding horizontal écran** : `24px`
- **Padding vertical section** : `20px`
- **Gap standard** : `8px` (row items), `16px` (éléments de liste)
- **Séparation de sections** : `marginBottom` seul — **zéro divider** (`borderBottomWidth`)
- **Fond CTA sticky** : toujours `backgroundColor: brand.bg` + `useSafeAreaInsets` pour `paddingBottom`

---

## 6. Composants récurrents

### Badge dark (niveau, points)
```typescript
// Container
{ backgroundColor: '#433831', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }
// Text
{ fontSize: 13, fontWeight: '700', color: '#FCFAEA' }
```

### Badge points pill (défis)
```typescript
// Container
{ backgroundColor: '#433831', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }
// Text
{ fontSize: 11, fontWeight: '800', color: '#FCFAEA' }
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
