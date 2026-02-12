using BloodTracker.Application.Common;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Infrastructure;

public class PagedResultTests
{
    [Fact]
    public void PagedRequest_Should_SetDefaultValues()
    {
        // Arrange & Act
        var request = new PagedRequest();

        // Assert
        request.Page.Should().Be(1);
        request.PageSize.Should().Be(50);
        request.Skip.Should().Be(0);
    }

    [Fact]
    public void PagedRequest_Should_AcceptCustomValues()
    {
        // Arrange & Act
        var request = new PagedRequest(Page: 3, PageSize: 25);

        // Assert
        request.Page.Should().Be(3);
        request.PageSize.Should().Be(25);
        request.Skip.Should().Be(50); // (3-1) * 25 = 50
    }

    [Fact]
    public void PagedRequest_Should_ClampPageToMinimum1()
    {
        // Arrange & Act
        var request = new PagedRequest(Page: 0);

        // Assert
        request.Page.Should().Be(1);
    }

    [Fact]
    public void PagedRequest_Should_ClampNegativePageTo1()
    {
        // Arrange & Act
        var request = new PagedRequest(Page: -5);

        // Assert
        request.Page.Should().Be(1);
    }

    [Fact]
    public void PagedRequest_Should_ClampPageSizeToMinimum1()
    {
        // Arrange & Act
        var request = new PagedRequest(PageSize: 0);

        // Assert
        request.PageSize.Should().Be(1);
    }

    [Fact]
    public void PagedRequest_Should_ClampPageSizeToMaximum200()
    {
        // Arrange & Act
        var request = new PagedRequest(PageSize: 500);

        // Assert
        request.PageSize.Should().Be(200);
    }

    [Fact]
    public void PagedRequest_Skip_Should_CalculateCorrectOffset()
    {
        // Arrange & Act
        var request1 = new PagedRequest(Page: 1, PageSize: 10);
        var request2 = new PagedRequest(Page: 2, PageSize: 10);
        var request3 = new PagedRequest(Page: 5, PageSize: 20);

        // Assert
        request1.Skip.Should().Be(0);   // (1-1) * 10 = 0
        request2.Skip.Should().Be(10);  // (2-1) * 10 = 10
        request3.Skip.Should().Be(80);  // (5-1) * 20 = 80
    }

    [Fact]
    public void PagedResult_Should_CalculateTotalPages()
    {
        // Arrange
        var items = new List<string> { "item1", "item2", "item3" };

        // Act
        var result = new PagedResult<string>(
            Items: items,
            TotalCount: 100,
            Page: 1,
            PageSize: 10
        );

        // Assert
        result.TotalPages.Should().Be(10); // 100 / 10 = 10
    }

    [Fact]
    public void PagedResult_Should_RoundUpTotalPages()
    {
        // Arrange
        var items = new List<string> { "item1" };

        // Act
        var result = new PagedResult<string>(
            Items: items,
            TotalCount: 25,
            Page: 1,
            PageSize: 10
        );

        // Assert
        result.TotalPages.Should().Be(3); // ceil(25 / 10) = 3
    }

    [Fact]
    public void PagedResult_HasNext_Should_BeTrue_WhenNotOnLastPage()
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: 100,
            Page: 5,
            PageSize: 10
        );

        // Assert
        result.HasNext.Should().BeTrue();
    }

    [Fact]
    public void PagedResult_HasNext_Should_BeFalse_WhenOnLastPage()
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: 100,
            Page: 10,
            PageSize: 10
        );

        // Assert
        result.HasNext.Should().BeFalse();
    }

    [Fact]
    public void PagedResult_HasPrevious_Should_BeTrue_WhenNotOnFirstPage()
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: 100,
            Page: 2,
            PageSize: 10
        );

        // Assert
        result.HasPrevious.Should().BeTrue();
    }

    [Fact]
    public void PagedResult_HasPrevious_Should_BeFalse_WhenOnFirstPage()
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: 100,
            Page: 1,
            PageSize: 10
        );

        // Assert
        result.HasPrevious.Should().BeFalse();
    }

    [Fact]
    public void PagedResult_Should_HandleEmptyResults()
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: 0,
            Page: 1,
            PageSize: 10
        );

        // Assert
        result.Items.Should().BeEmpty();
        result.TotalPages.Should().Be(0);
        result.HasNext.Should().BeFalse();
        result.HasPrevious.Should().BeFalse();
    }

    [Fact]
    public void PagedResult_Should_HandleSinglePage()
    {
        // Arrange
        var items = new List<string> { "item1", "item2", "item3" };

        // Act
        var result = new PagedResult<string>(
            Items: items,
            TotalCount: 3,
            Page: 1,
            PageSize: 10
        );

        // Assert
        result.Items.Should().HaveCount(3);
        result.TotalPages.Should().Be(1);
        result.HasNext.Should().BeFalse();
        result.HasPrevious.Should().BeFalse();
    }

    [Theory]
    [InlineData(1, 10, 100, true, false)]  // First page
    [InlineData(5, 10, 100, true, true)]   // Middle page
    [InlineData(10, 10, 100, false, true)] // Last page
    public void PagedResult_Should_CalculateNavigationFlags(
        int page, int pageSize, int totalCount, bool hasNext, bool hasPrevious)
    {
        // Arrange & Act
        var result = new PagedResult<string>(
            Items: new List<string>(),
            TotalCount: totalCount,
            Page: page,
            PageSize: pageSize
        );

        // Assert
        result.HasNext.Should().Be(hasNext);
        result.HasPrevious.Should().Be(hasPrevious);
    }
}
