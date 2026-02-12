using System.Globalization;
using BloodTracker.Application.Common;
using Docnet.Core;
using Docnet.Core.Models;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class GeminiPdfParser : IPdfParserService
{
    private readonly ILogger<GeminiPdfParser> _logger;
    private readonly GeminiVisionService? _geminiService;
    private readonly OcrPdfParser _ocrParser;
    private readonly string _tessDataPath;
    
    private const int RenderScale = 3;

    public GeminiPdfParser(ILogger<GeminiPdfParser> logger, GeminiVisionService? geminiService = null)
    {
        _logger = logger;
        _geminiService = geminiService;
        _tessDataPath = Path.Combine(AppContext.BaseDirectory, "tessdata");
        
        if (!Directory.Exists(_tessDataPath))
        {
            Directory.CreateDirectory(_tessDataPath);
        }

        _ocrParser = new OcrPdfParser(_logger, _tessDataPath);
    }

    public async Task<PdfAnalysisResult> ParseAnalysisPdfAsync(Stream pdfStream, CancellationToken ct = default)
    {
        var result = new PdfAnalysisResult
        {
            Date = DateTime.Today,
            Values = new Dictionary<string, double>(),
            UnrecognizedItems = new List<string>()
        };

        try
        {
            using var memoryStream = new MemoryStream();
            await pdfStream.CopyToAsync(memoryStream, ct);
            var pdfBytes = memoryStream.ToArray();
            
            if (_geminiService?.IsAvailable == true)
            {
                _logger.LogInformation("Using Gemini Vision API for PDF parsing");
                var geminiResult = await ParseWithGeminiAsync(pdfBytes, ct);
                if (geminiResult.Values.Count > 0)
                {
                    _logger.LogInformation("Gemini extracted {Count} values", geminiResult.Values.Count);
                    return geminiResult;
                }
                _logger.LogWarning("Gemini returned no values, falling back to OCR");
            }
            
            _logger.LogInformation("Using OCR for PDF parsing");
            await _ocrParser.EnsureTessDataAsync(ct);
            
            await ParseWithOcrAsync(pdfBytes, result, ct);
            
            _logger.LogInformation("Parsed {Count} values, {Unrecognized} unrecognized", 
                result.Values.Count, result.UnrecognizedItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse PDF");
            result.UnrecognizedItems.Add($"Ошибка парсинга: {ex.Message}");
        }

        return result;
    }

    private async Task ParseWithOcrAsync(byte[] pdfBytes, PdfAnalysisResult result, CancellationToken ct)
    {
        await _ocrParser.EnsureTessDataAsync(ct);
        
        using var engine = new Tesseract.TesseractEngine(_tessDataPath, "rus+eng", Tesseract.EngineMode.Default);
        engine.SetVariable("tessedit_char_whitelist", "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789.,-%<>≤≥()/ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
        
        using var docReader = DocLib.Instance.GetDocReader(pdfBytes, new PageDimensions(RenderScale));
        var pageCount = docReader.GetPageCount();
        
        _logger.LogInformation("PDF has {PageCount} pages for OCR", pageCount);
        
        for (int pageIndex = 0; pageIndex < pageCount; pageIndex++)
        {
            ct.ThrowIfCancellationRequested();
            
            using var pageReader = docReader.GetPageReader(pageIndex);
            var width = pageReader.GetPageWidth();
            var height = pageReader.GetPageHeight();
            var rawBytes = pageReader.GetImage();
            
            if (rawBytes == null || rawBytes.Length == 0)
                continue;
            
            var processedImage = ImagePreprocessor.PreprocessImage(rawBytes, width, height);
            
            var pageWords = _ocrParser.ExtractWordsFromPage(engine, processedImage, pageIndex + 1);
            
            if (pageWords.Count == 0)
                continue;
            
            var pageLines = _ocrParser.GroupWordsIntoLines(pageWords);
            _logger.LogInformation("Page {Page}: {Words} words -> {Lines} lines", 
                pageIndex + 1, pageWords.Count, pageLines.Count);
            
            _ocrParser.ProcessPageLines(pageLines, result, width);
        }
    }

    private async Task<PdfAnalysisResult> ParseWithGeminiAsync(byte[] pdfBytes, CancellationToken ct)
    {
        var result = new PdfAnalysisResult
        {
            Date = DateTime.Today,
            Values = new Dictionary<string, double>(),
            UnrecognizedItems = new List<string>()
        };

        using var docReader = DocLib.Instance.GetDocReader(pdfBytes, new PageDimensions(RenderScale));
        var pageCount = docReader.GetPageCount();
        
        _logger.LogInformation("PDF has {PageCount} pages for Gemini processing", pageCount);
        
        var pageImages = new List<byte[]>();
        
        for (int pageIndex = 0; pageIndex < pageCount; pageIndex++)
        {
            ct.ThrowIfCancellationRequested();
            
            using var pageReader = docReader.GetPageReader(pageIndex);
            var width = pageReader.GetPageWidth();
            var height = pageReader.GetPageHeight();
            var rawBytes = pageReader.GetImage();
            
            if (rawBytes == null || rawBytes.Length == 0)
            {
                _logger.LogWarning("Page {Page} has no image data", pageIndex + 1);
                continue;
            }
            
            var processedImage = ImagePreprocessor.PreprocessImage(rawBytes, width, height);
            pageImages.Add(processedImage);
            
            _logger.LogInformation("Page {Page} rendered: {Size} bytes", pageIndex + 1, processedImage.Length);
        }
        
        if (pageImages.Count == 0)
        {
            _logger.LogError("No valid page images extracted from PDF");
            result.UnrecognizedItems.Add("Не удалось извлечь изображения из PDF");
            return result;
        }
        
        try
        {
            _logger.LogInformation("Sending all {Count} pages to Gemini in a single request", pageImages.Count);
            
            var jsonText = await _geminiService!.ExtractTableDataFromImagesAsync(pageImages, ct);
            
            _logger.LogInformation("Gemini returned {Length} chars for all {Pages} pages. Preview: {Preview}",
                jsonText.Length, pageImages.Count,
                jsonText.Length > 500 ? jsonText[..500] + "..." : jsonText);
            
            ParseGeminiJsonResponse(jsonText, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process PDF with Gemini");
            result.UnrecognizedItems.Add($"Ошибка Gemini API: {ex.Message}");
        }
        
        return result;
    }

    private void ParseGeminiJsonResponse(string jsonText, PdfAnalysisResult result)
    {
        try
        {
            var jsonStart = jsonText.IndexOf('{');
            var jsonEnd = jsonText.LastIndexOf('}');
            
            if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart)
            {
                _logger.LogWarning("No JSON found in Gemini response");
                return;
            }
            
            var json = jsonText.Substring(jsonStart, jsonEnd - jsonStart + 1);
            var doc = System.Text.Json.JsonDocument.Parse(json);
            
            if (doc.RootElement.TryGetProperty("rows", out var rows))
            {
                foreach (var row in rows.EnumerateArray())
                {
                    if (!row.TryGetProperty("name", out var nameElement) ||
                        !row.TryGetProperty("result", out var resultElement))
                        continue;
                    
                    var name = nameElement.GetString();
                    var resultStr = resultElement.GetString();
                    
                    if (string.IsNullOrWhiteSpace(name))
                        continue;
                    
                    if (resultStr?.Contains("Выполняется", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        result.UnrecognizedItems.Add($"{name}: Выполняется");
                        continue;
                    }
                    
                    if (string.IsNullOrWhiteSpace(resultStr))
                        continue;
                    
                    var valueStr = resultStr.Replace(',', '.').Trim();
                    if (!double.TryParse(valueStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
                        continue;
                    
                    foreach (var mapping in BloodTestNameMapper.NameMappings)
                    {
                        if (result.Values.ContainsKey(mapping.Key))
                            continue;
                        
                        bool nameMatches = mapping.Value.Any(pattern =>
                            name.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                        
                        if (!nameMatches)
                            continue;
                        
                        if (BloodTestNameMapper.ValidateValue(mapping.Key, value))
                        {
                            result.Values[mapping.Key] = value;
                            _logger.LogInformation("Gemini found {Key} = {Value} (name: '{Name}')",
                                mapping.Key, value, name);
                        }
                        else
                        {
                            _logger.LogWarning("{Key}: value {Value} failed validation",
                                mapping.Key, value);
                        }
                        
                        break;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini JSON response");
        }
    }
}
