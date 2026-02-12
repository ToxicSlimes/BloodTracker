using BloodTracker.Application.Common;
using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Handlers;
using BloodTracker.Application.Workouts.Queries;
using BloodTracker.Domain.Models;
using FluentAssertions;
using MapsterMapper;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class WorkoutHandlerTests
{
    private static IMapper CreateMapper()
    {
        var mapper = Substitute.For<IMapper>();
        mapper.Map<WorkoutProgramDto>(Arg.Any<WorkoutProgram>()).Returns(x =>
        {
            var p = x.Arg<WorkoutProgram>();
            return new WorkoutProgramDto { Id = p.Id, Title = p.Title, Notes = p.Notes };
        });
        mapper.Map<WorkoutDayDto>(Arg.Any<WorkoutDay>()).Returns(x =>
        {
            var d = x.Arg<WorkoutDay>();
            return new WorkoutDayDto { Id = d.Id, ProgramId = d.ProgramId, DayOfWeek = d.DayOfWeek, Title = d.Title, Notes = d.Notes };
        });
        mapper.Map<WorkoutExerciseDto>(Arg.Any<WorkoutExercise>()).Returns(x =>
        {
            var e = x.Arg<WorkoutExercise>();
            return new WorkoutExerciseDto { Id = e.Id, ProgramId = e.ProgramId, DayId = e.DayId, Name = e.Name, MuscleGroup = e.MuscleGroup, Notes = e.Notes };
        });
        mapper.Map<WorkoutSetDto>(Arg.Any<WorkoutSet>()).Returns(x =>
        {
            var s = x.Arg<WorkoutSet>();
            return new WorkoutSetDto { Id = s.Id, ExerciseId = s.ExerciseId, Repetitions = s.Repetitions, Weight = s.Weight, Duration = s.Duration, Notes = s.Notes };
        });
        return mapper;
    }

    #region WorkoutProgram

    [Fact]
    public async Task CreateWorkoutProgramHandler_Should_CreateProgram()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var created = new WorkoutProgram { Title = "PPL", Notes = "Push Pull Legs" };
        repo.CreateAsync(Arg.Any<WorkoutProgram>(), Arg.Any<CancellationToken>()).Returns(created);

        var handler = new CreateWorkoutProgramHandler(repo, mapper);
        var result = await handler.Handle(
            new CreateWorkoutProgramCommand(new CreateWorkoutProgramDto { Title = "PPL", Notes = "Push Pull Legs" }),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.Title.Should().Be("PPL");
        await repo.Received(1).CreateAsync(Arg.Is<WorkoutProgram>(p => p.Title == "PPL"), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateWorkoutProgramHandler_Should_UpdateExisting()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        var existing = new WorkoutProgram { Title = "Old" };
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        repo.UpdateAsync(Arg.Any<WorkoutProgram>(), Arg.Any<CancellationToken>()).Returns(x => x.Arg<WorkoutProgram>());

        var handler = new UpdateWorkoutProgramHandler(repo, mapper);
        var result = await handler.Handle(
            new UpdateWorkoutProgramCommand(id, new UpdateWorkoutProgramDto { Title = "New" }),
            CancellationToken.None);

        result.Title.Should().Be("New");
        await repo.Received(1).UpdateAsync(Arg.Is<WorkoutProgram>(p => p.Title == "New"), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateWorkoutProgramHandler_Should_ThrowWhenNotFound()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((WorkoutProgram?)null);

        var handler = new UpdateWorkoutProgramHandler(repo, mapper);
        await handler.Invoking(h => h.Handle(
            new UpdateWorkoutProgramCommand(id, new UpdateWorkoutProgramDto { Title = "X" }),
            CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteWorkoutProgramHandler_Should_ReturnTrue()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var id = Guid.NewGuid();
        repo.DeleteAsync(id, Arg.Any<CancellationToken>()).Returns(true);

        var handler = new DeleteWorkoutProgramHandler(repo);
        var result = await handler.Handle(new DeleteWorkoutProgramCommand(id), CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetAllWorkoutProgramsHandler_Should_ReturnList()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var programs = new List<WorkoutProgram>
        {
            new() { Title = "PPL" },
            new() { Title = "Upper/Lower" }
        };
        repo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(programs);

        var handler = new GetAllWorkoutProgramsHandler(repo, mapper);
        var result = await handler.Handle(new GetAllWorkoutProgramsQuery(), CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetWorkoutProgramByIdHandler_Should_ReturnProgram()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(new WorkoutProgram { Title = "PPL" });

        var handler = new GetWorkoutProgramByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutProgramByIdQuery(id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Title.Should().Be("PPL");
    }

    [Fact]
    public async Task GetWorkoutProgramByIdHandler_Should_ReturnNull_WhenNotFound()
    {
        var repo = Substitute.For<IWorkoutProgramRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((WorkoutProgram?)null);

        var handler = new GetWorkoutProgramByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutProgramByIdQuery(id), CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion

    #region WorkoutDay

    [Fact]
    public async Task CreateWorkoutDayHandler_Should_CreateDay()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        var programId = Guid.NewGuid();
        var created = new WorkoutDay { ProgramId = programId, DayOfWeek = DayOfWeek.Monday, Title = "Chest" };
        repo.CreateAsync(Arg.Any<WorkoutDay>(), Arg.Any<CancellationToken>()).Returns(created);

        var handler = new CreateWorkoutDayHandler(repo, mapper);
        var result = await handler.Handle(
            new CreateWorkoutDayCommand(new CreateWorkoutDayDto { ProgramId = programId, DayOfWeek = DayOfWeek.Monday, Title = "Chest" }),
            CancellationToken.None);

        result.Title.Should().Be("Chest");
        result.DayOfWeek.Should().Be(DayOfWeek.Monday);
    }

    [Fact]
    public async Task UpdateWorkoutDayHandler_Should_UpdateExisting()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        var existing = new WorkoutDay { ProgramId = Guid.NewGuid(), DayOfWeek = DayOfWeek.Monday, Title = "Old" };
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        repo.UpdateAsync(Arg.Any<WorkoutDay>(), Arg.Any<CancellationToken>()).Returns(x => x.Arg<WorkoutDay>());

        var handler = new UpdateWorkoutDayHandler(repo, mapper);
        var result = await handler.Handle(
            new UpdateWorkoutDayCommand(id, new UpdateWorkoutDayDto { ProgramId = existing.ProgramId, DayOfWeek = DayOfWeek.Friday, Title = "Legs" }),
            CancellationToken.None);

        result.Title.Should().Be("Legs");
    }

    [Fact]
    public async Task UpdateWorkoutDayHandler_Should_ThrowWhenNotFound()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((WorkoutDay?)null);

        var handler = new UpdateWorkoutDayHandler(repo, mapper);
        await handler.Invoking(h => h.Handle(
            new UpdateWorkoutDayCommand(id, new UpdateWorkoutDayDto { ProgramId = Guid.NewGuid(), Title = "X" }),
            CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteWorkoutDayHandler_Should_ReturnTrue()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        repo.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(true);

        var handler = new DeleteWorkoutDayHandler(repo);
        var result = await handler.Handle(new DeleteWorkoutDayCommand(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetWorkoutDaysByProgramHandler_Should_ReturnDays()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        var programId = Guid.NewGuid();
        repo.GetByProgramIdAsync(programId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutDay>
        {
            new() { ProgramId = programId, DayOfWeek = DayOfWeek.Monday, Title = "Day 1" },
            new() { ProgramId = programId, DayOfWeek = DayOfWeek.Wednesday, Title = "Day 2" }
        });

        var handler = new GetWorkoutDaysByProgramHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutDaysByProgramQuery(programId), CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetWorkoutDayByIdHandler_Should_ReturnDay()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(new WorkoutDay { ProgramId = Guid.NewGuid(), DayOfWeek = DayOfWeek.Tuesday, Title = "Push" });

        var handler = new GetWorkoutDayByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutDayByIdQuery(id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Title.Should().Be("Push");
    }

    [Fact]
    public async Task GetWorkoutDayByIdHandler_Should_ReturnNull_WhenNotFound()
    {
        var repo = Substitute.For<IWorkoutDayRepository>();
        var mapper = CreateMapper();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutDay?)null);

        var handler = new GetWorkoutDayByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutDayByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion

    #region WorkoutExercise

    [Fact]
    public async Task CreateWorkoutExerciseHandler_Should_CreateExercise()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        var created = new WorkoutExercise { ProgramId = Guid.NewGuid(), DayId = Guid.NewGuid(), Name = "Bench Press", MuscleGroup = MuscleGroup.Chest };
        repo.CreateAsync(Arg.Any<WorkoutExercise>(), Arg.Any<CancellationToken>()).Returns(created);

        var handler = new CreateWorkoutExerciseHandler(repo, mapper);
        var result = await handler.Handle(
            new CreateWorkoutExerciseCommand(new CreateWorkoutExerciseDto
            {
                ProgramId = Guid.NewGuid(),
                DayId = Guid.NewGuid(),
                Name = "Bench Press",
                MuscleGroup = MuscleGroup.Chest
            }),
            CancellationToken.None);

        result.Name.Should().Be("Bench Press");
        result.MuscleGroup.Should().Be(MuscleGroup.Chest);
    }

    [Fact]
    public async Task UpdateWorkoutExerciseHandler_Should_UpdateExisting()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        var existing = new WorkoutExercise { ProgramId = Guid.NewGuid(), DayId = Guid.NewGuid(), Name = "Old", MuscleGroup = MuscleGroup.Back };
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        repo.UpdateAsync(Arg.Any<WorkoutExercise>(), Arg.Any<CancellationToken>()).Returns(x => x.Arg<WorkoutExercise>());

        var handler = new UpdateWorkoutExerciseHandler(repo, mapper);
        var result = await handler.Handle(
            new UpdateWorkoutExerciseCommand(id, new UpdateWorkoutExerciseDto
            {
                ProgramId = Guid.NewGuid(),
                DayId = Guid.NewGuid(),
                Name = "Squat",
                MuscleGroup = MuscleGroup.Quadriceps
            }),
            CancellationToken.None);

        result.Name.Should().Be("Squat");
    }

    [Fact]
    public async Task UpdateWorkoutExerciseHandler_Should_ThrowWhenNotFound()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutExercise?)null);

        var handler = new UpdateWorkoutExerciseHandler(repo, mapper);
        await handler.Invoking(h => h.Handle(
            new UpdateWorkoutExerciseCommand(Guid.NewGuid(), new UpdateWorkoutExerciseDto
            {
                ProgramId = Guid.NewGuid(),
                DayId = Guid.NewGuid(),
                Name = "X",
                MuscleGroup = MuscleGroup.Abs
            }),
            CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteWorkoutExerciseHandler_Should_ReturnTrue()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        repo.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(true);

        var handler = new DeleteWorkoutExerciseHandler(repo);
        var result = await handler.Handle(new DeleteWorkoutExerciseCommand(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetWorkoutExercisesByProgramHandler_Should_ReturnExercises()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        var programId = Guid.NewGuid();
        repo.GetByProgramIdAsync(programId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutExercise>
        {
            new() { ProgramId = programId, DayId = Guid.NewGuid(), Name = "Bench" },
            new() { ProgramId = programId, DayId = Guid.NewGuid(), Name = "Squat" }
        });

        var handler = new GetWorkoutExercisesByProgramHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutExercisesByProgramQuery(programId), CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetWorkoutExercisesByDayHandler_Should_ReturnExercises()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        var dayId = Guid.NewGuid();
        repo.GetByDayIdAsync(dayId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutExercise>
        {
            new() { ProgramId = Guid.NewGuid(), DayId = dayId, Name = "OHP" }
        });

        var handler = new GetWorkoutExercisesByDayHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutExercisesByDayQuery(dayId), CancellationToken.None);

        result.Should().HaveCount(1);
        result[0].Name.Should().Be("OHP");
    }

    [Fact]
    public async Task GetWorkoutExerciseByIdHandler_Should_ReturnExercise()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(new WorkoutExercise { ProgramId = Guid.NewGuid(), DayId = Guid.NewGuid(), Name = "Deadlift" });

        var handler = new GetWorkoutExerciseByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutExerciseByIdQuery(id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Deadlift");
    }

    [Fact]
    public async Task GetWorkoutExerciseByIdHandler_Should_ReturnNull_WhenNotFound()
    {
        var repo = Substitute.For<IWorkoutExerciseRepository>();
        var mapper = CreateMapper();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutExercise?)null);

        var handler = new GetWorkoutExerciseByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutExerciseByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion

    #region WorkoutSet

    [Fact]
    public async Task CreateWorkoutSetHandler_Should_CreateSet()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        var exerciseId = Guid.NewGuid();
        var created = new WorkoutSet { ExerciseId = exerciseId, Repetitions = 12, Weight = 80 };
        repo.CreateAsync(Arg.Any<WorkoutSet>(), Arg.Any<CancellationToken>()).Returns(created);

        var handler = new CreateWorkoutSetHandler(repo, mapper);
        var result = await handler.Handle(
            new CreateWorkoutSetCommand(new CreateWorkoutSetDto { ExerciseId = exerciseId, Repetitions = 12, Weight = 80 }),
            CancellationToken.None);

        result.Repetitions.Should().Be(12);
        result.Weight.Should().Be(80);
    }

    [Fact]
    public async Task UpdateWorkoutSetHandler_Should_UpdateExisting()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        var existing = new WorkoutSet { ExerciseId = Guid.NewGuid(), Repetitions = 10, Weight = 60 };
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        repo.UpdateAsync(Arg.Any<WorkoutSet>(), Arg.Any<CancellationToken>()).Returns(x => x.Arg<WorkoutSet>());

        var handler = new UpdateWorkoutSetHandler(repo, mapper);
        var result = await handler.Handle(
            new UpdateWorkoutSetCommand(id, new UpdateWorkoutSetDto { ExerciseId = existing.ExerciseId, Repetitions = 8, Weight = 100 }),
            CancellationToken.None);

        result.Repetitions.Should().Be(8);
        result.Weight.Should().Be(100);
    }

    [Fact]
    public async Task UpdateWorkoutSetHandler_Should_ThrowWhenNotFound()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutSet?)null);

        var handler = new UpdateWorkoutSetHandler(repo, mapper);
        await handler.Invoking(h => h.Handle(
            new UpdateWorkoutSetCommand(Guid.NewGuid(), new UpdateWorkoutSetDto { ExerciseId = Guid.NewGuid() }),
            CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteWorkoutSetHandler_Should_ReturnTrue()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        repo.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(true);

        var handler = new DeleteWorkoutSetHandler(repo);
        var result = await handler.Handle(new DeleteWorkoutSetCommand(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetWorkoutSetsByExerciseHandler_Should_ReturnSets()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        var exerciseId = Guid.NewGuid();
        repo.GetByExerciseIdAsync(exerciseId, Arg.Any<CancellationToken>()).Returns(new List<WorkoutSet>
        {
            new() { ExerciseId = exerciseId, Repetitions = 12, Weight = 60 },
            new() { ExerciseId = exerciseId, Repetitions = 10, Weight = 70 },
            new() { ExerciseId = exerciseId, Repetitions = 8, Weight = 80 }
        });

        var handler = new GetWorkoutSetsByExerciseHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutSetsByExerciseQuery(exerciseId), CancellationToken.None);

        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetWorkoutSetByIdHandler_Should_ReturnSet()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        var id = Guid.NewGuid();
        repo.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(new WorkoutSet { ExerciseId = Guid.NewGuid(), Repetitions = 10, Weight = 80 });

        var handler = new GetWorkoutSetByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutSetByIdQuery(id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Repetitions.Should().Be(10);
    }

    [Fact]
    public async Task GetWorkoutSetByIdHandler_Should_ReturnNull_WhenNotFound()
    {
        var repo = Substitute.For<IWorkoutSetRepository>();
        var mapper = CreateMapper();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((WorkoutSet?)null);

        var handler = new GetWorkoutSetByIdHandler(repo, mapper);
        var result = await handler.Handle(new GetWorkoutSetByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    #endregion
}
