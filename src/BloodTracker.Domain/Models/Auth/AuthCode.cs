namespace BloodTracker.Domain.Models;

/// <summary>
/// Код авторизации по email (хранится в auth.db)
/// </summary>
public sealed class AuthCode
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string Code { get; init; } = "";
    public DateTime ExpiresAt { get; init; }
    public bool Used { get; set; }
}
