#!/usr/bin/env bash
# Create GitHub issues from docs/github-issues-backlog.md
# Requires: gh CLI (brew install gh) and gh auth login

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  echo "  brew install gh"
  echo "  gh auth login"
  echo ""
  echo "Or create issues manually from: docs/github-issues-backlog.md"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run: gh auth login"
  exit 1
fi

create_issue() {
  local title="$1"
  local body="$2"
  local labels="${3:-}"

  echo "Creating: $title"
  if [[ -n "$labels" ]]; then
    gh issue create --title "$title" --body "$body" --label "$labels"
  else
    gh issue create --title "$title" --body "$body"
  fi
}

# --- Epics: API integration ---
create_issue "[Epic] Backend API integration — Discovery & datasets" "$(cat <<'EOF'
Replace in-memory mock data in `DatasetService` with the NBS SmartData Hub REST API.

**Current:** `mock-datasets.ts`, routes `/datasets`, `/datasets/:id`, `/topics/:slug`
**RTM:** SRS 5.4, 5.1 keyword search

## Tasks
- [ ] DTOs aligned with backend OpenAPI
- [ ] GET datasets with filters, GET by id, GET by topic
- [ ] Error/loading states via `PageStateComponent`
- [ ] Gate mocks behind `environment.useMockData`

## Acceptance
Catalog, detail, and topic pages load from API in staging.
EOF
)" "epic,backend,priority:high"

create_issue "[Epic] Backend API integration — Smart search (SRS 5.1)" "$(cat <<'EOF'
Connect smart search and header/home search to the real NLP/search service.

**Current:** `SmartSearchService` (mock), `/search`, `?q=`
**RTM:** SRS 5.1

## Tasks
- [ ] Search API contract and response mapping
- [ ] Debounce/cancel in-flight requests
- [ ] Empty and error states

## Acceptance
Natural-language queries return ranked datasets from backend.
EOF
)" "epic,backend,ai"

create_issue "[Epic] Backend API integration — Explore & visualization (SRS 5.3)" "$(cat <<'EOF'
Replace mock indicators with live statistics API for Chart.js dashboards.

**Current:** `ExploreDataService`, `/explore`
**RTM:** SRS 5.3

## Tasks
- [ ] Indicator catalog and time series API
- [ ] Regional data API
- [ ] Deep-link `?indicator=` from dataset detail

## Acceptance
Explore charts render from API data.
EOF
)" "epic,backend,charts"

create_issue "[Epic] Backend API integration — Download & export (SRS 5.7)" "$(cat <<'EOF'
Wire `DatasetExportService` to backend export endpoints (CSV, JSON, XLSX, SDMX, PDF).

**Current:** Client-side mock export on dataset detail

## Acceptance
Users download supported formats; failures show clear messages.
EOF
)" "epic,backend,access"

create_issue "[Epic] Backend API integration — Developer API portal (SRS 5.2)" "$(cat <<'EOF'
Connect `/developers` to unified API gateway: keys, OpenAPI docs, try-it console.

**Current:** `DeveloperApiService` (mock)

## Acceptance
Members create/revoke keys; try-it returns real API responses.
EOF
)" "epic,backend,developers"

create_issue "[Epic] Backend API integration — User accounts (SRS 5.8)" "$(cat <<'EOF'
Persist profile, preferences, saved datasets, and saved queries.

**Current:** `AccountService` in-memory, `/account`

## Acceptance
User data survives refresh and works across devices.
EOF
)" "epic,backend,auth"

create_issue "[Epic] Backend API integration — Admin analytics & metadata (SRS 5.9)" "$(cat <<'EOF'
Wire admin dashboard to analytics API and metadata publish workflow.

**Current:** `AdminAnalyticsService` mock, `DatasetService.updateMetadata`

## Acceptance
Live KPIs; metadata changes publish to public catalog.
EOF
)" "epic,backend,admin"

create_issue "[Epic] Production authentication (replace demo login)" "$(cat <<'EOF'
Replace demo login (`admin`/`member`, `mkulima90`) with NBS IdP (OAuth2/OIDC/SAML).

