using BloodTracker.Application.Workouts.Dto;
using MediatR;

namespace BloodTracker.Application.Workouts.Commands;

public sealed record CreateWorkoutProgramCommand(CreateWorkoutProgramDto Data) : IRequest<WorkoutProgramDto>;
public sealed record UpdateWorkoutProgramCommand(Guid Id, UpdateWorkoutProgramDto Data) : IRequest<WorkoutProgramDto>;
public sealed record DeleteWorkoutProgramCommand(Guid Id) : IRequest<bool>;

public sealed record CreateWorkoutDayCommand(CreateWorkoutDayDto Data) : IRequest<WorkoutDayDto>;
public sealed record UpdateWorkoutDayCommand(Guid Id, UpdateWorkoutDayDto Data) : IRequest<WorkoutDayDto>;
public sealed record DeleteWorkoutDayCommand(Guid Id) : IRequest<bool>;

public sealed record CreateWorkoutExerciseCommand(CreateWorkoutExerciseDto Data) : IRequest<WorkoutExerciseDto>;
public sealed record UpdateWorkoutExerciseCommand(Guid Id, UpdateWorkoutExerciseDto Data) : IRequest<WorkoutExerciseDto>;
public sealed record DeleteWorkoutExerciseCommand(Guid Id) : IRequest<bool>;

public sealed record CreateWorkoutSetCommand(CreateWorkoutSetDto Data) : IRequest<WorkoutSetDto>;
public sealed record UpdateWorkoutSetCommand(Guid Id, UpdateWorkoutSetDto Data) : IRequest<WorkoutSetDto>;
public sealed record DeleteWorkoutSetCommand(Guid Id) : IRequest<bool>;
