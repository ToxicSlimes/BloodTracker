using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class GeminiVisionService
{
    private readonly ILogger<GeminiVisionService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    
    // Используем v1beta API с gemini-2.5-flash (поддерживает изображения, бесплатный tier)
    private const string GeminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public GeminiVisionService(ILogger<GeminiVisionService> logger, IConfiguration configuration, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Gemini API key not configured. Vision API will be disabled.");
        }
    }

    public bool IsAvailable => !string.IsNullOrEmpty(_apiKey);

    /// <summary>
    /// Извлекает данные из ВСЕХ страниц PDF за ОДИН запрос к Gemini API
    /// </summary>
    public async Task<string> ExtractTableDataFromImagesAsync(List<byte[]> images, CancellationToken ct = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("Gemini API key is not configured");
        }

        if (images.Count == 0)
        {
            return string.Empty;
        }

        try
        {
            _logger.LogInformation("Sending {Count} images to Gemini in a single request", images.Count);
            
            // Создаём список частей: сначала текст-промпт, потом все изображения
            var parts = new List<object>
            {
                new
                {
                    text = $@"You are analyzing {images.Count} pages of a blood test results document.
Extract ALL data from the blood test results tables on ALL {images.Count} pages.
Return the result ONLY in JSON format (no markdown, no explanations):
{{
  ""rows"": [
    {{
      ""name"": ""full test name"",
      ""result"": ""value from Result column (number or 'Выполняется')"",
      ""unit"": ""unit of measurement"",
      ""reference"": ""reference values""
    }}
  ]
}}

CRITICAL REQUIREMENTS:
- Analyze ALL {images.Count} pages/images provided
- Extract ALL rows from ALL tables on ALL pages
- Include rows where result = 'Выполняется' (In Progress) or empty
- For rows with 'Выполняется' - keep result as 'Выполняется' (as string)
- For numeric values - extract ONLY from the 'Result' column (second column)
- DO NOT extract values from 'Reference Values' or 'Normal Values' columns
- Test name must be complete (e.g., 'Тестостерон общий' not just 'Тестостерон')
- Numbers in decimal format with dot or comma (e.g., 24.67 or 24,67)
- Look for: Glucose, HbA1c, Urea, Vitamin D, IGF-1, hormones, enzymes, lipids, proteins
- Scan EVERY page systematically - do not miss any table rows
- Return ONLY valid JSON, no markdown blocks, no comments"
                }
            };

            // Добавляем все изображения
            foreach (var imageBytes in images)
            {
                var base64Image = Convert.ToBase64String(imageBytes);
                parts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = "image/png",
                        data = base64Image
                    }
                });
            }

            var requestBody = new
            {
                contents = new object[]
                {
                    new
                    {
                        parts = parts
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var requestContent = new StringContent(json, Encoding.UTF8, "application/json");
            
            var url = $"{GeminiApiUrl}?key={_apiKey}";
            
            _logger.LogInformation("Sending single request with {Count} pages to Gemini API", images.Count);
            var response = await _httpClient.PostAsync(url, requestContent, ct);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini API error: {StatusCode} - {Error}", response.StatusCode, errorText);
                throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {errorText}");
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var responseObj = JsonSerializer.Deserialize<JsonElement>(responseJson);
            
            // Извлекаем текст из ответа
            if (responseObj.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0)
            {
                var candidate = candidates[0];
                if (candidate.TryGetProperty("content", out var contentObj) &&
                    contentObj.TryGetProperty("parts", out var responseParts) &&
                    responseParts.GetArrayLength() > 0)
                {
                    var text = responseParts[0].GetProperty("text").GetString();
                    _logger.LogInformation("Gemini extracted {Length} characters from {Pages} pages", 
                        text?.Length ?? 0, images.Count);
                    return text ?? string.Empty;
                }
            }

            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract data using Gemini Vision API");
            throw;
        }
    }
}
