# UX Research — Workout Tracker Apps
> BloodTracker — Дневник тренировок
> Источники: NNGroup, BusinessOfApps, Tom's Guide, App Store reviews, competitor analysis
> Дата: 2026-02-14

---

## 1. Рынок (BusinessOfApps 2024)

- **$3.98 млрд** — выручка фитнес-приложений в 2024 (+11.1% YoY)
- **345 млн** активных пользователей
- **850 млн** скачиваний
- Peloton — лидер по выручке (подписка + оборудование)
- Тренд: выручка растёт даже при снижении downloads → юзеры остаются и платят
- Тренд: split between **trackers** (Strava, Fitbit) и **platforms** (Peloton, Centr)

### Наша ниша
Self-hosted strength training tracker = практически пустая ниша. Конкуренты все SaaS/cloud.

---

## 2. Mobile UX Principles (NNGroup Research, 151 участников)

### Ключевые ограничения мобильных
1. **Маленький экран** → контент важнее chrome, приоритизация, content-to-chrome ratio
2. **Portable = Interruptible** → avg session 72 сек (vs 150 сек desktop). ВСЕГДА сохранять state
3. **Single window** → нельзя сравнить два экрана рядом
4. **Variable connectivity** → offline-first обязательно

### Принципы для нашего приложения
- **Save state always** — при любом прерывании данные сохранены
- **Prioritize essential** — минимум UI, максимум данных
- **Allow resume** — вернулся → всё на месте
- **High content-to-chrome ratio** — убрать лишнюю навигацию во время тренировки
- **Mobile content is 2x harder** — упрощать, упрощать, упрощать

### Прямые применения
| NNGroup принцип | Наше решение |
|----------------|-------------|
| Save state | IndexedDB + localStorage при каждом действии |
| Short sessions (72 сек) | 3-tap set logging |
| Interruptible | Persistent workout bar при уходе на другой экран |
| Content priority | Во время тренировки — ТОЛЬКО подходы, таймер, прогресс |
| Variable connectivity | Offline mutation queue + optimistic UI |

---

## 3. Strong — Benchmark (#1 workout tracker)

**Источник:** App Store listing, 4.9/5, 108K рейтингов, 1.2M+ скачиваний

### Фичи Strong (полный список):
- Simplest interface (их главный selling point)
- Comprehensive exercise library + custom exercises
- **Apple Watch app** (полноценный лог без iPhone!)
- Custom routines
- Animated exercise videos
- **Auto Countdown Timer** (rest breaks)
- **Multiple exercise types**: Assisted Bodyweight, Duration
- **Set tags**: Warm Up, Failure, Drop Sets
- **Supersets/Grouped Exercises**
- **Graphs**: Volume + 1RM Progression
- **Cloud Sync**
- Body measurements tracker + Apple Health
- **Warm Up Calculator** (какие веса для разминки)
- **Plate Calculator**
- Imperial + Metric (combination!)
- Notes + progress pictures
- Share sheet (routines + workouts)
- CSV export

### Что мы берём, что нет

| Strong фича | Берём? | Почему |
|-------------|--------|--------|
| Simple interface | ✅ | Это #1 причина успеха |
| Apple Watch | ❌ | PWA, нет нативного watch app. Может PWA watch в будущем |
| Animated videos | ❌ Phase 1 | Позже можно через ExerciseDB API |
| Set tags (warmup/failure/drop) | ✅ | Уже в плане |
| Supersets | ✅ | Phase 3 |
| Plate Calculator | ✅ | Phase 3 |
| Warm Up Calculator | ✅ | Phase 3 |
| Progress photos | 🔜 | Nice-to-have, Phase 5+ |
| Body measurements | 🔜 | BloodTracker уже трекает вес? |
| Cloud Sync | ✅ | Наш сервер = cloud |

### Что пользователи хвалят в Strong (из отзывов):
```
"Simple. Intuitive. Functional."
"bare bones and serious"
"couldn't train without it"
"most intuitive and easy to use"
```
→ **Ключевой insight: простота побеждает фичи**

### Цены Strong:
- Free: unlimited workouts, 3 routines
- Pro: $4.99/mo, $29.99/year, $99.99 lifetime
- → Мы: 100% бесплатно, self-hosted

---

## 4. Gravitus — Social Strength Tracking

