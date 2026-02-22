namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class RestTimerSettings : Entity
{
    public required string UserId { get; set; }
    public int DefaultRestSeconds { get; set; } = 90;
    public bool AutoStartTimer { get; set; } = true;
    public bool PlaySound { get; set; } = true;
    public bool Vibrate { get; set; } = true;
    public int SoundAlertBeforeEndSeconds { get; set; } = 5;
}
