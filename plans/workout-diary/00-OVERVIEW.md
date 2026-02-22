# Workout Diary — Обзор и Архитектура
> BloodTracker — Дневник тренировок
> Версия: 3.0 | Дата: 2026-02-14
> Status: 📋 Planning (Enhanced with UX Research + Market Analysis)

---

## 📋 Содержание плана (по файлам)

| Файл | Фаза | Описание | Effort |
|------|-------|----------|--------|
| `00-OVERVIEW.md` | — | Обзор, архитектура, design system, UX principles | — |
| `01-PHASE-CORE.md` | Phase 1 | Domain, CQRS, API, UI, Wake Lock, Ghost Overlay, Undo, Summary Tables | 4-5 дня |
| `02-PHASE-ANALYTICS.md` | Phase 2 | PR detection (weight+rep), charts, Strength Standards, e1RM formulas, Period Comparison | 2-3 дня |
| `03-PHASE-ADVANCED.md` | Phase 3 | Timer, bodyweight, plate calc, supersets, **RPE-Drift Plateau Detection**, INOL, Auto-Progression | 3-4 дня |
| `04-PHASE-GAMIFICATION.md` | Phase 4 | Streaks + Shield, milestones, export, sharing | 1-2 дня |
| `05-PHASE-OFFLINE.md` | Phase 5 | IndexedDB, offline queue, sync, polish | 1-2 дня |
| `06-UX-DESIGN-GUIDE.md` | — | Design system, компоненты, accessibility, UX patterns | — |
| `07-UX-RESEARCH.md` | — | UX research: NNGroup, competitors, 25 borrowable ideas, Web APIs | — |
| `08-MARKET-DEEP-DIVE.md` | — | Deep market analysis: Strong/Hevy/Fitbod/JEFIT/PRPath/Gainz/Boostcamp | — |
| `09-PLAN-DELTA.md` | — | Change log: what was added/changed vs original plan | — |

**Итого: ~12-16 дней при фокусированной работе.**
> Phase 1 — must have. Phase 2-3 — should have. Phase 4-5 — nice to have.

## 🎯 Ключевые дифференциаторы (vs конкуренты)

| # | Фича | Кто ещё делает | Наше преимущество |
|---|------|---------------|-------------------|
| 1 | **RPE-Drift Plateau Detection** | Никто | Скрытое плато через рост RPE при стабильном весе |
| 2 | **Self-hosted, 100% бесплатно** | wger (Python) | .NET + LiteDB, dungeon theme, PWA |
| 3 | **Предрассчитанные агрегаты** | Hevy, Fitbod (SaaS) | O(log n) для графиков при 1000+ тренировок |
| 4 | **INOL monitoring** | Gainz (частично) | Real-time during workout, not just post-analysis |
| 5 | **Rep-PR tracking** | StrengthLog | PR не только по весу, но по повторениям для данного веса |
| 6 | **Requirements-gated auto-progression** | wger | Прогрессия ТОЛЬКО если реально выполнил план |

## 📊 Market Context (из ресёрча)

- **$3.98B** — рынок фитнес-приложений (2024)
- **70%** юзеров уходят в первые 90 дней
- **2.3×** retention от просмотра данных о прогрессе
- **+65%** 90-day retention от achievement notifications
- **+40%** abandonment от тяжёлого логирования
- Strong: 3M+ users, Hevy: 11M+, Boostcamp: 15M+, JEFIT: 13M+
- Наша ниша: self-hosted .NET tracker = практически пустая

---

## Технический стек

```
Backend:   .NET 8 + ASP.NET Core + LiteDB + MediatR (CQRS)
Frontend:  TypeScript + Vite (vanilla reactive Proxy-based state, NO frameworks)
Style:     Dark dungeon/retro terminal ASCII
Deploy:    Docker (Caddy + .NET 8) → blood.txcslm.net
PWA:       Service Worker (cache-first static, stale-while-revalidate API)
Per-user:  user_{userId}.db (LiteDB)
```

---

## Проблема

Сейчас в BloodTracker есть только **шаблоны программ тренировок** (WorkoutProgram → WorkoutDay → WorkoutExercise → WorkoutSet). Пользователь заполнил программы на Пн/Ср/Пт с упражнениями и весами, но не может:
- Начать реальную тренировку и логировать подходы
- Фиксировать фактические результаты (вес, повторения, RPE)
- Видеть таймер отдыха
- Анализировать прогресс и статистику

---

## Решение

**Workout Diary** — система real-time логирования и анализа тренировок:

```
WorkoutProgram (шаблон)          WorkoutSession (факт)
├── WorkoutDay "Пн — Грудь"  →  ├── Title: "Пн — Грудь"
│   ├── Exercise "Жим"        →  │   ├── SessionExercise "Жим"
│   │   ├── Set 30kg×10       →  │   │   ├── SessionSet planned:30×10, actual:30×10, RPE:7
│   │   └── Set 32kg×10       →  │   │   └── SessionSet planned:32×10, actual:35×10, RPE:9 🏆
│   └── Exercise "Разводка"   →  │   └── SessionExercise "Разводка"
└── WorkoutDay "Ср — Спина"      │       └── ...
                                 ├── TotalTonnage: 4280kg
                                 ├── Duration: 1h 12m
                                 └── Status: Completed ✓
```

### Ключевые User Stories

1. **Start Workout** — тап по "Start" на программе → автозаполнение из шаблона → тренировка началась
2. **Quick Log Set** — 3 тапа на подход: вес → повторения → ✓ Complete (3-5 сек)
3. **Rest Timer** — автоматически стартует после ✓, вибрация/звук при окончании
4. **What To Beat** — inline hint "прошлый раз: 80кг×10" + "попробуй: 82.5кг×8 или 80кг×12"
5. **Finish & Summary** — итоги с тоннажем, PR, сравнением с прошлым разом
6. **History & Analytics** — графики прогресса, muscle heat map, PR timeline