**Источник:** gravitus.com, 300K+ пользователей, 4.9 App Store

### Уникальные фичи Gravitus:
- **Real median gains data**: Bench +13/+22/+37 lbs за 1/3/12 мес, Squat +24/+37/+57, Deadlift +25/+41/+65
- **Social community**: лента тренировок, видео, props (лайки)
- **Leaderboards**: рейтинги по упражнениям
- **Exercise + Workout Streaks**: с коронами для самых стабильных
- **Heart rate recovery tracking** (через watch app)
- **300K+ exercises** in database

### Что можем заимствовать:
| Gravitus фича | Применимость | Приоритет |
|---------------|-------------|-----------|
| Median gains display | Показать "средний прирост за месяц" | Phase 2 |
| Exercise streaks (per exercise) | Не только общий стрик, но per-exercise | Phase 4 |
| Heart rate from watch | Нет, PWA. Но можно manual input | ❌ |
| Social feed | Не нужно для self-hosted | ❌ |
| Leaderboards | Бессмысленно для 1 юзера | ❌ |

### Ключевой insight из отзывов Gravitus:
```
"it shows you what you did on a previous workout... that's essential"
"it tracks PRs and there's also how-to videos"
"the free version... has all the features without the high price tag"
```
→ **"What you did last time" = must-have #1 по отзывам юзеров**

---

## 5. Liftosaur — Programmable Progressions

**Источник:** liftosaur.com

### Уникальный подход:
- **Liftoscript** — DSL для описания программ тренировок
- Пользователь может написать ЛЮБУЮ логику прогрессии
- Myo-reps, drop sets, manipulating weight/reps/RPE/rest timer через скрипты
- Web editor для десктопа

### Пример кода:
```
Bench Press 3x12-15 progress: custom() {~
  for (var.i in completedReps) {
    if (completedReps[var.i] >= reps[var.i]) {
      weights[var.i] += 5lb;
    }
  }
~}
```

### Что можем заимствовать:

| Liftosaur фича | Применимость | Приоритет |
|---------------|-------------|-----------|
| Programmable progressions | Слишком сложно для нас, но ИДЕЯ rule-based progression | Phase 3 (simplified) |
| Undulation graphs | Как меняется volume/intensity week-over-week | Phase 2 analytics |
| Muscle volume stats (daily/weekly) | Sets/volume per muscle group в реальном времени | Phase 2 |
| Web editor | У нас уже есть веб-версия | ✅ |

### Ключевой insight:
→ **Продвинутые юзеры хотят кастомизацию прогрессий**. Для нас достаточно rule-based: "если 3 раза выполнил план → +2.5кг". Скриптинг — overkill.

---

## 6. Tom's Guide — Обзоры лучших приложений

### Centr (Chris Hemsworth) — #1 overall
- **Фильтр по оборудованию** — выбираешь что есть, видишь только подходящие тренировки
- **Meal planner** с авто-списком покупок
- **Медитации** (mind-body connection)
- → Для нас: фильтр по оборудованию не нужен (свои шаблоны), но идея **подбора тренировок под доступное оборудование** интересна

### Nike Training Club — бесплатно
- **Whiteboard workouts** — показывает всю тренировку, идёшь в своём темпе
- **Фильтры**: muscle group, focus (endurance/mobility/strength/yoga), equipment, duration, level, intensity
- → Для нас: **фильтры в истории** по muscle group, duration, intensity

### Apple Fitness+ 
- **Два инструктора**: один показывает модификации для новичков, другой для продвинутых
- **Realtime stats from Watch** на экране
- → Для нас: не применимо (не видео), но идея **modifications** = warmup sets как "beginner modification"

### Sweat (Kayla Itsines)
- **Structured programs** по целям и lifestyle
- **Manual tap between exercises** — юзерам РАЗДРАЖАЕТ
- → Для нас: **auto-advance** — после последнего подхода упражнения автоматически скроллить к следующему

### Strava
- **Social network** для бегунов/велосипедистов
- **Challenges** и **segments**
- → Для нас: **challenges** для self-hosted можно адаптировать как personal challenges ("подними 5000кг за неделю")

---

## 7. Идеи для заимствования (сводная таблица)

### UX Improvements (новые, не в текущем плане)

