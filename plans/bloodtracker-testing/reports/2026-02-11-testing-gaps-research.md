# Research Report: BloodTracker Testing Gaps & Untested User Flows

## Executive Summary

Current test coverage is **~40%** (138 tests across 2 suites). The purchase/intake tracking and encyclopedia catalog are well-covered, but **three entire features have ZERO test coverage**: Analyses (blood tests), Workouts, and Admin Panel. JWT security has surface-level testing only. Several classes of bugs common in health-tracking SPAs remain untested.

Research across industry sources reveals that the most commonly missed bugs in apps like ours fall into: **concurrent state mutations**, **session boundary errors**, **data visualization edge cases**, **LiteDB corruption under load**, and **JWT token lifecycle attacks**.

## Research Methodology
- Sources consulted: 30+ (web search results, GitHub issues, OWASP guides)
- Date range: 2024-2026
- Key terms: SPA testing edge cases, JWT vulnerabilities, LiteDB concurrency, health app testing, E2E beyond happy path

---

## Current Coverage Map

| Feature | Tests | Coverage |
|---------|-------|----------|
| Auth (email code) | 8 | 80% |
| Drug CRUD | 5 | 42% |
| Purchase tracking | 8 | 67% |
| Intake logs | 8 | 80% |
| Encyclopedia/Catalog | 12 | 100% |
| Data integrity | 5 | 100% |
| **Analyses (blood tests)** | **0** | **0%** |
| **Workouts** | **0** | **0%** |
| **Admin panel** | **0** | **0%** |
| **Course management** | **0** | **0%** |
| **Dashboard data** | **0** | **0%** |
| UI components | 4 | 27% |

---

## UNTESTED USER FLOWS

### 1. ANALYSES / BLOOD TESTS (Critical — Core Feature)

The entire analyses feature is untested. This is the app's PRIMARY purpose.

| Flow | Risk | Description |
|------|------|-------------|
| Create analysis manually | HIGH | Add blood test date + label + parameters |
| Edit analysis | HIGH | Modify values after creation |
| Delete analysis | HIGH | Remove with cascade to comparisons |
| PDF import + AI parsing | HIGH | Upload PDF → Gemini Vision OCR → auto-populate |
| Comparison (before/after) | MED | Select 2 analyses, show delta table |
| Trend charts | MED | ApexCharts line graph of parameter over time |
| Reference range alerts | MED | Out-of-range values highlighted |
| Parameter tooltips | LOW | Hover shows description from reference ranges |
| Analysis selector dropdowns | LOW | Populate on page load |

**Edge cases to test:**
- PDF with no recognizable parameters
- PDF in non-Russian language
- Duplicate parameter keys in one analysis
- Analysis with 0 parameters
- Comparison of analyses with different parameter sets
- Trend chart with single data point
- Trend chart with all values identical
- Reference range for parameter that doesn't exist
- Very large numeric values (e.g., 999999.99)
- Negative values in blood parameters

### 2. WORKOUTS (Complete Feature, Zero Tests)

| Flow | Risk | Description |
|------|------|-------------|
| Create workout program | HIGH | Name + description |
| Add workout day | HIGH | Day within program |
| Add exercise to day | HIGH | From exercise catalog |
| Record sets (reps/weight) | HIGH | Core tracking data |
| Delete program | MED | Cascade to days/exercises/sets |
| Delete day | MED | Cascade to exercises/sets |
| Duplicate day | MED | Deep copy with all exercises/sets |
| Duplicate exercise | MED | Copy with all sets |
| Exercise catalog search | LOW | Filter by muscle group |
| Muscle ASCII visualization | LOW | ASCII body diagram |

**Edge cases to test:**
- Program with 0 days
- Day with 0 exercises
- Exercise with 0 sets
- Set with weight=0 or reps=0
- Duplicate day/exercise generates unique IDs
- Delete middle day doesn't break ordering
- Very large weight values (9999 kg)
- Concurrent edits to same program

