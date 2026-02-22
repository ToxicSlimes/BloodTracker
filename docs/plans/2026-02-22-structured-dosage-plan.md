# Structured Dosage Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured numeric dosage fields to Drug/IntakeLog/Purchase with a DoseParser service for flexible user input (mg, ml, IU, tab, multipliers) and accurate inventory tracking in physical units.

**Architecture:** Add `DoseUnit` enum + numeric fields to domain entities. New `IDoseParser` service in Application layer parses user input strings and resolves doses. Handlers use parser during create/update. Frontend modals get structured dose fields + multiplier buttons. Inventory calculations switch from abstract counts to physical units.

**Tech Stack:** .NET 8, LiteDB, MediatR, FluentValidation, React/TypeScript frontend

**Design doc:** `docs/plans/2026-02-22-structured-dosage-design.md`

---

### Task 1: Add DoseUnit enum

**Files:**
- Create: `src/BloodTracker.Domain/Models/Enums/DoseUnit.cs`

**Step 1: Create the enum file**

```csharp
namespace BloodTracker.Domain.Models;

public enum DoseUnit
{
    mg,
    ml,
    IU,
    tab
}
```

**Step 2: Verify compilation**

Run: `dotnet build src/BloodTracker.Domain`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add src/BloodTracker.Domain/Models/Enums/DoseUnit.cs
git commit -m "feat(domain): add DoseUnit enum (mg, ml, IU, tab)"
```

---

### Task 2: Add structured fields to domain entities

**Files:**
- Modify: `src/BloodTracker.Domain/Models/Drug.cs` (after line 13)
- Modify: `src/BloodTracker.Domain/Models/IntakeLog.cs` (after line 12)
- Modify: `src/BloodTracker.Domain/Models/Purchase.cs` (after line 15)

**Step 1: Add fields to Drug.cs**

After `public string? ManufacturerId { get; set; }` add:

```csharp
public double? StandardDoseValue { get; set; }
public DoseUnit? StandardDoseUnit { get; set; }
public double? ConcentrationMgPerMl { get; set; }
public double? PackageSize { get; set; }
public DoseUnit? PackageUnit { get; set; }
```

**Step 2: Add fields to IntakeLog.cs**

After `public Guid? PurchaseId { get; set; }` add:

```csharp
public double? DoseValue { get; set; }
public DoseUnit? DoseUnit { get; set; }
public double? DoseMultiplier { get; set; }
public double? ConsumedAmount { get; set; }
public DoseUnit? ConsumedUnit { get; set; }
```

**Step 3: Add fields to Purchase.cs**

After `public string? ManufacturerName { get; set; }` add:

```csharp
public double? TotalAmount { get; set; }
public DoseUnit? AmountUnit { get; set; }
```

**Step 4: Verify compilation**

Run: `dotnet build src/BloodTracker.Domain`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add src/BloodTracker.Domain/Models/Drug.cs src/BloodTracker.Domain/Models/IntakeLog.cs src/BloodTracker.Domain/Models/Purchase.cs
git commit -m "feat(domain): add structured dosage fields to Drug, IntakeLog, Purchase"
```

---

### Task 3: Update DTOs

**Files:**
- Modify: `src/BloodTracker.Application/Courses/Dto/CourseDtos.cs`
- Modify: `src/BloodTracker.Application/Courses/Dto/PurchaseDtos.cs`

**Step 1: Update DrugDto** (line 29, before closing brace)

Add to `DrugDto`:
```csharp
public double? StandardDoseValue { get; init; }
public DoseUnit? StandardDoseUnit { get; init; }
public double? ConcentrationMgPerMl { get; init; }
public double? PackageSize { get; init; }
public DoseUnit? PackageUnit { get; init; }
```

Add to `CreateDrugDto` (line 62, before closing brace):
```csharp
public double? StandardDoseValue { get; init; }
public DoseUnit? StandardDoseUnit { get; init; }
public double? ConcentrationMgPerMl { get; init; }
public double? PackageSize { get; init; }
public DoseUnit? PackageUnit { get; init; }
```

Add to `UpdateDrugDto` (line 75, before closing brace):
```csharp
public double? StandardDoseValue { get; init; }
public DoseUnit? StandardDoseUnit { get; init; }
public double? ConcentrationMgPerMl { get; init; }
public double? PackageSize { get; init; }
public DoseUnit? PackageUnit { get; init; }
```

