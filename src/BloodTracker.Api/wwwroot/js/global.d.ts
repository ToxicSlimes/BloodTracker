import type { toast } from './components/toast.js'

declare global {
  interface Window {
    toast: typeof toast
    skeleton: {
      card(): string
      drugCards(count: number): string
      alertCards(count: number): string
      donutPlaceholder(): string
    }
    loginPage: {
      sendCode(): void
      verifyCode(): void
      backToEmail(): void
    }
    renderWorkouts: () => Promise<void>
    saveCourse: () => Promise<void>
    editCourse: () => void
    drugTypeBadge: (type: number) => string
    renderDrugs: () => void
    renderIntakeLogs: () => void
    updateLogDrugSelect: () => void
    openDrugModal: (drug?: unknown) => void
    openIntakeLogModal: (log?: unknown) => void
    openPurchaseModal: (purchase?: unknown) => void
    deleteWorkoutProgram: (id: string) => Promise<void>
    deleteWorkoutDay: (id: string) => Promise<void>
    deleteWorkoutExercise: (id: string) => Promise<void>
    deleteWorkoutSet: (id: string) => Promise<void>
    duplicateWorkoutDay: (id: string) => Promise<void>
    duplicateWorkoutExercise: (id: string) => Promise<void>
    duplicateWorkoutSet: (id: string) => Promise<void>
    handleGoogleCredential: (response: unknown) => void
    courseTabs: {
      switchTab(tab: string): void
    }
    compareAnalyses: () => Promise<void>
    initAdminPage: () => void
  }

  const ApexCharts: any
}

export {}
