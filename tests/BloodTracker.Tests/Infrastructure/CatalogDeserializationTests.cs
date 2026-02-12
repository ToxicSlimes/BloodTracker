using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using BloodTracker.Infrastructure.Services;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Infrastructure;

public class CatalogDeserializationTests
{
    private static readonly Lazy<JsonNode> CatalogJson = new(LoadCatalogJson);

    private static JsonNode LoadCatalogJson()
    {
        var assembly = Assembly.GetAssembly(typeof(DrugCatalogSeedService))!;
        using var stream = assembly.GetManifestResourceStream("BloodTracker.Infrastructure.Data.drug-catalog.json");
        stream.Should().NotBeNull("embedded resource must exist");
        return JsonNode.Parse(stream!)!;
    }

    private static JsonArray Substances => CatalogJson.Value["substances"]!.AsArray();
    private static JsonArray Manufacturers => CatalogJson.Value["manufacturers"]!.AsArray();

    [Fact]
    public void Catalog_Should_LoadFromEmbeddedResource()
    {
        CatalogJson.Value.Should().NotBeNull();
    }

    [Fact]
    public void Catalog_Should_Have132Substances()
    {
        Substances.Should().HaveCount(132);
    }

    [Fact]
    public void Catalog_AllSubstances_Should_HaveResearch()
    {
        foreach (var s in Substances)
        {
            s!["research"].Should().NotBeNull($"substance '{s["id"]}' must have research");
        }
    }

    [Fact]
    public void Catalog_AllResearch_Should_HaveNonEmptyMechanism()
    {
        foreach (var s in Substances)
        {
            var mechanism = s!["research"]?["mechanism"]?.GetValue<string>();
            mechanism.Should().NotBeNullOrWhiteSpace($"substance '{s["id"]}' must have mechanism");
        }
    }

    [Fact]
    public void Catalog_AllResearch_Should_HaveAtLeastOneStudy()
    {
        foreach (var s in Substances)
        {
            var studies = s!["research"]?["studies"]?.AsArray();
            studies.Should().NotBeNullOrEmpty($"substance '{s["id"]}' must have studies");
        }
    }

    [Fact]
    public void Catalog_AllResearch_Should_HaveAtLeastOneBloodworkMarker()
    {
        foreach (var s in Substances)
        {
            var bloodwork = s!["research"]?["bloodwork"]?.AsArray();
            bloodwork.Should().NotBeNullOrEmpty($"substance '{s["id"]}' must have bloodwork markers");
        }
    }

    [Fact]
    public void Catalog_InteractionSeverity_Should_BeValid()
    {
        var validSeverities = new[] { "info", "warning", "danger" };

        foreach (var s in Substances)
        {
            var interactions = s!["research"]?["interactions"]?.AsArray();
            if (interactions == null) continue;

            foreach (var i in interactions)
            {
                var severity = i!["severity"]?.GetValue<string>() ?? "info";
                validSeverities.Should().Contain(severity,
                    $"interaction in '{s["id"]}' has invalid severity '{severity}'");
            }
        }
    }

    [Fact]
    public void Catalog_TestosteroneEnanthate_Should_HaveCorrectData()
    {
        var te = Substances.FirstOrDefault(s => s!["id"]?.GetValue<string>() == "testosterone-enanthate");

        te.Should().NotBeNull();
        te!["name"]?.GetValue<string>().Should().NotBeNullOrWhiteSpace();
        te["research"].Should().NotBeNull();
        te["research"]!["mechanism"]?.GetValue<string>().Should().NotBeNullOrWhiteSpace();
        te["research"]!["studies"]?.AsArray().Should().NotBeEmpty();
        te["research"]!["bloodwork"]?.AsArray().Should().NotBeEmpty();
    }

    [Fact]
    public void Catalog_Should_HaveManufacturers()
    {
        Manufacturers.Should().NotBeEmpty();
    }

    [Fact]
    public void Catalog_Version_Should_Be4()
    {
        CatalogJson.Value["version"]!.GetValue<int>().Should().Be(4);
    }
}
