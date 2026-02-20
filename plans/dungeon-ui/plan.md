# BloodTracker Dungeon UI — Implementation Plan

## Status: READY FOR REVIEW
## Date: 2026-02-14
## Scope: Phase 1 MVP (TZ sections 1-6, 10, 12 + 7 Design Decisions)

---

## Context

- **TZ:** `wwwroot/docs/TZ_DUNGEON_UI.md` (v1.1, 1305 lines)
- **Codebase Audit:** `plans/dungeon-ui/reports/2026-02-14-codebase-audit.md`
- **Design Decisions:** 7 decisions resolving audit questions (user-provided)
- **Visual Reference:** Asciipocalypse (wonrzrzeczny/Asciipocalypse)

## Architecture Summary

Replace flat tab navigation with CSS perspective 3D dungeon hall. User stands in a stone corridor, clicks doors to enter rooms (existing page content). All business logic, reactive state, modals, API layer — unchanged. Only the navigation wrapper changes.

```
BEFORE:  [header+nav] → click tab → show/hide .page div
AFTER:   [3D hall]     → click door → camera animation → show room content → [BACK] → hall
```

## Phase Overview

| # | Phase | Files | Depends On | Status |
|---|-------|-------|------------|--------|
| 1 | [Foundation & Engine](phase-01-foundation.md) | 3 new TS, 2 new CSS | — | Pending |
| 2 | [Viewport & Walls](phase-02-viewport-walls.md) | 2 CSS, 1 TS | Phase 1 | Pending |
| 3 | [Doors & Signposts](phase-03-doors-signposts.md) | 1 CSS, 1 TS | Phase 2 | Pending |
| 4 | [Room Transitions](phase-04-room-transitions.md) | 1 CSS, 1 TS | Phase 3 | Pending |
| 5 | [Content Adaptation](phase-05-content-adaptation.md) | modify HTML+main.ts | Phase 4 | Pending |
| 6 | [Login Gate](phase-06-login-gate.md) | 1 TS, 1 CSS, modify login.ts | Phase 1 | Pending |
| 7 | [Decorations & Interactions](phase-07-decorations.md) | 4 TS, 4 CSS | Phase 5 | Pending |
| 8 | [Dungeon Map](phase-08-dungeon-map.md) | 1 TS, 1 CSS | Phase 5 | Pending |

## Critical Path

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
                                           ↓
Phase 6 (parallel, independent of 2-5)  Phase 7, Phase 8 (parallel)
```

## File Inventory

### New Files (19 total)
```
wwwroot/js/dungeon/
├── dungeonEngine.ts          Phase 1 — core engine, state, init
├── wallGenerator.ts          Phase 2 — procedural brick wall ASCII
├── doorInteraction.ts        Phase 3 — door hover/click/animation
├── cameraController.ts       Phase 4 — camera translateZ, transitions
├── roomManager.ts            Phase 4 — load/unload room content
├── dungeonGate.ts            Phase 6 — login gate page logic
├── dungeonMap.ts             Phase 8 — minimap + fullmap
├── floorRunes.ts             Phase 7 — quick action runes
└── secretStone.ts            Phase 7 — admin hidden door

wwwroot/css/dungeon/
├── viewport.css              Phase 1 — perspective container, 3D transforms
├── engine.css                Phase 1 — base dungeon styles, ASCII font config
├── walls.css                 Phase 2 — brick textures, defects, windows
├── doors.css                 Phase 3 — door frames, signposts, hover states
├── transitions.css           Phase 4 — enter/exit room keyframes
├── rooms.css                 Phase 5 — room content wrappers
├── gate.css                  Phase 6 — login gate ворота
├── map.css                   Phase 8 — minimap + fullmap overlay
├── runes.css                 Phase 7 — floor runes, torch picker
└── secrets.css               Phase 7 — admin stone, crack animation
```

### Modified Files (5 total)
```
wwwroot/index.html            Phase 5 — restructure header→hall, wrap pages→rooms
wwwroot/js/main.ts            Phase 5 — replace initNavigation→initDungeon
wwwroot/js/components/navigation.ts  Phase 5 — deprecated (replaced by dungeonEngine)
wwwroot/js/pages/login.ts     Phase 6 — add gate animation after auth
wwwroot/css/effects.css       Phase 7 — torch styles adapted for wall placement
```

## Key Constraints

- Vanilla TypeScript + CSS only (no React/Vue/Three.js)
- CSS `perspective` + `transform-style: preserve-3d` for 3D (not WebGL)
- Existing WebGL shaders (shaderBg, shaderPost) continue unchanged
- All overlay effects (vignette, noise, flicker) stay at current z-indices
- All modals work unchanged (they sit above room content)
- Reactive state system untouched — only DOM structure changes
- Mobile: simplified vertical door list, no perspective (TZ section 9)
