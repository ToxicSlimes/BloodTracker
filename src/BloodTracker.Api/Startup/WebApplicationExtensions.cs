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

        // Static file cache headers (P3.5 + P3.15)
        // - Non-hashed files (current): short-lived cache (1 hour)
        // - Hashed files (future Vite build): immutable long-term cache
        // - HTML: always revalidate
        var cacheHeaders = new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                var path = ctx.File.Name.ToLowerInvariant();
                
                // HTML files: always revalidate
                if (path.EndsWith(".html"))
                {
                    ctx.Context.Response.Headers[HeaderNames.CacheControl] = "no-cache";
                    return;
                }

                // Hashed files from Vite build (e.g., main.a1b2c3d4.js)
                // Pattern: .[8+ hex chars].{js|css}
                if (System.Text.RegularExpressions.Regex.IsMatch(path, @"\.[a-f0-9]{8,}\.(js|css)$"))
                {
                    // Immutable long-term cache for content-addressed assets
                    ctx.Context.Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";
                    return;
                }

                // Non-hashed JS/CSS: short cache with revalidation (current state)
                if (path.EndsWith(".js") || path.EndsWith(".css"))
                {
                    ctx.Context.Response.Headers[HeaderNames.CacheControl] = "public, max-age=3600";
                    return;
                }

                // Other static files (fonts, images): moderate cache
                if (path.EndsWith(".ttf") || path.EndsWith(".woff") || path.EndsWith(".woff2") || 
                    path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".jpeg") || 
                    path.EndsWith(".gif") || path.EndsWith(".svg") || path.EndsWith(".webp"))
                {
                    ctx.Context.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000"; // 30 days
                    return;
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

        // TODO (P3.10): API Versioning
        // Plan: Prefix all routes with /api/v1/ to enable future version migration
        // Implementation: Use ApiVersioningExtensions.AddApiVersioning() to configure
        // Breaking Change: Requires frontend URL updates — defer until v2.0 release
        // See: Startup/ApiVersioningExtensions.cs
        app.MapControllers();

        app.MapGet("/healthz", async (BloodTracker.Infrastructure.Persistence.AuthDbContext authDb) =>
        {
            var authStatus = await CheckAuthDbAccessAsync(authDb);
            var diskStatus = CheckDiskSpace();

            var allHealthy = authStatus.healthy && diskStatus.healthy;

            var health = new
            {
                status = allHealthy ? "healthy" : "degraded",
                timestamp = DateTime.UtcNow,
                version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
                checks = new
                {
                    authDb = authStatus,
                    diskSpace = diskStatus
                }
            };

            return allHealthy ? Results.Ok(health) : Results.Json(health, statusCode: 503);
        });

        static async Task<(bool healthy, int? userCount, string? error)> CheckAuthDbAccessAsync(BloodTracker.Infrastructure.Persistence.AuthDbContext authDb)
        {
            try
            {
                var userCount = await Task.Run(() => authDb.Users.Count());
                return (true, userCount, null);
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }

        static (bool healthy, double? availableGB, double? totalGB, double? usedPercent, string? error, string? warning) CheckDiskSpace()
        {
            try
            {
                var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.DriveType == DriveType.Fixed);
                if (drive == null)
                {
                    return (true, null, null, null, null, "No fixed drives found");
                }

                var availableGB = drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                var totalGB = drive.TotalSize / (1024.0 * 1024.0 * 1024.0);
                var usedPercent = ((totalGB - availableGB) / totalGB) * 100;

                return (availableGB > 1.0,
                        Math.Round(availableGB, 2),
                        Math.Round(totalGB, 2),
                        Math.Round(usedPercent, 1),
                        null,
                        null);
            }
            catch (Exception ex)
            {
                return (false, null, null, null, ex.Message, null);
            }
        }

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
