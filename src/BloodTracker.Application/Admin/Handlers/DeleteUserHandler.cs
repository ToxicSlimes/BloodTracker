using BloodTracker.Application.Admin.Commands;
using BloodTracker.Application.Common;
using MediatR;

namespace BloodTracker.Application.Admin.Handlers;

public sealed class DeleteUserHandler(IAdminRepository adminRepository)
    : IRequestHandler<DeleteUserCommand, Unit>
{
    public async Task<Unit> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        await adminRepository.DeleteUserAsync(request.UserId, cancellationToken);
        return Unit.Value;
    }
}
