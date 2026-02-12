using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Handlers;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class CourseHandlerTests
{
    private readonly ICourseRepository _repository;

    public CourseHandlerTests()
    {
        _repository = Substitute.For<ICourseRepository>();
    }

    [Fact]
    public async Task CreateCourseHandler_Should_CreateActiveCourse()
    {
        // Arrange
        var command = new CreateCourseCommand(new CreateCourseDto
        {
            Title = "Spring Cycle",
            StartDate = DateTime.UtcNow,
            Notes = "Doctor prescribed"
        });

        var createdCourse = new Course
        {
            Title = "Spring Cycle",
            IsActive = true,
            StartDate = command.Data.StartDate,
            Notes = command.Data.Notes
        };

        _repository.CreateAsync(Arg.Any<Course>(), Arg.Any<CancellationToken>())
            .Returns(createdCourse);

        var handler = new CreateCourseHandler(_repository);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Spring Cycle");
        result.IsActive.Should().BeTrue();
        await _repository.Received(1).CreateAsync(
            Arg.Is<Course>(c => c.Title == "Spring Cycle" && c.IsActive),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task GetActiveCourseHandler_Should_ReturnActiveCourse()
    {
        // Arrange
        var activeCourse = new Course
        {
            Title = "Active Course",
            IsActive = true
        };

        _repository.GetActiveAsync(Arg.Any<CancellationToken>()).Returns(activeCourse);

        var handler = new GetActiveCourseHandler(_repository);
        var query = new GetActiveCourseQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Active Course");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetActiveCourseHandler_Should_ReturnNull_WhenNoActiveCourse()
    {
        // Arrange
        _repository.GetActiveAsync(Arg.Any<CancellationToken>()).Returns((Course?)null);

        var handler = new GetActiveCourseHandler(_repository);
        var query = new GetActiveCourseQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllCoursesHandler_Should_ReturnAllCourses()
    {
        // Arrange
        var courses = new List<Course>
        {
            new() { Title = "Course 1", IsActive = true },
            new() { Title = "Course 2", IsActive = false }
        };

        _repository.GetAllAsync(Arg.Any<CancellationToken>()).Returns(courses);

        var handler = new GetAllCoursesHandler(_repository);
        var query = new GetAllCoursesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(c => c.Title == "Course 1");
        result.Should().Contain(c => c.Title == "Course 2");
    }

    [Fact]
    public async Task UpdateCourseHandler_Should_UpdateExistingCourse()
    {
        // Arrange
        var courseId = Guid.NewGuid();
        var existingCourse = new Course
        {
            Title = "Old Title",
            IsActive = true
        };

        var command = new UpdateCourseCommand(courseId, new CreateCourseDto
        {
            Title = "Updated Title",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3),
            Notes = "Updated notes"
        });

        _repository.GetByIdAsync(courseId, Arg.Any<CancellationToken>()).Returns(existingCourse);
        _repository.UpdateAsync(Arg.Any<Course>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<Course>());

        var handler = new UpdateCourseHandler(_repository);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Updated Title");
        await _repository.Received(1).UpdateAsync(
            Arg.Is<Course>(c => c.Title == "Updated Title"),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task UpdateCourseHandler_Should_ThrowException_WhenCourseNotFound()
    {
        // Arrange
        var courseId = Guid.NewGuid();
        _repository.GetByIdAsync(courseId, Arg.Any<CancellationToken>()).Returns((Course?)null);

        var command = new UpdateCourseCommand(courseId, new CreateCourseDto
        {
            Title = "Updated Title"
        });

        var handler = new UpdateCourseHandler(_repository);

        // Act & Assert
        await handler.Invoking(h => h.Handle(command, CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }
}
