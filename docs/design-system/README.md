# NBS Design System

Coherent custom UI system for NBS SmartData Hub, aligned with the official NBS brand.

**Canonical docs (Obsidian vault):** `NBS/SmartData/` — open in Obsidian for full notes with wikilinks.

## Design system

| Topic | Obsidian | Code source |
|-------|----------|-------------|
| Overview | `design-system/overview.md` | — |
| Tokens | `design-system/tokens.md` | [`tailwind.config.js`](../../tailwind.config.js) |
| Utilities | `design-system/utilities.md` | [`src/styles.scss`](../../src/styles.scss) |
| UI primitives | `design-system/ui-primitives.md` | [`src/app/shared/ui/`](../../src/app/shared/ui/) |
| Shared components | `design-system/shared-components.md` | [`src/app/shared/`](../../src/app/shared/) |
| Icon catalog | `design-system/icons.md` | [`icon/icon.component.ts`](../../src/app/shared/ui/icon/icon.component.ts) |
| Charts & data viz | `design-system/charts-data-viz.md` | [`chart-colors.util.ts`](../../src/app/features/explore/utils/chart-colors.util.ts) |
| Patterns | `design-system/patterns.md` | — |

## Frontend & backend

| Topic | Obsidian |
|-------|----------|
| Project structure | `frontend/project-structure.md` |
| Architecture | `frontend/architecture.md` |
| Auth & security | `frontend/auth-security.md` |
| Backend overview | `backend/overview.md` |
| Local setup (Docker) | `backend/local-setup.md` |

## Quick reference

### Import UI kit

```typescript
import { ButtonComponent, AlertComponent } from '@shared/ui';
```

### Page shell

```html
<div class="nbs-container py-8">
  <header class="nbs-page-header">
    <h1 class="nbs-page-title">Title</h1>
    <p class="nbs-page-lead">Description</p>
  </header>
</div>
```

### Async loading pattern

```typescript
import { AsyncState, idleState, loadingState, successState, errorState } from '@app/shared/models/async-state.model';
```

### Brand colors (Tailwind)

- Primary: `nbs-primary` (`#0272a7`)
- Gold accent: `nbs-highlight` (`#edc91e`) — headings only
- Teal: `nbs-accent` (`#219f94`)
- States: `nbs-success`, `nbs-warning`, `nbs-info`, `nbs-danger`

### Cursor AI

[`.cursor/rules/nbs-design-system.mdc`](../../../.cursor/rules/nbs-design-system.mdc) applies when editing `src/**`.