---

## Архитектурные решения

### 1. Template vs Session (separation of concerns)
```
WorkoutProgram/Day/Exercise/Set — ШАБЛОНЫ (не трогаем, read-only во время тренировки)
WorkoutSession/Exercise/Set — ФАКТ (новые сущности, копия из шаблона при старте)
```
Шаблоны не зависят от сессий. Сессии ссылаются на шаблоны через optional FK.

### 2. Денормализация метрик
Тоннаж, объём, avg rest, streak — считаются при `CompleteSession` и сохраняются в `WorkoutSession`. Не пересчитываются при каждом запросе.

### 3. ExerciseHistory — агрегированная история
При каждом complete session обновляется `ExerciseHistory` — best weight, best reps, best 1RM, total sessions. Позволяет быстро показать "What to beat" без сканирования всех сессий.

### 4. Offline-first PWA
Все мутации (complete set, start/finish session) идут в offline queue + optimistic UI update. Синхронизация при восстановлении сети. Last-Write-Wins conflict resolution.

### 5. One-handed gym UX (из NNGroup research)
- **Bottom sheet** вместо модалок (thumb-reachable zone)
- **Touch targets ≥ 48px** (потные руки в зале)
- **Numpad-only** для weight/reps (без переключения клавиатуры)
- **Save state always** — прерывание = норма (NNGroup: avg mobile session 72 сек)
- **Minimal chrome** — максимум контента, минимум навигации

---

## Референсы из индустрии

### Конкуренты и их сильные стороны

| App | Сила | Слабость | Берём себе |
|-----|------|----------|-----------|
| **Strong** | Quick logging, previous set inline | Paywall на routines | Inline previous set, 3-tap logging |
| **Hevy** | Free unlimited, +15/+30s timer buttons | Тяжёлый UI | Per-exercise timer, timer buttons |
| **JEFIT** | Exercise library, community programs | Outdated UI | Exercise catalog integration |
| **StrongLifts 5×5** | Auto +2.5kg progression | Only 5×5 format | Stall detection + deload suggestion |
| **Fitbod** | AI programming | $13/mo paywall | Progressive overload hints (rule-based) |
| **FitNotes** | Bodyweight support, CSV export | Android-only, basic UI | BW exercises, export |
| **Strava** | Streak gamification, social | Not for gym | Streaks, weekly goal |
| **Setgraph** | Plate calculator, volume charts | Niche | Plate calc, volume breakdown |
| **Gainz Pro** | RPE/RIR tracking, superset support | iOS-only | RPE/RIR toggle, superset grouping |

### Жалобы пользователей на конкурентов (из обзоров)
```
❌ Paywalled basic features (rest timer за деньги)       → Мы: 100% бесплатно
❌ Нет offline mode                                       → Мы: PWA offline-first
❌ Слишком много тапов на подход (5-8 тапов)              → Мы: max 3 тапа
❌ Нет предыдущего результата inline                      → Мы: "What to beat" всегда видно
❌ Нет кг+фунтов одновременно                            → Мы: per-exercise unit override
❌ Сложный onboarding                                     → Мы: шаблоны заполнены → "Start"
❌ Нет dark mode                                          → Мы: ТОЛЬКО dark mode 😈
❌ No self-hosting option                                 → Мы: Docker, свой сервер, свои данные
```

### Наше конкурентное преимущество
```
✅ Бесплатно, self-hosted, open source
✅ Твои данные — на твоём сервере
✅ Dark dungeon aesthetic (уникальный стиль)
✅ Интеграция с BloodTracker (анализы + тренировки в одном месте)
✅ PWA — работает на любом устройстве, нет привязки к App Store
✅ Offline-first — логируй в подвале без сети
```

---

## Зависимости от существующего кода

### Используемые сущности (read-only)
```
WorkoutProgram → WorkoutDay → WorkoutExercise → WorkoutSet (шаблоны)
ExerciseCatalog (из ExerciseDB API, cached в catalog.db)
MuscleGroup enum (FullBody, Chest, Back, Shoulders, Biceps, Triceps, Forearms, Abs, Glutes, Quadriceps, Hamstrings, Calves)
```

### Существующий frontend
```
/src/BloodTracker.Api/wwwroot/js/pages/workouts.ts (693 строки, reactive Proxy state)
components/muscleAscii.ts (ASCII muscle map)
```

### Паттерн per-user DB
```csharp
// Каждый юзер = своя LiteDB база
var db = new LiteDatabase($"user_{userId}.db");
var sessions = db.GetCollection<WorkoutSession>("workoutSessions");
```

---

## Карта экранов (Site Map)

```
Workouts (существующий)
├── Programs List (существующий)
│   └── Program Details (существующий)
│       └── [START WORKOUT] → Active Workout Screen (NEW)
│           ├── Quick Set Logger (bottom sheet) (NEW)
│           ├── Rest Timer (persistent bar) (NEW)
│           └── [FINISH] → Workout Summary (NEW)
│
├── Workout Diary / History (NEW)
│   └── Past Workout Details (NEW)
│
├── Analytics (NEW)
│   ├── By Exercise (charts)
│   ├── By Muscle Group (heatmap + tonnage)
│   ├── Personal Records (timeline)
│   └── Stats (streaks, consistency, frequency)
│
└── Settings (NEW)
    ├── Rest Timer Settings
    ├── Weight Units & Increments
    ├── Plate Calculator Config
    └── Weekly Goal
```

---

*Подробности каждой фазы — в отдельных файлах.*
