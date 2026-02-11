using BloodTracker.Domain.Models;
using LiteDB;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Persistence;

public sealed class AuthDbContext : IDisposable
{
    private readonly LiteDatabase _database;

    public AuthDbContext(IOptions<DatabaseSettings> settings)
    {
        var connStr = settings.Value.ConnectionString;
        var dir = Path.GetDirectoryName(connStr.Replace("Filename=", "").Split(';')[0]) ?? ".";
        _database = new LiteDatabase($"Filename={Path.Combine(dir, "auth.db")};Connection=shared");

        Users.EnsureIndex(x => x.Email, unique: true);
        Users.EnsureIndex(x => x.GoogleId);
        AuthCodes.EnsureIndex(x => x.Email);
    }

    public ILiteCollection<AppUser> Users => _database.GetCollection<AppUser>("users");
    public ILiteCollection<AuthCode> AuthCodes => _database.GetCollection<AuthCode>("auth_codes");

    public void Dispose() => _database.Dispose();
}
