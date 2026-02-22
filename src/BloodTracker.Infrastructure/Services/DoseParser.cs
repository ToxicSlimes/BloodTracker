using System.Globalization;
using System.Text.RegularExpressions;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Services;

public sealed partial class DoseParser : IDoseParser
{
    [GeneratedRegex(@"^([\d.,]+)\s*(mg|мг|ml|мл|iu|ед|ed|tab|таб)$", RegexOptions.IgnoreCase)]
    private static partial Regex UnitPattern();

    [GeneratedRegex(@"^[x×]?([\d.,]+)[x×]?$", RegexOptions.IgnoreCase)]
    private static partial Regex MultiplierPattern();

    public DoseResult? Parse(string input, Drug drug)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        if (!drug.StandardDoseValue.HasValue || !drug.StandardDoseUnit.HasValue)
            return null;

        var standardDose = drug.StandardDoseValue.Value;
        var standardUnit = drug.StandardDoseUnit.Value;
        var trimmed = input.Trim();

        var unitMatch = UnitPattern().Match(trimmed);
        if (unitMatch.Success)
            return ParseUnitInput(unitMatch, drug, standardDose, standardUnit);

        var multMatch = MultiplierPattern().Match(trimmed);
        if (multMatch.Success)
            return ParseMultiplierInput(multMatch, drug, standardDose, standardUnit);

        return null;
    }

    private static DoseResult? ParseUnitInput(
        Match match, Drug drug, double standardDose, DoseUnit standardUnit)
    {
        if (!TryParseNumber(match.Groups[1].Value, out var value))
            return null;

        var normalizedUnit = NormalizeUnit(match.Groups[2].Value);
        if (normalizedUnit is null)
            return null;

        var doseValue = value;
        var doseUnit = normalizedUnit.Value;
        var consumedAmount = value;
        var consumedUnit = normalizedUnit.Value;

        if (normalizedUnit == DoseUnit.ml && drug.ConcentrationMgPerMl.HasValue)
        {
            doseValue = value * drug.ConcentrationMgPerMl.Value;
            doseUnit = DoseUnit.mg;
            consumedAmount = value;
            consumedUnit = DoseUnit.ml;
        }
        else if (normalizedUnit == DoseUnit.tab && standardUnit == DoseUnit.mg)
        {
            doseValue = value * standardDose;
            doseUnit = DoseUnit.mg;
            consumedAmount = value;
            consumedUnit = DoseUnit.tab;
        }

        var multiplier = standardDose > 0 ? doseValue / standardDose : 1.0;

        if (consumedUnit != doseUnit)
        {
            consumedAmount = CalculateConsumedAmount(doseValue, doseUnit, drug, standardDose);
            consumedUnit = GetConsumedUnit(drug, doseUnit);
        }

        var display = FormatDisplayText(doseValue, doseUnit, consumedAmount, consumedUnit, multiplier);

        return new DoseResult
        {
            DoseValue = doseValue,
            DoseUnit = doseUnit,
            DoseMultiplier = Math.Round(multiplier, 4),
            ConsumedAmount = Math.Round(consumedAmount, 4),
            ConsumedUnit = consumedUnit,
            DisplayText = display
        };
    }

    private static DoseResult? ParseMultiplierInput(
        Match match, Drug drug, double standardDose, DoseUnit standardUnit)
    {
        if (!TryParseNumber(match.Groups[1].Value, out var multiplier))
            return null;

        var doseValue = multiplier * standardDose;
        var doseUnit = standardUnit;
        var consumedAmount = CalculateConsumedAmount(doseValue, doseUnit, drug, standardDose);
        var consumedUnit = GetConsumedUnit(drug, doseUnit);

        var display = FormatDisplayText(doseValue, doseUnit, consumedAmount, consumedUnit, multiplier);

        return new DoseResult
        {
            DoseValue = Math.Round(doseValue, 4),
            DoseUnit = doseUnit,
            DoseMultiplier = Math.Round(multiplier, 4),
            ConsumedAmount = Math.Round(consumedAmount, 4),
            ConsumedUnit = consumedUnit,
            DisplayText = display
        };
    }

    private static double CalculateConsumedAmount(
        double doseValue, DoseUnit doseUnit, Drug drug, double standardDose)
    {
        if (doseUnit == DoseUnit.mg && drug.ConcentrationMgPerMl is > 0)
            return doseValue / drug.ConcentrationMgPerMl.Value;

        if (doseUnit == DoseUnit.mg && drug.PackageUnit == DoseUnit.tab && standardDose > 0)
            return doseValue / standardDose;

        return doseValue;
    }

    private static DoseUnit GetConsumedUnit(Drug drug, DoseUnit doseUnit)
    {
        if (doseUnit == DoseUnit.mg && drug.ConcentrationMgPerMl is > 0)
            return DoseUnit.ml;

        if (doseUnit == DoseUnit.mg && drug.PackageUnit == DoseUnit.tab)
            return DoseUnit.tab;

        return doseUnit;
    }

    private static string FormatDisplayText(
        double doseValue, DoseUnit doseUnit, double consumedAmount, DoseUnit consumedUnit, double multiplier)
    {
        var dose = FormatNumber(doseValue);
        var mult = FormatNumber(multiplier);

        if (consumedUnit != doseUnit)
        {
            var consumed = FormatNumber(consumedAmount);
            return $"{dose}{doseUnit} ({consumed}{consumedUnit}) ({mult}x)";
        }

        return $"{dose}{doseUnit} ({mult}x)";
    }

    private static DoseUnit? NormalizeUnit(string raw)
    {
        return raw.ToLowerInvariant() switch
        {
            "mg" or "мг" => DoseUnit.mg,
            "ml" or "мл" => DoseUnit.ml,
            "iu" or "ед" or "ed" => DoseUnit.IU,
            "tab" or "таб" => DoseUnit.tab,
            _ => null
        };
    }

    private static bool TryParseNumber(string raw, out double value)
    {
        var normalized = raw.Replace(',', '.');
        return double.TryParse(normalized, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    private static string FormatNumber(double value)
    {
        return value == Math.Floor(value)
            ? value.ToString("0", CultureInfo.InvariantCulture)
            : value.ToString("0.##", CultureInfo.InvariantCulture);
    }
}
