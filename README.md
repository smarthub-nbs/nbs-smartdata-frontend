# NBS SmartData Hub — Frontend

Angular 17 SPA for browsing, searching, and exploring official Tanzania statistics.

## Prerequisites

- Node.js 22.13+
- npm 10+

## Setup

```bash
npm ci
```

## Development

```bash
npm start
```

Open `http://127.0.0.1:4200/`. API requests proxy to `http://127.0.0.1:8000` via [`proxy.conf.json`](proxy.conf.json).

### Environments

| File                                          | Use                                   |
| --------------------------------------------- | ------------------------------------- |
| `src/environments/environment.ts`             | Production build                      |
| `src/environments/environment.development.ts` | `ng serve` (mock explore API on)      |
| `src/environments/environment.e2e.ts`         | Playwright (mock discovery + explore) |

## Scripts

| Command                      | Description                |
| ---------------------------- | -------------------------- |
| `npm start`                  | Dev server                 |
| `npm run build`              | Production build           |
| `npm run lint`               | ESLint                     |
| `npm run format:check`       | Prettier check             |
| `npm run check:architecture` | Feature boundary rules     |
| `npm run test:ci`            | Unit tests (headless)      |
| `npm run e2e`                | Playwright smoke tests     |
| `npm run e2e:chrome`         | E2E using installed Chrome |

## Testing

```bash
npm run test:ci
npm run e2e:chrome   # local; CI uses bundled Chromium
```

E2E specs live in `e2e/smoke/`. The dev server starts automatically via `playwright.config.ts`.

## CI

GitHub Actions workflow [`.github/workflows/frontend-ci.yml`](.github/workflows/frontend-ci.yml) runs on push/PR to `main` and `development`:

1. **Lint, Test, And Build** — lint, architecture check, unit tests, production build
2. **Playwright Smoke Tests** — install Chromium, run e2e suite

## Project structure

```
src/app/
  core/       auth, guards, interceptors, ApiService
  features/   domain pages (discovery, explore, admin, …)
  layout/     shell, header, footer
  shared/     UI kit, page-state, utilities
```

Path aliases: `@app/*`, `@shared/*`, `@env/*`

## Auth note

JWT tokens are stored in `localStorage`. See [`docs/auth-storage.md`](docs/auth-storage.md) for the threat model and HttpOnly cookie migration path.
