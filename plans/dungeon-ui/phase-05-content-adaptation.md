# Phase 5: Content Adaptation (Integration)

## Priority: CRITICAL (this is the switchover)
## Status: Pending
## Depends On: Phase 4

---

## Overview

Replace the current header+nav with the dungeon viewport. Wrap existing `.page` containers as room content. This is the switchover phase where the old navigation dies and the dungeon goes live.

## Key Insights

- Current `<header>` contains: ASCII art logo, skeleton strip, `<nav>` with 8 buttons
- Current `.page` divs contain ALL actual content — they stay as-is
- `initNavigation()` in main.ts is a 59-line function — replaced by `initDungeon()`
- Color picker, user info bar, modals — all stay outside dungeon viewport
- ASCII header + skeletons → move into hall wall relief (Design Decision 1)

## Strategy: Additive, Not Destructive

**Do NOT delete the old nav code.** Instead:
1. Add `dungeonEngine` initialization alongside `initNavigation()`
2. Use a feature flag (`localStorage.getItem('dungeon-ui')`) to switch between old/new
3. Once stable, remove old code in a separate cleanup commit

## Related Code Files

### Modify
- `wwwroot/index.html` — add dungeon viewport container, restructure header
- `wwwroot/js/main.ts` — add dungeon init, feature flag
- `wwwroot/css/dungeon/rooms.css` — room content wrapper styles (NEW)

### Deprecate (not delete yet)
- `wwwroot/js/components/navigation.ts` — replaced by dungeonEngine

## Implementation Steps

### Step 1: Add dungeon viewport to index.html

Insert BEFORE the existing `<header>` block:

```html
<!-- DUNGEON VIEWPORT (new navigation system) -->
<div class="dungeon-viewport" id="dungeon-viewport" style="display:none">
    <!-- DungeonEngine builds hall + walls + doors here dynamically -->
</div>
```

The viewport starts hidden. `initDungeon()` shows it and hides old header.

### Step 2: Create room CSS

**File: `wwwroot/css/dungeon/rooms.css`**

```css
/* Room content inherits existing .page styles */
.page.room-content {
    position: fixed;
    inset: 0;
    z-index: 20;
    overflow-y: auto;
    padding: 20px;
    background: var(--bg-primary);
    /* Existing .page padding/font preserved */
}

/* Room theme classes (Phase 2+ polish) */
.room-throne   { /* Dashboard — regal lighting */ }
.room-lab      { /* Analyses — green/blue alchemy glow */ }
.room-alchemy  { /* Course — warm potion tones */ }
.room-mirrors  { /* Compare — reflective accent */ }
.room-arena    { /* Workouts — iron/chain accent */ }
.room-library  { /* Encyclopedia — parchment tones */ }
.room-workshop { /* ASCII Studio — tool/craft accent */ }
.room-secret   { /* Admin — dark purple */ }

/* Room header — replaces .card-header for room context */
.room-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
}

.room-header .room-icon {
    font-size: 24px;
    opacity: 0.8;
}
```

### Step 3: Modify main.ts

```typescript
// Add imports at top
import { initDungeon, getDungeon } from './dungeon/dungeonEngine.js'

// In init() function, REPLACE:
//   initNavigation()
// WITH:
const useDungeon = localStorage.getItem('dungeon-ui') !== 'off'
if (useDungeon) {
    const appEl = document.querySelector('.app') as HTMLElement
    const dungeonVp = document.getElementById('dungeon-viewport')
    if (appEl && dungeonVp) {
        // Hide old header+nav
        const header = appEl.querySelector('header')
        if (header) header.style.display = 'none'
        // Show dungeon viewport
        dungeonVp.style.display = ''
        // Initialize dungeon engine
        initDungeon(appEl)
    }
} else {
    // Fallback to old navigation
    initNavigation()
}
```

### Step 4: Add CSS imports to main.ts

```typescript
// Add after existing CSS imports
import '../css/dungeon/engine.css'
import '../css/dungeon/viewport.css'
import '../css/dungeon/walls.css'
import '../css/dungeon/doors.css'
import '../css/dungeon/transitions.css'
import '../css/dungeon/rooms.css'
```

### Step 5: Handle page-specific initialization

Some pages need re-initialization when shown (charts, etc.):

```typescript
// In roomManager.showRoom()
switch (roomId) {
    case 'dashboard':
        // Trigger dashboard chart resize
        window.dispatchEvent(new Event('resize'))
        break
    case 'workouts':
        // Muscle ASCII may need recalc
        break
    case 'analyses':
        // Trend chart may need resize
        break
}
```

### Step 6: Handle the existing .page.active logic

Currently: `.page.active { display: block }`, all others `display: none`.
In dungeon mode: `.page` elements are shown/hidden by `roomManager.showRoom()`, not by nav click.

Need to ensure:
- On init, remove `.active` from all pages (no page visible in hall view)
- `showRoom()` adds `.active`
- `hideRoom()` removes `.active`
- Existing `subscribe()` callbacks still work because they reference elements by ID

### Step 7: Move ASCII header to wall relief

The ASCII logo + skeleton strip from `<header>` gets repositioned:
- In dungeon mode: rendered as a `<pre>` element positioned on `.wall-back`
- CSS: `position: absolute; top: 10%; left: 50%; transform: translateX(-50%)`
- The `scaleAsciiSkull()` function continues working — it scales to container width
- Container is now the wall face instead of the header

### Step 8: Feature flag toggle

Add to color picker panel (or console command):
```typescript
// Quick toggle for development
window.toggleDungeonUI = () => {
    const current = localStorage.getItem('dungeon-ui')
    localStorage.setItem('dungeon-ui', current === 'off' ? 'on' : 'off')
    location.reload()
}
```

## Todo List

- [ ] Add `<div class="dungeon-viewport">` to index.html
- [ ] Create `rooms.css` with room-content positioning and theme classes
- [ ] Modify `main.ts` — add dungeon imports, feature flag, initDungeon call
- [ ] Handle `.page.active` — deactivate all pages when in hall view
- [ ] Move ASCII header + skull strip rendering to wall relief
- [ ] Add `window.toggleDungeonUI` dev toggle
- [ ] Test: all 7 non-admin rooms accessible via doors
- [ ] Test: all existing page content works inside rooms (forms, charts, modals)
- [ ] Test: reactive state updates still render correctly in rooms
- [ ] Test: feature flag OFF → old nav works exactly as before
- [ ] Test: mobile → simplified door list, no perspective

## Success Criteria

- Dungeon hall visible after login (instead of header + nav tabs)
- All 7 rooms accessible via door clicks
- All existing functionality works inside rooms:
    - Dashboard: stat cards, donut chart, drug cards, alerts
    - Course: tabs, forms, intake log table
    - Analyses: analysis selector, trend chart, PDF import
    - Compare: dual dropdown, comparison table
    - Workouts: 5-panel drill-down, muscle ASCII
    - Encyclopedia: search, grid, manufacturer tabs
    - ASCII Studio: canvas, controls
- Feature flag `dungeon-ui=off` → old navigation works perfectly
- No JavaScript errors in console
- ApexCharts render correctly inside rooms (resize event fires)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Charts don't render in room | Medium | High | Fire resize event on room enter |
| Modals break (z-index) | Low | High | Modals are at `.app` level, above rooms |
| reactive subscriptions fail | Low | Critical | subscriptions use element IDs, not position |
| Old nav styles leak into dungeon | Medium | Low | Scope dungeon styles under `.dungeon-viewport` |
