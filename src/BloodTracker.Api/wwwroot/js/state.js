// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

export const state = {
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
    extraRows: [],

    workoutPrograms: [],
    workoutDays: {},
    workoutExercises: {},
    workoutSets: {},
    selectedProgramId: null,
    selectedDayId: null,
    selectedExerciseId: null,

    staticAnalysisKeys: [
        'testosterone', 'free-testosterone', 'lh', 'fsh', 'prolactin', 'estradiol', 'shbg', 'tsh',
        'cholesterol', 'hdl', 'ldl', 'triglycerides', 'atherogenic',
        'alt', 'ast', 'ggt', 'bilirubin', 'hemoglobin', 'hematocrit', 'glucose', 'vitd'
    ]
}

// Legacy exports for backward compatibility
export const analyses = state.analyses
export const drugs = state.drugs
export const intakeLogs = state.intakeLogs
export const referenceRanges = state.referenceRanges