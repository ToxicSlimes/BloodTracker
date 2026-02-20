using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Application.WorkoutDiary.Handlers;
using BloodTracker.Application.WorkoutDiary.Queries;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class WorkoutDiaryHandlerTests
{
    private const string UserId = "test-user-1";

    private static IWorkoutSessionRepository MockSessionRepo() => Substitute.For<IWorkoutSessionRepository>();
    private static IWorkoutStatsRepository MockStatsRepo() => Substitute.For<IWorkoutStatsRepository>();
    private static IWorkoutDayRepository MockDayRepo() => Substitute.For<IWorkoutDayRepository>();
    private static IWorkoutExerciseRepository MockExerciseRepo() => Substitute.For<IWorkoutExerciseRepository>();
    private static IWorkoutSetRepository MockSetRepo() => Substitute.For<IWorkoutSetRepository>();

    private static WorkoutSession CreateTestSession(string userId = UserId, WorkoutSessionStatus status = WorkoutSessionStatus.InProgress)
    {
        var session = new WorkoutSession
        {
            UserId = userId,
            Title = "Test Workout",
            StartedAt = DateTime.UtcNow.AddMinutes(-30),
            Status = status,
            Exercises = new List<WorkoutSessionExercise>
            {
                new()
                {
                    Name = "Bench Press",
                    MuscleGroup = MuscleGroup.Chest,
                    OrderIndex = 0,
                    Sets = new List<WorkoutSessionSet>
                    {
                        new() { OrderIndex = 0, PlannedWeight = 80, PlannedRepetitions = 10 },
                        new() { OrderIndex = 1, PlannedWeight = 80, PlannedRepetitions = 10 },
                        new() { OrderIndex = 2, PlannedWeight = 85, PlannedRepetitions = 8 }
                    }
                },
                new()
                {
                    Name = "Incline DB Press",
                    MuscleGroup = MuscleGroup.Chest,
                    OrderIndex = 1,
                    Sets = new List<WorkoutSessionSet>
                    {
                        new() { OrderIndex = 0, PlannedWeight = 30, PlannedRepetitions = 12 },
                        new() { OrderIndex = 1, PlannedWeight = 30, PlannedRepetitions = 12 }
                    }
                }
            }
        };
        return session;
    }

    #region StartWorkoutSessionHandler

    [Fact]
    public async Task Start_EmptySession_CreatesSuccessfully()
    {
        var sessionRepo = MockSessionRepo();
        var dayRepo = MockDayRepo();
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();

        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);
        sessionRepo.CreateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new StartWorkoutSessionHandler(sessionRepo, dayRepo, exerciseRepo, setRepo);
        var result = await handler.Handle(
            new StartWorkoutSessionCommand(UserId, null, "My Workout", null, false),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.Title.Should().Be("My Workout");
        result.Status.Should().Be("InProgress");
        await sessionRepo.Received(1).CreateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Start_ActiveSessionExists_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var dayRepo = MockDayRepo();
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();

        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns(CreateTestSession());

        var handler = new StartWorkoutSessionHandler(sessionRepo, dayRepo, exerciseRepo, setRepo);

        var act = async () => await handler.Handle(
            new StartWorkoutSessionCommand(UserId, null, null, null, false),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Start_FromTemplate_PopulatesExercisesAndSets()
    {
        var sessionRepo = MockSessionRepo();
        var dayRepo = MockDayRepo();
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();

        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);
        sessionRepo.CreateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());
        sessionRepo.GetLastWithExerciseAsync(UserId, Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns((WorkoutSession?)null);

        var dayId = Guid.NewGuid();
        var programId = Guid.NewGuid();
        var day = new WorkoutDay { Id = dayId, ProgramId = programId, DayOfWeek = 0, Title = "Monday" };
        dayRepo.GetByIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(day);

        var exercises = new List<WorkoutExercise>
        {
            new() { Id = Guid.NewGuid(), Name = "Squat", MuscleGroup = MuscleGroup.Quadriceps, DayId = dayId, ProgramId = programId }
        };
        exerciseRepo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(exercises);

        var sets = new List<WorkoutSet>
        {
            new() { ExerciseId = exercises[0].Id, Repetitions = 5, Weight = 100 },
            new() { ExerciseId = exercises[0].Id, Repetitions = 5, Weight = 100 }
        };
        setRepo.GetByExerciseIdAsync(exercises[0].Id, Arg.Any<CancellationToken>()).Returns(sets);

        var handler = new StartWorkoutSessionHandler(sessionRepo, dayRepo, exerciseRepo, setRepo);
        var result = await handler.Handle(
            new StartWorkoutSessionCommand(UserId, dayId, null, null, false),
            CancellationToken.None);

        result.Exercises.Should().HaveCount(1);
        result.Exercises[0].Name.Should().Be("Squat");
        result.Exercises[0].Sets.Should().HaveCount(2);
        result.Exercises[0].Sets[0].PlannedWeight.Should().Be(100);
    }

    [Fact]
    public async Task Start_RepeatLast_CopiesLastSessionData()
    {
        var sessionRepo = MockSessionRepo();
        var dayRepo = MockDayRepo();
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();

        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);

        var lastSession = CreateTestSession(UserId, WorkoutSessionStatus.Completed);
        lastSession.Title = "Previous Workout";
        lastSession.Exercises[0].Sets[0].ActualWeight = 82.5m;
        lastSession.Exercises[0].Sets[0].ActualRepetitions = 10;
        lastSession.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;

        sessionRepo.GetLastCompletedAsync(UserId, Arg.Any<CancellationToken>()).Returns(lastSession);
        sessionRepo.CreateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new StartWorkoutSessionHandler(sessionRepo, dayRepo, exerciseRepo, setRepo);
        var result = await handler.Handle(
            new StartWorkoutSessionCommand(UserId, null, null, null, true),
            CancellationToken.None);

        result.Title.Should().Be("Previous Workout");
        result.Exercises.Should().HaveCount(2);
        result.Exercises[0].Sets[0].PreviousWeight.Should().Be(82.5m);
        result.Exercises[0].Sets[0].PreviousReps.Should().Be(10);
    }

    [Fact]
    public async Task Start_TemplatePreviousExerciseData_FillsPreviousWeightReps()
    {
        var sessionRepo = MockSessionRepo();
        var dayRepo = MockDayRepo();
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();

        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);
        sessionRepo.CreateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var dayId = Guid.NewGuid();
        dayRepo.GetByIdAsync(dayId, Arg.Any<CancellationToken>())
            .Returns(new WorkoutDay { Id = dayId, ProgramId = Guid.NewGuid(), DayOfWeek = 0 });

        var exercise = new WorkoutExercise { Id = Guid.NewGuid(), Name = "Bench", MuscleGroup = MuscleGroup.Chest, DayId = dayId, ProgramId = Guid.NewGuid() };
        exerciseRepo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutExercise> { exercise });
        setRepo.GetByExerciseIdAsync(exercise.Id, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSet> { new() { ExerciseId = exercise.Id, Repetitions = 10, Weight = 80 } });

        var prevSession = new WorkoutSession
        {
            UserId = UserId,
            Title = "Prev",
            Status = WorkoutSessionStatus.Completed,
            Exercises = new List<WorkoutSessionExercise>
            {
                new()
                {
                    Name = "Bench",
                    MuscleGroup = MuscleGroup.Chest,
                    Sets = new List<WorkoutSessionSet>
                    {
                        new() { OrderIndex = 0, ActualWeight = 85, ActualRepetitions = 8, CompletedAt = DateTime.UtcNow }
                    }
                }
            }
        };
        sessionRepo.GetLastWithExerciseAsync(UserId, "Bench", Arg.Any<CancellationToken>()).Returns(prevSession);

        var handler = new StartWorkoutSessionHandler(sessionRepo, dayRepo, exerciseRepo, setRepo);
        var result = await handler.Handle(
            new StartWorkoutSessionCommand(UserId, dayId, null, null, false),
            CancellationToken.None);

        result.Exercises[0].Sets[0].PreviousWeight.Should().Be(85);
        result.Exercises[0].Sets[0].PreviousReps.Should().Be(8);
    }

    #endregion

    #region CompleteSetHandler

    [Fact]
    public async Task CompleteSet_ValidSet_UpdatesAndReturnsDto()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        var setId = session.Exercises[0].Sets[0].Id;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var statsRepo = MockStatsRepo();
        var handler = new CompleteSetHandler(sessionRepo, statsRepo);
        var result = await handler.Handle(
            new CompleteSetCommand(UserId, session.Id, setId, 80, 80, 10, null, 7, SetType.Working, null),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.Set.ActualWeight.Should().Be(80);
        result.Set.ActualRepetitions.Should().Be(10);
        result.Set.RPE.Should().Be(7);
        result.Set.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CompleteSet_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var statsRepo = MockStatsRepo();
        var handler = new CompleteSetHandler(sessionRepo, statsRepo);
        var act = async () => await handler.Handle(
            new CompleteSetCommand(UserId, session.Id, Guid.NewGuid(), 80, 80, 10, null, null, SetType.Working, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CompleteSet_CompletedSession_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        session.Status = WorkoutSessionStatus.Completed;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var statsRepo = MockStatsRepo();
        var handler = new CompleteSetHandler(sessionRepo, statsRepo);
        var act = async () => await handler.Handle(
            new CompleteSetCommand(UserId, session.Id, session.Exercises[0].Sets[0].Id, 80, 80, 10, null, null, SetType.Working, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CompleteSet_NonexistentSet_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var statsRepo = MockStatsRepo();
        var handler = new CompleteSetHandler(sessionRepo, statsRepo);
        var act = async () => await handler.Handle(
            new CompleteSetCommand(UserId, session.Id, Guid.NewGuid(), 80, 80, 10, null, null, SetType.Working, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    #endregion

    #region UndoLastSetHandler

    [Fact]
    public async Task Undo_LastCompletedSet_ClearsActualValues()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        session.Exercises[0].Sets[0].ActualWeight = 80;
        session.Exercises[0].Sets[0].ActualWeightKg = 80;
        session.Exercises[0].Sets[0].ActualRepetitions = 10;
        session.Exercises[0].Sets[0].RPE = 7;
        session.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new UndoLastSetHandler(sessionRepo);
        var result = await handler.Handle(new UndoLastSetCommand(UserId, session.Id), CancellationToken.None);

        var undoneSet = result.Exercises[0].Sets[0];
        undoneSet.ActualWeight.Should().BeNull();
        undoneSet.ActualRepetitions.Should().BeNull();
        undoneSet.RPE.Should().BeNull();
        undoneSet.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task Undo_NoCompletedSets_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new UndoLastSetHandler(sessionRepo);
        var act = async () => await handler.Handle(new UndoLastSetCommand(UserId, session.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Undo_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new UndoLastSetHandler(sessionRepo);
        var act = async () => await handler.Handle(new UndoLastSetCommand(UserId, session.Id), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    #endregion

    #region CompleteWorkoutSessionHandler

    [Fact]
    public async Task Complete_ValidSession_CalculatesAggregates()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();

        session.Exercises[0].Sets[0].ActualWeightKg = 80;
        session.Exercises[0].Sets[0].ActualRepetitions = 10;
        session.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;
        session.Exercises[0].Sets[1].ActualWeightKg = 80;
        session.Exercises[0].Sets[1].ActualRepetitions = 10;
        session.Exercises[0].Sets[1].CompletedAt = DateTime.UtcNow;

        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());
        sessionRepo.GetHistoryAsync(UserId, Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), 0, 1000, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSession> { session });

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        var result = await handler.Handle(
            new CompleteWorkoutSessionCommand(UserId, session.Id, "Great workout"),
            CancellationToken.None);

        result.Session.Should().NotBeNull();
        result.Session.Status.Should().Be("Completed");
        result.Session.TotalSetsCompleted.Should().Be(2);
        result.Session.TotalTonnage.Should().Be(1600);
        result.Session.TotalVolume.Should().Be(20);

        await statsRepo.Received().UpsertDailyExerciseStatsAsync(Arg.Any<DailyExerciseStats>(), Arg.Any<CancellationToken>());
        await statsRepo.Received().UpsertExercisePRAsync(Arg.Any<UserExercisePR>(), Arg.Any<CancellationToken>());
        await statsRepo.Received().UpsertWeeklyUserStatsAsync(Arg.Any<WeeklyUserStats>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Complete_AlreadyCompleted_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();
        session.Status = WorkoutSessionStatus.Completed;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        var act = async () => await handler.Handle(
            new CompleteWorkoutSessionCommand(UserId, session.Id, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Complete_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        var act = async () => await handler.Handle(
            new CompleteWorkoutSessionCommand(UserId, session.Id, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Complete_WithNotes_AppendsNotes()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();
        session.Notes = "Started well";

        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());
        sessionRepo.GetHistoryAsync(UserId, Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), 0, 1000, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSession> { session });

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        await handler.Handle(
            new CompleteWorkoutSessionCommand(UserId, session.Id, "Finished strong"),
            CancellationToken.None);

        session.Notes.Should().Contain("Started well");
        session.Notes.Should().Contain("Finished strong");
    }

    [Fact]
    public async Task Complete_WeeklyRecalculation_SumsAllSessionsInWeek()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();
        session.Exercises[0].Sets[0].ActualWeightKg = 80;
        session.Exercises[0].Sets[0].ActualRepetitions = 10;
        session.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;

        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var otherSession = CreateTestSession();
        otherSession.Status = WorkoutSessionStatus.Completed;
        otherSession.TotalSetsCompleted = 5;
        otherSession.TotalVolume = 50;
        otherSession.TotalTonnage = 4000;
        otherSession.DurationSeconds = 2400;

        sessionRepo.GetHistoryAsync(UserId, Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), 0, 1000, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSession> { session, otherSession });

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        await handler.Handle(
            new CompleteWorkoutSessionCommand(UserId, session.Id, null),
            CancellationToken.None);

        await statsRepo.Received().UpsertWeeklyUserStatsAsync(
            Arg.Is<WeeklyUserStats>(s => s.TotalSessions == 2),
            Arg.Any<CancellationToken>());
    }

    #endregion

    #region AbandonWorkoutSessionHandler

    [Fact]
    public async Task Abandon_ValidSession_SetsStatusAbandoned()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AbandonWorkoutSessionHandler(sessionRepo);
        await handler.Handle(new AbandonWorkoutSessionCommand(UserId, session.Id), CancellationToken.None);

        session.Status.Should().Be(WorkoutSessionStatus.Abandoned);
        await sessionRepo.Received(1).UpdateAsync(session, Arg.Any<CancellationToken>());
    }

    #endregion

    #region Query Handlers

    [Fact]
    public async Task GetActive_ExistingSession_ReturnsDto()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new GetActiveWorkoutSessionHandler(sessionRepo);
        var result = await handler.Handle(new GetActiveWorkoutSessionQuery(UserId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Title.Should().Be("Test Workout");
        result.Exercises.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetActive_NoSession_ReturnsNull()
    {
        var sessionRepo = MockSessionRepo();
        sessionRepo.GetActiveAsync(UserId, Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);

        var handler = new GetActiveWorkoutSessionHandler(sessionRepo);
        var result = await handler.Handle(new GetActiveWorkoutSessionQuery(UserId), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetHistory_ReturnsPagedResult()
    {
        var sessionRepo = MockSessionRepo();
        var sessions = new List<WorkoutSession>
        {
            CreateTestSession(UserId, WorkoutSessionStatus.Completed),
            CreateTestSession(UserId, WorkoutSessionStatus.Completed)
        };
        sessionRepo.GetHistoryAsync(UserId, null, null, 0, 20, Arg.Any<CancellationToken>()).Returns(sessions);
        sessionRepo.GetHistoryCountAsync(UserId, null, null, Arg.Any<CancellationToken>()).Returns(2);

        var handler = new GetWorkoutSessionHistoryHandler(sessionRepo);
        var result = await handler.Handle(
            new GetWorkoutSessionHistoryQuery(UserId, null, null, 1, 20),
            CancellationToken.None);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetById_Exists_ReturnsDto()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new GetWorkoutSessionByIdHandler(sessionRepo);
        var result = await handler.Handle(
            new GetWorkoutSessionByIdQuery(UserId, session.Id),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);
    }

    [Fact]
    public async Task GetById_WrongUser_ReturnsNull()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new GetWorkoutSessionByIdHandler(sessionRepo);
        var result = await handler.Handle(
            new GetWorkoutSessionByIdQuery(UserId, session.Id),
            CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion

    #region AddExercise & AddSet

    [Fact]
    public async Task AddExercise_ValidSession_AddsToExerciseList()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AddExerciseHandler(sessionRepo);
        var result = await handler.Handle(
            new AddExerciseCommand(UserId, session.Id, "Lateral Raise", MuscleGroup.Shoulders, null),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.Name.Should().Be("Lateral Raise");
        session.Exercises.Should().HaveCount(3);
    }

    [Fact]
    public async Task AddSet_ValidExercise_AddsToSetList()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        var exerciseId = session.Exercises[0].Id;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AddSetHandler(sessionRepo);
        var result = await handler.Handle(
            new AddSetCommand(UserId, session.Id, exerciseId, 90, 8, null),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.PlannedWeight.Should().Be(90);
        session.Exercises[0].Sets.Should().HaveCount(4);
    }

    #endregion

    #region AddExercise Edge Cases

    [Fact]
    public async Task AddExercise_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AddExerciseHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddExerciseCommand(UserId, session.Id, "Curls", MuscleGroup.Biceps, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddExercise_CompletedSession_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        session.Status = WorkoutSessionStatus.Completed;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AddExerciseHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddExerciseCommand(UserId, session.Id, "Curls", MuscleGroup.Biceps, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task AddExercise_SessionNotFound_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        sessionRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);

        var handler = new AddExerciseHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddExerciseCommand(UserId, Guid.NewGuid(), "Curls", MuscleGroup.Biceps, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddExercise_OrderIndex_IncrementsFromExisting()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AddExerciseHandler(sessionRepo);
        var result = await handler.Handle(
            new AddExerciseCommand(UserId, session.Id, "Lateral Raise", MuscleGroup.Shoulders, null),
            CancellationToken.None);

        result.OrderIndex.Should().Be(2);
    }

    #endregion

    #region AddSet Edge Cases

    [Fact]
    public async Task AddSet_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AddSetHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddSetCommand(UserId, session.Id, session.Exercises[0].Id, 80, 10, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddSet_CompletedSession_ThrowsInvalidOperation()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        session.Status = WorkoutSessionStatus.Completed;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AddSetHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddSetCommand(UserId, session.Id, session.Exercises[0].Id, 80, 10, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task AddSet_ExerciseNotFound_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AddSetHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AddSetCommand(UserId, session.Id, Guid.NewGuid(), 80, 10, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddSet_NullWeightReps_CopiesFromLastSet()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        session.Exercises[0].Sets[2].ActualWeight = 90;
        session.Exercises[0].Sets[2].ActualRepetitions = 8;
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AddSetHandler(sessionRepo);
        var result = await handler.Handle(
            new AddSetCommand(UserId, session.Id, session.Exercises[0].Id, null, null, null),
            CancellationToken.None);

        result.PlannedWeight.Should().Be(90);
        result.PlannedRepetitions.Should().Be(8);
        result.OrderIndex.Should().Be(3);
    }

    #endregion

    #region Abandon Edge Cases

    [Fact]
    public async Task Abandon_WrongUser_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession("other-user");
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        var handler = new AbandonWorkoutSessionHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AbandonWorkoutSessionCommand(UserId, session.Id), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Abandon_SessionNotFound_ThrowsKeyNotFound()
    {
        var sessionRepo = MockSessionRepo();
        sessionRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);

        var handler = new AbandonWorkoutSessionHandler(sessionRepo);
        var act = async () => await handler.Handle(
            new AbandonWorkoutSessionCommand(UserId, Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Abandon_SetsCompletedAtAndStatusAbandoned()
    {
        var sessionRepo = MockSessionRepo();
        var session = CreateTestSession();
        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());

        var handler = new AbandonWorkoutSessionHandler(sessionRepo);
        await handler.Handle(new AbandonWorkoutSessionCommand(UserId, session.Id), CancellationToken.None);

        session.Status.Should().Be(WorkoutSessionStatus.Abandoned);
        session.CompletedAt.Should().NotBeNull();
    }

    #endregion

    #region GetPreviousExerciseData

    [Fact]
    public async Task GetPreviousExercise_Found_ReturnsDto()
    {
        var sessionRepo = MockSessionRepo();
        var prevSession = new WorkoutSession
        {
            UserId = UserId,
            Title = "Prev",
            StartedAt = DateTime.UtcNow.AddDays(-2),
            Status = WorkoutSessionStatus.Completed,
            Exercises = new List<WorkoutSessionExercise>
            {
                new()
                {
                    Name = "Bench Press",
                    MuscleGroup = MuscleGroup.Chest,
                    Sets = new List<WorkoutSessionSet>
                    {
                        new() { OrderIndex = 0, ActualWeight = 80, ActualRepetitions = 10, RPE = 7, CompletedAt = DateTime.UtcNow.AddDays(-2) },
                        new() { OrderIndex = 1, ActualWeight = 85, ActualRepetitions = 8, RPE = 8, CompletedAt = DateTime.UtcNow.AddDays(-2) },
                        new() { OrderIndex = 2, ActualWeight = 85, ActualRepetitions = 6, CompletedAt = null }
                    }
                }
            }
        };
        sessionRepo.GetLastWithExerciseAsync(UserId, "Bench Press", Arg.Any<CancellationToken>()).Returns(prevSession);

        var handler = new GetPreviousExerciseDataHandler(sessionRepo);
        var result = await handler.Handle(
            new GetPreviousExerciseDataQuery(UserId, "Bench Press"), CancellationToken.None);

        result.Should().NotBeNull();
        result!.ExerciseName.Should().Be("Bench Press");
        result.Sets.Should().HaveCount(2);
        result.Sets[0].Weight.Should().Be(80);
        result.Sets[0].Repetitions.Should().Be(10);
        result.Sets[0].RPE.Should().Be(7);
        result.Sets[1].Weight.Should().Be(85);
    }

    [Fact]
    public async Task GetPreviousExercise_NoSession_ReturnsNull()
    {
        var sessionRepo = MockSessionRepo();
        sessionRepo.GetLastWithExerciseAsync(UserId, "Squat", Arg.Any<CancellationToken>()).Returns((WorkoutSession?)null);

        var handler = new GetPreviousExerciseDataHandler(sessionRepo);
        var result = await handler.Handle(
            new GetPreviousExerciseDataQuery(UserId, "Squat"), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPreviousExercise_ExerciseNotInSession_ReturnsNull()
    {
        var sessionRepo = MockSessionRepo();
        var prevSession = new WorkoutSession
        {
            UserId = UserId,
            Title = "Prev",
            StartedAt = DateTime.UtcNow.AddDays(-2),
            Status = WorkoutSessionStatus.Completed,
            Exercises = new List<WorkoutSessionExercise>
            {
                new() { Name = "Deadlift", MuscleGroup = MuscleGroup.Back, Sets = new List<WorkoutSessionSet>() }
            }
        };
        sessionRepo.GetLastWithExerciseAsync(UserId, "Bench Press", Arg.Any<CancellationToken>()).Returns(prevSession);

        var handler = new GetPreviousExerciseDataHandler(sessionRepo);
        var result = await handler.Handle(
            new GetPreviousExerciseDataQuery(UserId, "Bench Press"), CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion

    #region GetWorkoutDurationEstimate

    [Fact]
    public async Task DurationEstimate_WithSetsAndRest_CalculatesCorrectly()
    {
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();
        var statsRepo = MockStatsRepo();

        var dayId = Guid.NewGuid();
        var exercises = new List<WorkoutExercise>
        {
            new() { Id = Guid.NewGuid(), Name = "Bench", DayId = dayId, ProgramId = Guid.NewGuid() },
            new() { Id = Guid.NewGuid(), Name = "Squat", DayId = dayId, ProgramId = Guid.NewGuid() }
        };
        exerciseRepo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(exercises);

        setRepo.GetByExerciseIdAsync(exercises[0].Id, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSet>
            {
                new() { ExerciseId = exercises[0].Id, Weight = 80, Repetitions = 10 },
                new() { ExerciseId = exercises[0].Id, Weight = 80, Repetitions = 10 },
                new() { ExerciseId = exercises[0].Id, Weight = 80, Repetitions = 10 }
            });
        setRepo.GetByExerciseIdAsync(exercises[1].Id, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSet>
            {
                new() { ExerciseId = exercises[1].Id, Weight = 100, Repetitions = 5 },
                new() { ExerciseId = exercises[1].Id, Weight = 100, Repetitions = 5 }
            });

        statsRepo.GetAverageRestSecondsAsync(UserId, Arg.Any<CancellationToken>()).Returns(120);

        var handler = new GetWorkoutDurationEstimateHandler(exerciseRepo, setRepo, statsRepo, MockSessionRepo());
        var result = await handler.Handle(
            new GetWorkoutDurationEstimateQuery(UserId, dayId), CancellationToken.None);

        result.TotalSets.Should().Be(5);
        result.AverageRestSeconds.Should().Be(120);
        result.EstimatedMinutes.Should().Be(5 * (30 + 120) / 60);
    }

    [Fact]
    public async Task DurationEstimate_NoAvgRest_DefaultsTo90()
    {
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();
        var statsRepo = MockStatsRepo();

        var dayId = Guid.NewGuid();
        var exercises = new List<WorkoutExercise>
        {
            new() { Id = Guid.NewGuid(), Name = "Bench", DayId = dayId, ProgramId = Guid.NewGuid() }
        };
        exerciseRepo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(exercises);
        setRepo.GetByExerciseIdAsync(exercises[0].Id, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSet>
            {
                new() { ExerciseId = exercises[0].Id, Weight = 80, Repetitions = 10 }
            });
        statsRepo.GetAverageRestSecondsAsync(UserId, Arg.Any<CancellationToken>()).Returns(0);

        var handler = new GetWorkoutDurationEstimateHandler(exerciseRepo, setRepo, statsRepo, MockSessionRepo());
        var result = await handler.Handle(
            new GetWorkoutDurationEstimateQuery(UserId, dayId), CancellationToken.None);

        result.AverageRestSeconds.Should().Be(90);
        result.TotalSets.Should().Be(1);
        result.EstimatedMinutes.Should().Be(1 * (30 + 90) / 60);
    }

    [Fact]
    public async Task DurationEstimate_NoExercises_ReturnsZero()
    {
        var exerciseRepo = MockExerciseRepo();
        var setRepo = MockSetRepo();
        var statsRepo = MockStatsRepo();

        var dayId = Guid.NewGuid();
        exerciseRepo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutExercise>());
        statsRepo.GetAverageRestSecondsAsync(UserId, Arg.Any<CancellationToken>()).Returns(0);

        var handler = new GetWorkoutDurationEstimateHandler(exerciseRepo, setRepo, statsRepo, MockSessionRepo());
        var result = await handler.Handle(
            new GetWorkoutDurationEstimateQuery(UserId, dayId), CancellationToken.None);

        result.TotalSets.Should().Be(0);
        result.EstimatedMinutes.Should().Be(0);
    }

    #endregion

    #region PRs and Weight Brackets

    [Fact]
    public async Task Complete_NewPR_CreatesExercisePR()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();
        session.Exercises[0].Sets[0].ActualWeightKg = 100;
        session.Exercises[0].Sets[0].ActualRepetitions = 5;
        session.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;
        session.Exercises[0].Sets[0].Type = SetType.Working;

        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());
        sessionRepo.GetHistoryAsync(UserId, Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), 0, 1000, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSession> { session });
        statsRepo.GetExercisePRAsync(UserId, "Bench Press", Arg.Any<CancellationToken>()).Returns((UserExercisePR?)null);

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        await handler.Handle(new CompleteWorkoutSessionCommand(UserId, session.Id, null), CancellationToken.None);

        await statsRepo.Received().UpsertExercisePRAsync(
            Arg.Any<UserExercisePR>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Complete_ExistingPR_UpdatesOnlyIfBetter()
    {
        var sessionRepo = MockSessionRepo();
        var statsRepo = MockStatsRepo();
        var session = CreateTestSession();
        session.Exercises[0].Sets[0].ActualWeightKg = 80;
        session.Exercises[0].Sets[0].ActualRepetitions = 10;
        session.Exercises[0].Sets[0].CompletedAt = DateTime.UtcNow;

        sessionRepo.GetByIdAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);
        sessionRepo.UpdateAsync(Arg.Any<WorkoutSession>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<WorkoutSession>());
        sessionRepo.GetHistoryAsync(UserId, Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), 0, 1000, Arg.Any<CancellationToken>())
            .Returns(new List<WorkoutSession> { session });

        var existingPR = new UserExercisePR
        {
            UserId = UserId,
            ExerciseName = "Bench Press",
            BestWeight = 90,
            BestWeightDate = DateTime.UtcNow.AddDays(-7),
            BestE1RM = 120,
            BestE1RMDate = DateTime.UtcNow.AddDays(-7),
            BestVolumeSingleSession = 2000,
            BestVolumeDate = DateTime.UtcNow.AddDays(-7),
            RepPRsByWeight = new Dictionary<string, RepPREntry>
            {
                ["80.0"] = new() { Reps = 12, Date = DateTime.UtcNow.AddDays(-7) }
            }
        };
        statsRepo.GetExercisePRAsync(UserId, "Bench Press", Arg.Any<CancellationToken>()).Returns(existingPR);

        var handler = new CompleteWorkoutSessionHandler(sessionRepo, statsRepo);
        await handler.Handle(new CompleteWorkoutSessionCommand(UserId, session.Id, null), CancellationToken.None);

        existingPR.BestWeight.Should().Be(90);
        existingPR.RepPRsByWeight["80.0"].Reps.Should().Be(12);
    }

    #endregion
}
