# ideo: Vintage Metal Design System (V2)

## Commander's Intent (Design)

The "Vintage Metal" theme represents an evolution of the initial "Metal Orange" concept. It shifts away from stark, modern grays and aggressive contrasts, moving toward a warmer, more analogue, and tactile feel. 

The goal is to evoke the feeling of a premium, well-crafted physical object—like an expensive notebook, a piece of vintage audio equipment, or a classic Braun appliance. It should feel authoritative but deeply approachable. We want the user to feel they are building something permanent and valuable.

### Key Emotional Drivers
- **Warmth & Analogue Feel:** Avoiding sterile tech vibes in favor of cream, egg-yolk yellow, and deep brown-gray (leather/dark metal).
- **Tactility:** Elements should feel like physical cards or recessed tracks.
- **Clarity via Contrast:** Using very soft background colors offset by stark white functional elements to show exactly what is interactive.

---

## 1. Color Palette

The color system is highly constrained to ensure the aesthetic holds together without becoming chaotic.

### App Backgrounds
- **Primary Screen Fill (Vintage Cream):** `#FCFAEA`
  *Usage: The global background color for all main onboarding and app screens. This is the foundation of the warm vibe.*

### Surfaces & Containers
- **Functional Surface (Pure White):** `#FFFFFF`
  *Usage: Used for unselected interactable elements like `FormOption` cards. Placed against the cream background, this makes them pop slightly like physical paper cards.*
- **Selected Accent (Egg Yolk):** `#FDF4CD`
  *Usage: Used when a user selects an option. It's a pale, warm yellow that signals selection without shouting like a neon color.*

### Interactive & Action Elements
- **Primary Action (Dark Leather / Deep Metal):** `#433831`
  *Usage: The main CTA button fill color. It's not pure black `#000000` or neutral dark gray `#111827`, but a complex, subtle brownish-gray that grounds the design.*
- **Action Accent (Orange):** `#EA580C`
  *Usage: Used sparingly for progress arcs, active radio button centers, and micro-interactions. It provides the necessary "pop" against the dark gray and cream.*

### Strokes & Borders
- **Standard Border (Cool Gray):** `#E2E2E6`
  *Usage: Used for unselected option borders and empty progress tracks. It provides structure without being loud.*
- **Active Border (Medium Zinc):** `#A1A1AA`
  *Usage: Used for borders of selected elements to give them a slightly heavier, recessed feel compared to unselected states.*

### Typography
- **Primary Text:** `#111827` (or similar near-black)
  *Usage: Headings and main copy. Must remain highly legible.*
- **Button Text:** `#FFFFFF`
  *Usage: White text strictly used on the `#433831` primary buttons.*

---

## 2. Core Components

### The "Card" Options (`FormOption`)
- **Unselected State:** 
  - Fill: `#FFFFFF` 
  - Stroke: `#E2E2E6` (thickness: 1)
  - Layout: Large click targets, pure white against the `#FCFAEA` background.
- **Selected State:**
  - Fill: `#FDF4CD`
  - Stroke: `#A1A1AA` (thickness: 1)
  - Detail: The radio button fills with the `#EA580C` orange accent.

### CTA Buttons (`Button/Primary`)
- **Style:** Flat, no stroke, relying entirely on the weight of the dark color.
- **Fill:** `#433831`
- **Corner Radius:** 12px (soft but structured).
- **Text:** Bold, `#FFFFFF`.

### Progress Indicator (`Component/Progress`)
- **Track:** 40x40px (or 48x48px depending on screen weight), thickness 3px.
- **Background Track:** Light gray `#E2E2E6` stroke.
- **Active Arc:** Orange `#EA580C` stroke.
- *Implementation Note:* Created using a track ellipse and an overlaying clip frame to avoid Pencil's SVG path rendering bugs.

### Back Button (`Component/BackButton`)
- **Size:** 28x28px
- **Weight:** Thicker icon stroke to match the substantial, analogue feel of the other UI elements. Dark tint.

---

## 3. Typographic Hierarchy & Layout Rules

1. **No Border Radius on Screens:** The screens themselves should feel like a solid canvas.
2. **Generous Spacing:** Allow for significant padding (e.g., `48px` top, `32px` bottom) to let the cream background breathe.
3. **Typography:** Rely on a strong serif/display font (e.g., *Playfair Display*, *Space Grotesk*) for headers to lean into the vintage, editorial feel, while keeping functional text clean and legible (sans-serif). 
4. **Fixed Width for Readability:** Ensure all multi-line text has `textGrowth: "fixed-width"` to prevent overflow and maintain column structure.

---

## 4. Implementation Notes regarding Pencil Engine

When applying this design system in the `.pen` files:
- Always use the Master Components stored in the `Metal Orange Components` (now effectively "Vintage Metal") frame.
- Do not mix the legacy Light/Dark components with this specific V2 aesthetic unless explicitly requested.
- Maintain `layout: "none"` for complex container screens and use precise absolute positioning for bulletproof rendering.
