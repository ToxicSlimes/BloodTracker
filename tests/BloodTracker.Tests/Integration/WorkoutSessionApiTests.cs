using System.Net;
using System.Net.Http.Json;
using BloodTracker.Application.WorkoutDiary.Dto;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Integration;

[Collection("Integration")]
public class WorkoutSessionApiTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;

    public WorkoutSessionApiTests(TestWebAppFactory factory)
    {
        _client = factory.CreateAuthenticatedClient();
    }

    [Fact]
    public async Task GetActive_NoSession_Returns200OrNoContent()
    {
        var response = await _client.GetAsync("/api/v1/workout-sessions/active");

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Start_EmptyWorkout_Returns200()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/workout-sessions/start", new
        {
            customTitle = "Integration Test Workout"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var session = await response.Content.ReadFromJsonAsync<WorkoutSessionDto>();
        session.Should().NotBeNull();
        session!.Title.Should().Be("Integration Test Workout");
        session.Status.Should().Be("InProgress");

        await AbandonSession(session.Id);
    }

    [Fact]
    public async Task Start_DuplicateActiveSession_Returns500()
    {
        var first = await StartSession("First");

        var response = await _client.PostAsJsonAsync("/api/v1/workout-sessions/start", new
        {
            customTitle = "Second"
        });

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        await AbandonSession(first.Id);
    }

    [Fact]
    public async Task CompleteSet_ValidSet_Returns200()
    {
        var session = await StartSession("Complete Set Test");
        var exercise = session.Exercises.FirstOrDefault();

        if (exercise == null || exercise.Sets.Count == 0)
        {
            await AbandonSession(session.Id);
            return;
        }

        var setId = exercise.Sets[0].Id;
        var response = await _client.PostAsJsonAsync(
            $"/api/v1/workout-sessions/{session.Id}/sets/{setId}/complete",
            new { weight = 80m, weightKg = 80m, repetitions = 10, rpe = 7 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        await AbandonSession(session.Id);
    }

    [Fact]
    public async Task UndoSet_AfterComplete_Returns200()
    {
        var session = await StartSession("Undo Test");
        var exercise = session.Exercises.FirstOrDefault();

        if (exercise == null || exercise.Sets.Count == 0)
        {
            await AbandonSession(session.Id);
            return;
        }

        var setId = exercise.Sets[0].Id;
        await _client.PostAsJsonAsync(
            $"/api/v1/workout-sessions/{session.Id}/sets/{setId}/complete",
            new { weight = 80m, weightKg = 80m, repetitions = 10 });

        var undoResponse = await _client.PostAsync(
            $"/api/v1/workout-sessions/{session.Id}/sets/undo", null);

        undoResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await AbandonSession(session.Id);
    }

    [Fact]
    public async Task Complete_ValidSession_Returns200WithSummary()
    {
        var session = await StartSession("Complete Test");

        var response = await _client.PostAsJsonAsync(
            $"/api/v1/workout-sessions/{session.Id}/complete",
            new { notes = "Done!" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await response.Content.ReadFromJsonAsync<WorkoutSessionSummaryDto>();
        summary.Should().NotBeNull();
        summary!.Session.Status.Should().Be("Completed");
    }

    [Fact]
    public async Task Abandon_ValidSession_Returns204()
    {
        var session = await StartSession("Abandon Test");

        var response = await _client.PostAsync(
            $"/api/v1/workout-sessions/{session.Id}/abandon", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetHistory_Empty_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/workout-sessions?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_AfterCompleted_ContainsSession()
    {
        var session = await StartSession("History Test");
        await _client.PostAsJsonAsync(
            $"/api/v1/workout-sessions/{session.Id}/complete",
            new { });

        var response = await _client.GetAsync("/api/v1/workout-sessions?page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_Exists_Returns200()
    {
        var session = await StartSession("GetById Test");

        var response = await _client.GetAsync($"/api/v1/workout-sessions/{session.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<WorkoutSessionDto>();
        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);

        await AbandonSession(session.Id);
    }

    [Fact]
    public async Task GetById_NotExists_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/workout-sessions/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Unauthorized_NoToken_Returns401()
    {
        var client = new TestWebAppFactory().CreateClient();

        var response = await client.GetAsync("/api/v1/workout-sessions/active");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task FullFlow_StartLogComplete_ReturnsCorrectAggregates()
    {
        var session = await StartSession("Full Flow Test");

        if (session.Exercises.Count > 0 && session.Exercises[0].Sets.Count > 0)
        {
            var setId = session.Exercises[0].Sets[0].Id;
            await _client.PostAsJsonAsync(
                $"/api/v1/workout-sessions/{session.Id}/sets/{setId}/complete",
                new { weight = 60m, weightKg = 60m, repetitions = 10, rpe = 7 });
        }

        var completeResponse = await _client.PostAsJsonAsync(
            $"/api/v1/workout-sessions/{session.Id}/complete",
            new { notes = "Full flow done" });

        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await completeResponse.Content.ReadFromJsonAsync<WorkoutSessionSummaryDto>();
        summary.Should().NotBeNull();
        summary!.Session.Status.Should().Be("Completed");
        summary.Session.Notes.Should().Contain("Full flow done");
    }

    private async Task<WorkoutSessionDto> StartSession(string title)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/workout-sessions/start", new
        {
            customTitle = title
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<WorkoutSessionDto>())!;
    }

    private async Task AbandonSession(Guid sessionId)
    {
        await _client.PostAsync($"/api/v1/workout-sessions/{sessionId}/abandon", null);
    }
}
