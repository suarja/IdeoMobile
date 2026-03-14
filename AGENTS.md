# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

IdeoMobile is a React Native mobile app built on the [Obytes React Native Template](https://github.com/obytes/react-native-template-obytes). It uses Expo SDK 54, Expo Router 6 (file-based routing), and TypeScript with strict mode.

## Commands

### Development
```
pnpm install            # Install dependencies (pnpm is enforced)
pnpm start              # Start Expo dev server
pnpm ios                # Run on iOS
pnpm android            # Run on Android
```

### Quality Checks
```
pnpm lint               # ESLint (flat config via @antfu/eslint-config)
pnpm lint:fix           # ESLint with auto-fix
pnpm type-check         # TypeScript validation (tsc --noemit)
pnpm test               # Jest unit tests
pnpm check-all          # Runs lint + type-check + lint:translations + test
```

### Testing
```
pnpm test                       # Run all tests
pnpm test -- --watch            # Watch mode
pnpm test -- path/to/file       # Run a single test file
pnpm test -- --testNamePattern="pattern"  # Run tests matching a name
pnpm test:ci                    # Run with coverage
pnpm e2e-test                   # Maestro E2E tests (.maestro/)
```

### Environment-Specific Builds
```
pnpm ios:preview                # Preview env on iOS
pnpm ios:production             # Production env on iOS
pnpm build:production:ios       # EAS cloud build (production, iOS)
pnpm build:production:android   # EAS cloud build (production, Android)
```

## Architecture

### Routing
File-based routing via Expo Router in `src/app/`. The root layout (`src/app/_layout.tsx`) wraps the app in a provider stack: `GestureHandlerRootView > KeyboardProvider > ThemeProvider > APIProvider > BottomSheetModalProvider`. The `(app)/` group is a tab navigator (Feed, Style, Settings) that redirects to `/onboarding` or `/login` based on auth state.

### Feature Modules
Each feature lives in `src/features/<name>/` with its screens, components, and API hooks. Screens are exported from feature modules and consumed by route files in `src/app/`.

### Data Fetching
React Query via `react-query-kit`. API hooks are defined with `createQuery`/`createMutation` (see `src/features/feed/api.ts`). The HTTP client is Axios, configured in `src/lib/api/client.tsx` with base URL from env. Pagination utilities are in `src/lib/api/utils.tsx`.

### State Management
- **Auth state**: Zustand store (`src/features/auth/use-auth-store.tsx`) with `createSelectors` pattern for granular subscriptions (e.g., `useAuthStore.use.status()`). Auth hydrates from MMKV storage at app startup.
- **Local storage**: MMKV via `src/lib/storage.tsx` — use this instead of AsyncStorage.

### Styling
TailwindCSS via Uniwind/NativeWind. Theme is defined in CSS variables in `src/global.css` (not a JS config). Color palettes: primary (orange), charcoal, neutral, success, warning, danger. Dark mode via `prefers-color-scheme` media query. Use `tailwind-variants` for component variant styling and `tailwind-merge` for class merging.

### i18n
i18next with `src/translations/en.json` as the reference file. All translation files must have identical, sorted keys (enforced by `eslint-plugin-i18n-json`). RTL is supported.

### Testing Setup
Jest with `jest-expo` preset. Test utilities in `src/lib/test-utils.tsx` provide a `render` wrapper (with navigation + bottom sheet providers) and a `setup` function for user event testing. Native module mocks (reanimated, MMKV, worklets, localization) are in `jest-setup.ts`. Tests are co-located with source files using `.test.tsx` suffix.

## Key Rules

- **Imports**: Always use `@/` prefix for src imports, never relative paths. Environment config uses `@env` alias.
- **Type definitions**: Use `type` keyword, not `interface` (enforced by ESLint).
- **Type imports**: Use inline `import { type Foo }` syntax.
- **File naming**: kebab-case enforced by ESLint (`unicorn/filename-case`).
- **Functions**: Max 3 parameters, max 110 lines per function (ESLint enforced).
- **Forms**: Use TanStack Form + Zod for validation (not react-hook-form). Use `getFieldError` from `src/components/ui/form-utils.ts`.
- **Native code**: Do not modify `android/` or `ios/` directly — use Expo config plugins.
- **Environment variables**: Must be prefixed with `EXPO_PUBLIC_*` for app access. Defined and validated with Zod in `env.ts`. The `.env` file sets defaults; environment-specific config is selected via `EXPO_PUBLIC_APP_ENV`.
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint). Direct commits to `main`/`master` are blocked by the pre-commit hook.
- **Pre-commit**: Runs `type-check` and `lint-staged` (ESLint --fix on staged files).
