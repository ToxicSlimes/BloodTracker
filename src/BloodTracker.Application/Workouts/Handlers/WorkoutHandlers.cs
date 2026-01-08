using BloodTracker.Application.Common;
using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Queries;
using BloodTracker.Domain.Models;
using MapsterMapper;
using MediatR;

namespace BloodTracker.Application.Workouts.Handlers;

public sealed class CreateWorkoutProgramHandler(IWorkoutProgramRepository repository, IMapper mapper)
    : IRequestHandler<CreateWorkoutProgramCommand, WorkoutProgramDto>
{
    public async Task<WorkoutProgramDto> Handle(CreateWorkoutProgramCommand request, CancellationToken ct)
    {
        var program = new WorkoutProgram
        {
            Title = request.Data.Title,
            Notes = request.Data.Notes
        };

        var created = await repository.CreateAsync(program, ct);
        return mapper.Map<WorkoutProgramDto>(created);
    }
}

public sealed class UpdateWorkoutProgramHandler(IWorkoutProgramRepository repository, IMapper mapper)
    : IRequestHandler<UpdateWorkoutProgramCommand, WorkoutProgramDto>
{
    public async Task<WorkoutProgramDto> Handle(UpdateWorkoutProgramCommand request, CancellationToken ct)
    {
        var program = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Workout program {request.Id} not found");

        program.Title = request.Data.Title;
        program.Notes = request.Data.Notes;
        program.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(program, ct);
        return mapper.Map<WorkoutProgramDto>(updated);
    }
}

