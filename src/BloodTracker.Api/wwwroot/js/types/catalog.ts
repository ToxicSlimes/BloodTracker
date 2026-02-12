import type { DrugCategory, DrugSubcategory, DrugType, ManufacturerType } from './enums'

export interface PharmacologyInfo {
  halfLife?: string
  detectionTime?: string
  anabolicRating?: number
  androgenicRating?: number
  commonDosages?: string
}

export interface SubstanceDescription {
  text?: string
  effects?: string
  sideEffects?: string
  notes?: string
}

export interface CatalogMeta {
  isPopular: boolean
  sortOrder: number
  hasBothForms: boolean
  pubMedSearchTerm?: string
}

export interface StudyReference {
  citation: string
  pmid?: number
  design?: string
  finding: string
}

export interface BloodworkMarker {
  name: string
  frequency?: string
  why?: string
}

export interface DrugInteraction {
  drug: string
  effect: string
  severity: 'info' | 'warning' | 'danger'
}

export interface ContraindicationsInfo {
  absolute: string[]
  relative: string[]
}

export interface ResearchData {
  mechanism?: string
  studies: StudyReference[]
  bloodwork: BloodworkMarker[]
  interactions: DrugInteraction[]
  contraindications?: ContraindicationsInfo
  practicalNotes?: string
}

export interface DrugCatalogItem {
  id: string
  name: string
  nameEn?: string
  category: DrugCategory
  subcategory?: DrugSubcategory
  drugType: DrugType
  activeSubstance?: string
  pharmacology: PharmacologyInfo
  description: SubstanceDescription
  meta: CatalogMeta
  research?: ResearchData
}

export interface Manufacturer {
  id: string
  name: string
  type: ManufacturerType
  country?: string
  website?: string
  description?: string
  sortOrder: number
}
