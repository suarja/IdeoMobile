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

## Backend (Convex)

The POC uses **Convex** as the backend (real-time database + serverless functions + AI agent orchestration via `@convex-dev/agent`).

**Source of truth for all Convex rules:** `docs/agents/convex_rules.txt` — always read this file before writing any code in `convex/`.

Key rules summary:
- All Convex functions live in `convex/` with file-based routing (`api.module.function` / `internal.module.function`).
- Schema must be defined in `convex/schema.ts`. Always name indexes after their fields (e.g. `by_field1_and_field2`).
- Always include argument validators (`v.*`) on every function — no exceptions.
- Use `query`/`mutation`/`action` for public functions; `internalQuery`/`internalMutation`/`internalAction` for private ones.
- Never use `ctx.db` inside actions. Never accept `userId` as an argument — always derive identity via `ctx.auth.getUserIdentity()`.
- Add `"use node";` only to action files that need Node.js built-ins; never mix with queries/mutations in the same file.
- Do not use `.filter()` on queries — define indexes and use `.withIndex()` instead.
- Do not use `.collect()` for unbounded results — use `.take(n)` or paginate.
- Convex config: `convex/convex.config.ts`. Agent layer: `convex/agents/`.

## Architecture Documentation

Decisions are documented in `docs/architecture/`. Read before touching the relevant systems.

| File | System | Summary |
|---|---|---|
| [`docs/architecture/auth.md`](docs/architecture/auth.md) | Clerk + Convex + SecureStore | Auth stack, SSO flow, session persistence, Convex identity rules |
| [`docs/architecture/gamification.md`](docs/architecture/gamification.md) | Gamification + Focus Screen | 6 Convex tables, scoring system, streak calc, daily challenge cron, agent tools, Focus Screen wiring |

## Next Steps (in-progress work on `feat/focus-screen`)

### 🔴 Clerk Webhook — user initialization

When a user signs up via Clerk, their `userStats` row does not exist until they send a first voice message. This means the daily challenge cron skips them.

**Must implement:** `convex/http.ts` HTTP endpoint listening to Clerk's `user.created` webhook:
- Verify Svix signature (header `svix-signature`, secret from Clerk dashboard)
- On `user.created`: call `internal.gamification.initUserStats` to create a zeroed `userStats` row
- Register the webhook URL in Clerk dashboard: `https://<deployment>.convex.cloud/clerk-webhook`

See `docs/architecture/gamification.md` for the implementation pattern.

### 🟡 Focus Screen UI polish

To be done with a dedicated design agent:
- Radar chart (4 dimensions, weight-scaled axes) for `projectScores`
- Badge indicator on Focus tab if today's challenges are all uncompleted
- "Add goal" button (calls `useAddGoal`)
- Completion animation on challenge/goal tap
