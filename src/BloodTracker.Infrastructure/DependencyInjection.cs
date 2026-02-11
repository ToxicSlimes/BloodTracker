using BloodTracker.Application.Common;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BloodTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<DatabaseSettings>(configuration.GetSection("Database"));
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<EmailSettings>(configuration.GetSection("Email"));
        services.Configure<GoogleAuthSettings>(configuration.GetSection("Google"));
        services.Configure<AdminSettings>(configuration.GetSection("Admin"));

        // Auth database (singleton — shared across all requests)
        services.AddSingleton<AuthDbContext>();

        // Per-user database context (scoped — resolved per request based on authenticated user)
        services.AddScoped<BloodTrackerDbContext>(sp =>
        {
            var dbSettings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DatabaseSettings>>().Value;
            var userContext = sp.GetRequiredService<IUserContext>();

            // Extract base directory from connection string
            var connStr = dbSettings.ConnectionString;
            var filename = connStr.Replace("Filename=", "").Split(';')[0];
            var dir = Path.GetDirectoryName(filename) ?? ".";

            string userDbPath;
            if (userContext.IsAuthenticated && userContext.UserId != Guid.Empty)
            {
                userDbPath = Path.Combine(dir, $"user_{userContext.UserId}.db");
            }
            else
            {
                // Fallback for unauthenticated requests (shouldn't happen for protected endpoints)
                userDbPath = filename;
            }

            return new BloodTrackerDbContext($"Filename={userDbPath};Connection=shared");
        });

        services.AddScoped<IAnalysisRepository, AnalysisRepository>();
        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IDrugRepository, DrugRepository>();
        services.AddScoped<IIntakeLogRepository, IntakeLogRepository>();
        services.AddScoped<IPurchaseRepository, PurchaseRepository>();
        services.AddScoped<IWorkoutProgramRepository, WorkoutProgramRepository>();
        services.AddScoped<IWorkoutDayRepository, WorkoutDayRepository>();
        services.AddScoped<IWorkoutExerciseRepository, WorkoutExerciseRepository>();
        services.AddScoped<IWorkoutSetRepository, WorkoutSetRepository>();

        services.AddSingleton<IReferenceRangeService, ReferenceRangeService>();

        // Auth services (HttpClient for Brevo email API)
        services.AddHttpClient<AuthService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserContext, UserContext>();

        // HTTP Client для Gemini API
        services.AddHttpClient<GeminiVisionService>();
        services.AddSingleton<GeminiVisionService>();

        // HTTP Client для каталога упражнений
        services.AddHttpClient<ExerciseCatalogService>();
        services.AddScoped<IExerciseCatalogService, ExerciseCatalogService>();

        services.AddSingleton<IPdfParserService, PdfParserService>();

        // Data migration
        services.AddSingleton<DataMigrationService>();

        return services;
    }
}
