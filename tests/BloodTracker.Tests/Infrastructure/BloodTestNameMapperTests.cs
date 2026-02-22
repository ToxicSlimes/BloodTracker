using System.Reflection;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Infrastructure;

public class BloodTestNameMapperTests
{
    private static Type GetMapperType()
    {
        var assembly = Assembly.Load("BloodTracker.Infrastructure");
        return assembly.GetType("BloodTracker.Infrastructure.Services.BloodTestNameMapper")!;
    }

    private static Dictionary<string, string[]> GetNameMappings()
    {
        var mapperType = GetMapperType();
        var field = mapperType.GetField("NameMappings", BindingFlags.Public | BindingFlags.Static);
        return (Dictionary<string, string[]>)field!.GetValue(null)!;
    }

    private static Dictionary<string, (double Min, double Max)> GetExpectedRanges()
    {
        var mapperType = GetMapperType();
        var field = mapperType.GetField("ExpectedRanges", BindingFlags.Public | BindingFlags.Static);
        return (Dictionary<string, (double Min, double Max)>)field!.GetValue(null)!;
    }

    private static bool ValidateValue(string key, double value)
    {
        var mapperType = GetMapperType();
        var method = mapperType.GetMethod("ValidateValue", BindingFlags.Public | BindingFlags.Static);
        return (bool)method!.Invoke(null, new object[] { key, value })!;
    }

    [Fact]
    public void NameMappings_Should_ContainTestosteroneMapping()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert
        mappings.Should().ContainKey("testosterone");
        mappings["testosterone"].Should().Contain("Тестостерон общий");
    }

    [Fact]
    public void NameMappings_Should_ContainFreeTestosteroneMapping()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert
        mappings.Should().ContainKey("free-testosterone");
        mappings["free-testosterone"].Should().Contain("Тестостерон свободный");
    }

    [Fact]
    public void NameMappings_Should_ContainCholesterolMappings()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert
        mappings.Should().ContainKey("cholesterol");
        mappings.Should().ContainKey("hdl");
        mappings.Should().ContainKey("ldl");
        mappings.Should().ContainKey("triglycerides");
        
        mappings["hdl"].Should().Contain("ЛПВП, HDL");
        mappings["ldl"].Should().Contain("ЛПНП, LDL");
    }

    [Fact]
    public void NameMappings_Should_ContainHormoneMappings()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert
        mappings.Should().ContainKey("lh");
        mappings.Should().ContainKey("fsh");
        mappings.Should().ContainKey("prolactin");
        mappings.Should().ContainKey("estradiol");
        mappings.Should().ContainKey("tsh");
        
        mappings["lh"].Should().Contain("Лютеинизирующий гормон");
        mappings["fsh"].Should().Contain("Фолликулостимулирующий гормон");
    }

    [Fact]
    public void NameMappings_Should_ContainLiverEnzymeMappings()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert
        mappings.Should().ContainKey("alt");
        mappings.Should().ContainKey("ast");
        mappings.Should().ContainKey("ggt");
        mappings.Should().ContainKey("alp");
    }

    [Fact]
    public void NameMappings_Should_BeCaseInsensitive()
    {
        // Arrange & Act
        var mappings = GetNameMappings();

        // Assert - Try accessing with different case
        mappings.Should().ContainKey("testosterone");
        mappings.Should().ContainKey("TESTOSTERONE");
        mappings.Should().ContainKey("Testosterone");
    }

    [Fact]
    public void ExpectedRanges_Should_ContainTestosteroneRange()
    {
        // Arrange & Act
        var ranges = GetExpectedRanges();

        // Assert
        ranges.Should().ContainKey("testosterone");
        ranges["testosterone"].Min.Should().BeGreaterThan(0);
        ranges["testosterone"].Max.Should().BeGreaterThan(ranges["testosterone"].Min);
    }

    [Fact]
    public void ExpectedRanges_Should_ContainGlucoseRange()
    {
        // Arrange & Act
        var ranges = GetExpectedRanges();

        // Assert
        ranges.Should().ContainKey("glucose");
        ranges["glucose"].Min.Should().Be(1);
        ranges["glucose"].Max.Should().Be(30);
    }

    [Fact]
    public void ValidateValue_Should_AcceptValueWithinRange()
    {
        // Arrange
        var key = "glucose";
        var value = 5.5;

        // Act
        var result = ValidateValue(key, value);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void ValidateValue_Should_RejectValueBelowRange()
    {
        // Arrange
        var key = "glucose";
        var value = 0.5;

        // Act
        var result = ValidateValue(key, value);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateValue_Should_RejectValueAboveRange()
    {
        // Arrange
        var key = "glucose";
        var value = 31.0;

        // Act
        var result = ValidateValue(key, value);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateValue_Should_AcceptValueAtRangeBoundaries()
    {
        // Arrange
        var key = "glucose";
        var minValue = 1.0;
        var maxValue = 30.0;

        // Act
        var minResult = ValidateValue(key, minValue);
        var maxResult = ValidateValue(key, maxValue);

        // Assert
        minResult.Should().BeTrue();
        maxResult.Should().BeTrue();
    }

    [Fact]
    public void ValidateValue_Should_ReturnTrue_ForUnknownKey()
    {
        // Arrange
        var key = "unknown-test";
        var value = 999.0;

        // Act
        var result = ValidateValue(key, value);

        // Assert
        result.Should().BeTrue(); // Unknown keys are not validated
    }

    [Theory]
    [InlineData("testosterone", 25.0, true)]
    [InlineData("testosterone", 150.0, false)]
    [InlineData("cholesterol", 5.0, true)]
    [InlineData("cholesterol", 15.0, false)]
    [InlineData("alt", 50.0, true)]
    [InlineData("alt", 600.0, false)]
    public void ValidateValue_Should_ValidateMultipleTests(string key, double value, bool expected)
    {
        // Act
        var result = ValidateValue(key, value);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void NameMappings_Should_HaveConsistentKeysWithExpectedRanges()
    {
        // Arrange
        var mappings = GetNameMappings();
        var ranges = GetExpectedRanges();

        // Act & Assert - All range keys should have corresponding mappings
        foreach (var rangeKey in ranges.Keys)
        {
            mappings.Should().ContainKey(rangeKey, 
                $"Range key '{rangeKey}' should have a corresponding name mapping");
        }
    }
}