| # | Идея | Источник | Приоритет | Phase |
|---|------|----------|-----------|-------|
| 1 | **Auto-advance to next exercise** — после завершения всех подходов автоскролл к следующему | Sweat complaints | P1 | 1 |
| 2 | **Smart numpad** — custom numpad с кнопками частых весов (20, 25, 30, 32.5, 35...) на основе истории | Strong UX analysis | P2 | 3 |
| 3 | **Previous workout ghost overlay** — серым показывать результаты прошлой тренировки рядом с текущими | Gravitus reviews | P0 | 1 |
| 4 | **Exercise swap** — заменить упражнение на альтернативу (тот же muscle group) если тренажёр занят | Centr equipment filter | P2 | 3 |
| 5 | **Voice input** — "35 кило 10 повторений" через микрофон (потные руки!) | Gym UX research | P3 | 5+ |
| 6 | **Workout duration estimate** — перед стартом показать "~45 мин based on your avg rest time" | NNGroup (set expectations) | P1 | 1 |
| 7 | **Auto-fill from last time by default** — weight/reps pre-filled не из шаблона, а из LAST ACTUAL results | Strong, Gravitus, all top apps | P0 | 1 |
| 8 | **Personal challenges** — "Подними 10,000кг за неделю" (self-competition, не social) | Strava challenges | P2 | 4 |
| 9 | **Workout calendar with training split** — календарь на неделю с цветами muscle groups | Apple Fitness+ structure | P1 | 2 |
| 10 | **"Copy last workout"** shortcut — быстрый старт без шаблона, просто повторить прошлый раз | Strong, Hevy | P1 | 1 |
| 11 | **In-set timer** — для timed exercises (planks, holds): countdown timer внутри подхода | Strong duration exercises | P2 | 3 |
| 12 | **Swipe between exercises** — горизонтальный свайп = переключение между упражнениями | Mobile UX patterns | P2 | 3 |
| 13 | **Quick-add exercise** — поиск + "recent exercises" + "from this muscle group" | Strong, all apps | P1 | 1 |
| 14 | **Undo complete set** — 5 секунд тоста "Set completed [UNDO]" перед финализацией | Gmail undo-send pattern | P0 | 1 |
| 15 | **Muscle map before/after** — visual ASCII map: что тренировал сегодня (подсвечено) | Existing muscleAscii.ts | P1 | 2 |
| 16 | **Workout notes from last time** — заметки с прошлой тренировки показываются при старте | Hevy, Strong (notes feature) | P1 | 1 |
| 17 | **"You're ahead/behind" live indicator** — во время тренировки сравнение с прошлым разом | Gravitus median gains | P2 | 2 |
| 18 | **Volume landmarks** — "You just lifted 1 ton today!" notification при достижении круглых чисел | Strava milestone pop-ups | P2 | 4 |
| 19 | **Rest timer as notification** — Web Notification API когда app в background | NNGroup interruptions, PWA | P0 | 1 |
| 20 | **Plate calculator in-line** — не модалка, а маленький hint под полем веса "= 25+10+5 per side" | Setgraph | P2 | 3 |
| 21 | **Session resume banner** — при входе в app: "You have an active workout (23 min). [RESUME] [ABANDON]" | NNGroup save state | P0 | 1 |
| 22 | **Double-tap weight to copy from planned** — быстрый сброс к плановому значению | Strong UX | P1 | 1 |
| 23 | **Exercise video thumbnails** (optional) — маленькая GIF/thumbnail рядом с названием | JEFIT, Strong animated videos | P3 | 5+ |
| 24 | **Weekly volume per muscle group** — summary "Chest: 24 sets this week (recommended: 10-20)" | Liftosaur muscle stats | P1 | 2 |
| 25 | **Max weight indicator on current set** — "This would be a PR!" before completing | Gravitus PR prediction | P1 | 2 |

---

## 8. Anti-patterns (чего НЕ делать)

### Из отзывов пользователей конкурентов:

