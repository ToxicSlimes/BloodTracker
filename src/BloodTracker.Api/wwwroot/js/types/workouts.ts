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
  name: string
  target: string
  bodyPart: string
  equipment: string
  gifUrl?: string
  secondaryMuscles?: string[]
  instructions?: string[]
}
