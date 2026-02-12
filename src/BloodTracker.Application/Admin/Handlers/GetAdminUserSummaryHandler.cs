using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Admin.Queries;
using BloodTracker.Application.Common;
using MediatR;

namespace BloodTracker.Application.Admin.Handlers;

public sealed class GetAdminUserSummaryHandler(IAdminRepository adminRepository)
    : IRequestHandler<GetAdminUserSummaryQuery, AdminUserSummaryDto?>
{
    public async Task<AdminUserSummaryDto?> Handle(GetAdminUserSummaryQuery request, CancellationToken cancellationToken)
    {
        var user = await adminRepository.GetUserByIdAsync(request.UserId, cancellationToken);
        if (user is null)
            return null;

        var stats = await adminRepository.GetUserDbStatsAsync(request.UserId, cancellationToken);
        var analyses = await adminRepository.GetUserAnalysesAsync(request.UserId, cancellationToken);
        var activeCourse = await adminRepository.GetUserActiveCourseAsync(request.UserId, cancellationToken);

        return new AdminUserSummaryDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.IsAdmin,
            user.CreatedAt,
            user.LastLoginAt,
            analyses,
            activeCourse,
            stats.DrugsCount,
            stats.WorkoutsCount,
            stats.DbSizeBytes);
    }
}
