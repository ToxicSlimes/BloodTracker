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
        
        services.AddSingleton<BloodTrackerDbContext>();

        services.AddScoped<IAnalysisRepository, AnalysisRepository>();
        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IDrugRepository, DrugRepository>();
        services.AddScoped<IIntakeLogRepository, IntakeLogRepository>();

        services.AddSingleton<IReferenceRangeService, ReferenceRangeService>();
        
        // HTTP Client для Gemini API
        services.AddHttpClient<GeminiVisionService>();
        services.AddSingleton<GeminiVisionService>();

        // HTTP Client для каталога упражнений
        services.AddHttpClient<ExerciseCatalogService>();
        services.AddSingleton<IExerciseCatalogService, ExerciseCatalogService>();
        
        services.AddSingleton<IPdfParserService, PdfParserService>();

        return services;
    }
}
