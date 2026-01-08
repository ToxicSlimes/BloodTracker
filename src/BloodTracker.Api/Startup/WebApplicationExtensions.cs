using System.Reflection;
using Microsoft.Extensions.FileProviders;

namespace BloodTracker.Api.Startup;

public static class WebApplicationExtensions
{
    public static WebApplication UseApi(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "BloodTracker API v1"));

        IFileProvider fileProvider = app.Environment.WebRootFileProvider;
        
        if (IsSingleFile())
        {
            var embeddedProvider = new EmbeddedFileProvider(typeof(WebApplicationExtensions).Assembly, "BloodTracker.Api.wwwroot");
            if (fileProvider != null)
            {
                fileProvider = new CompositeFileProvider(embeddedProvider, fileProvider);
            }
            else
            {
                fileProvider = embeddedProvider;
            }
        }
        
        if (fileProvider != null)
        {
            app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
            app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });
            app.MapFallbackToFile("index.html", new StaticFileOptions { FileProvider = fileProvider });
        }
        else
        {
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.MapFallbackToFile("index.html");
        }
        
        app.UseCors("AllowAll");
        app.MapControllers();

        app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

        return app;
    }
    
    private static bool IsSingleFile()
    {
#pragma warning disable IL3000
        var assembly = Assembly.GetExecutingAssembly();
        var location = assembly.Location;
#pragma warning restore IL3000
        return string.IsNullOrEmpty(location);
    }
}
