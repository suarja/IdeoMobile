# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**IdeoMobile** is a React Native app (Expo SDK 54) that acts as an agentic "co-founder buddy" helping vibe coders carry a project to completion — guiding through complexity, doubts, and daily rituals. Built on the [Obytes React Native Template](https://starter.obytes.com).

The V1 scope is: **AI agent companion + gamification/daily ritual + single active project discipline** (no co-founder matching, no GitHub integration in V1).

## Commands

```bash
pnpm start              # Start Expo dev server
pnpm ios                # Run on iOS
pnpm android            # Run on Android

pnpm lint               # ESLint (flat config)
pnpm lint:fix           # ESLint auto-fix
pnpm type-check         # tsc --noemit
pnpm test               # Jest
pnpm check-all          # lint + type-check + lint:translations + test

pnpm test -- path/to/file                     # Single test file
pnpm test -- --testNamePattern="pattern"      # Filter by name
pnpm test -- --watch                          # Watch mode
pnpm test:ci                                  # With coverage

pnpm ios:preview        # Preview env on iOS
pnpm build:production:ios    # EAS cloud build
pnpm build:production:android
```

## Architecture

### Routing

File-based routing via Expo Router in `src/app/`. Root layout (`src/app/_layout.tsx`) wraps in: `GestureHandlerRootView > KeyboardProvider > ThemeProvider > APIProvider > BottomSheetModalProvider`.

The `(app)/` group is the authenticated tab navigator. On startup, it checks auth state and redirects to `/onboarding` (first-time) or `/login` (unauthenticated).

### Feature Modules

Each feature lives in `src/features/<name>/` containing its screens, components, and API hooks. Route files in `src/app/` import screens from feature modules — they stay thin.

### Data Fetching

React Query via `react-query-kit`. API hooks use `createQuery`/`createMutation` (see `src/features/feed/api.ts`). HTTP client is Axios configured in `src/lib/api/client.tsx` with base URL from env.

### State

- **Auth**: Zustand store (`src/features/auth/use-auth-store.tsx`) with `createSelectors` pattern for granular subscriptions: `useAuthStore.use.status()`. Hydrates from MMKV on startup.
- **Local storage**: MMKV via `src/lib/storage.tsx` — always use this, never AsyncStorage.

### Theming & Styling

NativeWind/Tailwind. Theme defined in CSS variables in `src/global.css` (no JS config). Color palettes: `primary` (orange), `charcoal`, `neutral`, `success`, `warning`, `danger`. Dark mode via `prefers-color-scheme`. Use `tailwind-variants` for component variant styling and `tailwind-merge` for class merging.

The theme is the **Vintage Metal** design language: warm cream/brownish tones with orange accents. Any palette changes go in `src/global.css`.

### `@expo/ui` Components

The project uses `@expo/ui` (canary) — a set of native iOS/Android components. Reference: https://docs.expo.dev/versions/latest/sdk/ui/ and the playground repo https://github.com/betomoedano/expo-ui-playground. Prefer these native components where available before building custom ones.

### Testing

Jest with `jest-expo` preset. Test helper in `src/lib/test-utils.tsx` provides `render` (with all providers) and `setup` (for user events). Tests are co-located with source files using `.test.tsx`. Native module mocks in `jest-setup.ts`.

### i18n

i18next with `src/translations/en.json` as reference. All translation files must have identical sorted keys (ESLint enforced). Add translation keys before using them in components.

## Key Rules

- **Imports**: Always `@/` prefix for src, `@env` for env vars. Never relative imports.
- **Types**: Use `type` keyword (not `interface`). Use inline `import { type Foo }` syntax.
- **File naming**: kebab-case (ESLint enforced).
- **Function limits**: Max 3 parameters, max 110 lines per function.
- **Forms**: TanStack Form + Zod only. Use `getFieldError` from `src/components/ui/form-utils.ts`.
- **Storage**: MMKV for sensitive data. Never AsyncStorage.
- **Native code**: Never modify `android/` or `ios/` directly — use Expo config plugins.
- **Env vars**: Must be `EXPO_PUBLIC_*` prefixed. All defined and validated with Zod in `env.ts`.
- **Commits**: Conventional Commits format (enforced by commitlint). Direct commits to `main`/`master` are blocked.
- **Pre-commit hook**: Runs `type-check` + `lint-staged` automatically.

## Template Docs

- [Rules & Conventions](https://starter.obytes.com/getting-started/rules-and-conventions/)
- [Project structure](https://starter.obytes.com/getting-started/project-structure)
- [Environment vars](https://starter.obytes.com/getting-started/environment-vars-config)
- [UI & Theming](https://starter.obytes.com/ui-and-theme/ui-theming)
- [Components](https://starter.obytes.com/ui-and-theme/components)
- [Forms](https://starter.obytes.com/ui-and-theme/Forms)
- [Data fetching](https://starter.obytes.com/guides/data-fetching)
