using System.Reflection;
using System.Threading.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Net.Http.Headers;

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

        // Force browser to revalidate JS/CSS files on every request (prevents stale module cache)
        var cacheHeaders = new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                var path = ctx.File.Name;
                if (path.EndsWith(".js") || path.EndsWith(".css"))
                {
                    ctx.Context.Response.Headers[HeaderNames.CacheControl] = "no-cache";
                }
            }
        };

        if (fileProvider != null)
        {
            cacheHeaders.FileProvider = fileProvider;
            app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
            app.UseStaticFiles(cacheHeaders);
            app.MapFallbackToFile("index.html", new StaticFileOptions { FileProvider = fileProvider });
        }
        else
        {
            app.UseDefaultFiles();
            app.UseStaticFiles(cacheHeaders);
            app.MapFallbackToFile("index.html");
        }

        app.UseExceptionHandler();
        app.UseCors("AllowAll");
        app.UseRateLimiter();

        app.UseAuthentication();
        app.UseAuthorization();

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
