# PLAN DELTA — Что нужно изменить/добавить в основной план
> На основе Deep Market Analysis (08-MARKET-DEEP-DIVE.md)
> Дата: 2026-02-14

---

## Что УЖЕ есть в плане и совпадает

| Фича | Наш план | Статус |
|------|----------|--------|
| Auto-fill from last workout | ✅ 01-PHASE-CORE | OK |
| Rest timer auto-start | ✅ 01-PHASE-CORE | OK |
| Rest timer cascade (exercise > muscle > global) | ✅ 03-PHASE-ADVANCED | OK |
| Set tags (warmup/failure/drop) | ✅ 01-PHASE-CORE | OK |
| Supersets | ✅ 03-PHASE-ADVANCED | OK |
| RPE/RIR toggle | ✅ 03-PHASE-ADVANCED | OK |
| Stall detection (3 sessions) | ✅ 03-PHASE-ADVANCED | OK |
| Deload recommendation (-10%, 1 week) | ✅ 03-PHASE-ADVANCED | OK |
| Plate calculator | ✅ 03-PHASE-ADVANCED | OK |
| Warmup calculator | ✅ 03-PHASE-ADVANCED | OK |
| PR celebration | ✅ 04-PHASE-GAMIFICATION | OK |
| Streak tracking | ✅ 04-PHASE-GAMIFICATION | OK |
| Milestones/achievements | ✅ 04-PHASE-GAMIFICATION | OK |
| Offline-first IndexedDB | ✅ 05-PHASE-OFFLINE | OK |
| LWW conflict resolution | ✅ 05-PHASE-OFFLINE | OK |
| Client-side UUIDs | ✅ 05-PHASE-OFFLINE | OK |
| CSV export | ✅ 04-PHASE-GAMIFICATION | OK |
| Muscle heatmap (ASCII) | ✅ 02-PHASE-ANALYTICS | OK |
| Workout calendar heatmap | ✅ 02-PHASE-ANALYTICS | OK |
| Weekly volume per muscle group | ✅ 02-PHASE-ANALYTICS (planned) | OK |

**Вывод:** Основной каркас плана СОВПАДАЕТ с индустриальным стандартом. Мы не пропустили ничего критического в структуре.

---

## ⚠️ Что НУЖНО ДОБАВИТЬ (новое)

### 1. e1RM формулы — UPGRADE (Phase 2)
**Текущий план:** Не специфицированы конкретные формулы
**Нужно:** Взвешенное среднее Epley + Brzycki + Mayhew с весами по типу упражнения и диапазону повторений
```
Жим → Brzycki/Mayhew (точнее для верха)
Присед → Epley/Baechle (точнее для ног)
Тяга → Wathen/Mayhew
>12 повторений → предупреждение "Low accuracy estimate"
```
**Файл:** `02-PHASE-ANALYTICS.md` — секция PersonalRecord detection

### 2. INOL метрика — NEW (Phase 3)
**Текущий план:** Нет
**Нужно:** `INOL_set = reps / (100 − intensity%)`, оптимум 0.8/тренировка, 2.0/неделя
**Зачем:** Предупреждение о перетренированности прямо во время тренировки
**Файл:** `03-PHASE-ADVANCED.md` — новая секция "Training Load Monitoring"

### 3. RPE-чувствительное обнаружение плато — UPGRADE (Phase 3)
**Текущий план:** Простой "3 сессии без прогресса"
**Нужно добавить:**
- SMA comparison (4 vs 4 тренировки) с цветовой индикацией
- Линейная регрессия за 6 недель (slope в %/неделя)
- **RPE drift detection**: рост RPE при стабильном весе = скрытое плато
**Зачем:** "Ни одно из исследованных приложений не реализует полноценный RPE-чувствительный алгоритм" — НАШЕ преимущество
**Файл:** `03-PHASE-ADVANCED.md` — секция "Stall Detection"

