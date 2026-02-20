
# Research Report: BloodTracker Frontend Codebase Audit for Dungeon UI Rebuild

## Executive Summary

The current BloodTracker frontend is a **single-page app** with tab-based navigation (8 `.page` divs toggled via `.active` class). The navigation system (`navigation.ts`) is trivially simple — 59 lines that toggle CSS classes. The page content is 100% static HTML in `index.html` (~1028 lines). Effects are layered: CSS overlays (flicker, vignette, noise, scanlines), WebGL shaders (background + post-processing), ASCII torches (fixed-position DOM), matrix runes (canvas), and decorative runes (DOM). **No CSS perspective/3D transforms exist anywhere in the app** except a subtle `distortion-effect` class that's unused. The rebuild requires replacing the flat tab navigation with a 3D dungeon hall, but all page content and business logic can remain unchanged — only the navigation wrapper and transition system need replacing.

## Key Findings

### 1. Navigation System (navigation.ts — 59 lines)

**Dead simple toggle mechanism:**
```typescript
// Click handler: remove .active from all nav-btns and .pages, add to clicked
btn.classList.add('active')
document.getElementById(pageId).classList.add('active')
```

- 8 nav buttons in `<nav>` inside `<header>` → 8 `.page` divs
- Pages: dashboard, course, analyses, compare, workouts, encyclopedia, ascii-studio, admin
- Tab system: `.tab` buttons inside pages toggle `.tab-content` (used in course, analyses modals)
- ESC key closes modals, click-on-backdrop closes modals
- **No animations, no transitions, no state tracking** — pure class toggle

**Impact for dungeon UI:** `initNavigation()` gets completely replaced by `DungeonEngine`. The nav buttons become door signposts. The `.page` containers become room content.

### 2. Page Loading Mechanism

**All HTML is pre-rendered in index.html.** No lazy loading of page content, no dynamic HTML injection for pages.

Load sequence in `init()`:
1. Auth gate (show login or reveal `.app`)
2. `loadSavedColor()` — theme color from localStorage
3. `loadReferenceRanges()` → `loadAnalyses()` → `loadDrugs()` → `loadIntakeLogs()` → `loadDashboard()`
4. `initNavigation()` — attach click handlers
5. `initCourseTabs()`, `initAsciiArtUI()`, `initEncyclopedia()`
6. Visual effects: runes, matrix runes, progress bar, font, asciify, sparks

**Reactive state** (`reactive.ts`) uses Proxy-based fine-grained reactivity with batched microtask updates. State changes trigger `subscribe()` callbacks that re-render specific DOM sections. This is completely decoupled from navigation — **zero impact from dungeon UI**.

### 3. Existing CSS 3D / Perspective Usage

**NONE.** Zero `perspective`, `transform-style: preserve-3d`, or `translateZ` in any CSS file.

The only 3D-ish CSS:
- `.distortion-effect` in effects.css: `perspective(1000px) rotateX(0.5deg)` — unused decorative class
- `.nav-btn` uses `::before`/`::after` pseudo-elements for `╔═══╗` / `╚═══╝` box-drawing borders

**This means the dungeon viewport is entirely NEW code — no conflicts with existing styles.**

### 4. Current Effects Architecture (Layering)

```
z-index stack (bottom to top):
  -1    shader-bg canvas (WebGL dungeon background)
   1    matrix-runes canvas (falling green chars)
   2    .crt::before (scanline gradient)
  10    .app container (all content)
  50    .rune decorative elements (8 fixed-pos divs)
 100    .torch elements (2 fixed-pos, left+right)
1000    .scanline-move::after (moving scanline bar)
9990    shader-post canvas (CRT overlay - from memory, not in CSS)
9997    .noise-overlay (SVG turbulence noise)
9998    .vignette-overlay (radial gradient)
9999    .flicker-overlay (opacity animation)
```

Key observations:
- Torches are OUTSIDE `.app` — fixed to body, hardcoded left:15px / right:15px
- Overlays (flicker, vignette, noise) are OUTSIDE `.app` — fixed to body
- Matrix runes canvas is OUTSIDE `.app` — fixed to body
- Shader canvases are OUTSIDE `.app` — fixed to body
- `.app` is z-index:10, centered 1400px max-width container

**For dungeon UI:** All overlay effects (z:9997-9999) STAY as-is above everything. Torches need to become part of dungeon walls instead of fixed screen position. Matrix runes and shader-bg continue unchanged.

### 5. HTML Structure (index.html — 1028 lines)