| Anti-pattern | App | Пример |
|-------------|-----|--------|
| **Paywalled rest timer** | Strong (old version) | Базовая функция за деньги = ярость |
| **Manual tap between exercises** | Sweat | Нагибаться к телефону каждый переход |
| **Too many fields** | JEFIT (old) | 10+ полей на подход = ад |
| **Forced account creation** | Hevy | Нельзя использовать без регистрации |
| **No offline** | Many apps | В подвальном зале = бесполезно |
| **Cluttered dashboard** | Fitbod | 100 метрик одновременно |
| **Auto-play music** | Some apps | Перебивает свою музыку юзера |
| **Required tutorial** | Some apps | 5 экранов onboarding перед первым использованием |
| **Non-deletable default exercises** | JEFIT | Мусор в каталоге |
| **Heavy animations** | Some apps | Тормозит на старых телефонах |

### Наши правила:
```
1. ВСЕ функции бесплатны. Всегда.
2. Zero onboarding — шаблоны заполнены, тапни Start.
3. Max 3 поля на подход (weight, reps, RPE).
4. Offline by default — сеть = бонус, не требование.
5. No forced account — per-user DB уже работает.
6. Performance > animation — никаких тяжёлых анимаций.
7. Respect user's music — наши звуки = короткие alerts.
```

---

## 9. Behavioral Psychology Insights

### Из исследования Quantified Self (Wikipedia + academic)

- **Sharing exercise data → improves motivation** (Finnish study, 125 trail runners, Leisure Studies 2010)
- **Self-tracking → behavior change** через awareness effect
- **Visual progress → sustained engagement** (графики > числа)
- **Social accountability** работает, но для self-hosted: **personal accountability** через streaks, goals, milestones

### Gamification best practices (из Strava, Fitbod):
1. **Progress bars > numbers** — "67% done" лучше чем "2 из 3"
2. **Loss aversion** — "Don't break your 12-day streak!" мотивирует больше чем "Keep going!"
3. **Variable rewards** — PR celebrations НЕОЖИДАННЫЕ, не каждый раз
4. **Near misses** — "So close to a PR! 0.5kg away" мотивирует попробовать снова
5. **Milestone chunking** — маленькие цели (10 тренировок) до больших (100)

### Применение:
- Streak counter с "loss aversion" framing
- "Almost PR!" notification когда within 5% от рекорда
- Milestone chunking: 1→10→25→50→100 тренировок
- Progress bars везде (workout progress, weekly goal, milestone progress)

---

## 10. PWA-Specific UX (наше преимущество)

### Что доступно в PWA но не используется конкурентами:

| Web API | Применение | Поддержка |
|---------|-----------|-----------|
| Vibration API | Haptic feedback (timer, PR, set complete) | Chrome, Firefox (NOT Safari iOS) |
| Web Notifications API | Timer done notification в background | Chrome, Firefox, Safari 16.4+ |
| Web Share API | Share workout summary | Все современные браузеры |
| Screen Wake Lock | Экран не гаснет во время тренировки | Chrome 84+, Edge |
| Badging API | Badge on PWA icon "1 active workout" | Chrome 81+ |
| Background Sync | Sync offline queue | Chrome only |
| Picture-in-Picture | Timer в PiP окне (experimental) | Chrome 70+ |
| Media Session API | Timer в lockscreen notifications | Chrome 73+ |

### КРИТИЧНО: Screen Wake Lock

```typescript
// Экран НЕ ДОЛЖЕН гаснуть во время тренировки!
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released');
      });
    } catch (err) {
      console.log('Wake Lock error:', err);
    }
  }
}

// При старте тренировки
async function startWorkout() {
  await requestWakeLock();
  // ... остальная логика
}

// При завершении/отмене
function endWorkout() {
  wakeLock?.release();
  wakeLock = null;
}

// При возврате в app (wake lock отпускается при сворачивании)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && hasActiveWorkout()) {
    await requestWakeLock();
  }
});
```

**Это УБИЙСТВЕННАЯ фича** — у нативных приложений это по умолчанию, но 90% PWA об этом забывают. Юзер в зале отдыхает → экран гаснет → разблокировать → найти app → потеря контекста. Wake Lock это решает.

### Media Session API (timer на lockscreen)

```typescript
// Показать таймер на lockscreen/в шторке уведомлений
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: `Rest: ${formatTime(remaining)}`,
    artist: 'BloodTracker',
    album: currentExercise.name,
  });
  
  navigator.mediaSession.setActionHandler('play', () => restTimer.resume());
  navigator.mediaSession.setActionHandler('pause', () => restTimer.pause());
  navigator.mediaSession.setActionHandler('seekforward', () => restTimer.addTime(30));
  navigator.mediaSession.setActionHandler('seekbackward', () => restTimer.addTime(-15));
}
```

