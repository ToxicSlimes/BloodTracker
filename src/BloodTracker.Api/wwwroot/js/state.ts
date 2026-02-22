// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

import type { AnalysisDto, DrugDto, IntakeLogDto, CourseDto, PurchaseDto, ReferenceRange, WorkoutSessionDto } from './types/index.js'

export interface RestTimerState {
    isRunning: boolean
    remainingSeconds: number
    totalSeconds: number
    startTime?: number
    pausedAt?: number
    playSound?: boolean
    vibrate?: boolean
}

export interface AppState {
    user: { id: string; email: string; displayName?: string; isAdmin: boolean } | null
    analyses: AnalysisDto[]
    drugs: DrugDto[]
    intakeLogs: IntakeLogDto[]
    purchases: PurchaseDto[]
    referenceRanges: Record<string, ReferenceRange>
    currentCourse: CourseDto | null

    editingCourseId: string | null
    editingDrugId: string | null
    editingLogId: string | null
    editingAnalysisId: string | null
    editingPurchaseId: string | null
    selectedAnalysisId: string | null
    extraRows: unknown[]

    drugCatalog: unknown[]
    manufacturers: unknown[]
    catalogLoaded: boolean

    workoutPrograms: unknown[]
    workoutDays: Record<string, unknown>
    workoutExercises: Record<string, unknown>
    workoutSets: Record<string, unknown>
    selectedProgramId: string | null
    selectedDayId: string | null
    selectedExerciseId: string | null

    activeWorkoutSession: WorkoutSessionDto | null
    workoutHistory: WorkoutSessionDto[]
    workoutHistoryTotal: number
    restTimerState: RestTimerState

    dashboardStats: { analysesCount: number; lastAnalysisDate: string | null } | null

    currentPage: string
    workoutSubTab: string

    staticAnalysisKeys: string[]

    [key: string]: unknown
}

import { reactive } from './reactive.js'

/** Глобальное состояние приложения: данные пользователя, анализы, препараты, курсы, тренировки */
const initialState: AppState = {
    user: null,
    analyses: [],
    drugs: [],
    intakeLogs: [],
    purchases: [],
    referenceRanges: {},
    currentCourse: null,

    editingCourseId: null,
    editingDrugId: null,
    editingLogId: null,
    editingAnalysisId: null,
    editingPurchaseId: null,
    selectedAnalysisId: null,
    extraRows: [],

    drugCatalog: [],
    manufacturers: [],
    catalogLoaded: false,

    workoutPrograms: [],
    workoutDays: {},
    workoutExercises: {},
    workoutSets: {},
    selectedProgramId: null,
    selectedDayId: null,
    selectedExerciseId: null,

    activeWorkoutSession: null,
    workoutHistory: [],
    workoutHistoryTotal: 0,
    restTimerState: {
        isRunning: false,
        remainingSeconds: 0,
        totalSeconds: 90
    },

    dashboardStats: null,

    currentPage: 'dashboard',
    workoutSubTab: 'training',

    staticAnalysisKeys: [
        'testosterone', 'free-testosterone', 'lh', 'fsh', 'prolactin', 'estradiol', 'shbg', 'tsh',
        'cholesterol', 'hdl', 'ldl', 'triglycerides', 'atherogenic',
        'alt', 'ast', 'ggt', 'bilirubin', 'hemoglobin', 'hematocrit', 'glucose', 'vitd'
    ]
}

export const state: AppState = reactive(initialState)

// Legacy exports for backward compatibility
export const analyses: AnalysisDto[] = state.analyses
export const drugs: DrugDto[] = state.drugs
export const intakeLogs: IntakeLogDto[] = state.intakeLogs
export const referenceRanges: Record<string, ReferenceRange> = state.referenceRanges
