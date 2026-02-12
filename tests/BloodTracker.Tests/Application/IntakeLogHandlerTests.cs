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

public class IntakeLogHandlerTests
{
    #region CreateIntakeLogHandler Tests

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldCreateIntakeLog_ForValidDrug()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        intakeLogRepo.CreateAsync(Arg.Any<IntakeLog>(), Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(call.Arg<IntakeLog>()));

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            Dose = "100mg",
            Note = "Morning dose"
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.DrugId.Should().Be(drugId);
        result.DrugName.Should().Be("Test Drug");
        result.Dose.Should().Be("100mg");
        result.Note.Should().Be("Morning dose");
        await intakeLogRepo.Received(1).CreateAsync(Arg.Is<IntakeLog>(x => x.DrugId == drugId), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldThrowKeyNotFoundException_WhenDrugNotFound()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            Dose = "100mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldThrowKeyNotFoundException_WhenPurchaseNotFound()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns((Purchase?)null);

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            PurchaseId = purchaseId,
            Dose = "100mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldThrowInvalidOperationException_WhenPurchaseDoesNotBelongToDrug()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var otherDrugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        var purchase = new Purchase 
        { 
            Id = purchaseId, 
            DrugId = otherDrugId, 
            DrugName = "Other Drug", 
            PurchaseDate = DateTime.Now,
            Quantity = 10, 
            Price = 100 
        };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(purchase);

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            PurchaseId = purchaseId,
            Dose = "100mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong to*");
    }

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldThrowInvalidOperationException_WhenPurchaseHasNoRemainingStock()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        var purchase = new Purchase 
        { 
            Id = purchaseId, 
            DrugId = drugId, 
            DrugName = "Test Drug", 
            PurchaseDate = DateTime.Now,
            Quantity = 10, 
            Price = 100 
        };

        // Create 10 intake logs to fully consume the purchase
        var allLogs = Enumerable.Range(0, 10).Select(_ => new IntakeLog
        {
            Id = Guid.NewGuid(),
            Date = DateTime.Now,
            DrugId = drugId,
            DrugName = "Test Drug",
            PurchaseId = purchaseId
        }).ToList();
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(purchase);
        intakeLogRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(allLogs);

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            PurchaseId = purchaseId,
            Dose = "100mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no remaining stock*");
    }

    [Fact]
    public async Task CreateIntakeLogHandler_ShouldIncludePurchaseLabel_WhenPurchaseIdProvided()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new CreateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        var purchase = new Purchase 
        { 
            Id = purchaseId, 
            DrugId = drugId, 
            DrugName = "Test Drug", 
            PurchaseDate = new DateTime(2024, 1, 15),
            Quantity = 10, 
            Price = 100,
            Vendor = "TestVendor"
        };

        var createdLog = new IntakeLog
        {
            Id = Guid.NewGuid(),
            Date = DateTime.Now,
            DrugId = drugId,
            DrugName = "Test Drug",
            PurchaseId = purchaseId,
            Dose = "100mg"
        };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(purchase);
        intakeLogRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<IntakeLog>());
        intakeLogRepo.CreateAsync(Arg.Any<IntakeLog>(), Arg.Any<CancellationToken>()).Returns(createdLog);

        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            PurchaseId = purchaseId,
            Dose = "100mg"
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.PurchaseId.Should().Be(purchaseId);
        result.PurchaseLabel.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region GetRecentIntakeLogsHandler Tests

    [Fact]
    public async Task GetRecentIntakeLogsHandler_ShouldReturnRecentLogs_WithPurchaseLabels()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new GetRecentIntakeLogsHandler(intakeLogRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var logs = new List<IntakeLog>
        {
            new IntakeLog 
            { 
                Id = Guid.NewGuid(), 
                Date = DateTime.Now.AddDays(-1), 
                DrugId = drugId, 
                DrugName = "Test Drug",
                PurchaseId = purchaseId,
                Dose = "100mg"
            }
        };

        var purchases = new List<Purchase>
        {
            new Purchase
            {
                Id = purchaseId,
                DrugId = drugId,
                DrugName = "Test Drug",
                PurchaseDate = DateTime.Now.AddDays(-10),
                Quantity = 20,
                Price = 200
            }
        };

        intakeLogRepo.GetRecentAsync(10, Arg.Any<CancellationToken>()).Returns(logs);
        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(purchases);

        var query = new GetRecentIntakeLogsQuery(10);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result.First().PurchaseId.Should().Be(purchaseId);
        result.First().PurchaseLabel.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region GetAllIntakeLogsHandler Tests

    [Fact]
    public async Task GetAllIntakeLogsHandler_ShouldReturnAllLogs()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new GetAllIntakeLogsHandler(intakeLogRepo, purchaseRepo);

        var logs = new List<IntakeLog>
        {
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = Guid.NewGuid(), DrugName = "Drug 1", Dose = "100mg" },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now.AddDays(-1), DrugId = Guid.NewGuid(), DrugName = "Drug 2", Dose = "200mg" }
        };

        intakeLogRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(logs);
        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Purchase>());

        var query = new GetAllIntakeLogsQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
    }

    #endregion

    #region UpdateIntakeLogHandler Tests

    [Fact]
    public async Task UpdateIntakeLogHandler_ShouldUpdateExistingLog()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new UpdateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var logId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var existingLog = new IntakeLog 
        { 
            Id = logId, 
            Date = DateTime.Now.AddDays(-1), 
            DrugId = drugId, 
            DrugName = "Old Drug",
            Dose = "100mg"
        };
        var drug = new Drug { Id = drugId, Name = "Updated Drug", Type = DrugType.Oral };

        intakeLogRepo.GetByIdAsync(logId, Arg.Any<CancellationToken>()).Returns(existingLog);
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        intakeLogRepo.UpdateAsync(Arg.Any<IntakeLog>(), Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(call.Arg<IntakeLog>()));

        var command = new UpdateIntakeLogCommand(logId, new UpdateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            Dose = "200mg",
            Note = "Updated note"
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(logId);
        result.Dose.Should().Be("200mg");
        result.Note.Should().Be("Updated note");
        await intakeLogRepo.Received(1).UpdateAsync(Arg.Any<IntakeLog>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateIntakeLogHandler_ShouldThrowKeyNotFoundException_WhenLogNotFound()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new UpdateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var logId = Guid.NewGuid();
        intakeLogRepo.GetByIdAsync(logId, Arg.Any<CancellationToken>()).Returns((IntakeLog?)null);

        var command = new UpdateIntakeLogCommand(logId, new UpdateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = Guid.NewGuid(),
            Dose = "200mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateIntakeLogHandler_ShouldThrowKeyNotFoundException_WhenDrugNotFound()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new UpdateIntakeLogHandler(intakeLogRepo, drugRepo, purchaseRepo);

        var logId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var existingLog = new IntakeLog 
        { 
            Id = logId, 
            Date = DateTime.Now.AddDays(-1), 
            DrugId = drugId, 
            DrugName = "Old Drug",
            Dose = "100mg"
        };

        intakeLogRepo.GetByIdAsync(logId, Arg.Any<CancellationToken>()).Returns(existingLog);
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var command = new UpdateIntakeLogCommand(logId, new UpdateIntakeLogDto
        {
            Date = DateTime.Now,
            DrugId = drugId,
            Dose = "200mg"
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    #endregion

    #region DeleteIntakeLogHandler Tests

    [Fact]
    public async Task DeleteIntakeLogHandler_ShouldDelete_AndReturnTrue()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var handler = new DeleteIntakeLogHandler(intakeLogRepo);

        var logId = Guid.NewGuid();
        intakeLogRepo.DeleteAsync(logId, Arg.Any<CancellationToken>()).Returns(true);

        var command = new DeleteIntakeLogCommand(logId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        await intakeLogRepo.Received(1).DeleteAsync(logId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteIntakeLogHandler_ShouldReturnFalse_WhenNotFound()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var handler = new DeleteIntakeLogHandler(intakeLogRepo);

        var logId = Guid.NewGuid();
        intakeLogRepo.DeleteAsync(logId, Arg.Any<CancellationToken>()).Returns(false);

        var command = new DeleteIntakeLogCommand(logId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetIntakeLogsByDrugHandler Tests

    [Fact]
    public async Task GetIntakeLogsByDrugHandler_ShouldReturnLogsFilteredByDrugId()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new GetIntakeLogsByDrugHandler(intakeLogRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var logs = new List<IntakeLog>
        {
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", Dose = "100mg" },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now.AddDays(-1), DrugId = drugId, DrugName = "Test Drug", Dose = "100mg" }
        };

        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(logs);
        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Purchase>());

        var query = new GetIntakeLogsByDrugQuery(drugId, null, null, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(log => log.DrugId.Should().Be(drugId));
    }

    [Fact]
    public async Task GetIntakeLogsByDrugHandler_ShouldFilterByDateRange()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new GetIntakeLogsByDrugHandler(intakeLogRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var startDate = DateTime.Now.AddDays(-10);
        var endDate = DateTime.Now.AddDays(-1);
        var logs = new List<IntakeLog>
        {
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now.AddDays(-5), DrugId = drugId, DrugName = "Test Drug", Dose = "100mg" }
        };

        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(logs);
        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Purchase>());

        var query = new GetIntakeLogsByDrugQuery(drugId, startDate, endDate, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetIntakeLogsByDrugHandler_ShouldRespectLimit()
    {
        // Arrange
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new GetIntakeLogsByDrugHandler(intakeLogRepo, purchaseRepo);

        var drugId = Guid.NewGuid();
        var limit = 5;
        var logs = Enumerable.Range(0, 10).Select(i => new IntakeLog
        {
            Id = Guid.NewGuid(),
            Date = DateTime.Now.AddDays(-i),
            DrugId = drugId,
            DrugName = "Test Drug",
            Dose = "100mg"
        }).ToList();

        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(logs);
        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Purchase>());

        var query = new GetIntakeLogsByDrugQuery(drugId, null, null, limit);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCountLessOrEqualTo(limit);
    }

    #endregion
}
