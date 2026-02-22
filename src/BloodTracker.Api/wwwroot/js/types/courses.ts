import type { DrugType } from './enums'

export type DoseUnit = 'mg' | 'ml' | 'IU' | 'tab'

export interface CourseDto {
  id: string
  title: string
  startDate?: string
  endDate?: string
  notes?: string
  isActive: boolean
  currentDay: number
  totalDays: number
}

export interface DrugDto {
  id: string
  name: string
  type: DrugType
  dosage?: string
  amount?: string
  schedule?: string
  notes?: string
  courseId?: string
  catalogItemId?: string
  manufacturerId?: string
  manufacturerName?: string
  standardDoseValue?: number
  standardDoseUnit?: DoseUnit
  concentrationMgPerMl?: number
  packageSize?: number
  packageUnit?: DoseUnit
}

export interface IntakeLogDto {
  id: string
  date: string
  drugId: string
  drugName: string
  dose?: string
  note?: string
  purchaseId?: string
  purchaseLabel?: string
  doseValue?: number
  doseUnit?: DoseUnit
  doseMultiplier?: number
  consumedAmount?: number
  consumedUnit?: DoseUnit
}

export interface PurchaseDto {
  id: string
  drugId: string
  drugName: string
  purchaseDate: string
  quantity: number
  price: number
  vendor?: string
  notes?: string
  manufacturerId?: string
  manufacturerName?: string
  totalAmount?: number
  amountUnit?: DoseUnit
  createdAt: string
}

export interface DashboardDto {
  activeCourse?: CourseDto
  drugs: DrugDto[]
  recentIntakes: IntakeLogDto[]
  analysesCount: number
  lastAnalysisDate?: string
}

export interface DrugStatisticsDto {
  drugId: string
  drugName: string
  totalConsumed: number
  totalPurchased: number
  currentStock: number
  totalSpent: number
}

export interface PurchaseOptionDto {
  id: string
  label: string
  remainingStock: number
}

export interface InventoryItemDto {
  drugId: string
  drugName: string
  totalPurchased: number
  totalConsumed: number
  currentStock: number
  totalSpent: number
  lastPurchaseDate?: string
  lastIntakeDate?: string
  purchaseBreakdown: PerPurchaseStockDto[]
  unallocatedConsumed: number
  totalAmountStructured?: number
  consumedAmountStructured?: number
  remainingAmountStructured?: number
  amountUnit?: DoseUnit
}

export interface PerPurchaseStockDto {
  purchaseId: string
  label: string
  purchased: number
  consumed: number
  remaining: number
  totalAmountStructured?: number
  consumedAmountStructured?: number
  remainingAmountStructured?: number
  amountUnit?: DoseUnit
}

export interface InventoryDto {
  items: InventoryItemDto[]
  totalDrugs: number
  totalSpent: number
}

export interface ConsumptionTimelineDto {
  dataPoints: ConsumptionDataPointDto[]
}

export interface ConsumptionDataPointDto {
  date: string
  count: number
}

export interface PurchaseVsConsumptionDto {
  timeline: TimelinePointDto[]
}

export interface TimelinePointDto {
  date: string
  purchases: number
  consumption: number
  runningStock: number
}
