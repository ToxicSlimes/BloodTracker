export enum DrugType {
  Oral = 0,
  Injectable = 1,
  Subcutaneous = 2,
  Transdermal = 3,
  Nasal = 4,
}

export enum DrugCategory {
  AAS = 0,
  Peptide = 1,
  SARM = 2,
  PCT = 3,
  FatBurner = 4,
  GrowthHormone = 5,
  AntiEstrogen = 6,
  Insulin = 7,
  Prohormone = 8,
  DopamineAgonist = 9,
  Other = 10,
}

export enum DrugSubcategory {
  None = 0,
  Testosterone = 1,
  Nandrolone = 2,
  Trenbolone = 3,
  Boldenone = 4,
  Drostanolone = 5,
  Methenolone = 6,
  OralAAS = 7,
  GHRP = 8,
  GHRH = 9,
  HealingPeptide = 10,
  Melanotropin = 11,
  GLP1Agonist = 12,
  Thyroid = 13,
  AromataseInhibitor = 14,
  SERM = 15,
  General = 16,
}

export enum ValueStatus {
  Normal = 0,
  Low = 1,
  SlightlyHigh = 2,
  High = 3,
  Pending = 4,
}

export enum ManufacturerType {
  Pharmaceutical = 0,
  UGL = 1,
}

export enum MuscleGroup {
  FullBody = 0,
  Chest = 1,
  Back = 2,
  Shoulders = 3,
  Biceps = 4,
  Triceps = 5,
  Forearms = 6,
  Abs = 7,
  Glutes = 8,
  Quadriceps = 9,
  Hamstrings = 10,
  Calves = 11,
}
