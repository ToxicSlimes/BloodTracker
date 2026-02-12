using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class CourseRepository : BaseRepository<Course>, ICourseRepository
{
    public CourseRepository(BloodTrackerDbContext context) : base(context.Courses)
    {
    }

    public Task<List<Course>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.FindAll().ToList());

    public Task<Course?> GetActiveAsync(CancellationToken ct = default)
        => Task.FromResult<Course?>(Collection.FindOne(x => x.IsActive));

    public override Task<Course> CreateAsync(Course course, CancellationToken ct = default)
    {
        // Deactivate other courses
        var activeCourses = Collection.Find(x => x.IsActive).ToList();
        foreach (var c in activeCourses)
        {
            c.IsActive = false;
            Collection.Update(c);
        }
        Collection.Insert(course);
        return Task.FromResult(course);
    }
}
