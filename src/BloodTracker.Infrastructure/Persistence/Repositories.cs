using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence;

public sealed class AnalysisRepository(BloodTrackerDbContext context) : IAnalysisRepository
{
    public Task<List<Analysis>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.Analyses.Query().OrderByDescending(x => x.Date).ToList());

    public Task<Analysis?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<Analysis?>(context.Analyses.FindById(id));

    public Task<Analysis> CreateAsync(Analysis analysis, CancellationToken ct = default)
    {
        context.Analyses.Insert(analysis);
        return Task.FromResult(analysis);
    }

    public Task<Analysis> UpdateAsync(Analysis analysis, CancellationToken ct = default)
    {
        context.Analyses.Update(analysis);
        return Task.FromResult(analysis);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.Analyses.Delete(id));
}

public sealed class CourseRepository(BloodTrackerDbContext context) : ICourseRepository
{
    public Task<List<Course>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.Courses.FindAll().ToList());

    public Task<Course?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<Course?>(context.Courses.FindById(id));

    public Task<Course?> GetActiveAsync(CancellationToken ct = default)
        => Task.FromResult<Course?>(context.Courses.FindOne(x => x.IsActive));

    public Task<Course> CreateAsync(Course course, CancellationToken ct = default)
    {
        // Deactivate other courses
        var activeCourses = context.Courses.Find(x => x.IsActive).ToList();
        foreach (var c in activeCourses)
        {
            c.IsActive = false;
            context.Courses.Update(c);
        }
        context.Courses.Insert(course);
        return Task.FromResult(course);
    }

    public Task<Course> UpdateAsync(Course course, CancellationToken ct = default)
    {
        context.Courses.Update(course);
        return Task.FromResult(course);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.Courses.Delete(id));
}

public sealed class DrugRepository(BloodTrackerDbContext context) : IDrugRepository
{
    public Task<List<Drug>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.Drugs.FindAll().ToList());

    public Task<List<Drug>> GetByCourseIdAsync(Guid courseId, CancellationToken ct = default)
        => Task.FromResult(context.Drugs.Find(x => x.CourseId == courseId).ToList());

    public Task<Drug?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<Drug?>(context.Drugs.FindById(id));

    public Task<Drug> CreateAsync(Drug drug, CancellationToken ct = default)
    {
        context.Drugs.Insert(drug);
        return Task.FromResult(drug);
    }

    public Task<Drug> UpdateAsync(Drug drug, CancellationToken ct = default)
    {
        drug.UpdatedAt = DateTime.UtcNow;
        context.Drugs.Update(drug);
        return Task.FromResult(drug);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.Drugs.Delete(id));
}

public sealed class IntakeLogRepository(BloodTrackerDbContext context) : IIntakeLogRepository
{
    public Task<List<IntakeLog>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.IntakeLogs.Query().OrderByDescending(x => x.Date).ToList());

    public Task<List<IntakeLog>> GetRecentAsync(int count, CancellationToken ct = default)
        => Task.FromResult(context.IntakeLogs.Query().OrderByDescending(x => x.Date).Limit(count).ToList());

    public Task<IntakeLog?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<IntakeLog?>(context.IntakeLogs.FindById(id));

    public Task<IntakeLog> CreateAsync(IntakeLog log, CancellationToken ct = default)
    {
        context.IntakeLogs.Insert(log);
        return Task.FromResult(log);
    }

    public Task<IntakeLog> UpdateAsync(IntakeLog log, CancellationToken ct = default)
    {
        log.UpdatedAt = DateTime.UtcNow;
        context.IntakeLogs.Update(log);
        return Task.FromResult(log);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.IntakeLogs.Delete(id));
}

public sealed class WorkoutProgramRepository(BloodTrackerDbContext context) : IWorkoutProgramRepository
{
    public Task<List<WorkoutProgram>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.WorkoutPrograms.FindAll().ToList());

    public Task<WorkoutProgram?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<WorkoutProgram?>(context.WorkoutPrograms.FindById(id));

    public Task<WorkoutProgram> CreateAsync(WorkoutProgram program, CancellationToken ct = default)
    {
        context.WorkoutPrograms.Insert(program);
        return Task.FromResult(program);
    }

    public Task<WorkoutProgram> UpdateAsync(WorkoutProgram program, CancellationToken ct = default)
    {
        program.UpdatedAt = DateTime.UtcNow;
        context.WorkoutPrograms.Update(program);
        return Task.FromResult(program);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutPrograms.Delete(id));
}

