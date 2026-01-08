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