### 4. Предрассчитанные агрегаты — NEW (Phase 1 backend!)
**Текущий план:** Нет, подразумевается прямой расчёт
**Нужно:**
```
daily_exercise_stats: e1RM, total_volume, max_weight, total_sets per exercise/day
weekly_user_stats: sessions, duration, volume per week  
weekly_muscle_volume: sets + volume per muscle group/week
user_exercise_prs: кэш PR (обновляется только при новом рекорде)
```
**Зачем:** При длинной истории (1000+ тренировок) графики будут тормозить без этого
**Файл:** `01-PHASE-CORE.md` — backend architecture

### 5. Canonical kg storage — NEW (Phase 1)
**Текущий план:** Единицы хранятся в user preference
**Нужно:** Двойное хранение `actual_weight` + `actual_weight_kg`
**Зачем:** Если юзер сменит единицы или сравнивает данные → no data loss
**Файл:** `01-PHASE-CORE.md` — domain model ExerciseSet

### 6. Deload: научные данные — UPGRADE (Phase 3)
**Текущий план:** -10% на 1 неделю
**Нужно:** -50% объём, -10% интенсивность, цикл 5.6±2.3 недели, 4 триггера
**Файл:** `03-PHASE-ADVANCED.md` — Deload секция

### 7. Streak Shield — NEW (Phase 4)
**Текущий план:** Streak с допуском 1 дня отдыха
**Нужно:** Явная "shield" механика — юзер может заморозить streak (болезнь, отпуск, rest day)
**Файл:** `04-PHASE-GAMIFICATION.md` — Streak секция

### 8. Smart Superset Scrolling — NEW (Phase 3)
**Текущий план:** Supersets есть, но нет авто-скролла
**Нужно:** При фиксации подхода в суперсете → auto-scroll к следующему упражнению
**Файл:** `03-PHASE-ADVANCED.md` — Superset секция

### 9. "Same as Last Set" pattern — CLARIFY (Phase 1)
**Текущий план:** Auto-fill from TEMPLATE, не от предыдущего подхода
**Нужно:** Добавить подход → pre-fill из ПРЕДЫДУЩЕГО подхода ЭТОЙ тренировки (не шаблона!)
**Пример:** Сделал жим 80кг×10, добавляешь подход → сразу 80кг×10
**Файл:** `01-PHASE-CORE.md` — Quick Set Logger

### 10. Rep-PR tracking — NEW (Phase 2)
**Текущий план:** PR только по весу
**Нужно:** PR по ПОВТОРЕНИЯМ для данного веса (StrengthLog паттерн)
**Пример:** "80кг: обычно 8, сегодня 10 — Rep PR!"
**Файл:** `02-PHASE-ANALYTICS.md` — PR Detection

### 11. Set color coding — NEW (Phase 1)
**Текущий план:** Нет цветовой индикации подходов
**Нужно:** Зелёный = побил предыдущий, жёлтый = повторил, красный = ниже
**Файл:** `01-PHASE-CORE.md` — Active Workout Screen

### 12. Separate volume controls — NICE-TO-HAVE (Phase 3)
**Текущий план:** Один звук для всего
**Нужно:** Отдельно: timer / set complete / PR notification
**Файл:** `03-PHASE-ADVANCED.md` — WorkoutPreferences

### 13. FitNotes rep-range filter for e1RM — NEW (Phase 2)
**Текущий план:** Нет
**Нужно:** Фильтр "показывать e1RM только для подходов 3-10 reps" (>12 = неточно)
**Файл:** `02-PHASE-ANALYTICS.md` — Charts

### 14. Period comparison — NEW (Phase 2)
**Текущий план:** Нет
**Нужно:** Сравнение двух произвольных периодов с подсветкой различий
**Файл:** `02-PHASE-ANALYTICS.md` — Analytics tabs