public sealed class WorkoutDayRepository(BloodTrackerDbContext context) : IWorkoutDayRepository
{
    public Task<List<WorkoutDay>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutDays.Find(x => x.ProgramId == programId).ToList());

    public Task<WorkoutDay?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<WorkoutDay?>(context.WorkoutDays.FindById(id));

    public Task<WorkoutDay> CreateAsync(WorkoutDay day, CancellationToken ct = default)
    {
        context.WorkoutDays.Insert(day);
        return Task.FromResult(day);
    }

    public Task<WorkoutDay> UpdateAsync(WorkoutDay day, CancellationToken ct = default)
    {
        day.UpdatedAt = DateTime.UtcNow;
        context.WorkoutDays.Update(day);
        return Task.FromResult(day);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutDays.Delete(id));
}

public sealed class WorkoutExerciseRepository(BloodTrackerDbContext context) : IWorkoutExerciseRepository
{
    public Task<List<WorkoutExercise>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutExercises.Find(x => x.ProgramId == programId).ToList());

    public Task<List<WorkoutExercise>> GetByDayIdAsync(Guid dayId, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutExercises.Find(x => x.DayId == dayId).ToList());

    public Task<WorkoutExercise?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<WorkoutExercise?>(context.WorkoutExercises.FindById(id));

    public Task<WorkoutExercise> CreateAsync(WorkoutExercise exercise, CancellationToken ct = default)
    {
        context.WorkoutExercises.Insert(exercise);
        return Task.FromResult(exercise);
    }

    public Task<WorkoutExercise> UpdateAsync(WorkoutExercise exercise, CancellationToken ct = default)
    {
        exercise.UpdatedAt = DateTime.UtcNow;
        context.WorkoutExercises.Update(exercise);
        return Task.FromResult(exercise);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutExercises.Delete(id));
}

public sealed class WorkoutSetRepository(BloodTrackerDbContext context) : IWorkoutSetRepository
{
    public Task<List<WorkoutSet>> GetByExerciseIdAsync(Guid exerciseId, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutSets.Find(x => x.ExerciseId == exerciseId).ToList());

    public Task<WorkoutSet?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<WorkoutSet?>(context.WorkoutSets.FindById(id));

    public Task<WorkoutSet> CreateAsync(WorkoutSet set, CancellationToken ct = default)
    {
        context.WorkoutSets.Insert(set);
        return Task.FromResult(set);
    }

    public Task<WorkoutSet> UpdateAsync(WorkoutSet set, CancellationToken ct = default)
    {
        set.UpdatedAt = DateTime.UtcNow;
        context.WorkoutSets.Update(set);
        return Task.FromResult(set);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.WorkoutSets.Delete(id));
}

public sealed class PurchaseRepository(BloodTrackerDbContext context) : IPurchaseRepository
{
    public Task<List<Purchase>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.Purchases.Query().OrderByDescending(x => x.PurchaseDate).ToList());

    public Task<List<Purchase>> GetByDrugIdAsync(Guid drugId, CancellationToken ct = default)
        => Task.FromResult(context.Purchases.Find(x => x.DrugId == drugId).OrderByDescending(x => x.PurchaseDate).ToList());

    public Task<Purchase?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<Purchase?>(context.Purchases.FindById(id));

    public Task<Purchase> CreateAsync(Purchase purchase, CancellationToken ct = default)
    {
        context.Purchases.Insert(purchase);
        return Task.FromResult(purchase);
    }

    public Task<Purchase> UpdateAsync(Purchase purchase, CancellationToken ct = default)
    {
        purchase.UpdatedAt = DateTime.UtcNow;
        context.Purchases.Update(purchase);
        return Task.FromResult(purchase);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.Purchases.Delete(id));
}
