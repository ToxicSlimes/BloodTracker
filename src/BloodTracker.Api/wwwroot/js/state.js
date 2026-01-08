// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

export const state = {
    analyses: [],
    drugs: [],
    intakeLogs: [],
    referenceRanges: {},
    currentCourse: null,

    editingCourseId: null,
    editingDrugId: null,
    editingLogId: null,
    editingAnalysisId: null,
    extraRows: [],

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