**Step 2: Update IntakeLogDto** (line 41, before closing brace)

Add to `IntakeLogDto`:
```csharp
public double? DoseValue { get; init; }
public DoseUnit? DoseUnit { get; init; }
public double? DoseMultiplier { get; init; }
public double? ConsumedAmount { get; init; }
public DoseUnit? ConsumedUnit { get; init; }
```

Add to `CreateIntakeLogDto` (line 84):
```csharp
public double? DoseValue { get; init; }
public DoseUnit? DoseUnit { get; init; }
public double? DoseMultiplier { get; init; }
```

Add to `UpdateIntakeLogDto` (line 93):
```csharp
public double? DoseValue { get; init; }
public DoseUnit? DoseUnit { get; init; }
public double? DoseMultiplier { get; init; }
```

**Step 3: Update PurchaseDtos.cs**

Add to `PurchaseDto` (line 15):
```csharp
public double? TotalAmount { get; init; }
public DoseUnit? AmountUnit { get; init; }
```

Add to `CreatePurchaseDto` (line 26):
```csharp
public double? TotalAmount { get; init; }
public DoseUnit? AmountUnit { get; init; }
```

Add to `UpdatePurchaseDto` (line 37):
```csharp
public double? TotalAmount { get; init; }
public DoseUnit? AmountUnit { get; init; }
```

Update `InventoryItemDto` — change `int` to `double` for structured tracking:
```csharp
public double? TotalAmountStructured { get; init; }
public double? ConsumedAmountStructured { get; init; }
public double? RemainingAmountStructured { get; init; }
public DoseUnit? AmountUnit { get; init; }
```

Update `PerPurchaseStockDto` — add structured fields:
```csharp
public double? TotalAmountStructured { get; init; }
public double? ConsumedAmountStructured { get; init; }
public double? RemainingAmountStructured { get; init; }
public DoseUnit? AmountUnit { get; init; }
```

**Step 4: Verify compilation**

Run: `dotnet build src/BloodTracker.Application`
Expected: Build succeeded (may have warnings about unused fields — fix in later tasks)

**Step 5: Commit**

```bash
git add src/BloodTracker.Application/Courses/Dto/
git commit -m "feat(dto): add structured dosage fields to all DTOs"
```

---

### Task 4: Create DoseParser service

**Files:**
- Create: `src/BloodTracker.Application/Common/IDoseParser.cs`
- Create: `src/BloodTracker.Infrastructure/Services/DoseParser.cs`
- Modify: `src/BloodTracker.Infrastructure/DependencyInjection.cs` (register service)

**Step 1: Create IDoseParser interface + DoseResult record**

In `src/BloodTracker.Application/Common/IDoseParser.cs`:

```csharp
using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Common;

public sealed record DoseResult
{
    public double DoseValue { get; init; }
    public DoseUnit DoseUnit { get; init; }
    public double DoseMultiplier { get; init; }
    public double ConsumedAmount { get; init; }
    public DoseUnit ConsumedUnit { get; init; }
    public string DisplayText { get; init; } = "";
}

public interface IDoseParser
{
    DoseResult? Parse(string input, Drug drug);
}
```

**Step 2: Implement DoseParser**

In `src/BloodTracker.Infrastructure/Services/DoseParser.cs`:

```csharp
using System.Globalization;
using System.Text.RegularExpressions;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Services;

public sealed partial class DoseParser : IDoseParser
{
    [GeneratedRegex(@"^[x×]?([\d.,]+)[x×]?$", RegexOptions.IgnoreCase)]
    private static partial Regex MultiplierPattern();

    [GeneratedRegex(@"^([\d.,]+)\s*(mg|мг|ml|мл|iu|ед|ed|tab|таб)$", RegexOptions.IgnoreCase)]
    private static partial Regex UnitPattern();

    public DoseResult? Parse(string input, Drug drug)
    {
        if (string.IsNullOrWhiteSpace(input) || drug.StandardDoseValue is null || drug.StandardDoseUnit is null)
            return null;

        var trimmed = input.Trim();
        var stdVal = drug.StandardDoseValue.Value;
        var stdUnit = drug.StandardDoseUnit.Value;

        var unitMatch = UnitPattern().Match(trimmed);
        if (unitMatch.Success)
        {
            var value = ParseNumber(unitMatch.Groups[1].Value);
            if (value is null || value <= 0) return null;

            var unit = NormalizeUnit(unitMatch.Groups[2].Value);
            if (unit is null) return null;

            return ResolveWithUnit(value.Value, unit.Value, drug, stdVal, stdUnit);
        }

        var multMatch = MultiplierPattern().Match(trimmed);
        if (multMatch.Success)
        {
            var multiplier = ParseNumber(multMatch.Groups[1].Value);
            if (multiplier is null || multiplier <= 0) return null;

            return ResolveWithMultiplier(multiplier.Value, drug, stdVal, stdUnit);
        }

        return null;
    }

    private static DoseResult? ResolveWithUnit(double value, DoseUnit inputUnit, Drug drug, double stdVal, DoseUnit stdUnit)
    {
        double doseInStdUnit;
        double consumedAmount;
        DoseUnit consumedUnit;

        if (inputUnit == DoseUnit.ml && drug.ConcentrationMgPerMl is > 0)
        {
            doseInStdUnit = value * drug.ConcentrationMgPerMl.Value;
            consumedAmount = value;
            consumedUnit = DoseUnit.ml;

            if (stdUnit != DoseUnit.mg)
                return null;
        }
        else if (inputUnit == stdUnit)
        {
            doseInStdUnit = value;
            consumedAmount = CalculateConsumed(value, drug, stdVal, stdUnit);
            consumedUnit = drug.PackageUnit ?? stdUnit;
        }
        else if (inputUnit == DoseUnit.tab && stdUnit == DoseUnit.mg)
        {
            doseInStdUnit = value * stdVal;
            consumedAmount = value;
            consumedUnit = DoseUnit.tab;
        }
        else
        {
            return null;
        }

        var multiplier = doseInStdUnit / stdVal;
        var displayUnit = stdUnit == DoseUnit.mg && drug.ConcentrationMgPerMl is > 0
            ? $"{doseInStdUnit}{stdUnit} ({consumedAmount}{consumedUnit})"
            : $"{doseInStdUnit}{stdUnit}";

        return new DoseResult
        {
            DoseValue = doseInStdUnit,
            DoseUnit = stdUnit,
            DoseMultiplier = Math.Round(multiplier, 4),
            ConsumedAmount = consumedAmount,
            ConsumedUnit = consumedUnit,
            DisplayText = $"{displayUnit} ({multiplier:0.##}x)"
        };
    }

    private static DoseResult ResolveWithMultiplier(double multiplier, Drug drug, double stdVal, DoseUnit stdUnit)
    {
        var doseValue = multiplier * stdVal;
        var consumed = CalculateConsumed(doseValue, drug, stdVal, stdUnit);
        var consumedUnit = drug.PackageUnit ?? stdUnit;

        return new DoseResult
        {
            DoseValue = doseValue,
            DoseUnit = stdUnit,
            DoseMultiplier = multiplier,
            ConsumedAmount = consumed,
            ConsumedUnit = consumedUnit,
            DisplayText = $"{doseValue}{stdUnit} ({multiplier:0.##}x)"
        };
    }

    private static double CalculateConsumed(double doseValue, Drug drug, double stdVal, DoseUnit stdUnit)
    {
        if (drug.ConcentrationMgPerMl is > 0 && stdUnit == DoseUnit.mg)
            return doseValue / drug.ConcentrationMgPerMl.Value;

        if (stdUnit == DoseUnit.mg && drug.PackageUnit == DoseUnit.tab)
            return doseValue / stdVal;

        return doseValue;
    }

    private static double? ParseNumber(string s)
    {
        s = s.Replace(',', '.');
        return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    private static DoseUnit? NormalizeUnit(string s) => s.ToLowerInvariant() switch
    {
        "mg" or "мг" => DoseUnit.mg,
        "ml" or "мл" => DoseUnit.ml,
        "iu" or "ед" or "ed" => DoseUnit.IU,
        "tab" or "таб" => DoseUnit.tab,
        _ => null
    };
}
```

**Step 3: Register in DI**

Find `src/BloodTracker.Infrastructure/DependencyInjection.cs` and add:
```csharp
services.AddSingleton<IDoseParser, DoseParser>();
```

**Step 4: Verify compilation**

