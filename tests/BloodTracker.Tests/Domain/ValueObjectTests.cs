using BloodTracker.Domain.Models.ValueObjects;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class ValueObjectTests
{
    // === Dosage ===

    [Fact]
    public void Dosage_Should_CreateWithValue()
    {
        var dosage = new Dosage("250mg");
        dosage.Value.Should().Be("250mg");
    }

    [Fact]
    public void Dosage_Should_TrimWhitespace()
    {
        var dosage = new Dosage("  250mg  ");
        dosage.Value.Should().Be("250mg");
    }

    [Fact]
    public void Dosage_Should_RejectNull()
    {
        var act = () => new Dosage(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Dosage_Should_ImplicitConvertToString()
    {
        Dosage dosage = new("250mg");
        string result = dosage;
        result.Should().Be("250mg");
    }

    [Fact]
    public void Dosage_Should_ImplicitConvertFromString()
    {
        Dosage dosage = "500mg";
        dosage.Value.Should().Be("500mg");
    }

    [Fact]
    public void Dosage_ToString_Should_ReturnValue()
    {
        var dosage = new Dosage("100mg EOD");
        dosage.ToString().Should().Be("100mg EOD");
    }

    // === Money ===

    [Fact]
    public void Money_Should_CreateWithPositiveAmount()
    {
        var money = new Money(99.99m);
        money.Amount.Should().Be(99.99m);
    }

    [Fact]
    public void Money_Should_AllowZero()
    {
        var money = new Money(0m);
        money.Amount.Should().Be(0m);
    }

    [Fact]
    public void Money_Should_RejectNegative()
    {
        var act = () => new Money(-1m);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Money_Should_ImplicitConvertToDecimal()
    {
        Money money = new(42.50m);
        decimal result = money;
        result.Should().Be(42.50m);
    }

    [Fact]
    public void Money_Should_ImplicitConvertFromDecimal()
    {
        Money money = 100m;
        money.Amount.Should().Be(100m);
    }

    [Fact]
    public void Money_ToString_Should_FormatWith2Decimals()
    {
        var money = new Money(5m);
        money.ToString().Should().MatchRegex(@"^5[.,]00$");
    }

    // === DateRange ===

    [Fact]
    public void DateRange_Should_CreateWithValidDates()
    {
        var start = new DateTime(2024, 1, 1);
        var end = new DateTime(2024, 3, 31);
        var range = new DateRange(start, end);

        range.Start.Should().Be(start);
        range.End.Should().Be(end);
    }

    [Fact]
    public void DateRange_Should_RejectEndBeforeStart()
    {
        var act = () => new DateRange(new DateTime(2024, 3, 1), new DateTime(2024, 1, 1));
        act.Should().Throw<ArgumentException>().WithMessage("*end*start*");
    }

    [Fact]
    public void DateRange_TotalDays_Should_CalculateInclusive()
    {
        var range = new DateRange(new DateTime(2024, 1, 1), new DateTime(2024, 1, 10));
        range.TotalDays.Should().Be(10);
    }

    [Fact]
    public void DateRange_TotalDays_Should_Be1ForSameDay()
    {
        var date = new DateTime(2024, 6, 15);
        var range = new DateRange(date, date);
        range.TotalDays.Should().Be(1);
    }

    [Fact]
    public void DateRange_CurrentDay_Should_CalculateFromToday()
    {
        var start = DateTime.Today.AddDays(-5);
        var end = DateTime.Today.AddDays(5);
        var range = new DateRange(start, end);

        range.CurrentDay.Should().Be(6); // day 1 + 5 days elapsed
    }

    [Fact]
    public void DateRange_ToString_Should_FormatDates()
    {
        var range = new DateRange(new DateTime(2024, 1, 15), new DateTime(2024, 6, 30));
        range.ToString().Should().Be("2024-01-15 to 2024-06-30");
    }
}
