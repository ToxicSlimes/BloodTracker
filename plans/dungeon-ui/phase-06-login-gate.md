# Phase 6: Login Gate Page

## Priority: HIGH
## Status: Pending
## Depends On: Phase 1 (can run in parallel with Phases 2-5)

---

## Overview

Transform the login page into a dungeon gate — massive stone doors at the end of a dark tunnel. After successful auth, gates open with a cinematic animation and the user enters the main hall. This is the first impression of the app.

## Key Insights

- Current login: `showLoginPage()` creates a `#login-overlay` with auth form
- Current login has dungeon-themed ASCII art already (auth.css styles)
- Design Decision 5: tunnel → gates → keyhole inputs → bolt button → gate opening animation
- Auth methods: Google OAuth + Email magic code (6-digit OTP) — forms stay standard `<input>`
- Gate animation runs AFTER successful auth, BEFORE hall appears

## Architecture

```
dungeonGate.ts
├── createGateScene(): HTMLElement        — build tunnel + gate DOM
├── integrateLoginForm(gateEl): void      — move existing form into gate
├── playGateOpenAnimation(): Promise<void> — 1.5s cinematic: torches → gates split → light → enter
└── destroyGate(): void                    — remove gate scene after animation
```

## Related Code Files

### Create
- `wwwroot/js/dungeon/dungeonGate.ts` — gate scene, animation
- `wwwroot/css/dungeon/gate.css` — tunnel, gate doors, animation keyframes

### Modify
- `wwwroot/js/pages/login.ts` — after auth success, call `playGateOpenAnimation()`

## Implementation Steps

### Step 1: Gate HTML structure

```typescript
function createGateScene(): HTMLElement {
    const scene = document.createElement('div')
    scene.id = 'dungeon-gate'
    scene.className = 'gate-scene'
    scene.innerHTML = `
        <div class="gate-tunnel">
            <pre class="gate-tunnel-wall gate-tunnel-left dungeon-ascii">${generateTunnelWall(30, 40)}</pre>
            <pre class="gate-tunnel-wall gate-tunnel-right dungeon-ascii">${generateTunnelWall(30, 40)}</pre>

            <div class="gate-header">
                <pre class="gate-title dungeon-ascii">
╔══════════════════════════╗
║    B L O O D T R A C K E R    ║
╚══════════════════════════╝</pre>
            </div>

            <div class="gate-torches">
                <div class="gate-torch gate-torch-left">🔥</div>
                <div class="gate-torch gate-torch-right">🔥</div>
            </div>

            <div class="gate-doors">
                <div class="gate-door gate-door-left">
                    <pre class="dungeon-ascii">${generateGateDoorArt('left')}</pre>
                </div>
                <div class="gate-door gate-door-right">
                    <pre class="dungeon-ascii">${generateGateDoorArt('right')}</pre>
                </div>
            </div>

            <div class="gate-form-area">
                <!-- Login form gets injected here -->
            </div>
        </div>
    `
    return scene
}
```

### Step 2: Gate CSS

**File: `wwwroot/css/dungeon/gate.css`**

