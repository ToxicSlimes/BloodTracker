using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Handlers;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using FluentAssertions;
using MapsterMapper;
using NSubstitute;
using Xunit;

namespace BloodTracker.Tests.Application;

public class PurchaseHandlerTests
{
    #region CreatePurchaseHandler Tests

    [Fact]
    public async Task CreatePurchaseHandler_ShouldCreatePurchase_ForValidDrug()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.CreateAsync(Arg.Any<Purchase>(), Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(call.Arg<Purchase>()));
        
        mapper.Map<PurchaseDto>(Arg.Any<Purchase>()).Returns(x =>
        {
            var p = x.Arg<Purchase>();
            return new PurchaseDto 
            { 
                Id = p.Id, 
                DrugId = p.DrugId, 
                DrugName = p.DrugName,
                PurchaseDate = p.PurchaseDate,
                Quantity = p.Quantity,
                Price = p.Price,
                Vendor = p.Vendor,
                CreatedAt = DateTime.Now
            };
        });

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 30,
            Price = 150.00m,
            Vendor = "TestVendor"
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.DrugId.Should().Be(drugId);
        result.DrugName.Should().Be("Test Drug");
        result.Quantity.Should().Be(30);
        result.Price.Should().Be(150.00m);
        result.Vendor.Should().Be("TestVendor");
        await purchaseRepo.Received(1).CreateAsync(Arg.Is<Purchase>(x => x.DrugId == drugId), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreatePurchaseHandler_ShouldThrowKeyNotFoundException_WhenDrugNotFound()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 30,
            Price = 150.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreatePurchaseHandler_ShouldThrowArgumentException_ForZeroQuantity()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 0,
            Price = 150.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Quantity*");
    }