```html
<body class="crt">
  <!-- Fixed overlays (outside .app) -->
  <div class="flicker-overlay"></div>
  <div class="vignette-overlay"></div>
  <div class="noise-overlay"></div>
  <div class="ascii-progress-bar"></div>
  <div class="torch torch-left">...</div>
  <div class="torch torch-right">...</div>

  <!-- Main app container -->
  <div class="app crt-text scanline-move auth-hidden">
    <header>
      <!-- ASCII art header block -->
      <!-- <nav> with 8 .nav-btn buttons -->
    </header>

    <!-- Color picker panel -->
    <!-- User info bar -->

    <!-- 8 PAGE CONTAINERS -->
    <div class="page active" id="dashboard">...</div>
    <div class="page" id="course">...</div>
    <div class="page" id="analyses">...</div>
    <div class="page" id="compare">...</div>
    <div class="page" id="workouts">...</div>
    <div class="page" id="encyclopedia">...</div>
    <div class="page" id="ascii-studio">...</div>
    <div class="page" id="admin">...</div>
  </div>

  <!-- 8 MODAL OVERLAYS (outside pages, inside .app) -->
  <!-- Research modal -->
  <!-- Scripts -->
```

### 6. CSS Architecture (18 files, Vite-bundled)

```
variables.css  — Design tokens (colors, spacing, typography, shadows, z-index)
base.css       — Reset, body, scrollbar
animations.css — Keyframe definitions
layout.css     — Header, nav, .page, .app container, responsive breakpoints
effects.css    — Torch, rune, CRT, glitch, vignette, noise, bloom, scanline
components.css — .nav-btn, .card, .btn, .form-*, .quick-actions, .stat-*
tables.css     — Table styles, responsive wrappers
modals.css     — Modal overlay/content
toast.css      — Toast notifications
skeleton.css   — Loading skeletons
ascii-engine.css — ASCII art studio
asciify.css    — ASCIIfy text renderer
auth.css       — Login page
admin.css      — Admin panel
catalog.css    — Encyclopedia/catalog
mobile.css     — Mobile-specific overrides
offline.css    — Offline indicator
ascii-art.css  — ASCII skull header art
```

### 7. WebGL Shader System (shaderEngine.ts + shaderBg.ts)

- `ShaderEngine` base: fullscreen quad, iTime/iResolution/uColor uniforms, mobile DPR cap, FPS throttle
- `shaderBg`: z-index 0, procedural fog/stone/torch glow
- `shaderPost`: z-index 9990, CRT scanlines/barrel distortion/phosphor grid (from memory)
- Toggle: localStorage `bloodtracker-shaders`, `.shader-bg-active` / `.shader-post-active` classes on body

**These are fully independent of app content and will coexist with dungeon UI without changes.**

## Architecture Impact Assessment

### What STAYS unchanged:
- All 8 page contents (dashboard, course, analyses, etc.)
- All modals (8 modal overlays)
- Reactive state system (state.ts + reactive.ts)
- API layer (api.ts + endpoints.ts)
- Auth system (auth.ts + login.ts)
- All effect overlays (vignette, noise, flicker, scanlines)
- WebGL shaders (shaderBg, shaderPost)
- Toast, skeleton, trend chart systems
- Color picker, font picker, asciify
- Service worker + offline support

### What gets REPLACED:
- `navigation.ts` → `dungeonEngine.ts` (complete rewrite)
- `<header>` with `<nav>` → dungeon hall viewport
- `.page` show/hide → room enter/exit with 3D transitions
- Fixed torch positions → dungeon wall torches
- Matrix runes → may integrate into dungeon walls

### What gets ADDED:
- `css/dungeon/` — 6 new CSS files (viewport, walls, doors, rooms, transitions, windows)
- `css/rooms/` — 7 room-specific CSS files
- `js/dungeon/` — 5 new TS files (engine, camera, doors, walls, rooms)
- Procedural brick wall generation
- CSS perspective viewport
- Door interaction system
- Room transition animations
- Mobile simplified dungeon view

### What gets MODIFIED:
- `index.html` — header replaced with dungeon viewport, pages wrapped in room containers
- `main.ts` — `initNavigation()` → `initDungeon()`, torch init changes
- `layout.css` — header/nav styles become dungeon-compatible
- `effects.css` — torch styles adapted for in-wall placement

## Unresolved Questions

1. **Header ASCII art + skull strip** — keep above dungeon? Remove? Move into throne room?
2. **Color picker panel** — floating over dungeon hall? Or integrated into a wall element?
3. **User info bar** — where does it go in dungeon context?
4. **Quick actions bar** (on dashboard) — these are currently page-level, not nav-level
5. **Login page** — does it also get dungeon treatment or stays as-is?
6. **Admin nav button** (conditionally shown) — how does the "hidden door" work?
