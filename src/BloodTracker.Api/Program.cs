using BloodTracker.Api.Startup;
using ElectronNET.API;
using ElectronNET.API.Entities;
using Microsoft.AspNetCore.DataProtection;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Electron.NET integration - ПРАВИЛЬНЫЙ способ!
builder.WebHost.UseElectron(args);

// Logging
Log.Logger = new LoggerConfiguration()
  .ReadFrom.Configuration(builder.Configuration)
  .Enrich.FromLogContext()
  .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
  .WriteTo.File("logs/app-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7)
  .CreateLogger();

builder.Host.UseSerilog();

// DataProtection keys — persist in /data/ volume so tokens survive container rebuilds
var dataDir = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
    ? "/data" : ".";
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDir, "DataProtection-Keys")));

// Services
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

// Run data migration for existing single-user DB → per-user DB
var migrationService = app.Services.GetRequiredService<BloodTracker.Infrastructure.Services.DataMigrationService>();
migrationService.MigrateIfNeeded();

// Seed catalogs
var drugCatalogSeeder = app.Services.GetRequiredService<BloodTracker.Infrastructure.Services.DrugCatalogSeedService>();
drugCatalogSeeder.SeedIfNeeded();

var exerciseCatalogSeeder = app.Services.GetRequiredService<BloodTracker.Infrastructure.Services.ExerciseCatalogSeedService>();
exerciseCatalogSeeder.SeedIfNeeded();

app.UseApi();

// Start async for Electron
await app.StartAsync();

// Create Electron window only when running in Electron
if (HybridSupport.IsElectronActive)
{
  Log.Information("Electron is active, creating window...");
  await CreateElectronWindow();
}
else
{
  Log.Information("Running in browser mode at http://localhost:5000");
}

app.WaitForShutdown();

async Task CreateElectronWindow()
{
  var options = new BrowserWindowOptions
  {
    Title = "🩸 BloodTracker",
    Width = 1400,
    Height = 900,
    MinWidth = 1000,
    MinHeight = 700,
    Show = false,
    AutoHideMenuBar = true,
    WebPreferences = new WebPreferences
    {
      NodeIntegration = false,
      ContextIsolation = true
    }
  };

  var window = await Electron.WindowManager.CreateWindowAsync(options);
    
  window.OnReadyToShow += () =>
  {
    window.Show();
    Log.Information("Electron window shown");
  };
    
  window.OnClosed += () =>
  {
    Log.Information("Window closed, shutting down...");
    Electron.App.Quit();
  };
    
  Log.Information("Electron window created");
}

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }