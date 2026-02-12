using Xunit;

namespace BloodTracker.Tests.Integration;

[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<TestWebAppFactory>
{
}
