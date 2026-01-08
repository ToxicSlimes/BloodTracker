using BloodTracker.Api.Startup;
using ElectronNET.API;
using ElectronNET.API.Entities;
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

// Services
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

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