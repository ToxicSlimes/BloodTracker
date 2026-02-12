import type { ValueStatus } from './enums'

export interface AnalysisDto {
  id: string
  date: string
  label: string
  laboratory?: string
  notes?: string
  values: Record<string, number>
}

export interface AnalysisValueDto {
  key: string
  name: string
  value: number
  unit: string
  refMin: number
  refMax: number
  status: ValueStatus
}

export interface CreateAnalysisDto {
  date: string
  label: string
  laboratory?: string
  notes?: string
  values: Record<string, number>
}

export interface CompareAnalysesDto {
  before: AnalysisDto
  after: AnalysisDto
  comparisons: ComparisonValueDto[]
}

export interface ComparisonValueDto {
  key: string
  name: string
  unit: string
  beforeValue?: number
  afterValue?: number
  deltaPercent?: number
  beforeStatus: ValueStatus
  afterStatus: ValueStatus
}

export interface ImportPdfResultDto {
  success: boolean
  analysis?: AnalysisDto
  errorMessage?: string
  parsedValuesCount: number
  unrecognizedItems: string[]
  detectedLaboratory?: string
  detectedDate?: string
}

export interface AlertDto {
  name: string
  value: number
  unit: string
  status: ValueStatus
  refMin: number
  refMax: number
}

export interface ReferenceRange {
  key: string
  name: string
  unit: string
  min: number
  max: number
}
