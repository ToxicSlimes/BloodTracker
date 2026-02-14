import type { MuscleGroup } from './enums'

export interface WorkoutProgramDto {
  id: string
  title: string
  notes?: string
}

export interface WorkoutDayDto {
  id: string
  programId: string
  dayOfWeek: number
  title?: string
  notes?: string
}

export interface WorkoutExerciseDto {
  id: string
  programId: string
  dayId: string
  name: string
  muscleGroup: MuscleGroup
  notes?: string
}

export interface WorkoutSetDto {
  id: string
  exerciseId: string
  repetitions?: number
  weight?: number
  duration?: string
  notes?: string
}

export interface ExerciseCatalogEntry {
  id: string
  nameRu: string
  nameEn: string
  bodyPart: string
  target: string
  equipment: string
  muscleGroup: number
  secondaryMuscles: number[]
  exerciseType: string
  category: string
  instructions?: string
}

export interface WorkoutSessionSetDto {
  id: string
  exerciseId: string
  sourceSetId?: string
  orderIndex: number
  plannedWeight?: number
  plannedRepetitions?: number
  plannedDurationSeconds?: number
  actualWeight?: number
  actualWeightKg?: number
  actualRepetitions?: number
  actualDurationSeconds?: number
  rpe?: number
  type?: string
  notes?: string
  previousWeight?: number
  previousReps?: number
  startedAt?: string
  completedAt?: string
  restAfterSeconds?: number
  comparison?: string
}

export interface WorkoutSessionExerciseDto {
  id: string
  sessionId: string
  sourceExerciseId?: string
  name: string
  muscleGroup: string
  notes?: string
  orderIndex: number
  startedAt?: string
  completedAt?: string
  sets: WorkoutSessionSetDto[]
}

export interface WorkoutSessionDto {
  id: string
  userId: string
  sourceProgramId?: string
  sourceDayId?: string
  title: string
  notes?: string
  startedAt: string
  completedAt?: string
  durationSeconds: number
  status: string
  totalTonnage: number
  totalVolume: number
  totalSetsCompleted: number
  averageIntensity: number
  averageRestSeconds: number
  exercises: WorkoutSessionExerciseDto[]
}

export interface WorkoutSessionSummaryDto {
  session: WorkoutSessionDto
  comparedToPrevious?: {
    tonnageDelta: number
    volumeDelta: number
    durationDelta: number
  }
}

export interface PreviousExerciseDataDto {
  exerciseName: string
  sessionDate: string
  sets: Array<{
    weight?: number
    repetitions?: number
    rpe?: number
  }>
}

export interface WorkoutDurationEstimateDto {
  estimatedMinutes: number
  totalSets: number
  totalExercises: number
}

export interface CompleteSetResultDto {
  set: WorkoutSessionSetDto
  isNewPR: boolean
  newPRs: PRDetailDto[]
}

export interface PRDetailDto {
  recordType: string
  value: number
  previousValue: number | null
  improvementPercent: number
  exerciseName: string
}

export interface UserExercisePRDto {
  exerciseName: string
  bestWeight: number | null
  bestWeightDate: string | null
  bestE1RM: number | null
  bestE1RMDate: string | null
  bestVolumeSingleSession: number | null
  bestVolumeDate: string | null
  repPRsByWeight: Record<string, { reps: number; date: string }>
}
