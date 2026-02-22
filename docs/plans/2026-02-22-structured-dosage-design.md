# Structured Dosage Tracking System

## Problem

All dosage fields (Drug.Dosage, IntakeLog.Dose, Purchase.Quantity) are free-text strings or abstract integers. The system cannot calculate remaining stock in physical units, convert between mg/ml, or compute weekly totals.

## Solution: Structured Dose Model (Approach A)

Add numeric fields to Drug, IntakeLog, Purchase. Old string fields remain for backward compatibility (LiteDB NoSQL — new fields are simply null on old records).

## Data Model

### New enum: DoseUnit

```csharp
public enum DoseUnit { mg, ml, IU, tab }
```

### Drug — new fields (all nullable, user-entered per drug instance)

```csharp
public double? StandardDoseValue { get; set; }    // 250, 50, 2.4
public DoseUnit? StandardDoseUnit { get; set; }   // mg, tab, IU
public double? ConcentrationMgPerMl { get; set; } // injectables only: mg per 1ml
public double? PackageSize { get; set; }           // 10 (ml), 100 (tab), 24 (IU)
public DoseUnit? PackageUnit { get; set; }         // ml, tab, IU
```

Concentration varies per manufacturer — user fills it for each drug. Existing `Dosage` (string) and `Amount` (string) fields remain.

### IntakeLog — new fields

```csharp
public double? DoseValue { get; set; }      // resolved: 125 (mg), 3.6 (IU)
public DoseUnit? DoseUnit { get; set; }     // mg, ml, IU, tab
public double? DoseMultiplier { get; set; } // 0.5 = half-dose, always calculated
public double? ConsumedAmount { get; set; } // physical: 0.5 (ml), 2 (tab)
public DoseUnit? ConsumedUnit { get; set; } // ml, tab, IU — for inventory
```

Existing `Dose` (string) field remains.

### Purchase — new fields

```csharp
public double? TotalAmount { get; set; }   // 10 (ml), 100 (tab), 24 (IU)
public DoseUnit? AmountUnit { get; set; }  // ml, tab, IU
```

Existing `Quantity` (int) field remains.

## DoseParser Service

`IDoseParser` in Application layer. Input: raw string + Drug. Output: `DoseResult`.

### Recognized formats

| Input | Parsed as |
|---|---|
| `125mg`, `125 мг` | (125, mg) |
| `0.5ml`, `0.5 мл` | (0.5, ml) — converts to mg if concentration available |
| `2 таб`, `2 tab` | (2, tab) |
| `3.6 ED`, `3.6 ЕД`, `3.6 IU` | (3.6, IU) |
| `1.5`, `x1.5`, `1.5x`, `×1.5` | multiplier 1.5 |

### Conversion logic

- **Same unit as StandardDose**: `Multiplier = DoseValue / StandardDoseValue`
- **ml input for injectable**: `DoseValue(mg) = ml × ConcentrationMgPerMl`, then calc multiplier
- **Pure number**: `DoseValue = number × StandardDoseValue`

### ConsumedAmount calculation (for inventory)

- Injectable with concentration: `ConsumedAmount = DoseValue(mg) / ConcentrationMgPerMl` → ml
- Oral tablets: `ConsumedAmount = DoseValue(mg) / StandardDoseValue` → tab count
- IU-based: `ConsumedAmount = DoseValue(IU)` → IU

### Validation

- No StandardDoseValue → parsing impossible, fallback to raw string
- ml input without concentration → error
- Negative/zero values → error

## UI Changes

### Drug Modal

New section "Dose tracking" below existing Dosage/Amount:
- Standard dose: number + unit dropdown (mg/ml/IU/tab)
- Concentration (mg/ml): shown only for Injectable/Subcutaneous/Intramuscular types
- Package size: number + unit dropdown

### IntakeLog Modal

- Quick multiplier buttons: `[0.5x] [1x] [1.5x] [2x]`
- Free text input below: `"125mg"`, `"0.5ml"`, `"3.6 ED"`
- Live calculation hint: `= 125mg (0.5 doses) · stock: -0.5ml`
- Fallback to plain text if drug has no StandardDoseValue

### Purchase Modal

- New "Volume" field (double + unit) alongside/replacing Quantity

### Inventory Tab

- Stock in physical units: "Remaining: 8.5 ml of 10 ml"
- ASCII donut chart: consumed / totalAmount × 100

## Backward Compatibility

LiteDB (NoSQL) requires no migration. New fields are null on old records. Old string fields remain for display. UI gracefully degrades when structured fields are absent.

## Examples

```
Testosterone Enanthate (Balkan): StandardDose=250mg, Concentration=250mg/ml, Package=10ml
  → Intake "0.5ml" → DoseValue=125mg, Multiplier=0.5, Consumed=0.5ml, Stock=9.5ml

Testosterone Enanthate (Other): StandardDose=200mg, Concentration=200mg/ml, Package=10ml
  → Intake "0.5ml" → DoseValue=100mg, Multiplier=0.5, Consumed=0.5ml

Oxymetholone: StandardDose=50mg, Package=100tab
  → Intake "100mg" → DoseValue=100mg, Multiplier=2.0, Consumed=2tab, Stock=98tab

NGENLA: StandardDose=2.4IU, Package=24IU
  → Intake "3.6 ED" → DoseValue=3.6IU, Multiplier=1.5, Consumed=3.6IU, Stock=20.4IU
```