## Tasks
- [ ] Token storage and refresh
- [ ] HTTP interceptor for Authorization
- [ ] Role mapping to `UserRole`
- [ ] Remove demo credentials from production builds

## Acceptance
Protected routes use server-validated roles.
EOF
)" "epic,auth,security,priority:high"

# --- UX ---
create_issue "Mobile-friendly portal audit (SRS 5.5)" "$(cat <<'EOF'
Complete responsive UX pass per SRS 5.5 (RTM: In progress).

## Tasks
- [ ] Test 320–1024px breakpoints
- [ ] Datasets table on mobile
- [ ] Explore charts/map on small screens
- [ ] Touch targets ≥ 44px

## Acceptance
Core journeys work on mobile without horizontal scroll.
EOF
)" "ux,mobile,priority:medium"

create_issue "Navigation visibility for anonymous users" "$(cat <<'EOF'
Define navbar policy when logged out (public nav vs minimal vs hidden).

**Current:** Public links visible; My hub/Admin hidden.

## Tasks
- [ ] Stakeholder decision (A/B/C)
- [ ] Update `header-nav.config.ts` + mobile nav

## Acceptance
Matches approved NBS policy; sign-in remains discoverable.
EOF
)" "ux,auth"

create_issue "Home page — content & branding polish" "$(cat <<'EOF'
Second-pass polish on `HomePageComponent`: NBS copy, featured datasets, trust indicators.

## Acceptance
Copy approved; page serves citizens, researchers, and developers.
EOF
)" "ux,good first issue"

create_issue "Global error and empty states" "$(cat <<'EOF'
Standardize loading/empty/error UX with `PageStateComponent`.

## Tasks
- [ ] 404 for unknown dataset ids
- [ ] API retry messaging
- [ ] Empty catalog/search states
EOF
)" "ux,quality"

# --- Quality & DevOps ---
create_issue "Unit tests for core services and guards" "$(cat <<'EOF'
Add Jasmine tests for AuthService, guards, DatasetService, SmartSearchService, shared UI.

## Acceptance
`ng test` passes in CI with agreed coverage threshold.
EOF
)" "testing,quality"

create_issue "E2E smoke tests for primary user journeys" "$(cat <<'EOF'
E2E: browse datasets → detail, smart search, login → account, admin dashboard (staging).

## Acceptance
E2E runs on PR or nightly.
EOF
)" "testing,e2e"

create_issue "CI/CD pipeline for frontend" "$(cat <<'EOF'
GitHub Actions: install, lint, test, build on PR and main; optional staging deploy.

## Acceptance
PRs require green checks before merge.
EOF
)" "devops,ci"

create_issue "Environment and configuration management" "$(cat <<'EOF'
Staging env file, `useMockData` flag, README for env switching.

## Acceptance
Run against mock or staging API with one config switch.
EOF
)" "devops,config"

create_issue "Accessibility audit (WCAG 2.1 AA target)" "$(cat <<'EOF'
Keyboard nav, form errors, chart alternatives, contrast, optional axe in CI.

## Acceptance
No critical violations on home, datasets, search, login.
EOF
)" "a11y,quality"

create_issue "Dataset recommendations — live ML service (SRS 5.6)" "$(cat <<'EOF'
Connect `RecommendedDatasetsComponent` to recommendation API with graceful fallback.

## Acceptance
Detail page recommendations from live service.
EOF
)" "backend,ai"

create_issue "Add GitHub issue templates and PR template" "$(cat <<'EOF'
Add `.github/ISSUE_TEMPLATE/` (bug, feature, API integration) and PR template.
EOF
)" "documentation,good first issue"

create_issue "Update README for contributors" "$(cat <<'EOF'
Document setup, scripts, path aliases, SRS/RTM links, branch strategy, demo login (dev only).

## Acceptance
New developer runs app in < 15 minutes from README.
EOF
)" "documentation,good first issue"

echo ""
echo "Done. View issues: $(gh repo view --json url -q .url)/issues"
