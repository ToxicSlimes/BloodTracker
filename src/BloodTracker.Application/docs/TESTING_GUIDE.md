# TESTING GUIDE — BloodTracker.Application

> На данный момент тесты не написаны. Этот гайд — шаблон для будущей реализации.

## Стратегия тестирования

### Unit-тесты хэндлеров

Каждый хэндлер тестируется изолированно с мок-репозиториями.

**Рекомендуемый стек:**
- xUnit
- NSubstitute (или Moq)
- FluentAssertions
- AutoFixture (опционально)

### Пример: тест CreateAnalysisHandler

```csharp
public class CreateAnalysisHandlerTests
{
    private readonly IAnalysisRepository _repository = Substitute.For<IAnalysisRepository>();
    private readonly IMapper _mapper = Substitute.For<IMapper>();
    private readonly ILogger<CreateAnalysisHandler> _logger = Substitute.For<ILogger<CreateAnalysisHandler>>();

    [Fact]
    public async Task Handle_ValidData_CreatesAndReturnsDto()
    {
        // Arrange
        var dto = new CreateAnalysisDto
        {
            Date = DateTime.Today,
            Label = "Кровь общий",
            Values = new() { ["testosterone"] = 25.5 }
        };

        _repository.CreateAsync(Arg.Any<Analysis>(), Arg.Any<CancellationToken>())
            .Returns(ci => ci.Arg<Analysis>());

        _mapper.Map<AnalysisDto>(Arg.Any<Analysis>())
            .Returns(new AnalysisDto { Id = Guid.NewGuid(), Label = "Кровь общий", Date = DateTime.Today });

        var handler = new CreateAnalysisHandler(_repository, _mapper, _logger);

        // Act
        var result = await handler.Handle(new CreateAnalysisCommand(dto), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Label.Should().Be("Кровь общий");
        await _repository.Received(1).CreateAsync(Arg.Any<Analysis>(), Arg.Any<CancellationToken>());
    }
}
```

### Пример: тест с бизнес-логикой (CreateIntakeLogHandler)

```csharp
[Fact]
public async Task Handle_PurchaseOverConsumed_ThrowsInvalidOperation()
{
    // Arrange — Purchase с Quantity=1, уже 1 log привязан
    var drug = new Drug { Id = Guid.NewGuid(), Name = "Test", Type = DrugType.Oral };
    var purchase = new Purchase { Id = Guid.NewGuid(), DrugId = drug.Id, DrugName = "Test",
        PurchaseDate = DateTime.Today, Quantity = 1 };

    _drugRepo.GetByIdAsync(drug.Id, Arg.Any<CancellationToken>()).Returns(drug);
    _purchaseRepo.GetByIdAsync(purchase.Id, Arg.Any<CancellationToken>()).Returns(purchase);
    _logRepo.GetAllAsync(Arg.Any<CancellationToken>())
        .Returns(new List<IntakeLog> { new() { DrugId = drug.Id, DrugName = "Test",
            Date = DateTime.Today, PurchaseId = purchase.Id } });

    var handler = new CreateIntakeLogHandler(_logRepo, _drugRepo, _purchaseRepo);
    var dto = new CreateIntakeLogDto { Date = DateTime.Today, DrugId = drug.Id, PurchaseId = purchase.Id };

    // Act & Assert
    await handler.Invoking(h => h.Handle(new CreateIntakeLogCommand(dto), CancellationToken.None))
        .Should().ThrowAsync<InvalidOperationException>()
        .WithMessage("*no remaining stock*");
}
```

### Пример: тест CompareAnalysesHandler

```csharp
[Fact]
public async Task Handle_TwoAnalyses_ReturnsComparison()
{
    var before = new Analysis { Date = DateTime.Today.AddMonths(-1), Label = "Before",
        Values = new() { ["testosterone"] = 15.0 } };
    var after = new Analysis { Date = DateTime.Today, Label = "After",
        Values = new() { ["testosterone"] = 25.0 } };

    _repository.GetByIdAsync(before.Id, Arg.Any<CancellationToken>()).Returns(before);
    _repository.GetByIdAsync(after.Id, Arg.Any<CancellationToken>()).Returns(after);
    _referenceService.GetRange("testosterone").Returns(new ReferenceRange
        { Key = "testosterone", Name = "Тестостерон", Min = 8.33, Max = 30.19, Unit = "нмоль/л" });
    _referenceService.GetStatus("testosterone", 15.0).Returns(ValueStatus.Normal);
    _referenceService.GetStatus("testosterone", 25.0).Returns(ValueStatus.Normal);

    var handler = new CompareAnalysesHandler(_repository, _referenceService, _mapper);
    var result = await handler.Handle(new CompareAnalysesQuery(before.Id, after.Id), CancellationToken.None);

    result.Should().NotBeNull();
    result!.Comparisons.Should().ContainSingle(c => c.Key == "testosterone");
    result.Comparisons[0].DeltaPercent.Should().BeApproximately(66.67, 0.1);
}
```

## Что тестировать

| Приоритет | Компонент | Что проверять |
|-----------|-----------|---------------|
| 🔴 Высокий | CreateIntakeLogHandler | Валидация Purchase, проверка остатка |
| 🔴 Высокий | DeleteDrugHandler | Каскадное удаление IntakeLog и Purchase |
| 🔴 Высокий | CompareAnalysesHandler | Расчёт дельты, статусы |
| 🟡 Средний | ImportPdfAnalysisHandler | Обработка ошибок, fallback |
| 🟡 Средний | GetInventoryHandler | Подсчёт остатков, breakdown |
| 🟢 Низкий | CRUD хэндлеры | Базовый create/update/delete |

## Структура тест-проекта

```
BloodTracker.Application.Tests/
├── Analyses/
│   ├── CreateAnalysisHandlerTests.cs
│   ├── CompareAnalysesHandlerTests.cs
│   └── ImportPdfHandlerTests.cs
├── Courses/
│   ├── CreateIntakeLogHandlerTests.cs
│   ├── DeleteDrugHandlerTests.cs
│   └── GetInventoryHandlerTests.cs
└── Workouts/
    └── WorkoutCrudHandlerTests.cs
```
