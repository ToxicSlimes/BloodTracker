# BloodTracker E2E Tests

## Prerequisites
- Node.js 18+
- BloodTracker running at `http://localhost:5000`

## Setup
```bash
npm install
npx playwright install chromium
```

## Run Tests
```bash
# All tests
npx playwright test

# Specific file
npx playwright test tests/e2e/encyclopedia.spec.js

# Specific project (device)
npx playwright test --project="Desktop Chrome"
npx playwright test --project="Mobile Chrome"

# With UI
npx playwright test --ui

# List reporter
npx playwright test --reporter=list

# Debug mode
npx playwright test --debug
```

## Test Files
| File | Description |
|------|-------------|
| `encyclopedia.spec.js` | Encyclopedia page: tabs, search, cards, research modal |
| `navigation.spec.js` | Nav links, headers, back/forward, active state |
| `responsive.spec.js` | Layout at desktop/mobile/tablet, overflow checks |
| `screenshots.spec.js` | Baseline screenshots for visual regression |
| `pwa.spec.js` | Service worker, manifest, offline fallback |

## Screenshots
Baseline screenshots are saved to `tests/e2e/screenshots/`.
Run screenshot tests to generate: `npx playwright test tests/e2e/screenshots.spec.js`

## Notes
- Tests don't require auth (public pages only)
- If server is not running, tests will fail with connection errors
- Auth-required pages are skipped with `test.skip`
