using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Admin.Queries;
using BloodTracker.Application.Common;
using MediatR;

namespace BloodTracker.Application.Admin.Handlers;

public sealed class GetAllAdminUsersHandler(IAdminRepository adminRepository)
    : IRequestHandler<GetAllAdminUsersQuery, List<AdminUserDto>>
{
    public async Task<List<AdminUserDto>> Handle(GetAllAdminUsersQuery request, CancellationToken cancellationToken)
    {
        var users = await adminRepository.GetAllUsersAsync(cancellationToken);
        var result = new List<AdminUserDto>();

        foreach (var user in users)
        {
            var stats = await adminRepository.GetUserDbStatsAsync(user.Id, cancellationToken);
            result.Add(new AdminUserDto(
                user.Id,
                user.Email,
                user.DisplayName,
                user.IsAdmin,
                user.CreatedAt,
                user.LastLoginAt,
                stats.AnalysesCount,
                stats.CoursesCount,
                stats.DrugsCount,
                stats.WorkoutsCount));
        }

        return result.OrderByDescending(u => u.CreatedAt).ToList();
    }
}