Run: `dotnet build`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add src/BloodTracker.Application/Common/IDoseParser.cs src/BloodTracker.Infrastructure/Services/DoseParser.cs src/BloodTracker.Infrastructure/DependencyInjection.cs
git commit -m "feat: add DoseParser service for flexible dose input parsing"
```

---

### Task 5: Update mapping extensions

**Files:**
- Modify: `src/BloodTracker.Application/Courses/Mapping/CourseMappingExtensions.cs`

**Step 1: Update Drug.ToDto()** — add new fields to mapping (lines 53-66):

After `ManufacturerName = mfrName` add:
```csharp
StandardDoseValue = drug.StandardDoseValue,
StandardDoseUnit = drug.StandardDoseUnit,
ConcentrationMgPerMl = drug.ConcentrationMgPerMl,
PackageSize = drug.PackageSize,
PackageUnit = drug.PackageUnit,
```

**Step 2: Update IntakeLog.ToDto() overloads** — both versions (lines 75-85 and 91-105):

After `PurchaseLabel = ...` add to both:
```csharp
DoseValue = log.DoseValue,
DoseUnit = log.DoseUnit,
DoseMultiplier = log.DoseMultiplier,
ConsumedAmount = log.ConsumedAmount,
ConsumedUnit = log.ConsumedUnit,
```

**Step 3: Update Purchase.ToDto()** (lines 112-127):

After `ManufacturerName = purchase.ManufacturerName` add:
```csharp
TotalAmount = purchase.TotalAmount,
AmountUnit = purchase.AmountUnit,
```

**Step 4: Verify compilation**

Run: `dotnet build`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add src/BloodTracker.Application/Courses/Mapping/CourseMappingExtensions.cs
git commit -m "feat: map structured dosage fields in DTO extensions"
```

---

### Task 6: Update handlers to use new fields + DoseParser

**Files:**
- Modify: `src/BloodTracker.Application/Courses/Handlers/DrugHandlers.cs`
- Modify: `src/BloodTracker.Application/Courses/Handlers/IntakeLogHandlers.cs`
- Modify: `src/BloodTracker.Application/Courses/Handlers/PurchaseHandlers.cs`

**Step 1: Update CreateDrugHandler** (lines 19-29)

Add new fields to Drug initializer after `ManufacturerId`:
```csharp
StandardDoseValue = request.Data.StandardDoseValue,
StandardDoseUnit = request.Data.StandardDoseUnit,
ConcentrationMgPerMl = request.Data.ConcentrationMgPerMl,
PackageSize = request.Data.PackageSize,
PackageUnit = request.Data.PackageUnit
```

**Step 2: Update UpdateDrugHandler** (lines 65-73)

Add after `drug.ManufacturerId = request.Data.ManufacturerId;`:
```csharp
drug.StandardDoseValue = request.Data.StandardDoseValue;
drug.StandardDoseUnit = request.Data.StandardDoseUnit;
drug.ConcentrationMgPerMl = request.Data.ConcentrationMgPerMl;
drug.PackageSize = request.Data.PackageSize;
drug.PackageUnit = request.Data.PackageUnit;
```

**Step 3: Update CreateIntakeLogHandler** — inject IDoseParser, resolve dose

Add `IDoseParser doseParser` to constructor. Before creating IntakeLog entity, resolve the dose:

```csharp
DoseResult? doseResult = null;
if (!string.IsNullOrWhiteSpace(request.Data.Dose) && drug.StandardDoseValue is not null)
    doseResult = doseParser.Parse(request.Data.Dose, drug);
```

Then in the IntakeLog initializer add:
```csharp
DoseValue = request.Data.DoseValue ?? doseResult?.DoseValue,
DoseUnit = request.Data.DoseUnit ?? doseResult?.DoseUnit,
DoseMultiplier = request.Data.DoseMultiplier ?? doseResult?.DoseMultiplier,
ConsumedAmount = doseResult?.ConsumedAmount,
ConsumedUnit = doseResult?.ConsumedUnit
```

**Step 4: Update UpdateIntakeLogHandler** — same pattern

Add `IDoseParser doseParser` to constructor. Before updating fields:

```csharp
DoseResult? doseResult = null;
if (!string.IsNullOrWhiteSpace(request.Data.Dose) && drug.StandardDoseValue is not null)
    doseResult = doseParser.Parse(request.Data.Dose, drug);

log.DoseValue = request.Data.DoseValue ?? doseResult?.DoseValue;
log.DoseUnit = request.Data.DoseUnit ?? doseResult?.DoseUnit;
log.DoseMultiplier = request.Data.DoseMultiplier ?? doseResult?.DoseMultiplier;
log.ConsumedAmount = doseResult?.ConsumedAmount;
log.ConsumedUnit = doseResult?.ConsumedUnit;
```

**Step 5: Update CreatePurchaseHandler** (lines 29-39)

Add to Purchase initializer:
```csharp
TotalAmount = request.Data.TotalAmount,
AmountUnit = request.Data.AmountUnit
```

**Step 6: Update UpdatePurchaseHandler** (lines 67-75)

Add:
```csharp
purchase.TotalAmount = request.Data.TotalAmount;
purchase.AmountUnit = request.Data.AmountUnit;
```

**Step 7: Update GetInventoryHandler** — use structured amounts where available

In the inventory calculation (lines 136-193), when `TotalAmount` and `AmountUnit` are set on purchases, use them for stock tracking instead of `Quantity` counting:

After line 146 (`var drugPurchases = ...`), check if structured data available:
```csharp
var hasStructuredDosage = drugPurchases.Any(p => p.TotalAmount.HasValue);
```

For structured tracking, calculate ConsumedAmountStructured by summing `IntakeLog.ConsumedAmount` per purchase. Populate the new DTO fields alongside existing int-based ones for backward compat.

**Step 8: Verify compilation**

Run: `dotnet build`
Expected: Build succeeded

**Step 9: Commit**

```bash
git add src/BloodTracker.Application/Courses/Handlers/
git commit -m "feat: integrate DoseParser into intake/drug/purchase handlers"
```

---

### Task 7: Update validators

**Files:**
- Modify: `src/BloodTracker.Application/Courses/Validators/CreateDrugValidator.cs`
- Modify: `src/BloodTracker.Application/Courses/Validators/UpdateDrugValidator.cs`
- Modify: `src/BloodTracker.Application/Courses/Validators/CreatePurchaseValidator.cs`
- Modify: `src/BloodTracker.Application/Courses/Validators/UpdatePurchaseValidator.cs`

**Step 1: Add drug validation rules**

```csharp
RuleFor(x => x.Data.StandardDoseValue)
    .GreaterThan(0).When(x => x.Data.StandardDoseValue.HasValue);
RuleFor(x => x.Data.ConcentrationMgPerMl)
    .GreaterThan(0).When(x => x.Data.ConcentrationMgPerMl.HasValue);
RuleFor(x => x.Data.PackageSize)
    .GreaterThan(0).When(x => x.Data.PackageSize.HasValue);
```

**Step 2: Add purchase validation rules**

```csharp
RuleFor(x => x.Data.TotalAmount)
    .GreaterThan(0).When(x => x.Data.TotalAmount.HasValue);
```

**Step 3: Verify compilation**

Run: `dotnet build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add src/BloodTracker.Application/Courses/Validators/
git commit -m "feat: add validation rules for structured dosage fields"
```

---

### Task 8: Update frontend TypeScript types

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/types/courses.ts`

**Step 1: Add DoseUnit type and update interfaces**

Add type:
```typescript
export type DoseUnit = 'mg' | 'ml' | 'IU' | 'tab';
```

Add to `DrugDto`:
```typescript
standardDoseValue?: number;
standardDoseUnit?: DoseUnit;
concentrationMgPerMl?: number;
packageSize?: number;
packageUnit?: DoseUnit;
```

Add to `IntakeLogDto`:
```typescript
doseValue?: number;
doseUnit?: DoseUnit;
doseMultiplier?: number;
consumedAmount?: number;
consumedUnit?: DoseUnit;
```

Add to `PurchaseDto`, `CreatePurchaseDto`, `UpdatePurchaseDto`:
```typescript
totalAmount?: number;
amountUnit?: DoseUnit;
```

Add to `InventoryItemDto`, `PerPurchaseStockDto`:
```typescript
totalAmountStructured?: number;
consumedAmountStructured?: number;
remainingAmountStructured?: number;
amountUnit?: DoseUnit;
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/types/courses.ts
git commit -m "feat(frontend): add structured dosage types to TypeScript interfaces"
```

---

### Task 9: Update DrugModal with dosage fields

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/components/modals/DrugModal.tsx`

**Step 1: Add state for new fields**