### 3. ADMIN PANEL (Privilege Escalation Risk)

| Flow | Risk | Description |
|------|------|-------------|
| List all users | HIGH | Admin-only endpoint |
| View user summary | MED | Aggregated stats per user |
| Toggle admin role | CRITICAL | Privilege escalation vector |
| Delete user | CRITICAL | Permanent data destruction |
| Impersonate user | CRITICAL | View data as another user |
| Stop impersonation | HIGH | Return to admin session |
| Admin stats | LOW | Registration trends, storage |

**Edge cases to test:**
- Non-admin user calling admin endpoints → 403
- Admin demoting themselves
- Deleting the last admin user
- Impersonating while already impersonating
- Impersonation token expiry (1hr)
- Admin actions during impersonation (should be blocked)
- Race condition: toggling admin while user is logged in

### 4. COURSE MANAGEMENT

| Flow | Risk | Description |
|------|------|-------------|
| Create course | HIGH | Title, dates, notes |
| Update course | HIGH | Modify active course |
| Course day calculation | MED | currentDay based on date diff |
| Course statistics tab | MED | Drug-specific stats |
| Consumption timeline | LOW | Chart data endpoint |
| Purchase vs consumption | LOW | Mixed chart data |

**Edge cases to test:**
- Course with end date before start date
- Course spanning DST change
- Overlapping courses
- Course with no drugs
- Statistics for drug with 0 intake logs
- Timeline with gaps (no activity for weeks)

### 5. DASHBOARD

| Flow | Risk | Description |
|------|------|-------------|
| Dashboard data load | MED | Active course + stats |
| Drug cards rendering | MED | Type badges, dosage display |
| Alerts (low stock) | MED | Threshold-based warnings |
| ASCII donut chart | LOW | Stock visualization |
| No active course state | MED | Dashboard with null course |

---

## CLASSES OF BUGS NOT YET TESTED

### A. JWT Security (Industry Research)

