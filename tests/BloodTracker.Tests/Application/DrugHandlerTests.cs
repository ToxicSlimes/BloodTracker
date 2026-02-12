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

public class DrugHandlerTests
{
    private readonly IDrugRepository _repository;
    private readonly IIntakeLogRepository _logRepository;
    private readonly IPurchaseRepository _purchaseRepository;
    private readonly IDrugCatalogService _catalogService;

    public DrugHandlerTests()
    {
        _repository = Substitute.For<IDrugRepository>();
        _logRepository = Substitute.For<IIntakeLogRepository>();
        _purchaseRepository = Substitute.For<IPurchaseRepository>();
        _catalogService = Substitute.For<IDrugCatalogService>();
    }

    [Fact]
    public async Task CreateDrugHandler_Should_CreateDrug()
    {
        // Arrange
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "Testosterone Enanthate",
            Type = DrugType.Injectable,
            Dosage = "250mg",
            Schedule = "2x per week"
        });

        var createdDrug = new Drug
        {
            Name = "Testosterone Enanthate",
            Type = DrugType.Injectable,
            Dosage = "250mg",
            Schedule = "2x per week"
        };

        _repository.CreateAsync(Arg.Any<Drug>(), Arg.Any<CancellationToken>())
            .Returns(createdDrug);

        var handler = new CreateDrugHandler(_repository, _catalogService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        await _repository.Received(1).CreateAsync(
            Arg.Is<Drug>(d => d.Name == "Testosterone Enanthate" && d.Type == DrugType.Injectable),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task CreateDrugHandler_Should_ThrowException_ForInvalidDrugType()
    {
        // Arrange
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "Test Drug",
            Type = (DrugType)999 // Invalid enum value
        });

        var handler = new CreateDrugHandler(_repository, _catalogService);

        // Act & Assert
        await handler.Invoking(h => h.Handle(command, CancellationToken.None))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid drug type: 999");
    }

    [Fact]
    public async Task DeleteDrugHandler_Should_DeleteDrugAndCascadeRelatedData()
    {
        // Arrange
        var drugId = Guid.NewGuid();
        var drug = new Drug
        {
            Name = "Test Drug",
            Type = DrugType.Oral
        };

        var purchases = new List<Purchase>
        {
            new() { DrugId = drugId, DrugName = "TestDrug", PurchaseDate = DateTime.Today, Quantity = 100, Price = 50 },
            new() { DrugId = drugId, DrugName = "TestDrug", PurchaseDate = DateTime.Today, Quantity = 50, Price = 25 }
        };

        _repository.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        _purchaseRepository.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(purchases);
        _logRepository.DeleteByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(true);
        _repository.DeleteAsync(drugId, Arg.Any<CancellationToken>()).Returns(true);

        var handler = new DeleteDrugHandler(_repository, _logRepository, _purchaseRepository);
        var command = new DeleteDrugCommand(drugId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        await _logRepository.Received(1).DeleteByDrugIdAsync(drugId, Arg.Any<CancellationToken>());
        await _purchaseRepository.Received(2).DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _repository.Received(1).DeleteAsync(drugId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteDrugHandler_Should_ReturnFalse_WhenDrugNotFound()
    {
        // Arrange
        var drugId = Guid.NewGuid();
        _repository.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var handler = new DeleteDrugHandler(_repository, _logRepository, _purchaseRepository);
        var command = new DeleteDrugCommand(drugId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
        await _logRepository.DidNotReceive().DeleteByDrugIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAllDrugsHandler_Should_ReturnAllDrugs()
    {
        // Arrange
        var drugs = new List<Drug>
        {
            new() { Name = "Drug 1", Type = DrugType.Oral },
            new() { Name = "Drug 2", Type = DrugType.Injectable }
        };

        _repository.GetAllAsync(Arg.Any<CancellationToken>()).Returns(drugs);

        var handler = new GetAllDrugsHandler(_repository, _catalogService);
        var query = new GetAllDrugsQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        await _repository.Received(1).GetAllAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateDrugHandler_Should_UpdateExistingDrug()
    {
        // Arrange
        var drugId = Guid.NewGuid();
        var existingDrug = new Drug
        {
            Name = "Old Name",
            Type = DrugType.Oral
        };

        var command = new UpdateDrugCommand(drugId, new UpdateDrugDto
        {
            Name = "Updated Name",
            Type = DrugType.Injectable,
            Dosage = "500mg"
        });

        _repository.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(existingDrug);
        _repository.UpdateAsync(Arg.Any<Drug>(), Arg.Any<CancellationToken>())
            .Returns(x => x.Arg<Drug>());

        var handler = new UpdateDrugHandler(_repository, _catalogService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        await _repository.Received(1).UpdateAsync(
            Arg.Is<Drug>(d => d.Name == "Updated Name" && d.Type == DrugType.Injectable),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task UpdateDrugHandler_Should_ThrowException_WhenDrugNotFound()
    {
        // Arrange
        var drugId = Guid.NewGuid();
        _repository.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var command = new UpdateDrugCommand(drugId, new UpdateDrugDto
        {
            Name = "Test",
            Type = DrugType.Oral
        });

        var handler = new UpdateDrugHandler(_repository, _catalogService);

        // Act & Assert
        await handler.Invoking(h => h.Handle(command, CancellationToken.None))
            .Should().ThrowAsync<KeyNotFoundException>();
    }
}