    [Fact]
    public async Task CreatePurchaseHandler_ShouldThrowArgumentException_ForNegativeQuantity()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = -10,
            Price = 150.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Quantity*");
    }

    [Fact]
    public async Task CreatePurchaseHandler_ShouldThrowArgumentException_ForNegativePrice()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 30,
            Price = -50.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Price*");
    }

    [Fact]
    public async Task CreatePurchaseHandler_ShouldResolveManufacturerName_FromCatalog()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new CreatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var drugId = Guid.NewGuid();
        var manufacturerId = "MFG123";
        var drug = new Drug { Id = drugId, Name = "Test Drug", Type = DrugType.Oral };
        
        var manufacturer = new Manufacturer { Id = manufacturerId, Name = "Test Manufacturer Inc." };
        
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        catalogService.GetManufacturerById(manufacturerId).Returns(manufacturer);
        purchaseRepo.CreateAsync(Arg.Any<Purchase>(), Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(call.Arg<Purchase>()));
        
        mapper.Map<PurchaseDto>(Arg.Any<Purchase>()).Returns(x =>
        {
            var p = x.Arg<Purchase>();
            return new PurchaseDto 
            { 
                Id = p.Id, 
                DrugId = p.DrugId, 
                DrugName = p.DrugName,
                ManufacturerId = p.ManufacturerId,
                ManufacturerName = p.ManufacturerName,
                PurchaseDate = p.PurchaseDate,
                Quantity = p.Quantity,
                Price = p.Price,
                CreatedAt = DateTime.Now
            };
        });

        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 30,
            Price = 150.00m,
            ManufacturerId = manufacturerId
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ManufacturerId.Should().Be(manufacturerId);
        result.ManufacturerName.Should().Be("Test Manufacturer Inc.");
        catalogService.Received(1).GetManufacturerById(manufacturerId);
    }

    #endregion

    #region UpdatePurchaseHandler Tests

    [Fact]
    public async Task UpdatePurchaseHandler_ShouldUpdateExistingPurchase()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new UpdatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var purchaseId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var existingPurchase = new Purchase
        {
            Id = purchaseId,
            DrugId = drugId,
            DrugName = "Old Drug",
            PurchaseDate = DateTime.Now.AddDays(-10),
            Quantity = 20,
            Price = 100.00m
        };
        var drug = new Drug { Id = drugId, Name = "Updated Drug", Type = DrugType.Oral };

        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(existingPurchase);
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drug);
        purchaseRepo.UpdateAsync(Arg.Any<Purchase>(), Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(call.Arg<Purchase>()));
        
        mapper.Map<PurchaseDto>(Arg.Any<Purchase>()).Returns(x =>
        {
            var p = x.Arg<Purchase>();
            return new PurchaseDto 
            { 
                Id = p.Id, 
                DrugId = p.DrugId, 
                DrugName = p.DrugName,
                Quantity = p.Quantity,
                Price = p.Price,
                Vendor = p.Vendor,
                PurchaseDate = p.PurchaseDate,
                CreatedAt = DateTime.Now
            };
        });

        var command = new UpdatePurchaseCommand(purchaseId, new UpdatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 50,
            Price = 250.00m,
            Vendor = "NewVendor"
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(purchaseId);
        result.Quantity.Should().Be(50);
        result.Price.Should().Be(250.00m);
        result.Vendor.Should().Be("NewVendor");
        await purchaseRepo.Received(1).UpdateAsync(Arg.Any<Purchase>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdatePurchaseHandler_ShouldThrowKeyNotFoundException_WhenPurchaseNotFound()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new UpdatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var purchaseId = Guid.NewGuid();
        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns((Purchase?)null);

        var command = new UpdatePurchaseCommand(purchaseId, new UpdatePurchaseDto
        {
            DrugId = Guid.NewGuid(),
            PurchaseDate = DateTime.Now,
            Quantity = 50,
            Price = 250.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdatePurchaseHandler_ShouldThrowKeyNotFoundException_WhenDrugNotFound()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var drugRepo = Substitute.For<IDrugRepository>();
        var catalogService = Substitute.For<IDrugCatalogService>();
        var mapper = Substitute.For<IMapper>();
        var handler = new UpdatePurchaseHandler(purchaseRepo, drugRepo, catalogService, mapper);

        var purchaseId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var existingPurchase = new Purchase
        {
            Id = purchaseId,
            DrugId = drugId,
            DrugName = "Old Drug",
            PurchaseDate = DateTime.Now.AddDays(-10),
            Quantity = 20,
            Price = 100.00m
        };

        purchaseRepo.GetByIdAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(existingPurchase);
        drugRepo.GetByIdAsync(drugId, Arg.Any<CancellationToken>()).Returns((Drug?)null);

        var command = new UpdatePurchaseCommand(purchaseId, new UpdatePurchaseDto
        {
            DrugId = drugId,
            PurchaseDate = DateTime.Now,
            Quantity = 50,
            Price = 250.00m
        });

        // Act
        var act = async () => await handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    #endregion

    #region DeletePurchaseHandler Tests

    [Fact]
    public async Task DeletePurchaseHandler_ShouldDelete_AndReturnTrue()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var handler = new DeletePurchaseHandler(purchaseRepo);

        var purchaseId = Guid.NewGuid();
        purchaseRepo.DeleteAsync(purchaseId, Arg.Any<CancellationToken>()).Returns(true);

        var command = new DeletePurchaseCommand(purchaseId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        await purchaseRepo.Received(1).DeleteAsync(purchaseId, Arg.Any<CancellationToken>());
    }

    #endregion

    #region GetAllPurchasesHandler Tests

    [Fact]
    public async Task GetAllPurchasesHandler_ShouldReturnAllPurchases()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var mapper = Substitute.For<IMapper>();
        var handler = new GetAllPurchasesHandler(purchaseRepo, mapper);

        var purchases = new List<Purchase>
        {
            new Purchase { Id = Guid.NewGuid(), DrugId = Guid.NewGuid(), DrugName = "Drug 1", PurchaseDate = DateTime.Now, Quantity = 30, Price = 100.00m },
            new Purchase { Id = Guid.NewGuid(), DrugId = Guid.NewGuid(), DrugName = "Drug 2", PurchaseDate = DateTime.Now, Quantity = 50, Price = 200.00m }
        };

        purchaseRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(purchases);
        
        mapper.Map<PurchaseDto>(Arg.Any<Purchase>()).Returns(x =>
        {
            var p = x.Arg<Purchase>();
            return new PurchaseDto 
            { 
                Id = p.Id, 
                DrugId = p.DrugId, 
                DrugName = p.DrugName,
                Quantity = p.Quantity,
                Price = p.Price,
                PurchaseDate = p.PurchaseDate,
                CreatedAt = DateTime.Now
            };
        });

        var query = new GetAllPurchasesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
    }

    #endregion

    #region GetPurchasesByDrugHandler Tests

    [Fact]
    public async Task GetPurchasesByDrugHandler_ShouldReturnPurchasesForSpecificDrug()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var mapper = Substitute.For<IMapper>();
        var handler = new GetPurchasesByDrugHandler(purchaseRepo, mapper);

        var drugId = Guid.NewGuid();
        var purchases = new List<Purchase>
        {
            new Purchase { Id = Guid.NewGuid(), DrugId = drugId, DrugName = "Test Drug", PurchaseDate = DateTime.Now, Quantity = 30, Price = 100.00m },
            new Purchase { Id = Guid.NewGuid(), DrugId = drugId, DrugName = "Test Drug", PurchaseDate = DateTime.Now, Quantity = 20, Price = 80.00m }
        };

        purchaseRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(purchases);
        
        mapper.Map<PurchaseDto>(Arg.Any<Purchase>()).Returns(x =>
        {
            var p = x.Arg<Purchase>();
            return new PurchaseDto 
            { 
                Id = p.Id, 
                DrugId = p.DrugId, 
                DrugName = p.DrugName,
                Quantity = p.Quantity,
                Price = p.Price,
                PurchaseDate = p.PurchaseDate,
                CreatedAt = DateTime.Now
            };
        });

        var query = new GetPurchasesByDrugQuery(drugId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(p => p.DrugId.Should().Be(drugId));
    }

    #endregion

    #region GetPurchaseOptionsHandler Tests

    [Fact]
    public async Task GetPurchaseOptionsHandler_ShouldReturnOptions_WithRemainingStockCalculated()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var handler = new GetPurchaseOptionsHandler(purchaseRepo, intakeLogRepo);

        var drugId = Guid.NewGuid();
        var purchase1Id = Guid.NewGuid();
        var purchase2Id = Guid.NewGuid();
        
        var purchases = new List<Purchase>
        {
            new Purchase 
            { 
                Id = purchase1Id, 
                DrugId = drugId, 
                DrugName = "Test Drug", 
                PurchaseDate = new DateTime(2024, 1, 15),
                Quantity = 30, 
                Price = 100.00m,
                Vendor = "VendorA"
            },
            new Purchase 
            { 
                Id = purchase2Id, 
                DrugId = drugId, 
                DrugName = "Test Drug", 
                PurchaseDate = new DateTime(2024, 2, 1),
                Quantity = 50, 
                Price = 150.00m,
                Vendor = "VendorB"
            }
        };

        var drugLogs = new List<IntakeLog>
        {
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase1Id }, // 10 consumed from purchase1
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase2Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase2Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase2Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase2Id },
            new IntakeLog { Id = Guid.NewGuid(), Date = DateTime.Now, DrugId = drugId, DrugName = "Test Drug", PurchaseId = purchase2Id }, // 5 consumed from purchase2
        };

        purchaseRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(purchases);
        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drugLogs);

        var query = new GetPurchaseOptionsQuery(drugId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        
        var option1 = result.First(x => x.Id == purchase1Id);
        option1.RemainingStock.Should().Be(20); // 30 - 10
        
        var option2 = result.First(x => x.Id == purchase2Id);
        option2.RemainingStock.Should().Be(45); // 50 - 5
    }

    [Fact]
    public async Task GetPurchaseOptionsHandler_ShouldShowZeroRemaining_WhenFullyConsumed()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var handler = new GetPurchaseOptionsHandler(purchaseRepo, intakeLogRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        
        var purchases = new List<Purchase>
        {
            new Purchase 
            { 
                Id = purchaseId, 
                DrugId = drugId, 
                DrugName = "Test Drug", 
                PurchaseDate = new DateTime(2024, 1, 15),
                Quantity = 30, 
                Price = 100.00m,
                Vendor = "VendorA"
            }
        };

        var drugLogs = Enumerable.Range(0, 30).Select(_ => new IntakeLog
        {
            Id = Guid.NewGuid(),
            Date = DateTime.Now,
            DrugId = drugId,
            DrugName = "Test Drug",
            PurchaseId = purchaseId
        }).ToList();

        purchaseRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(purchases);
        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(drugLogs);

        var query = new GetPurchaseOptionsQuery(drugId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result.First().RemainingStock.Should().Be(0);
    }

    #endregion

    #region GetPurchaseVsConsumptionHandler Tests

    [Fact]
    public async Task GetPurchaseVsConsumptionHandler_ShouldBuildTimeline_WithRunningStock()
    {
        // Arrange
        var purchaseRepo = Substitute.For<IPurchaseRepository>();
        var intakeLogRepo = Substitute.For<IIntakeLogRepository>();
        var handler = new GetPurchaseVsConsumptionHandler(purchaseRepo, intakeLogRepo);

        var drugId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        
        var purchases = new List<Purchase>
        {
            new Purchase 
            { 
                Id = purchaseId, 
                DrugId = drugId, 
                DrugName = "Test Drug", 
                PurchaseDate = new DateTime(2024, 1, 1),
                Quantity = 30, 
                Price = 100.00m 
            }
        };

        var intakeLogs = new List<IntakeLog>
        {
            new IntakeLog 
            { 
                Id = Guid.NewGuid(), 
                Date = new DateTime(2024, 1, 5), 
                DrugId = drugId, 
                DrugName = "Test Drug",
                PurchaseId = purchaseId,
                Dose = "1 pill"
            },
            new IntakeLog 
            { 
                Id = Guid.NewGuid(), 
                Date = new DateTime(2024, 1, 10), 
                DrugId = drugId, 
                DrugName = "Test Drug",
                PurchaseId = purchaseId,
                Dose = "1 pill"
            }
        };

        purchaseRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(purchases);
        intakeLogRepo.GetByDrugIdAsync(drugId, Arg.Any<CancellationToken>()).Returns(intakeLogs);

        var query = new GetPurchaseVsConsumptionQuery(drugId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Timeline.Should().NotBeEmpty();
        result.Timeline.Should().HaveCountGreaterOrEqualTo(3); // 1 purchase + 2 intake logs
        
        // First event should be purchase with initial stock
        var firstEvent = result.Timeline.First();
        firstEvent.Purchases.Should().Be(30);
        firstEvent.RunningStock.Should().Be(30);
        
        // Subsequent events should decrease stock
        var lastEvent = result.Timeline.Last();
        lastEvent.RunningStock.Should().BeLessThan(30);
    }

    #endregion
}