Based on [JWT Security 2025 research](https://securityboulevard.com/2025/06/jwt-security-in-2025-critical-vulnerabilities-every-b2b-saas-company-must-know/) and [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens):

| Attack Vector | Tested? | Description |
|---------------|---------|-------------|
| Token with `alg: none` | NO | Strip signature, set algorithm to none |
| Algorithm confusion (RS256→HS256) | NO | Use public key as HMAC secret |
| Expired token acceptance | NO | Send token with past `exp` |
| Modified claims (role escalation) | NO | Change `role: user` → `role: admin` in payload |
| Token reuse after logout | NO | Use old token after user logs out |
| Token without `exp` claim | NO | Craft token missing expiration |
| `kid` header injection | NO | SQL/path injection via key ID |
| `iss` array bypass | NO | `iss: ['attacker', 'legit']` |

### B. SPA State Management

Based on [common UI bugs research](https://birdeatsbug.com/blog/common-ui-bugs):

| Bug Class | Tested? | Description |
|-----------|---------|-------------|
| Stale state after API error | NO | Failed save leaves form in dirty state |
| Back/forward browser navigation | NO | SPA doesn't use pushState |
| Memory leak from ApexCharts | NO | Charts not destroyed on page switch |
| Multiple rapid page switches | NO | Race condition in async page loads |
| Form state preserved across modal reopen | PARTIAL | Only drug modal tested |
| localStorage quota exceeded | NO | ASCIIfy, color-picker, auth tokens |
| Token in localStorage (XSS exfiltration) | NO | If XSS exists, token is exposed |

### C. LiteDB Concurrency

Based on [LiteDB concurrency issues](https://github.com/mbdavid/LiteDB/issues/332) and [data corruption reports](https://github.com/mbdavid/LiteDB/issues/1245):

| Risk | Tested? | Description |
|------|---------|-------------|
| Concurrent writes from 2 users | NO | ReaderWriterLockSlim under load |
| Database file corruption on crash | NO | Journal write interrupted |
| Large document storage | NO | 10MB+ analysis data |
| Collection scan performance | NO | No indexes on new collections? |
| Per-user DB file creation race | NO | Two logins for new user simultaneously |

### D. Health Data Validation

Based on [healthcare app testing best practices](https://testgrid.io/blog/healthcare-application-testing/):

| Validation | Tested? | Description |
|------------|---------|-------------|
| Blood parameter range validation | NO | Hemoglobin=999? Testosterone=-5? |
| Unit consistency | NO | mg/dL vs mmol/L confusion |
| Date format across locales | NO | DD/MM vs MM/DD |
| Decimal precision | NO | 3.14159 vs 3.1 |
| Parameter key uniqueness | NO | Duplicate keys in one analysis |

---

## RECOMMENDED TEST PLAN

### Phase 1: Critical Gaps (50+ tests)

**e2e-analyses.mjs** — Blood test feature:
- CRUD operations (create, read, update, delete)
- PDF import (mock file, verify parsing)
- Comparison table rendering
- Trend chart data correctness
- Reference range alert indicators
- Parameter edge cases (extreme values, missing data)

**e2e-workouts.mjs** — Workout feature:
- Full CRUD chain: program → day → exercise → set
- Duplicate operations
- Cascade deletions
- Catalog search and filtering
- Edge cases (empty programs, zero-weight sets)

**e2e-admin.mjs** — Admin panel:
- Authorization (403 for non-admin)
- User listing and summary
- Role toggling
- User deletion (verify cascade)
- Impersonation flow (start → verify data → stop)
- Self-demotion protection

### Phase 2: Security Hardening (20+ tests)

**e2e-jwt-security.mjs**:
- Tampered token (modified payload)
- Expired token rejection
- Token without signature
- Algorithm none attack
- Role claim manipulation
- Token reuse after logout (if logout exists)

### Phase 3: Stress & Edge Cases (20+ tests)

**e2e-stress.mjs**:
- Rapid form submissions
- Large data payloads
- Concurrent API calls
- Chart rendering with extreme datasets
- LocalStorage limits
- Session expiry during form fill

---

## Resources & References

### JWT Security
- [JWT Security 2025 - Security Boulevard](https://securityboulevard.com/2025/06/jwt-security-in-2025-critical-vulnerabilities-every-b2b-saas-company-must-know/)
- [JWT Attacks - PortSwigger](https://portswigger.net/web-security/jwt)
- [JWT Vulnerabilities 2026 - Red Sentry](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide)
- [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)
- [Never-Expiring JWT Dangers - Akamai](https://www.akamai.com/blog/developers/the-dangers-of-the-never-expiring-jwt)

### Web App Testing
- [Common UI Bugs - Bird Eats Bug](https://birdeatsbug.com/blog/common-ui-bugs)
- [UI Testing Bugs - BrowserStack](https://www.browserstack.com/guide/bugs-in-ui-testing)
- [Edge Case Testing Explained - Virtuoso](https://www.virtuosoqa.com/post/edge-case-testing)
- [E2E Best Practices 2025 - Bunnyshell](https://www.bunnyshell.com/blog/best-practices-for-end-to-end-testing-in-2025/)

### LiteDB
- [LiteDB Concurrency Wiki](https://github.com/litedb-org/LiteDB/wiki/Concurrency)
- [Data Corruption Issue #1245](https://github.com/mbdavid/LiteDB/issues/1245)
- [Concurrency Issue #332](https://github.com/mbdavid/LiteDB/issues/332)

### Healthcare Testing
- [Healthcare App Testing - TestGrid](https://testgrid.io/blog/healthcare-application-testing/)
- [Healthcare Testing Guide - TestFort](https://testfort.com/blog/testing-healthcare-applications-step-by-step)
- [Healthcare Domain Testing - BrowserStack](https://www.browserstack.com/guide/healthcare-domain-testing)
