using BloodTracker.Application.Workouts.Dto;
using MediatR;

namespace BloodTracker.Application.Workouts.Queries;

public sealed record GetAllWorkoutProgramsQuery : IRequest<List<WorkoutProgramDto>>;
public sealed record GetWorkoutProgramByIdQuery(Guid Id) : IRequest<WorkoutProgramDto?>;

public sealed record GetWorkoutDaysByProgramQuery(Guid ProgramId) : IRequest<List<WorkoutDayDto>>;
public sealed record GetWorkoutDayByIdQuery(Guid Id) : IRequest<WorkoutDayDto?>;

public sealed record GetWorkoutExercisesByProgramQuery(Guid ProgramId) : IRequest<List<WorkoutExerciseDto>>;
public sealed record GetWorkoutExercisesByDayQuery(Guid DayId) : IRequest<List<WorkoutExerciseDto>>;
public sealed record GetWorkoutExerciseByIdQuery(Guid Id) : IRequest<WorkoutExerciseDto?>;

public sealed record GetWorkoutSetsByExerciseQuery(Guid ExerciseId) : IRequest<List<WorkoutSetDto>>;
public sealed record GetWorkoutSetByIdQuery(Guid Id) : IRequest<WorkoutSetDto?>;
