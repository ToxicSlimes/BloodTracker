using BloodTracker.Application.Common;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Persistence.Repositories;
using BloodTracker.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;

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

        // Catalog database (singleton — shared reference data)
        services.AddSingleton<CatalogDbContext>();
        services.AddSingleton<DrugCatalogSeedService>();
        services.AddSingleton<IDrugCatalogService, DrugCatalogService>();

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
        services.AddScoped<IAdminRepository, AdminRepository>();
        services.AddScoped<IWorkoutSessionRepository, WorkoutSessionRepository>();
        services.AddScoped<IWorkoutStatsRepository, WorkoutStatsRepository>();

        services.AddSingleton<IReferenceRangeService, ReferenceRangeService>();

        // Auth services (HttpClient for Brevo email API)
        services.AddHttpClient<AuthService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserContext, UserContext>();

        // HTTP Client для Gemini API with retry policy
        services.AddHttpClient<GeminiVisionService>()
            .AddPolicyHandler(GetRetryPolicy());
        services.AddSingleton<GeminiVisionService>();

        services.AddSingleton<ExerciseCatalogSeedService>();
        services.AddSingleton<IExerciseCatalogService, ExerciseCatalogService>();

        services.AddSingleton<IPdfParserService, GeminiPdfParser>();

        // Data migration
        services.AddSingleton<DataMigrationService>();

        // Domain event dispatcher
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();

        return services;
    }

    /// <summary>
    /// Polly retry policy: 3 retries with exponential backoff (2^n seconds)
    /// Handles transient HTTP errors (5xx, 408, network failures)
    /// </summary>
    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError() // Handles 5xx and 408
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests) // Handle 429
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryAttempt, context) =>
                {
                    // Log retry attempts (optional, can be enhanced with ILogger injection if needed)
                    Console.WriteLine($"[Polly] Retry {retryAttempt} after {timespan.TotalSeconds}s due to: {outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString()}");
                });
    }
}
