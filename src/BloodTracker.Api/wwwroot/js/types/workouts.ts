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
  tonnage?: number
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
  previousSessionNotes?: string
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

export interface WeekStatusDto {
  currentWeekSessions: WeekSessionEntryDto[]
  activeSession: ActiveSessionInfoDto | null
}

export interface WeekSessionEntryDto {
  sourceDayId: string | null
  dayOfWeek: number
  sessionId: string
  completedAt: string
  title: string
}

export interface ActiveSessionInfoDto {
  id: string
  title: string
  startedAt: string
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

export interface ExerciseProgressPointDto {
  date: string
  maxWeight: number
  bestEstimated1RM: number
  totalSets: number
  totalReps: number
  totalTonnage: number
  averageRPE: number | null
}

export interface ExerciseProgressDto {
  exerciseName: string
  dataPoints: ExerciseProgressPointDto[]
  currentPR: UserExercisePRDto | null
}

export interface MuscleGroupProgressPointDto {
  year: number
  week: number
  totalSets: number
  totalReps: number
  totalTonnage: number
}

export interface MuscleGroupProgressDto {
  muscleGroup: string
  weekly: MuscleGroupProgressPointDto[]
}

export interface PersonalRecordLogDto {
  id: string
  exerciseName: string
  muscleGroup: string
  recordType: string
  value: number
  previousValue: number | null
  improvementPercent: number
  achievedAt: string
}

export interface WeeklyStatsPointDto {
  year: number
  week: number
  sessions: number
  tonnage: number
  volume: number
  durationSeconds: number
}

export interface WorkoutStatsDto {
  totalWorkouts: number
  totalTonnage: number
  totalVolume: number
  totalDurationSeconds: number
  totalPersonalRecords: number
  avgTonnagePerWorkout: number
  avgVolumePerWorkout: number
  avgDurationSecondsPerWorkout: number
  avgRestSeconds: number
  workoutsPerWeek: number
  muscleGroupFrequency: Record<string, number>
  weeklyTrend: WeeklyStatsPointDto[]
}

export interface StrengthLevelThresholdDto {
  level: string
  weight: number
  ratio: number
}

export interface StrengthLevelDto {
  exerciseName: string
  level: string
  ratio: number
  percentile: number
  nextLevel: string | null
  nextTargetWeight: number | null
  currentE1RM: number
  bodyweight: number
  thresholds: StrengthLevelThresholdDto[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