---

## 11. Фичи для добавления в план (приоритизированные)

### MUST ADD (Phase 1):
1. Screen Wake Lock (экран не гаснет)
2. Session resume banner ("У вас есть активная тренировка")
3. Auto-advance to next exercise
4. Auto-fill from LAST ACTUAL (не из шаблона)
5. Undo set (5-sec toast)
6. Rest timer Web Notification
7. Workout duration estimate
8. Previous workout ghost overlay
9. Workout notes from last time
10. "Copy last workout" shortcut

### SHOULD ADD (Phase 2-3):
11. Workout calendar with muscle group colors
12. Weekly volume per muscle group
13. "Almost PR!" prediction
14. Exercise swap (same muscle group)
15. Plate calculator inline hint
16. Smart numpad (frequent weights)
17. In-set timer (planks, holds)
18. "You're ahead/behind" live indicator
19. Double-tap to reset to planned

### NICE TO HAVE (Phase 4-5):
20. Personal challenges
21. Volume landmarks
22. Media Session API (lockscreen timer)
23. Badging API (PWA icon badge)
24. Swipe between exercises
25. Exercise video thumbnails

---

## 12. Источники

### Успешно проанализированы:
1. NNGroup — Mobile UX research (nngroup.com/articles/mobile-ux/)
2. BusinessOfApps — Fitness App Market 2024 (businessofapps.com)
3. Tom's Guide — Best Workout Apps 2025 (tomsguide.com)
4. Apple App Store — Strong (4.9/5, 108K ratings)
5. Gravitus (gravitus.com, 300K users)
6. Liftosaur (liftosaur.com, programmable progressions)
7. Wikipedia — Quantified Self
8. Strong App website (strongapp.io) — feature list
9. Hevy App — feature analysis (previous session)
10. JEFIT — feature analysis (previous session)
11. StrongLifts 5×5 — auto-progression (previous session)
12. Fitbod — AI programming (previous session)
13. FitNotes — bodyweight, CSV export (previous session)
14. Strava — gamification, social (previous session)
15. Setgraph — plate calculator, volume charts (previous session)
16. Gainz Pro — RPE/RIR, supersets (previous session)
17. PRPath — progressive overload (previous session)
18. GymLog — hypertrophy tracking (previous session)
19. FitnessForLife — comparison guide (previous session)
20. Various App Store reviews and user complaints

### Не удалось загрузить (403/404/blocked):
- Medium articles (paywall/login required)
- PCMag, Barbend (Cloudflare blocked)
- Toptal, UXPin, SetProduct (404/403)
- Reddit (login required for wiki)
- Appfigures, Wirecutter (404)

---

---

## 13. Новые конкуренты (из дополнительного ресёрча)

### Boostcamp — "Reddit's most loved workout app"
- **15M+ скачиваний**, 120M+ залогированных тренировок
- 4.8 рейтинг (10K+ отзывов)
- **Бесплатные экспертные программы**: GZCLP (18K атлетов), Jacked & Tan 2.0, PHUL, KONG
- Coaches: Cody Lefever (GZCL, competitive powerlifter), Alex Bromley (strongman)
- **Auto progressions + personalized weight recommendations**
- Из отзывов: "Fully replaced my excels and other notes"
- **Killer feature**: курированные программы от реальных тренеров, а не AI-generated

**Что можем взять:** idea of curating workout templates from well-known programs (5x5, PPL, PHUL) as built-in presets.

### Strength Level — Strength Standards Database
- **48.3 МИЛЛИОНА lifts** в базе данных
- 5 уровней: Beginner / Novice / Intermediate / Advanced / Elite
- Standards per bodyweight, age, gender
- Bench Press example: 80kg BW → Beginner 73kg, Novice 109kg, Intermediate 154kg, Advanced 208kg, Elite 266kg
- **Bodyweight Ratio**: Beginner 0.50x, Novice 0.75x, Intermediate 1.25x, Advanced 1.75x, Elite 2.00x

**Что можем взять:** "Where do you stand?" feature — показать юзеру его уровень (Beginner→Elite) по его bodyweight и e1RM. Мотивация через сравнение с нормами, не с другими юзерами.

