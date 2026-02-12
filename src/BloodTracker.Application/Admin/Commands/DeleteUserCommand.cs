using MediatR;

namespace BloodTracker.Application.Admin.Commands;

public sealed record DeleteUserCommand(Guid UserId) : IRequest<Unit>;
