using MediatR;

namespace BloodTracker.Application.Admin.Commands;

public sealed record UpdateUserRoleCommand(Guid UserId, bool IsAdmin) : IRequest<Unit>;
