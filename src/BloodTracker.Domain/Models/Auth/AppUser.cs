namespace BloodTracker.Domain.Models;

/// <summary>
/// Пользователь системы (хранится в auth.db)
/// </summary>
public sealed class AppUser
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string? DisplayName { get; set; }
    public string? GoogleId { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
