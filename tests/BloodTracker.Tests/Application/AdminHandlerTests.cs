using BloodTracker.Application.Admin.Commands;
using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Admin.Handlers;
using BloodTracker.Application.Admin.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using FluentAssertions;
using MediatR;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class AdminHandlerTests
{
    #region DeleteUserHandler Tests

    [Fact]
    public async Task DeleteUserHandler_ShouldCallDeleteUserAsyncWithCorrectUserId()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new DeleteUserHandler(repository);
        var userId = Guid.NewGuid();
        var command = new DeleteUserCommand(userId);
        var cancellationToken = CancellationToken.None;

        // Act
        var result = await handler.Handle(command, cancellationToken);

        // Assert
        await repository.Received(1).DeleteUserAsync(userId, cancellationToken);
        result.Should().Be(Unit.Value);
    }

    #endregion

    #region GetAdminStatsHandler Tests

    [Fact]
    public async Task GetAdminStatsHandler_ShouldCalculateActiveUsersLast7Days()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAdminStatsHandler(repository);
        var query = new GetAdminStatsQuery();
        var cancellationToken = CancellationToken.None;

        var now = DateTime.UtcNow;
        var users = new List<AppUser>
        {
            new() { Id = Guid.NewGuid(), Email = "user1@test.com", CreatedAt = now.AddDays(-10), LastLoginAt = now.AddDays(-2) },
            new() { Id = Guid.NewGuid(), Email = "user2@test.com", CreatedAt = now.AddDays(-5), LastLoginAt = now.AddDays(-1) },
            new() { Id = Guid.NewGuid(), Email = "user3@test.com", CreatedAt = now.AddDays(-20), LastLoginAt = now.AddDays(-10) },
            new() { Id = Guid.NewGuid(), Email = "user4@test.com", CreatedAt = now.AddDays(-3), LastLoginAt = null }
        };

        repository.GetAllUsersAsync(cancellationToken).Returns(users);
        repository.GetTotalDbSizeAsync(cancellationToken).Returns(1024L);
        repository.GetAggregateStatsAsync(cancellationToken).Returns((100, 50, 75));

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.Should().NotBeNull();
        result.TotalUsers.Should().Be(4);
        result.ActiveUsersLast7Days.Should().Be(2); // user1 and user2 logged in within last 7 days
        result.TotalDbSizeBytes.Should().Be(1024L);
    }

    [Fact]
    public async Task GetAdminStatsHandler_ShouldAggregateStats()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAdminStatsHandler(repository);
        var query = new GetAdminStatsQuery();
        var cancellationToken = CancellationToken.None;

        repository.GetAllUsersAsync(cancellationToken).Returns(new List<AppUser>());
        repository.GetTotalDbSizeAsync(cancellationToken).Returns(2048L);
        repository.GetAggregateStatsAsync(cancellationToken).Returns((150, 75, 100));

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.TotalAnalyses.Should().Be(150);
        result.TotalCourses.Should().Be(75);
        result.TotalWorkouts.Should().Be(100);
    }

    [Fact]
    public async Task GetAdminStatsHandler_ShouldGroupRecentRegistrationsByDate()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAdminStatsHandler(repository);
        var query = new GetAdminStatsQuery();
        var cancellationToken = CancellationToken.None;

        var now = DateTime.UtcNow;
        var users = new List<AppUser>
        {
            new() { Id = Guid.NewGuid(), Email = "user1@test.com", CreatedAt = now.AddDays(-1) },
            new() { Id = Guid.NewGuid(), Email = "user2@test.com", CreatedAt = now.AddDays(-1) },
            new() { Id = Guid.NewGuid(), Email = "user3@test.com", CreatedAt = now.AddDays(-2) },
            new() { Id = Guid.NewGuid(), Email = "user4@test.com", CreatedAt = now.AddDays(-5) },
            new() { Id = Guid.NewGuid(), Email = "user5@test.com", CreatedAt = now.AddDays(-40) } // Outside 30-day window
        };

        repository.GetAllUsersAsync(cancellationToken).Returns(users);
        repository.GetTotalDbSizeAsync(cancellationToken).Returns(1024L);
        repository.GetAggregateStatsAsync(cancellationToken).Returns((100, 50, 75));

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.RecentRegistrations.Should().NotBeEmpty();
        result.RecentRegistrations.Should().HaveCountGreaterOrEqualTo(3); // At least 3 distinct days
        
        var dayWithTwoUsers = result.RecentRegistrations.FirstOrDefault(r => r.Count == 2);
        dayWithTwoUsers.Should().NotBeNull();
    }

    #endregion

    #region GetAdminUserSummaryHandler Tests

    [Fact]
    public async Task GetAdminUserSummaryHandler_ShouldReturnFullSummaryForExistingUser()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAdminUserSummaryHandler(repository);
        var userId = Guid.NewGuid();
        var query = new GetAdminUserSummaryQuery(userId);
        var cancellationToken = CancellationToken.None;

        var user = new AppUser
        {
            Id = userId,
            Email = "test@example.com",
            DisplayName = "Test User",
            IsAdmin = false,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            LastLoginAt = DateTime.UtcNow.AddHours(-2)
        };

        var stats = new UserDbStats(
            AnalysesCount: 5,
            CoursesCount: 2,
            DrugsCount: 3,
            WorkoutsCount: 4,
            DbSizeBytes: 4096L
        );

        var analyses = new List<AdminAnalysisBrief>
        {
            new(Guid.NewGuid(), DateTime.UtcNow.AddDays(-5), "Blood Test 1"),
            new(Guid.NewGuid(), DateTime.UtcNow.AddDays(-3), "Blood Test 2")
        };

        var activeCourse = new AdminCourseBrief(
            Title: "Vitamin D Course",
            StartDate: DateTime.UtcNow.AddDays(-7),
            EndDate: DateTime.UtcNow.AddDays(7),
            IsActive: true
        );

        repository.GetUserByIdAsync(userId, cancellationToken).Returns(user);
        repository.GetUserDbStatsAsync(userId, cancellationToken).Returns(stats);
        repository.GetUserAnalysesAsync(userId, cancellationToken).Returns(analyses);
        repository.GetUserActiveCourseAsync(userId, cancellationToken).Returns(activeCourse);

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(userId);
        result.Email.Should().Be("test@example.com");
        result.DisplayName.Should().Be("Test User");
        result.IsAdmin.Should().BeFalse();
        result.DrugCount.Should().Be(3);
        result.WorkoutProgramCount.Should().Be(4);
        result.DbSizeBytes.Should().Be(4096L);
        result.Analyses.Should().HaveCount(2);
        result.ActiveCourse.Should().NotBeNull();
        result.ActiveCourse!.Title.Should().Be("Vitamin D Course");
    }

    [Fact]
    public async Task GetAdminUserSummaryHandler_ShouldReturnNullForNonExistingUser()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAdminUserSummaryHandler(repository);
        var userId = Guid.NewGuid();
        var query = new GetAdminUserSummaryQuery(userId);
        var cancellationToken = CancellationToken.None;

        repository.GetUserByIdAsync(userId, cancellationToken).Returns((AppUser?)null);

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.Should().BeNull();
        await repository.DidNotReceive().GetUserDbStatsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await repository.DidNotReceive().GetUserAnalysesAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await repository.DidNotReceive().GetUserActiveCourseAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    #endregion

    #region GetAllAdminUsersHandler Tests

    [Fact]
    public async Task GetAllAdminUsersHandler_ShouldReturnAllUsersWithStatsOrderedByCreatedAtDesc()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new GetAllAdminUsersHandler(repository);
        var query = new GetAllAdminUsersQuery();
        var cancellationToken = CancellationToken.None;

        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();
        var user3Id = Guid.NewGuid();

        var users = new List<AppUser>
        {
            new() { Id = user1Id, Email = "user1@test.com", CreatedAt = DateTime.UtcNow.AddDays(-5) },
            new() { Id = user2Id, Email = "user2@test.com", CreatedAt = DateTime.UtcNow.AddDays(-10) },
            new() { Id = user3Id, Email = "user3@test.com", CreatedAt = DateTime.UtcNow.AddDays(-1) }
        };

        var stats1 = new UserDbStats(5, 2, 3, 4, 1024L);
        var stats2 = new UserDbStats(10, 3, 5, 6, 2048L);
        var stats3 = new UserDbStats(2, 1, 1, 2, 512L);

        repository.GetAllUsersAsync(cancellationToken).Returns(users);
        repository.GetUserDbStatsAsync(user1Id, cancellationToken).Returns(stats1);
        repository.GetUserDbStatsAsync(user2Id, cancellationToken).Returns(stats2);
        repository.GetUserDbStatsAsync(user3Id, cancellationToken).Returns(stats3);

        // Act
        var result = await handler.Handle(query, cancellationToken);

        // Assert
        result.Should().HaveCount(3);
        result[0].Id.Should().Be(user3Id); // Most recent
        result[1].Id.Should().Be(user1Id);
        result[2].Id.Should().Be(user2Id); // Oldest
        
        result[0].AnalysesCount.Should().Be(2);
        result[1].AnalysesCount.Should().Be(5);
        result[2].AnalysesCount.Should().Be(10);
    }

    #endregion

    #region UpdateUserRoleHandler Tests

    [Fact]
    public async Task UpdateUserRoleHandler_ShouldCallUpdateUserRoleAsyncWithCorrectParams()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new UpdateUserRoleHandler(repository);
        var userId = Guid.NewGuid();
        var command = new UpdateUserRoleCommand(userId, IsAdmin: true);
        var cancellationToken = CancellationToken.None;

        // Act
        var result = await handler.Handle(command, cancellationToken);

        // Assert
        await repository.Received(1).UpdateUserRoleAsync(userId, true, cancellationToken);
        result.Should().Be(Unit.Value);
    }

    [Fact]
    public async Task UpdateUserRoleHandler_ShouldHandleFalseIsAdminParameter()
    {
        // Arrange
        var repository = Substitute.For<IAdminRepository>();
        var handler = new UpdateUserRoleHandler(repository);
        var userId = Guid.NewGuid();
        var command = new UpdateUserRoleCommand(userId, IsAdmin: false);
        var cancellationToken = CancellationToken.None;

        // Act
        var result = await handler.Handle(command, cancellationToken);

        // Assert
        await repository.Received(1).UpdateUserRoleAsync(userId, false, cancellationToken);
        result.Should().Be(Unit.Value);
    }

    #endregion
}
