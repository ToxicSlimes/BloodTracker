using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class UpdateRestTimerSettingsHandler(IRestTimerSettingsRepository settingsRepository)
    : IRequestHandler<UpdateRestTimerSettingsCommand, RestTimerSettingsDto>
{
    public async Task<RestTimerSettingsDto> Handle(UpdateRestTimerSettingsCommand request, CancellationToken ct)
    {
        var settings = await settingsRepository.GetOrCreateAsync(request.UserId, ct);
        settings.DefaultRestSeconds = Math.Clamp(request.DefaultRestSeconds, 15, 300);
        settings.AutoStartTimer = request.AutoStartTimer;
        settings.PlaySound = request.PlaySound;
        settings.Vibrate = request.Vibrate;
        settings.SoundAlertBeforeEndSeconds = Math.Clamp(request.SoundAlertBeforeEndSeconds, 0, 30);
        var updated = await settingsRepository.UpdateAsync(settings, ct);
        return new RestTimerSettingsDto
        {
            DefaultRestSeconds = updated.DefaultRestSeconds,
            AutoStartTimer = updated.AutoStartTimer,
            PlaySound = updated.PlaySound,
            Vibrate = updated.Vibrate,
            SoundAlertBeforeEndSeconds = updated.SoundAlertBeforeEndSeconds
        };
    }
}
