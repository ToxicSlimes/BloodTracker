using System.Net;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Integration;

public class CatalogApiTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly HttpClient _anonClient;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public CatalogApiTests(TestWebAppFactory factory)
    {
        _client = factory.CreateAuthenticatedClient();
        _anonClient = factory.CreateClient();
    }

    [Fact]
    public async Task GetSubstances_Returns200WithList()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/substances");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetSubstances_WithCategoryFilter_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/substances?category=0");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetSubstances_WithSearch_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/substances?search=%D1%82%D0%B5%D1%81%D1%82%D0%BE%D1%81%D1%82%D0%B5%D1%80%D0%BE%D0%BD");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetSubstanceById_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/substances/nonexistent-id-12345");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPopular_Returns200WithList()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/substances/popular");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetManufacturers_Returns200WithList()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/manufacturers");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetManufacturerById_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/manufacturers/nonexistent-id");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCategories_Returns200WithList()
    {
        var response = await _client.GetAsync("/api/v1/DrugCatalog/categories");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
        doc.RootElement.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetSubstances_Unauthenticated_Returns401()
    {
        var response = await _anonClient.GetAsync("/api/v1/DrugCatalog/substances");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSubstances_SeededData_ContainsItems()
    {
        var json = await _client.GetStringAsync("/api/v1/DrugCatalog/substances");
        using var doc = JsonDocument.Parse(json);
        // Catalog is seeded by DrugCatalogSeedService, should have items
        doc.RootElement.GetArrayLength().Should().BeGreaterThan(0);
    }
}
