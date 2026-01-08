using BloodTracker.Application;
using BloodTracker.Infrastructure;
using ElectronNET.API;
using Microsoft.Extensions.Configuration;

namespace BloodTracker.Api.Startup;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new() { Title = "BloodTracker API", Version = "v1" });
        });

        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", p =>
                p.SetIsOriginAllowed(_ => true)
                 .AllowAnyHeader()
                 .AllowAnyMethod());
        });

        // Electron.NET DI integration
        services.AddElectron();

        services.AddApplication();
        services.AddInfrastructure(configuration);

        return services;
    }
}
