using BloodTracker.Application.Admin.Dto;
using MediatR;

namespace BloodTracker.Application.Admin.Queries;

public sealed record GetAllAdminUsersQuery : IRequest<List<AdminUserDto>>;
