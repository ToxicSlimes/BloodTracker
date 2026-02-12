using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Handlers;
using BloodTracker.Application.Analyses.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using FluentAssertions;
using MapsterMapper;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class AnalysisHandlerTests
{
    private readonly IAnalysisRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateAnalysisHandler> _logger;

    public AnalysisHandlerTests()
    {
        _repository = Substitute.For<IAnalysisRepository>();
        _mapper = Substitute.For<IMapper>();
        _logger = Substitute.For<ILogger<CreateAnalysisHandler>>();
    }

    [Fact]
    public async Task CreateAnalysisHandler_Should_CreateAnalysis()
    {
        // Arrange
        var date = DateTime.UtcNow;
        var command = new CreateAnalysisCommand(new CreateAnalysisDto
        {
            Date = date,
            Label = "Blood Test",
            Laboratory = "Invitro",
            Notes = "Fasting",
            Values = new Dictionary<string, double> { ["glucose"] = 5.5 }
        });

        var createdAnalysis = new Analysis
        {
            Date = date,
            Label = "Blood Test",
            Laboratory = "Invitro",
            Notes = "Fasting",
            Values = new Dictionary<string, double> { ["glucose"] = 5.5 }
        };

        var expectedDto = new AnalysisDto
        {
            Id = createdAnalysis.Id,
            Date = date,
            Label = "Blood Test"
        };

        _repository.CreateAsync(Arg.Any<Analysis>(), Arg.Any<CancellationToken>())
            .Returns(createdAnalysis);
        _mapper.Map<AnalysisDto>(createdAnalysis).Returns(expectedDto);

        var handler = new CreateAnalysisHandler(_repository, _mapper, _logger);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Label.Should().Be("Blood Test");
        await _repository.Received(1).CreateAsync(Arg.Any<Analysis>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAllAnalysesHandler_Should_ReturnAllAnalyses()
    {
        // Arrange
        var analyses = new List<Analysis>
        {
            new() { Date = DateTime.UtcNow, Label = "Test 1" },
            new() { Date = DateTime.UtcNow, Label = "Test 2" }
        };

        _repository.GetAllAsync(Arg.Any<CancellationToken>()).Returns(analyses);
        _mapper.Map<AnalysisDto>(Arg.Any<Analysis>()).Returns(
            x => new AnalysisDto { Id = ((Analysis)x[0]).Id, Label = ((Analysis)x[0]).Label }
        );

        var handler = new GetAllAnalysesHandler(_repository, _mapper);
        var query = new GetAllAnalysesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        await _repository.Received(1).GetAllAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAnalysisHandler_Should_DeleteAnalysis()
    {
        // Arrange
        var analysisId = Guid.NewGuid();
        _repository.DeleteAsync(analysisId, Arg.Any<CancellationToken>()).Returns(true);

        var deleteLogger = Substitute.For<ILogger<DeleteAnalysisHandler>>();
        var handler = new DeleteAnalysisHandler(_repository, deleteLogger);
        var command = new DeleteAnalysisCommand(analysisId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        await _repository.Received(1).DeleteAsync(analysisId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAnalysisHandler_Should_ReturnFalse_WhenNotFound()
    {
        // Arrange
        var analysisId = Guid.NewGuid();
        _repository.DeleteAsync(analysisId, Arg.Any<CancellationToken>()).Returns(false);

        var deleteLogger = Substitute.For<ILogger<DeleteAnalysisHandler>>();
        var handler = new DeleteAnalysisHandler(_repository, deleteLogger);
        var command = new DeleteAnalysisCommand(analysisId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetAnalysisByIdHandler_Should_ReturnAnalysis_WhenExists()
    {
        // Arrange
        var analysisId = Guid.NewGuid();
        var analysis = new Analysis { Date = DateTime.UtcNow, Label = "Test" };
        var expectedDto = new AnalysisDto { Id = analysisId, Label = "Test" };

        _repository.GetByIdAsync(analysisId, Arg.Any<CancellationToken>()).Returns(analysis);
        _mapper.Map<AnalysisDto>(analysis).Returns(expectedDto);

        var handler = new GetAnalysisByIdHandler(_repository, _mapper);
        var query = new GetAnalysisByIdQuery(analysisId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Label.Should().Be("Test");
    }

    [Fact]
    public async Task GetAnalysisByIdHandler_Should_ReturnNull_WhenNotExists()
    {
        // Arrange
        var analysisId = Guid.NewGuid();
        _repository.GetByIdAsync(analysisId, Arg.Any<CancellationToken>()).Returns((Analysis?)null);

        var handler = new GetAnalysisByIdHandler(_repository, _mapper);
        var query = new GetAnalysisByIdQuery(analysisId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }
}