### wger — Open Source Workout Manager
- **AGPL-3.0**, Python/Django, PostgreSQL
- REST API, Docker self-hostable
- **Iteration-based progression rules**: задать правило "+2kg каждую неделю" и оно автоматически применяется
- **Requirements-gated progression**: правило применяется ТОЛЬКО если юзер залогировал нужные значения в прошлой итерации
- **Slot-based supersets**: >1 exercise in slot = автоматический суперсет
- Cross-platform apps (Android/iOS/F-Droid/Flathub)
- 5.6K stars на GitHub

**Что можем взять:**
1. Iteration-based progression — наш шаблон может иметь правила "если выполнил 3×8 → следующий раз +2.5кг"
2. Requirements-gated rules — прогрессия ТОЛЬКО если юзер реально выполнил план
3. Slot = superset paradigm (совпадает с нашим superset_group)

### free-exercise-db — 800+ Exercises (Public Domain)
- JSON формат с полями: name, force, level, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions, images
- **Бесплатные изображения** для каждого упражнения
- Категории: strength, stretching, cardio, plyometrics, powerlifting, olympic weightlifting

**Прямое применение для BloodTracker:**
- Seed нашего каталога упражнений
- Маппинг primaryMuscles → наш MuscleGroup enum
- Инструкции для "How to" feature
- Изображения с GitHub CDN (бесплатно!)

---

## 14. Strength Standards — фича "How Strong Am I?"

Идея: после логирования e1RM показать юзеру его уровень.

```
┌─────────────────────────────────────────────┐
│  HOW STRONG ARE YOU?                         │
│                                              │
│  Bench Press: 85kg e1RM @ 80kg BW            │
│  Ratio: 1.06x bodyweight                     │
│                                              │
│  [====░░░░░░] Intermediate                   │
│   Beg  Nov  INT  Adv  Elite                  │
│   0.5x 0.75x 1.25x 1.75x 2.0x              │
│                                              │
│  Top 55% of lifters at your weight           │
│  Next level (Advanced): 140kg (+55kg to go!) │
└─────────────────────────────────────────────┘
```

Данные для comparison: hardcoded таблица из Strength Level (48M lifts).
Не требует сети — embedded в app.

**Phase:** 2 (Analytics)

---

## 15. Iteration-Based Auto-Progression (из wger)

Вместо ручного "подними вес когда готов", автоматические правила:

```typescript
interface ProgressionRule {
    exerciseName: string;
    condition: 'all_sets_completed' | 'rpe_below' | 'reps_above_target';
    conditionValue?: number;     // e.g., RPE < 8, or reps > planned
    action: 'increase_weight' | 'increase_reps' | 'increase_sets';
    actionValue: number;         // e.g., +2.5kg, +1 rep, +1 set
    maxValue?: number;           // Cap (e.g., don't go above 5 sets)
}

// Пример правил:
const rules: ProgressionRule[] = [
    {
        exerciseName: "Bench Press",
        condition: 'all_sets_completed',
        action: 'increase_weight',
        actionValue: 2.5,
    },
    {
        exerciseName: "Bicep Curl",
        condition: 'reps_above_target',
        conditionValue: 2,  // if did 2+ more reps than target
        action: 'increase_weight',
        actionValue: 2.5,
    },
    {
        exerciseName: "Pull-ups",
        condition: 'all_sets_completed',
        action: 'increase_reps',
        actionValue: 1,
        maxValue: 15,
    }
];
```

**Phase:** 3 (Advanced) — после того как базовые шаблоны работают.

---

## 16. RP Strength: Stimulus-to-Fatigue Ratio (SFR)

Из RP Hypertrophy Guide (Dr. Mike Israetel):
- Лучший рост = упражнения с высоким SFR
- Высокий SFR: упражнения дают максимум стимула при минимуме усталости
- Низкий SFR: много усталости, мало стимула (тяжёлая штанга > машина для того же мышечного группы)

**Применение для нас:**
- В каталоге упражнений добавить поле `sfr_tier: 'S' | 'A' | 'B' | 'C'`
- При выборе упражнения подсказывать: "For chest growth, Cable Fly (S-tier) > Bench Press (A-tier) for SFR"
- Phase 5+ (далёкое будущее)

---

*Этот документ дополняет `06-UX-DESIGN-GUIDE.md` конкретными данными из ресёрча.*
