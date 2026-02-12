using System.Net;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Integration;

public class HealthApiTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public HealthApiTests(TestWebAppFactory factory)
    {
        _client = factory.CreateAuthenticatedClient();
    }

    [Fact]
    public async Task Healthz_Returns200()
    {
        var response = await _client.GetAsync("/healthz");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Healthz_ContainsStatus()
    {
        var json = await _client.GetStringAsync("/healthz");
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().Should().Be("healthy");
    }

    [Fact]
    public async Task Healthz_ContainsVersion()
    {
        var json = await _client.GetStringAsync("/healthz");
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("version").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Healthz_ContainsDiskSpace()
    {
        var json = await _client.GetStringAsync("/healthz");
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("checks").GetProperty("diskSpace").Should().NotBeNull();
    }

    [Fact]
    public async Task Healthz_ContainsTimestamp()
    {
        var json = await _client.GetStringAsync("/healthz");
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("timestamp").GetString().Should().NotBeNullOrEmpty();
    }
}