```css
.gate-scene {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.gate-tunnel {
    position: relative;
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.gate-header {
    text-align: center;
    margin-bottom: 20px;
}

.gate-title {
    color: var(--primary-color);
    text-shadow:
        0 0 5px var(--primary-color),
        0 0 10px var(--primary-color);
    animation: gate-title-glow 3s ease-in-out infinite alternate;
}

.gate-doors {
    display: flex;
    width: 100%;
    overflow: hidden;
}

.gate-door {
    flex: 1;
    overflow: hidden;
    transition: transform 1.2s ease-in;
}

.gate-door pre {
    color: var(--door-iron);
    text-shadow: 0 0 3px rgba(74, 74, 80, 0.5);
}

/* Gate opening animation */
.gate-doors.opening .gate-door-left {
    transform: translateX(-100%);
}

.gate-doors.opening .gate-door-right {
    transform: translateX(100%);
}

/* Light burst from behind gates */
.gate-light-burst {
    position: absolute;
    inset: 0;
    background: radial-gradient(
        ellipse at center,
        rgba(255, 165, 0, 0.4) 0%,
        rgba(255, 100, 0, 0.2) 30%,
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.8s ease-in;
}

.gate-light-burst.active {
    opacity: 1;
}

/* Form integration — inputs styled as keyholes */
.gate-form-area {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 55;
    width: 80%;
    max-width: 320px;
}

.gate-form-area input[type="text"],
.gate-form-area input[type="email"],
.gate-form-area input[type="password"] {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid var(--door-iron);
    color: var(--primary-color);
    font-family: var(--ascii-font-family);
    padding: 12px;
    width: 100%;
    margin-bottom: 12px;
    text-shadow: 0 0 3px var(--primary-color);
}

.gate-form-area .btn {
    width: 100%;
    font-size: 16px;
    padding: 14px;
    text-transform: uppercase;
    letter-spacing: 3px;
}

.gate-torches {
    display: flex;
    justify-content: space-between;
    width: 100%;
    position: absolute;
    top: 20%;
}

.gate-torch {
    font-size: 32px;
    animation: flameSway 2s ease-in-out infinite alternate;
    filter: drop-shadow(0 0 20px rgba(255, 165, 0, 0.6));
}

@keyframes gate-title-glow {
    0%   { text-shadow: 0 0 5px var(--primary-color), 0 0 10px var(--primary-color); }
    100% { text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color); }
}

/* Fade entire gate scene out after opening */
@keyframes gate-fade-out {
    0%   { opacity: 1; }
    100% { opacity: 0; }
}

.gate-scene.exiting {
    animation: gate-fade-out 0.5s ease-in forwards;
    pointer-events: none;
}
```

### Step 3: Gate opening animation sequence

```typescript
export async function playGateOpenAnimation(): Promise<void> {
    const gate = document.getElementById('dungeon-gate')
    if (!gate) return

    // 1. Torches flare up (0.3s)
    const torches = gate.querySelectorAll('.gate-torch')
    torches.forEach(t => (t as HTMLElement).style.fontSize = '48px')
    await delay(300)

    // 2. Gates split open (1.2s)
    const doors = gate.querySelector('.gate-doors')
    doors?.classList.add('opening')

    // 3. Light burst from behind (0.5s after gates start)
    await delay(500)
    const light = document.createElement('div')
    light.className = 'gate-light-burst'
    gate.querySelector('.gate-tunnel')?.appendChild(light)
    requestAnimationFrame(() => light.classList.add('active'))

    // 4. Wait for gates to fully open
    await delay(700)

    // 5. Fade out entire gate scene (0.5s)
    gate.classList.add('exiting')
    await delay(500)

    // 6. Remove gate, reveal dungeon hall
    gate.remove()
}

function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
}
```

### Step 4: Integrate with login.ts

In `login.ts`, after successful auth:

```typescript
// Current code:
//   document.querySelector('.app')?.classList.remove('auth-hidden')
//   location.reload()  // or similar

// New code:
import { playGateOpenAnimation } from '../dungeon/dungeonGate.js'

// After successful login:
await playGateOpenAnimation()
document.querySelector('.app')?.classList.remove('auth-hidden')
// init() will handle dungeon setup from here
```

## Todo List

- [ ] Write `dungeonGate.ts` — gate scene creation, form integration, animation
- [ ] Write `gate.css` — tunnel, doors, torches, form styling, keyframes
- [ ] Generate gate door ASCII art (iron-style doors with studs/bolts)
- [ ] Modify `login.ts` — call gate animation after auth success
- [ ] Test Google OAuth flow → gate animation → hall
- [ ] Test email magic code flow → gate animation → hall
- [ ] Test gate on mobile (simplified: doors just fade, no split animation)
- [ ] Ensure password managers work with gate-wrapped inputs

## Success Criteria

- Login page shows stone tunnel with gates, torches, and form
- Existing auth methods (Google OAuth, email code) work unchanged
- After auth: gates open → light burst → fade → dungeon hall appears
- Total animation duration: ~2s
- Password managers auto-fill works
- Mobile: simplified gate animation (fade instead of split)
