using BloodTracker.Application.Admin.Commands;
using BloodTracker.Application.Common;
using MediatR;

namespace BloodTracker.Application.Admin.Handlers;

public sealed class UpdateUserRoleHandler(IAdminRepository adminRepository)
    : IRequestHandler<UpdateUserRoleCommand, Unit>
{
    public async Task<Unit> Handle(UpdateUserRoleCommand request, CancellationToken cancellationToken)
    {
        await adminRepository.UpdateUserRoleAsync(request.UserId, request.IsAdmin, cancellationToken);
        return Unit.Value;
    }
}