### 15. Configurable "what is previous" — NEW (Phase 3)
**Текущий план:** Предыдущая = последнее выполнение
**Нужно:** Опция: "предыдущая = последнее выполнение ЭТОГО упражнения" vs "в рамках ЭТОГО шаблона"
**Файл:** `03-PHASE-ADVANCED.md` — WorkoutPreferences

---

## 📊 Ключевые метрики для запоминания

| Метрика | Значение | Источник |
|---------|----------|----------|
| Churn rate first 90 days | 70% | Market research |
| Progress viewing → retention | 2.3x | Behavioral study |
| Achievement notifications → 90-day retention | +65% | Gamification research |
| Burdensome logging → abandonment | +40% | UX study |
| Haptic feedback → engagement | +30% | UX study |
| Deload cycle average | 5.6 ± 2.3 weeks | Exercise science |
| RPE autoregulation | ±4% weight per RIR point | Tuchscherer |
| INOL optimal per exercise/session | 0.8 | Prilepin |
| INOL optimal per week | 2.0 | Prilepin |
| INOL overtrain risk | >2.0/session | Prilepin |
| 3RM → 1RM accuracy | Better than 5RM | Research |

---

## 🎯 Приоритет интеграции

### Добавить в Phase 1 (CORE):
- [4] Предрассчитанные агрегаты (backend)
- [5] Canonical kg storage
- [9] "Same as Last Set" pattern
- [11] Set color coding (green/yellow/red)

### Добавить в Phase 2 (ANALYTICS):
- [1] e1RM weighted formula
- [10] Rep-PR tracking
- [13] Rep-range filter for e1RM charts
- [14] Period comparison

### Добавить в Phase 3 (ADVANCED):
- [2] INOL метрика
- [3] RPE-sensitive plateau detection (ДИФФЕРЕНЦИАТОР!)
- [6] Deload upgrade (научные данные)
- [8] Smart Superset Scrolling
- [12] Separate volume controls
- [15] Configurable "what is previous"

### Добавить в Phase 4 (GAMIFICATION):
- [7] Streak Shield

### Новые фичи (из 2-го раунда ресёрча):
- [16] **Strength Standards** — "How Strong Am I?" comparison (48M lifts data from Strength Level) → Phase 2
- [17] **Iteration-based Auto-Progression** — rules like "+2.5kg if all sets completed" (wger pattern) → Phase 3
- [18] **free-exercise-db seed** — 800+ exercises с images/instructions как starting catalog → Phase 1
- [19] **Boostcamp-style built-in programs** — curated templates (5×5, PPL, PHUL, GZCLP) → Phase 1
- [20] **Requirements-gated progression** — auto-progress ONLY if user actually logged the required performance → Phase 3

---

## ✅ Файлы обновлены

| Файл | Что добавлено | Статус |
|------|--------------|--------|
| 01-PHASE-CORE.md | Wake Lock, Resume Banner, Ghost Overlay, Set Colors, Undo Toast, Summary Tables, Canonical kg, Copy Last, Web Notification, Same-as-Last-Set, Duration Estimate | ✅ Done |
| 02-PHASE-ANALYTICS.md | Weighted e1RM formulas, INOL, Rep-PR tracking, Period Comparison, Rep-range filter, "Almost PR!" | ✅ Done |
| 03-PHASE-ADVANCED.md | RPE-Drift Plateau Detection (4 methods!), INOL monitoring, Smart Superset Scrolling, Separate Volume Controls, Configurable "Previous", Scientific Deload | ✅ Done |
| 04-PHASE-GAMIFICATION.md | Streak Shield (enhanced) | ✅ Done |
| 07-UX-RESEARCH.md | Boostcamp, Strength Level, wger, free-exercise-db, Strength Standards feature, Auto-Progression, RP SFR | ✅ Done |
| 08-MARKET-DEEP-DIVE.md | Raw data from Володя's research | ✅ Done |

---

*Этот файл = TODO для обновления основных файлов плана.*
