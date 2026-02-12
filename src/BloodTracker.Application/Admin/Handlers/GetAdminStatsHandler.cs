using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Admin.Queries;
using BloodTracker.Application.Common;
using MediatR;

namespace BloodTracker.Application.Admin.Handlers;

public sealed class GetAdminStatsHandler(IAdminRepository adminRepository)
    : IRequestHandler<GetAdminStatsQuery, AdminStatsDto>
{
    public async Task<AdminStatsDto> Handle(GetAdminStatsQuery request, CancellationToken cancellationToken)
    {
        var users = await adminRepository.GetAllUsersAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);
        var thirtyDaysAgo = now.AddDays(-30);

        var activeRecent = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= sevenDaysAgo);
        var totalDbSize = await adminRepository.GetTotalDbSizeAsync(cancellationToken);
        var (totalAnalyses, totalCourses, totalWorkouts) = await adminRepository.GetAggregateStatsAsync(cancellationToken);

        var recentRegs = users
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .GroupBy(u => u.CreatedAt.ToString("yyyy-MM-dd"))
            .Select(g => new RegistrationDay(g.Key, g.Count()))
            .OrderBy(r => r.Date)
            .ToList();

        return new AdminStatsDto(
            users.Count,
            totalDbSize,
            activeRecent,
            totalAnalyses,
            totalCourses,
            totalWorkouts,
            recentRegs);
    }
}
