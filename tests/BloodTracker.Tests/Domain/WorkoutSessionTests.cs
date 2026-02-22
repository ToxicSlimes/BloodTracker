using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class WorkoutSessionSetTests
{
    [Fact]
    public void Tonnage_WorkingSet_ReturnsWeightTimesReps()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 80m,
            ActualRepetitions = 10,
            Type = SetType.Working
        };

        set.Tonnage.Should().Be(800m);
    }

    [Fact]
    public void Tonnage_WarmupSet_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 40m,
            ActualRepetitions = 10,
            Type = SetType.Warmup
        };

        set.Tonnage.Should().Be(0m);
    }

    [Fact]
    public void Tonnage_NullWeight_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = null,
            ActualRepetitions = 10,
            Type = SetType.Working
        };

        set.Tonnage.Should().Be(0m);
    }

    [Fact]
    public void Tonnage_NullReps_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 80m,
            ActualRepetitions = null,
            Type = SetType.Working
        };

        set.Tonnage.Should().Be(0m);
    }

    [Fact]
    public void Tonnage_DropSet_CalculatesNormally()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 60m,
            ActualRepetitions = 15,
            Type = SetType.Drop
        };

        set.Tonnage.Should().Be(900m);
    }

    [Fact]
    public void Tonnage_FailureSet_CalculatesNormally()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 100m,
            ActualRepetitions = 3,
            Type = SetType.Failure
        };

        set.Tonnage.Should().Be(300m);
    }

    [Theory]
    [InlineData(100, 5)]
    [InlineData(80, 10)]
    [InlineData(60, 1)]
    public void Estimated1RM_ValidInput_ReturnsPositiveValue(decimal weight, int reps)
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = weight,
            ActualRepetitions = reps
        };

        set.Estimated1RM.Should().BeGreaterThan(0);
        if (reps == 1)
            set.Estimated1RM.Should().Be(weight);
        else
            set.Estimated1RM.Should().BeGreaterThan(weight);
    }

    [Fact]
    public void Estimated1RM_MoreThan12Reps_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 50m,
            ActualRepetitions = 15
        };

        set.Estimated1RM.Should().Be(0m);
    }

    [Fact]
    public void Estimated1RM_NullWeight_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = null,
            ActualRepetitions = 10
        };

        set.Estimated1RM.Should().Be(0m);
    }

    [Fact]
    public void Estimated1RM_ZeroReps_ReturnsZero()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeightKg = 80m,
            ActualRepetitions = 0
        };

        set.Estimated1RM.Should().Be(0m);
    }

    [Fact]
    public void CompareWithPrevious_BetterTonnage_ReturnsBetter()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = 85m,
            ActualRepetitions = 10,
            PreviousWeight = 80m,
            PreviousReps = 10
        };

        set.CompareWithPrevious().Should().Be(SetComparison.Better);
    }

    [Fact]
    public void CompareWithPrevious_SameTonnage_ReturnsSame()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = 80m,
            ActualRepetitions = 10,
            PreviousWeight = 80m,
            PreviousReps = 10
        };

        set.CompareWithPrevious().Should().Be(SetComparison.Same);
    }

    [Fact]
    public void CompareWithPrevious_WorseTonnage_ReturnsWorse()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = 75m,
            ActualRepetitions = 10,
            PreviousWeight = 80m,
            PreviousReps = 10
        };

        set.CompareWithPrevious().Should().Be(SetComparison.Worse);
    }

    [Fact]
    public void CompareWithPrevious_NoPreviousData_ReturnsNoPrevious()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = 80m,
            ActualRepetitions = 10,
            PreviousWeight = null,
            PreviousReps = null
        };

        set.CompareWithPrevious().Should().Be(SetComparison.NoPrevious);
    }

    [Fact]
    public void CompareWithPrevious_NoActualData_ReturnsNoPrevious()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = null,
            ActualRepetitions = null,
            PreviousWeight = 80m,
            PreviousReps = 10
        };

        set.CompareWithPrevious().Should().Be(SetComparison.NoPrevious);
    }

    [Fact]
    public void CompareWithPrevious_MoreRepsLessWeight_ComparesByTonnage()
    {
        var set = new WorkoutSessionSet
        {
            ActualWeight = 70m,
            ActualRepetitions = 12,
            PreviousWeight = 80m,
            PreviousReps = 10
        };

        set.CompareWithPrevious().Should().Be(SetComparison.Better);
    }
}

public class WorkoutSessionExerciseTests
{
    [Fact]
    public void IsCompleted_AllSetsCompleted_ReturnsTrue()
    {
        var exercise = new WorkoutSessionExercise
        {
            Name = "Bench Press",
            Sets = new List<WorkoutSessionSet>
            {
                new() { CompletedAt = DateTime.UtcNow },
                new() { CompletedAt = DateTime.UtcNow },
                new() { CompletedAt = DateTime.UtcNow }
            }
        };

        exercise.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public void IsCompleted_SomeSetsIncomplete_ReturnsFalse()
    {
        var exercise = new WorkoutSessionExercise
        {
            Name = "Bench Press",
            Sets = new List<WorkoutSessionSet>
            {
                new() { CompletedAt = DateTime.UtcNow },
                new() { CompletedAt = null },
                new() { CompletedAt = DateTime.UtcNow }
            }
        };

        exercise.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public void IsCompleted_NoSets_ReturnsFalse()
    {
        var exercise = new WorkoutSessionExercise
        {
            Name = "Bench Press",
            Sets = new List<WorkoutSessionSet>()
        };

        exercise.IsCompleted.Should().BeFalse();
    }
}
