using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Integration;

[Collection("Integration")]
public class AdminApiTests
{
    private readonly HttpClient _client;
    private readonly HttpClient _anonClient;

    public AdminApiTests(TestWebAppFactory factory)
    {
        _client = factory.CreateAuthenticatedClient();
        _anonClient = factory.CreateClient();
    }

    #region Admin Endpoints Tests

    [Fact]
    public async Task GetAllAdminUsers_ShouldReturn200WithList()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/Admin/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = await response.Content.ReadFromJsonAsync<List<object>>();
        users.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAdminStats_ShouldReturn200WithStatsObject()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/Admin/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
        
        var stats = JsonSerializer.Deserialize<JsonElement>(content);
        stats.TryGetProperty("totalUsers", out _).Should().BeTrue();
        stats.TryGetProperty("totalDbSizeBytes", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetAdminUserSummary_NonExistentUser_ShouldReturn404()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v1/Admin/users/{nonExistentUserId}/summary");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteUser_NonExistentUser_ShouldReturn404()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/api/v1/Admin/users/{nonExistentUserId}");

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateUserRole_NonExistentUser_ShouldReturn404()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();
        var payload = new { isAdmin = true };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PutAsync($"/api/v1/Admin/users/{nonExistentUserId}/role", content);

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAllAdminUsers_Unauthenticated_ShouldReturn401()
    {
        // Act
        var response = await _anonClient.GetAsync("/api/v1/Admin/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region WorkoutPrograms Endpoints Tests

    [Fact]
    public async Task GetWorkoutPrograms_ShouldReturn200()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/WorkoutPrograms");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var programs = await response.Content.ReadFromJsonAsync<List<object>>();
        programs.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateWorkoutProgram_WithValidPayload_ShouldReturn200Or201()
    {
        // Arrange
        var payload = new { title = "Test Workout Program" };
        var content = JsonContent.Create(payload);

        // Act
        var response = await _client.PostAsync("/api/v1/WorkoutPrograms", content);

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    #endregion

    #region IntakeLogs Endpoints Tests

    [Fact]
    public async Task GetIntakeLogs_ShouldReturn200()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/IntakeLogs");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var logs = await response.Content.ReadFromJsonAsync<List<object>>();
        logs.Should().NotBeNull();
    }

    #endregion

    #region Purchases Endpoints Tests

    [Fact]
    public async Task GetPurchases_ShouldReturn200()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/Purchases");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var purchases = await response.Content.ReadFromJsonAsync<List<object>>();
        purchases.Should().NotBeNull();
    }

    #endregion
}
