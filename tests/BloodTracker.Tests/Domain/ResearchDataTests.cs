using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class ResearchDataTests
{
    [Fact]
    public void ResearchData_Should_CreateWithAllFields()
    {
        // Arrange & Act
        var research = new ResearchData
        {
            Mechanism = "Binds to androgen receptor",
            Studies = [new StudyReference { Citation = "Smith 2020", Finding = "Effective" }],
            Bloodwork = [new BloodworkMarker { Name = "Hematocrit" }],
            Interactions = [new DrugInteraction { Drug = "Aspirin", Effect = "Increased bleeding" }],
            Contraindications = new ContraindicationsInfo { Absolute = ["Cancer"], Relative = ["Hypertension"] },
            PracticalNotes = "Stack with AI"
        };

        // Assert
        research.Mechanism.Should().Be("Binds to androgen receptor");
        research.Studies.Should().HaveCount(1);
        research.Bloodwork.Should().HaveCount(1);
        research.Interactions.Should().HaveCount(1);
        research.Contraindications.Should().NotBeNull();
        research.PracticalNotes.Should().Be("Stack with AI");
    }

    [Fact]
    public void ResearchData_Should_DefaultToEmptyCollections()
    {
        var research = new ResearchData();

        research.Studies.Should().BeEmpty();
        research.Bloodwork.Should().BeEmpty();
        research.Interactions.Should().BeEmpty();
        research.Mechanism.Should().BeNull();
        research.Contraindications.Should().BeNull();
        research.PracticalNotes.Should().BeNull();
    }

    [Fact]
    public void StudyReference_Should_CreateWithPmid()
    {
        var study = new StudyReference
        {
            Citation = "Bhasin et al., 1996",
            Pmid = 8637535,
            Design = "RCT",
            Finding = "Supraphysiological testosterone increases muscle mass"
        };

        study.Citation.Should().Be("Bhasin et al., 1996");
        study.Pmid.Should().Be(8637535);
        study.Design.Should().Be("RCT");
        study.Finding.Should().NotBeEmpty();
    }

    [Fact]
    public void StudyReference_Should_CreateWithoutPmid()
    {
        var study = new StudyReference
        {
            Citation = "Anonymous review",
            Finding = "Positive results"
        };

        study.Pmid.Should().BeNull();
        study.Design.Should().BeNull();
    }

    [Fact]
    public void BloodworkMarker_Should_RequireName()
    {
        var marker = new BloodworkMarker
        {
            Name = "Hematocrit",
            Frequency = "every 3 months",
            Why = ">54% — thrombosis risk"
        };

        marker.Name.Should().Be("Hematocrit");
        marker.Frequency.Should().NotBeEmpty();
        marker.Why.Should().NotBeEmpty();
    }

    [Fact]
    public void BloodworkMarker_Should_AllowNullOptionalFields()
    {
        var marker = new BloodworkMarker { Name = "ALT" };

        marker.Frequency.Should().BeNull();
        marker.Why.Should().BeNull();
    }

    [Theory]
    [InlineData("info")]
    [InlineData("warning")]
    [InlineData("danger")]
    public void DrugInteraction_Should_SupportSeverityValues(string severity)
    {
        var interaction = new DrugInteraction
        {
            Drug = "TestDrug",
            Effect = "Some effect",
            Severity = severity
        };

        interaction.Severity.Should().Be(severity);
    }

    [Fact]
    public void DrugInteraction_Should_DefaultSeverityToInfo()
    {
        var interaction = new DrugInteraction
        {
            Drug = "TestDrug",
            Effect = "Some effect"
        };

        interaction.Severity.Should().Be("info");
    }

    [Fact]
    public void ContraindicationsInfo_Should_CreateWithEmptyLists()
    {
        var ci = new ContraindicationsInfo();

        ci.Absolute.Should().BeEmpty();
        ci.Relative.Should().BeEmpty();
    }

    [Fact]
    public void ContraindicationsInfo_Should_CreateWithFilledLists()
    {
        var ci = new ContraindicationsInfo
        {
            Absolute = ["Prostate cancer", "Breast cancer"],
            Relative = ["Sleep apnea", "Polycythemia"]
        };

        ci.Absolute.Should().HaveCount(2);
        ci.Relative.Should().HaveCount(2);
        ci.Absolute.Should().Contain("Prostate cancer");
    }

    [Fact]
    public void DrugCatalogItem_Should_AllowNullResearch()
    {
        var item = new DrugCatalogItem
        {
            Id = "test-item",
            Name = "Test",
            Research = null
        };

        item.Research.Should().BeNull();
    }

    [Fact]
    public void DrugCatalogItem_Should_AllowFullResearch()
    {
        var item = new DrugCatalogItem
        {
            Id = "testosterone-enanthate",
            Name = "Тестостерон Энантат",
            Research = new ResearchData
            {
                Mechanism = "AR agonist",
                Studies = [new StudyReference { Citation = "Bhasin 1996", Finding = "Muscle gain" }],
                Bloodwork = [new BloodworkMarker { Name = "Total T" }],
                Interactions = [new DrugInteraction { Drug = "AI", Effect = "Reduced E2", Severity = "info" }],
                Contraindications = new ContraindicationsInfo { Absolute = ["Cancer"] }
            }
        };

        item.Research.Should().NotBeNull();
        item.Research!.Studies.Should().HaveCount(1);
        item.Research.Bloodwork.Should().HaveCount(1);
        item.Research.Interactions.Should().HaveCount(1);
    }

    [Fact]
    public void StudyReference_RecordEquality_Should_Work()
    {
        var a = new StudyReference { Citation = "X", Finding = "Y", Pmid = 123 };
        var b = new StudyReference { Citation = "X", Finding = "Y", Pmid = 123 };

        a.Should().Be(b);
    }

    [Fact]
    public void DrugInteraction_RecordEquality_Should_Work()
    {
        var a = new DrugInteraction { Drug = "A", Effect = "B", Severity = "warning" };
        var b = new DrugInteraction { Drug = "A", Effect = "B", Severity = "warning" };

        a.Should().Be(b);
    }
}