public sealed class DeleteWorkoutProgramHandler(IWorkoutProgramRepository repository)
    : IRequestHandler<DeleteWorkoutProgramCommand, bool>
{
    public async Task<bool> Handle(DeleteWorkoutProgramCommand request, CancellationToken ct)
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetAllWorkoutProgramsHandler(IWorkoutProgramRepository repository, IMapper mapper)
    : IRequestHandler<GetAllWorkoutProgramsQuery, List<WorkoutProgramDto>>
{
    public async Task<List<WorkoutProgramDto>> Handle(GetAllWorkoutProgramsQuery request, CancellationToken ct)
    {
        var programs = await repository.GetAllAsync(ct);
        return programs.Select(p => mapper.Map<WorkoutProgramDto>(p)).ToList();
    }
}

public sealed class GetWorkoutProgramByIdHandler(IWorkoutProgramRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutProgramByIdQuery, WorkoutProgramDto?>
{
    public async Task<WorkoutProgramDto?> Handle(GetWorkoutProgramByIdQuery request, CancellationToken ct)
    {
        var program = await repository.GetByIdAsync(request.Id, ct);
        return program is null ? null : mapper.Map<WorkoutProgramDto>(program);
    }
}

public sealed class CreateWorkoutDayHandler(IWorkoutDayRepository repository, IMapper mapper)
    : IRequestHandler<CreateWorkoutDayCommand, WorkoutDayDto>
{
    public async Task<WorkoutDayDto> Handle(CreateWorkoutDayCommand request, CancellationToken ct)
    {
        var day = new WorkoutDay
        {
            ProgramId = request.Data.ProgramId,
            DayOfWeek = request.Data.DayOfWeek,
            Title = request.Data.Title,
            Notes = request.Data.Notes
        };

        var created = await repository.CreateAsync(day, ct);
        return mapper.Map<WorkoutDayDto>(created);
    }
}

public sealed class UpdateWorkoutDayHandler(IWorkoutDayRepository repository, IMapper mapper)
    : IRequestHandler<UpdateWorkoutDayCommand, WorkoutDayDto>
{
    public async Task<WorkoutDayDto> Handle(UpdateWorkoutDayCommand request, CancellationToken ct)
    {
        var day = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Workout day {request.Id} not found");

        day.ProgramId = request.Data.ProgramId;
        day.DayOfWeek = request.Data.DayOfWeek;
        day.Title = request.Data.Title;
        day.Notes = request.Data.Notes;
        day.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(day, ct);
        return mapper.Map<WorkoutDayDto>(updated);
    }
}

public sealed class DeleteWorkoutDayHandler(IWorkoutDayRepository repository)
    : IRequestHandler<DeleteWorkoutDayCommand, bool>
{
    public async Task<bool> Handle(DeleteWorkoutDayCommand request, CancellationToken ct)
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetWorkoutDaysByProgramHandler(IWorkoutDayRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutDaysByProgramQuery, List<WorkoutDayDto>>
{
    public async Task<List<WorkoutDayDto>> Handle(GetWorkoutDaysByProgramQuery request, CancellationToken ct)
    {
        var days = await repository.GetByProgramIdAsync(request.ProgramId, ct);
        return days.Select(d => mapper.Map<WorkoutDayDto>(d)).ToList();
    }
}

public sealed class GetWorkoutDayByIdHandler(IWorkoutDayRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutDayByIdQuery, WorkoutDayDto?>
{
    public async Task<WorkoutDayDto?> Handle(GetWorkoutDayByIdQuery request, CancellationToken ct)
    {
        var day = await repository.GetByIdAsync(request.Id, ct);
        return day is null ? null : mapper.Map<WorkoutDayDto>(day);
    }
}

public sealed class CreateWorkoutExerciseHandler(IWorkoutExerciseRepository repository, IMapper mapper)
    : IRequestHandler<CreateWorkoutExerciseCommand, WorkoutExerciseDto>
{
    public async Task<WorkoutExerciseDto> Handle(CreateWorkoutExerciseCommand request, CancellationToken ct)
    {
        var exercise = new WorkoutExercise
        {
            ProgramId = request.Data.ProgramId,
            DayId = request.Data.DayId,
            Name = request.Data.Name,
            MuscleGroup = request.Data.MuscleGroup,
            Notes = request.Data.Notes
        };

        var created = await repository.CreateAsync(exercise, ct);
        return mapper.Map<WorkoutExerciseDto>(created);
    }
}

public sealed class UpdateWorkoutExerciseHandler(IWorkoutExerciseRepository repository, IMapper mapper)
    : IRequestHandler<UpdateWorkoutExerciseCommand, WorkoutExerciseDto>
{
    public async Task<WorkoutExerciseDto> Handle(UpdateWorkoutExerciseCommand request, CancellationToken ct)
    {
        var exercise = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Workout exercise {request.Id} not found");

        exercise.ProgramId = request.Data.ProgramId;
        exercise.DayId = request.Data.DayId;
        exercise.Name = request.Data.Name;
        exercise.MuscleGroup = request.Data.MuscleGroup;
        exercise.Notes = request.Data.Notes;
        exercise.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(exercise, ct);
        return mapper.Map<WorkoutExerciseDto>(updated);
    }
}

public sealed class DeleteWorkoutExerciseHandler(IWorkoutExerciseRepository repository)
    : IRequestHandler<DeleteWorkoutExerciseCommand, bool>
{
    public async Task<bool> Handle(DeleteWorkoutExerciseCommand request, CancellationToken ct)
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetWorkoutExercisesByProgramHandler(IWorkoutExerciseRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutExercisesByProgramQuery, List<WorkoutExerciseDto>>
{
    public async Task<List<WorkoutExerciseDto>> Handle(GetWorkoutExercisesByProgramQuery request, CancellationToken ct)
    {
        var exercises = await repository.GetByProgramIdAsync(request.ProgramId, ct);
        return exercises.Select(e => mapper.Map<WorkoutExerciseDto>(e)).ToList();
    }
}

public sealed class GetWorkoutExercisesByDayHandler(IWorkoutExerciseRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutExercisesByDayQuery, List<WorkoutExerciseDto>>
{
    public async Task<List<WorkoutExerciseDto>> Handle(GetWorkoutExercisesByDayQuery request, CancellationToken ct)
    {
        var exercises = await repository.GetByDayIdAsync(request.DayId, ct);
        return exercises.Select(e => mapper.Map<WorkoutExerciseDto>(e)).ToList();
    }
}

public sealed class GetWorkoutExerciseByIdHandler(IWorkoutExerciseRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutExerciseByIdQuery, WorkoutExerciseDto?>
{
    public async Task<WorkoutExerciseDto?> Handle(GetWorkoutExerciseByIdQuery request, CancellationToken ct)
    {
        var exercise = await repository.GetByIdAsync(request.Id, ct);
        return exercise is null ? null : mapper.Map<WorkoutExerciseDto>(exercise);
    }
}

public sealed class CreateWorkoutSetHandler(IWorkoutSetRepository repository, IMapper mapper)
    : IRequestHandler<CreateWorkoutSetCommand, WorkoutSetDto>
{
    public async Task<WorkoutSetDto> Handle(CreateWorkoutSetCommand request, CancellationToken ct)
    {
        var set = new WorkoutSet
        {
            ExerciseId = request.Data.ExerciseId,
            Repetitions = request.Data.Repetitions,
            Weight = request.Data.Weight,
            Duration = request.Data.Duration,
            Notes = request.Data.Notes
        };

        var created = await repository.CreateAsync(set, ct);
        return mapper.Map<WorkoutSetDto>(created);
    }
}

public sealed class UpdateWorkoutSetHandler(IWorkoutSetRepository repository, IMapper mapper)
    : IRequestHandler<UpdateWorkoutSetCommand, WorkoutSetDto>
{
    public async Task<WorkoutSetDto> Handle(UpdateWorkoutSetCommand request, CancellationToken ct)
    {
        var set = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Workout set {request.Id} not found");

        set.ExerciseId = request.Data.ExerciseId;
        set.Repetitions = request.Data.Repetitions;
        set.Weight = request.Data.Weight;
        set.Duration = request.Data.Duration;
        set.Notes = request.Data.Notes;
        set.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(set, ct);
        return mapper.Map<WorkoutSetDto>(updated);
    }
}

public sealed class DeleteWorkoutSetHandler(IWorkoutSetRepository repository)
    : IRequestHandler<DeleteWorkoutSetCommand, bool>
{
    public async Task<bool> Handle(DeleteWorkoutSetCommand request, CancellationToken ct)
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetWorkoutSetsByExerciseHandler(IWorkoutSetRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutSetsByExerciseQuery, List<WorkoutSetDto>>
{
    public async Task<List<WorkoutSetDto>> Handle(GetWorkoutSetsByExerciseQuery request, CancellationToken ct)
    {
        var sets = await repository.GetByExerciseIdAsync(request.ExerciseId, ct);
        return sets.Select(s => mapper.Map<WorkoutSetDto>(s)).ToList();
    }
}

public sealed class GetWorkoutSetByIdHandler(IWorkoutSetRepository repository, IMapper mapper)
    : IRequestHandler<GetWorkoutSetByIdQuery, WorkoutSetDto?>
{
    public async Task<WorkoutSetDto?> Handle(GetWorkoutSetByIdQuery request, CancellationToken ct)
    {
        var set = await repository.GetByIdAsync(request.Id, ct);
        return set is null ? null : mapper.Map<WorkoutSetDto>(set);
    }
}