```typescript
const [standardDoseValue, setStandardDoseValue] = useState<number | undefined>();
const [standardDoseUnit, setStandardDoseUnit] = useState<DoseUnit>('mg');
const [concentrationMgPerMl, setConcentrationMgPerMl] = useState<number | undefined>();
const [packageSize, setPackageSize] = useState<number | undefined>();
const [packageUnit, setPackageUnit] = useState<DoseUnit>('ml');
```

**Step 2: Add form section "Учёт дозировки"**

Below existing Dosage/Amount fields, add a bordered section with:
- Number input "Стандартная доза" + DoseUnit select dropdown
- Number input "Концентрация (мг/мл)" — visible only when Type is Injectable/Subcutaneous/Intramuscular
- Number input "Объём упаковки" + DoseUnit select dropdown

**Step 3: Include new fields in handleSave body**

**Step 4: Populate fields when editing existing drug**

**Step 5: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/modals/DrugModal.tsx
git commit -m "feat(frontend): add structured dosage fields to DrugModal"
```

---

### Task 10: Update IntakeLogModal with multiplier buttons + parser preview

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/components/modals/IntakeLogModal.tsx`

**Step 1: Add quick multiplier buttons**

When a drug is selected and has `standardDoseValue`, show:
```
[0.5x] [1x] [1.5x] [2x]
```

Clicking a button fills the dose field with `"0.5"`, `"1"`, etc.

**Step 2: Add live calculation preview**

Below the dose input, show a line like:
```
= 125mg (0.5 дозы) · списание: 0.5ml
```

This calls a local calculation function that mirrors the backend parser logic.

**Step 3: Include structured fields in save payload**

When multiplier buttons are used, send `doseMultiplier` in the DTO. Backend resolves the rest.

**Step 4: Fallback**

If drug has no `standardDoseValue`, show only the plain text dose field (current behavior).

**Step 5: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/modals/IntakeLogModal.tsx
git commit -m "feat(frontend): add multiplier buttons and dose preview to IntakeLogModal"
```

---

### Task 11: Update PurchaseModal with TotalAmount field

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/components/modals/PurchaseModal.tsx`

**Step 1: Add TotalAmount + AmountUnit fields**

Below Quantity field, add:
- Number input "Объём" (totalAmount)
- DoseUnit select (amountUnit)

Auto-fill from Drug's `packageSize`/`packageUnit` if available.

**Step 2: Include in save payload**

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/modals/PurchaseModal.tsx
git commit -m "feat(frontend): add structured volume fields to PurchaseModal"
```

---

### Task 12: Update Inventory display to show physical units

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/CoursePage.tsx` (inventory tab section)

**Step 1: Show structured stock**

When `amountUnit` is available, show:
- "Осталось: 8.5 мл из 10 мл" instead of "Осталось: 17 из 20 доз"
- Per-purchase breakdown in physical units

**Step 2: Update ASCII donut chart**

When structured data available, percentage = `consumedAmountStructured / totalAmountStructured * 100`

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/CoursePage.tsx
git commit -m "feat(frontend): show inventory stock in physical units"
```

---

### Task 13: Full integration check

**Step 1: Build entire solution**

Run: `dotnet build`
Expected: Build succeeded, 0 errors

**Step 2: Run the app locally**

Run: `cd src/BloodTracker.Api && dotnet run`
Expected: App starts at localhost:5000

**Step 3: Manual verification**

1. Open browser to localhost:5000
2. Navigate to Courses → Add Drug with structured fields
3. Log an intake with multiplier buttons
4. Verify inventory shows physical units
5. Verify old drugs (without structured fields) still display correctly

**Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for structured dosage"
```

---

## Task Dependencies

```
Task 1 (enum)
  └→ Task 2 (entities)
       ├→ Task 3 (DTOs)
       │    └→ Task 5 (mappings) → Task 6 (handlers) → Task 7 (validators)
       └→ Task 4 (DoseParser) → Task 6 (handlers)

Task 8 (TS types)
  ├→ Task 9 (DrugModal)
  ├→ Task 10 (IntakeLogModal)
  ├→ Task 11 (PurchaseModal)
  └→ Task 12 (Inventory display)

Task 13 (integration) — after all above
```

Backend tasks (1-7) and frontend tasks (8-12) can run in parallel once Task 3 DTOs are done (API contract established).
