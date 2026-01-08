using System.Globalization;
using System.Text.RegularExpressions;
using BloodTracker.Application.Common;
using Docnet.Core;
using Docnet.Core.Models;
using Microsoft.Extensions.Logging;
using OpenCvSharp;
using Tesseract;

namespace BloodTracker.Infrastructure.Services;

public sealed partial class PdfParserService : IPdfParserService
{
    private readonly ILogger<PdfParserService> _logger;
    private readonly GeminiVisionService? _geminiService;
    private readonly string _tessDataPath;
    
    private const int RenderScale = 3;
    private const float MinConfidence = 60f;
    
    public PdfParserService(ILogger<PdfParserService> logger, GeminiVisionService? geminiService = null)
    {
        _logger = logger;
        _geminiService = geminiService;
        _tessDataPath = Path.Combine(AppContext.BaseDirectory, "tessdata");
        
        if (!Directory.Exists(_tessDataPath))
        {
            Directory.CreateDirectory(_tessDataPath);
        }
    }

    private static readonly Dictionary<string, string[]> NameMappings = new(StringComparer.OrdinalIgnoreCase)
    {
        ["free-testosterone"] = ["Тестостерон свободный", "свободный (расч", "свободный"],
        ["testosterone"] = ["Тестостерон общий"],
        ["lh"] = ["Лютеинизирующий гормон", "гормон (ЛГ)", "(ЛГ)"],
        ["fsh"] = ["Фолликулостимулирующий гормон", "гормон (ФСГ)", "(ФСГ)"],
        ["prolactin"] = ["Пролактин"],
        ["estradiol"] = ["Эстрадиол"],
        ["shbg"] = ["ГСПГ", "Глобулин, связывающий половые", "связывающий половые", "SHBG"],
        ["tsh"] = ["Тиреотропный гормон", "гормон (ТТГ)", "(ТТГ)", "(TTT)", "ТТГ)"],
        ["igf1"] = ["ИФР-1", "IGF-1", "Соматомедин"],
        ["fai"] = ["Индекс свободных андрогенов", "свободных андрогенов"],
        
        ["hdl"] = ["ЛПВП", "HDL", "высокой плотности", "(ЛПВП", "ЛПВП,", "липопротеидов высокой"],
        ["ldl"] = ["ЛПНП", "LDL", "низкой плотности", "(ЛПНП", "ЛПНП,", "липопротеидов низкой", "JITTHIT"],
        ["vldl"] = ["ЛПОНП", "VLDL", "очень низкой плотности", "Липопротеиды очень низкой", "ЛПОНП (VLDL)", "ЛПОНП"],
        ["non-hdl-cholesterol"] = ["Холестерин не-ЛПВП", "не-ЛПВП", "не ЛПВП", "Холестерин не ЛПВП"],
        ["triglycerides"] = ["Триглицериды"],
        ["cholesterol"] = ["Холестерин общий", "Холестерол общий", "Холестерин общ", "Холестерин"],
        ["atherogenic"] = ["Коэффициент атерогенности", "атерогенности"],
        
        ["alt"] = ["Аланинаминотрансфераза", "(АЛТ)", "АЛТ)", "АЛТ"],
        ["ast"] = ["Аспартатаминотрансфераза", "(АСТ)", "АСТ)", "АСТ", "Аспартат"],
        ["ggt"] = ["Гамма-глутамилтрансфераза", "(ГГТ)", "ГГТ)", "ГГТ"],
        ["alp"] = ["Щелочная фосфатаза", "Щелочная", "фосфатаза"],
        
        ["bilirubin-direct"] = ["Билирубин прямой", "Билирубин, прямой", "прямой"],
        ["bilirubin"] = ["Билирубин общий", "Билирубин, общий", "Билирубин o6щий", "Билирубин общ"],
        
        ["glucose"] = ["Глюкоза"],
        ["hba1c"] = ["Гликированный гемоглобин", "HbA1c"],
        ["creatinine"] = ["Креатинин"],
        ["urea"] = ["Мочевина"],
        ["protein"] = ["Общий белок", "белок общий", "Белок общий", "белок"],
        ["vitd"] = ["Витамин D", "25-OH", "25-ОН"],
        
        ["pt"] = ["Протромбиновое время"],
        ["pt-percent"] = ["Протромбин %", "по Квику", "Протромбин % (по"],
        ["inr"] = ["МНО", "нормализованное отношение", "INR", "(МНО)", "отношение (МНО)"],
        
        ["hemoglobin"] = ["Гемоглобин"],
        ["hematocrit"] = ["Гематокрит"]
    };

    private static readonly Dictionary<string, (double Min, double Max)> ExpectedRanges = new()
    {
        ["testosterone"] = (5, 50),
        ["free-testosterone"] = (0.1, 2),
        ["lh"] = (0.3, 20),
        ["fsh"] = (0.3, 20),
        ["prolactin"] = (50, 1000),
        ["estradiol"] = (10, 300),
        ["shbg"] = (10, 100),
        ["tsh"] = (0.1, 10),
        ["igf1"] = (50, 500),
        ["fai"] = (10, 200),
        ["cholesterol"] = (2, 10),
        ["hdl"] = (0.5, 3),
        ["ldl"] = (0.5, 6),
        ["triglycerides"] = (0.3, 5),
        ["vldl"] = (0.1, 2),
        ["atherogenic"] = (0.5, 10),
        ["non-hdl-cholesterol"] = (1, 8),
        ["alt"] = (5, 200),
        ["ast"] = (5, 200),
        ["ggt"] = (5, 150),
        ["alp"] = (20, 300),
        ["bilirubin"] = (2, 50),
        ["bilirubin-direct"] = (0.5, 15),
        ["glucose"] = (2, 15),
        ["hba1c"] = (3, 15),
        ["creatinine"] = (30, 200),
        ["urea"] = (1, 20),
        ["protein"] = (50, 100),
        ["vitd"] = (5, 200),
        ["pt"] = (8, 25),
        ["pt-percent"] = (50, 150),
        ["inr"] = (0.5, 2),
        ["hemoglobin"] = (80, 200),
        ["hematocrit"] = (25, 60)
    };

    private sealed record OcrWord(string Text, int X1, int Y1, int X2, int Y2, float Confidence);

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
            await EnsureTessDataAsync(ct);
            
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
        await EnsureTessDataAsync(ct);
        
        using var engine = new TesseractEngine(_tessDataPath, "rus+eng", EngineMode.Default);
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
            
            var processedImage = PreprocessImage(rawBytes, width, height);
            
            var pageWords = ExtractWordsFromPage(engine, processedImage, pageIndex + 1);
            
            if (pageWords.Count == 0)
                continue;
            
            var pageLines = GroupWordsIntoLines(pageWords);
            _logger.LogInformation("Page {Page}: {Words} words -> {Lines} lines", 
                pageIndex + 1, pageWords.Count, pageLines.Count);
            
            ProcessPageLines(pageLines, result, width);
        }
    }

    private List<OcrWord> ExtractWordsFromPage(TesseractEngine engine, byte[] imageBytes, int pageNumber)
    {
        var words = new List<OcrWord>();
        
        using var pix = Pix.LoadFromMemory(imageBytes);
        using var page = engine.Process(pix, PageSegMode.Auto);
        
        var meanConf = page.GetMeanConfidence() * 100;
        _logger.LogInformation("Page {Page}: mean confidence {Conf:F1}%", pageNumber, meanConf);
        
        using var iter = page.GetIterator();
        iter.Begin();
        
        do
        {
            if (!iter.TryGetBoundingBox(PageIteratorLevel.Word, out var rect))
                continue;
            
            var text = iter.GetText(PageIteratorLevel.Word);
            if (string.IsNullOrWhiteSpace(text))
                continue;
            
            var confidence = iter.GetConfidence(PageIteratorLevel.Word);
            
            if (confidence < MinConfidence)
                continue;
            
            text = text.Trim();
            if (text.Length < 1)
                continue;
            
            words.Add(new OcrWord(text, rect.X1, rect.Y1, rect.X2, rect.Y2, confidence));
        }
        while (iter.Next(PageIteratorLevel.Word));
        
        return words;
    }

    private List<List<OcrWord>> GroupWordsIntoLines(List<OcrWord> words)
    {
        if (words.Count == 0)
            return new List<List<OcrWord>>();
        
        var sortedWords = words.OrderBy(w => w.Y1).ThenBy(w => w.X1).ToList();
        var lines = new List<List<OcrWord>>();
        
        var avgHeight = sortedWords.Average(w => w.Y2 - w.Y1);
        var yTolerance = (int)(avgHeight * 0.5);
        
        foreach (var word in sortedWords)
        {
            var existingLine = lines.LastOrDefault(l =>
                l.Any() && Math.Abs(l.Average(w => (w.Y1 + w.Y2) / 2.0) - (word.Y1 + word.Y2) / 2.0) <= yTolerance);
            
            if (existingLine != null)
            {
                existingLine.Add(word);
            }
            else
            {
                lines.Add(new List<OcrWord> { word });
            }
        }
        
        foreach (var line in lines)
        {
            line.Sort((a, b) => a.X1.CompareTo(b.X1));
        }
        
        return lines;
    }

    private void ProcessPageLines(List<List<OcrWord>> lines, PdfAnalysisResult result, int pageWidth)
    {
        for (int i = 0; i < lines.Count; i++)
        {
            var lineWords = lines[i];
            if (lineWords.Count == 0) continue;
            
            var lineText = string.Join(" ", lineWords.Select(w => w.Text));
            
            var hasNumbers = lineWords.Any(w => w.Text.Any(char.IsDigit));
            
            if (IsServiceLine(lineText) && !hasNumbers)
            {
                _logger.LogDebug("Skipped service line: '{Line}'", 
                    lineText.Length > 50 ? lineText[..50] + "..." : lineText);
                continue;
            }
            
            if (lineText.Contains("Выполняется", StringComparison.OrdinalIgnoreCase)) continue;
            
            bool anyMatch = false;
            
            foreach (var mapping in NameMappings)
            {
                if (result.Values.ContainsKey(mapping.Key))
                    continue;
                
                bool nameMatches = mapping.Value.Any(pattern =>
                    lineText.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                
                if (mapping.Key == "cholesterol" && nameMatches)
                {
                    if (lineText.Contains("не-ЛПВП", StringComparison.OrdinalIgnoreCase) ||
                        lineText.Contains("не ЛПВП", StringComparison.OrdinalIgnoreCase))
                    {
                        nameMatches = false;
                    }
                }
                
                if (mapping.Key == "non-hdl-cholesterol" && nameMatches)
                {
                    if (lineText.Contains("общий", StringComparison.OrdinalIgnoreCase) &&
                        !lineText.Contains("не-ЛПВП", StringComparison.OrdinalIgnoreCase) &&
                        !lineText.Contains("не ЛПВП", StringComparison.OrdinalIgnoreCase))
                    {
                        nameMatches = false;
                    }
                }
                
                if (!nameMatches)
                    continue;
                
                anyMatch = true;
                
                var nameWordX = lineWords.Where(w => mapping.Value.Any(p => w.Text.Contains(p, StringComparison.OrdinalIgnoreCase)))
                    .Select(w => w.X2).DefaultIfEmpty(0).Max();
                
                var valueWords = lineWords.Where(w => w.X1 > nameWordX).ToList();
                var value = ExtractNumericValueFromLine(valueWords.Count > 0 ? valueWords : lineWords, mapping.Key, pageWidth);
                
                if (!value.HasValue)
                {
                    var currentLineY = lineWords.Any() ? lineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var avgHeight = lineWords.Any() ? lineWords.Average(w => w.Y2 - w.Y1) : 20;
                    var yTolerance = avgHeight * 3;
                    
                    for (int j = 0; j < lines.Count; j++)
                    {
                        if (j == i) continue;
                        
                        var otherLineWords = lines[j];
                        var otherLineY = otherLineWords.Any() ? otherLineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                        var yDiff = Math.Abs(otherLineY - currentLineY);
                        
                        if (yDiff <= yTolerance)
                        {
                            var otherLineText = string.Join(" ", otherLineWords.Select(w => w.Text));
                            if (!IsServiceLine(otherLineText) && otherLineWords.Any(w => w.Text.Any(char.IsDigit)))
                            {
                                var testValue = ExtractNumericValueFromLine(otherLineWords, mapping.Key, pageWidth);
                                if (testValue.HasValue && ValidateValue(mapping.Key, testValue.Value))
                                {
                                    value = testValue;
                                    _logger.LogInformation("Found {Key} = {Value} from same Y-level line {J}: '{OtherLine}' (name in line {I}: '{Line}')",
                                        mapping.Key, value.Value, j,
                                        otherLineText.Length > 40 ? otherLineText[..40] + "..." : otherLineText,
                                        i, lineText.Length > 40 ? lineText[..40] + "..." : lineText);
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!value.HasValue && i + 1 < lines.Count && i + 2 < lines.Count)
                    {
                        for (int j = i + 1; j <= Math.Min(i + 3, lines.Count - 1); j++)
                        {
                            var nextLineWords = lines[j];
                            var nextLineText = string.Join(" ", nextLineWords.Select(w => w.Text));
                            if (!IsServiceLine(nextLineText) && nextLineWords.Any(w => w.Text.Any(char.IsDigit)))
                            {
                                var testValue = ExtractNumericValueFromLine(nextLineWords, mapping.Key, pageWidth);
                                if (testValue.HasValue && ValidateValue(mapping.Key, testValue.Value))
                                {
                                    value = testValue;
                                    _logger.LogInformation("Found {Key} = {Value} from next line {J}: '{NextLine}' (name in line {I}: '{Line}')",
                                        mapping.Key, value.Value, j,
                                        nextLineText.Length > 40 ? nextLineText[..40] + "..." : nextLineText,
                                        i, lineText.Length > 40 ? lineText[..40] + "..." : lineText);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                var hasRangeOnly = lineText.Contains("-") && 
                    Regex.IsMatch(lineText, @"\d+[.,]?\d*[-–—]\d+[.,]?\d*") &&
                    !value.HasValue;
                
                if (!value.HasValue && hasRangeOnly && i + 1 < lines.Count)
                {
                    var nextLineWords = lines[i + 1];
                    var nextLineText = string.Join(" ", nextLineWords.Select(w => w.Text));
                    var nextLineY = nextLineWords.Any() ? nextLineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var currentLineY = lineWords.Any() ? lineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var yDiff = Math.Abs(nextLineY - currentLineY);
                    var avgHeight = lineWords.Any() ? lineWords.Average(w => w.Y2 - w.Y1) : 20;
                    
                    if (nextLineWords.Any(w => w.Text.Any(char.IsDigit)) && !IsServiceLine(nextLineText) && yDiff < avgHeight * 3)
                    {
                        value = ExtractNumericValueFromLine(nextLineWords, mapping.Key, pageWidth);
                        if (value.HasValue)
                        {
                            _logger.LogInformation("Found {Key} = {Value} from next line (name had range only): '{Line}' -> '{NextLine}'",
                                mapping.Key, value.Value, 
                                lineText.Length > 40 ? lineText[..40] + "..." : lineText,
                                nextLineText.Length > 40 ? nextLineText[..40] + "..." : nextLineText);
                        }
                    }
                }
                
                if (!value.HasValue && i > 0)
                {
                    var prevLineWords = lines[i - 1];
                    var prevLineText = string.Join(" ", prevLineWords.Select(w => w.Text));
                    var prevLineY = prevLineWords.Any() ? prevLineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var currentLineY = lineWords.Any() ? lineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var yDiff = Math.Abs(prevLineY - currentLineY);
                    var avgHeight = lineWords.Any() ? lineWords.Average(w => w.Y2 - w.Y1) : 20;
                    
                    if (prevLineWords.Any(w => w.Text.Any(char.IsDigit)) && !IsServiceLine(prevLineText) && 
                        (prevLineText.Length < 30 || yDiff < avgHeight * 2))
                    {
                        value = ExtractNumericValueFromLine(prevLineWords, mapping.Key, pageWidth);
                        if (value.HasValue)
                        {
                            _logger.LogInformation("Found {Key} = {Value} from previous line: '{PrevLine}' (name in: '{Line}')",
                                mapping.Key, value.Value, 
                                prevLineText.Length > 40 ? prevLineText[..40] + "..." : prevLineText,
                                lineText.Length > 40 ? lineText[..40] + "..." : lineText);
                        }
                    }
                }
                
                if (!value.HasValue && i + 1 < lines.Count)
                {
                    var nextLineWords = lines[i + 1];
                    var nextLineText = string.Join(" ", nextLineWords.Select(w => w.Text));
                    var nextLineY = nextLineWords.Any() ? nextLineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var currentLineY = lineWords.Any() ? lineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var yDiff = Math.Abs(nextLineY - currentLineY);
                    var avgHeight = lineWords.Any() ? lineWords.Average(w => w.Y2 - w.Y1) : 20;
                    
                    if (nextLineWords.Any(w => w.Text.Any(char.IsDigit)) && !IsServiceLine(nextLineText) && yDiff < avgHeight * 3)
                    {
                        var combinedWords = new List<OcrWord>(lineWords);
                        combinedWords.AddRange(nextLineWords);
                        value = ExtractNumericValueFromLine(combinedWords, mapping.Key, pageWidth);
                        if (value.HasValue)
                        {
                            _logger.LogInformation("Found {Key} = {Value} from combined lines: '{Line}' + '{NextLine}'",
                                mapping.Key, value.Value, 
                                lineText.Length > 40 ? lineText[..40] + "..." : lineText,
                                nextLineText.Length > 40 ? nextLineText[..40] + "..." : nextLineText);
                        }
                    }
                }
                
                if (value.HasValue)
                {
                    if (ValidateValue(mapping.Key, value.Value))
                    {
                        result.Values[mapping.Key] = value.Value;
                        _logger.LogInformation("Found {Key} = {Value} from line: '{Line}'",
                            mapping.Key, value.Value, 
                            lineText.Length > 60 ? lineText[..60] + "..." : lineText);
                    }
                    else
                    {
                        _logger.LogWarning("{Key}: value {Value} failed validation, skipping. Line: '{Line}'",
                            mapping.Key, value.Value, 
                            lineText.Length > 60 ? lineText[..60] + "..." : lineText);
                    }
                }
                else
                {
                    _logger.LogWarning("{Key}: name matched but no value found. Line: '{Line}'",
                        mapping.Key, lineText.Length > 60 ? lineText[..60] + "..." : lineText);
                }
                
                break;
            }
            
            if (!anyMatch && hasNumbers && lineText.Length > 10)
            {
                var hasRange = Regex.IsMatch(lineText, @"\d+[.,]?\d*[-–—]\d+[.,]?\d*");
                var isOnlyNumbers = lineWords.All(w => 
                {
                    var t = w.Text.Trim();
                    return !Regex.IsMatch(t, @"[а-яА-ЯёЁ]{3,}");
                }) && (lineText.Length < 50 || hasRange) && hasNumbers;
                
                if (isOnlyNumbers && i > 0)
                {
                    var currentLineY = lineWords.Any() ? lineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                    var avgHeight = lineWords.Any() ? lineWords.Average(w => w.Y2 - w.Y1) : 20;
                    var yTolerance = avgHeight * 10;
                    
                    var candidates = new List<(string Key, double Value, int LookBack, string PrevLine, bool IsSameLine)>();
                    
                    var firstValueX = lineWords.Where(w => w.Text.Any(char.IsDigit) && !Regex.IsMatch(w.Text, @"\d+[.,]?\d*[-–—]\d+[.,]?\d*"))
                        .Select(w => w.X1).DefaultIfEmpty(int.MaxValue).Min();
                    
                    var nameWordsInSameLine = lineWords.Where(w => w.X1 < firstValueX).ToList();
                    if (nameWordsInSameLine.Any())
                    {
                        var sameLineText = string.Join(" ", nameWordsInSameLine.Select(w => w.Text));
                        foreach (var mapping in NameMappings)
                        {
                            if (result.Values.ContainsKey(mapping.Key))
                                continue;
                            
                            bool nameMatches = mapping.Value.Any(pattern =>
                                sameLineText.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                            
                            if (nameMatches)
                            {
                                var value = ExtractNumericValueFromLine(lineWords, mapping.Key, pageWidth);
                                
                                if (value.HasValue && ValidateValue(mapping.Key, value.Value))
                                {
                                    candidates.Add((mapping.Key, value.Value, 0, sameLineText, true));
                                }
                            }
                        }
                    }
                    
                    for (int lookBack = 1; lookBack <= Math.Min(20, i) && candidates.Count < 15; lookBack++)
                    {
                        var prevLineWords = lines[i - lookBack];
                        var prevLineText = string.Join(" ", prevLineWords.Select(w => w.Text));
                        
                        if (IsServiceLine(prevLineText))
                            continue;
                        
                        var prevLineY = prevLineWords.Any() ? prevLineWords.Average(w => (w.Y1 + w.Y2) / 2.0) : 0;
                        var yDiff = Math.Abs(prevLineY - currentLineY);
                        
                        if (yDiff > yTolerance)
                            continue;
                        
                        foreach (var mapping in NameMappings)
                        {
                            if (result.Values.ContainsKey(mapping.Key))
                                continue;
                            
                            bool nameMatches = mapping.Value.Any(pattern =>
                                prevLineText.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                            
                            if (nameMatches)
                            {
                                var value = ExtractNumericValueFromLine(lineWords, mapping.Key, pageWidth);
                                
                                if (value.HasValue && ValidateValue(mapping.Key, value.Value))
                                {
                                    candidates.Add((mapping.Key, value.Value, lookBack, prevLineText, false));
                                }
                            }
                        }
                    }
                    
                    if (candidates.Count > 0)
                    {
                        var best = candidates.OrderBy(c => c.IsSameLine ? 0 : 1)
                            .ThenBy(c => c.LookBack)
                            .ThenBy(c => Math.Abs(c.Value - ExpectedRanges.GetValueOrDefault(c.Key, (0, 1000)).Min))
                            .First();
                        result.Values[best.Key] = best.Value;
                        if (best.IsSameLine)
                        {
                            _logger.LogInformation("Found {Key} = {Value} from value line '{Line}' (name in same line: '{PrevLine}')",
                                best.Key, best.Value,
                                lineText.Length > 30 ? lineText[..30] + "..." : lineText,
                                best.PrevLine.Length > 40 ? best.PrevLine[..40] + "..." : best.PrevLine);
                        }
                        else
                        {
                            _logger.LogInformation("Found {Key} = {Value} from value line '{Line}' (name in line -{LookBack}: '{PrevLine}')",
                                best.Key, best.Value,
                                lineText.Length > 30 ? lineText[..30] + "..." : lineText,
                                best.LookBack,
                                best.PrevLine.Length > 40 ? best.PrevLine[..40] + "..." : best.PrevLine);
                        }
                        anyMatch = true;
                    }
                    else
                    {
                        if (hasRange)
                        {
                            _logger.LogInformation("Number-only line with range '{Line}' didn't match any name. Checked {MaxLookBack} previous lines",
                                lineText.Length > 40 ? lineText[..40] + "..." : lineText,
                                Math.Min(15, i));
                        }
                    }
                }
                
                if (!anyMatch)
                {
                    _logger.LogInformation("Unmatched line: '{Line}'",
                        lineText.Length > 100 ? lineText[..100] + "..." : lineText);
                }
            }
        }
    }

    private double? ExtractNumericValueFromLine(List<OcrWord> lineWords, string key, int pageWidth)
    {
        var numberRegex = new Regex(@"^(\d+[.,]\d+|\d+)$");
        var rangeRegex = new Regex(@"^\d+[.,]?\d*[-–—]\d+[.,]?\d*$");
        
        var candidates = new List<(double Value, int X, float Conf)>();
        
        for (int i = 0; i < lineWords.Count; i++)
        {
            var word = lineWords[i];
            var text = word.Text.Trim();
            
            if (text.Length < 1 || text.Length > 10)
                continue;
            
            if (text.Contains("Выполняется", StringComparison.OrdinalIgnoreCase))
                continue;
            
            if (text.StartsWith("<") || text.StartsWith(">") || 
                text.StartsWith("≤") || text.StartsWith("≥") ||
                text.Contains("<") || text.Contains(">"))
                continue;
            
            if (rangeRegex.IsMatch(text))
                continue;
            
            if (text.Contains("моль") || text.Contains("Ед") || text.Contains("мл") || 
                text.Contains("МЕ") || text.Contains("сек") || text.Contains("г/л") ||
                text.Contains("нг") || (text.Contains("%") && text.Length > 3))
                continue;
            
            if (!numberRegex.IsMatch(text))
                continue;
            
            var valueStr = text.Replace(',', '.');
            if (!double.TryParse(valueStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
                continue;
            
            if (value <= 0)
                continue;
            
            if (i > 0)
            {
                var prevText = lineWords[i - 1].Text.Trim();
                if (prevText is "<" or ">" or "≤" or "≥" || 
                    prevText.StartsWith("<") || prevText.StartsWith(">") ||
                    prevText.StartsWith("≤") || prevText.StartsWith("≥") ||
                    prevText.Equals("менее", StringComparison.OrdinalIgnoreCase) ||
                    prevText.Equals("более", StringComparison.OrdinalIgnoreCase))
                    continue;
            }
            
            if (i + 1 < lineWords.Count)
            {
                var nextText = lineWords[i + 1].Text.Trim();
                if ((nextText.StartsWith("-") || nextText.StartsWith("–") || nextText.StartsWith("—")) &&
                    nextText.Length > 1 && char.IsDigit(nextText[1]))
                    continue;
            }
            
            candidates.Add((value, word.X1, word.Confidence));
        }
        
        if (candidates.Count == 0)
            return null;
        
        var sorted = candidates.OrderBy(c => c.X).ToList();
        
        if (ExpectedRanges.TryGetValue(key, out var range))
        {
            var valid = sorted.FirstOrDefault(c => c.Value >= range.Min && c.Value <= range.Max);
            if (valid != default)
                return valid.Value;
        }
        
        return sorted.First().Value;
    }

    private bool ValidateValue(string key, double value)
    {
        if (!ExpectedRanges.TryGetValue(key, out var range))
            return true;
        
        return value >= range.Min && value <= range.Max;
    }

    private bool IsServiceLine(string text)
    {
        var lower = text.ToLowerInvariant();
        return lower.Contains("наименование исследования") ||
               (lower.Contains("результат") && lower.Contains("референс")) ||
               lower.Contains("ед. изм") ||
               lower.Contains("нормальные значения") ||
               lower.Contains("исследования крови") ||
               lower.Contains("коагулологические") ||
               lower.Contains("биохимические") ||
               lower.Contains("гормоны") && lower.Length < 20 ||
               lower.Contains("направлени") ||
               lower.Contains("фамилия") ||
               lower.Contains("дата рождения") ||
               lower.Contains("kdl") ||
               lower.Contains("медскан") ||
               lower.Contains("не является диагнозом") ||
               lower.Contains("лечащий врач") ||
               lower.Contains("адрес пациента") ||
               lower.Contains("белковые фракции") ||
               lower.Contains("онкомаркеры") && lower.Length < 30 ||
               string.IsNullOrWhiteSpace(text) ||
               text.Length < 3;
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
            
            var processedImage = PreprocessImage(rawBytes, width, height);
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
                    
                    foreach (var mapping in NameMappings)
                    {
                        if (result.Values.ContainsKey(mapping.Key))
                            continue;
                        
                        bool nameMatches = mapping.Value.Any(pattern =>
                            name.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                        
                        if (!nameMatches)
                            continue;
                        
                        if (ValidateValue(mapping.Key, value))
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

    private byte[] PreprocessImage(byte[] bgraBytes, int width, int height)
    {
        var handle = System.Runtime.InteropServices.GCHandle.Alloc(
            bgraBytes, System.Runtime.InteropServices.GCHandleType.Pinned);
        try
        {
            using var mat = new Mat(height, width, MatType.CV_8UC4, handle.AddrOfPinnedObject());
            using var gray = new Mat();
            Cv2.CvtColor(mat, gray, ColorConversionCodes.BGRA2GRAY);
            
            using var clahe = Cv2.CreateCLAHE(2.0, new Size(8, 8));
            using var enhanced = new Mat();
            clahe.Apply(gray, enhanced);
            
            using var binary = new Mat();
            Cv2.AdaptiveThreshold(enhanced, binary, 255,
                AdaptiveThresholdTypes.GaussianC,
                ThresholdTypes.Binary, 15, 8);
            
            Cv2.ImEncode(".png", binary, out var pngBytes);
            return pngBytes;
        }
        finally
        {
            handle.Free();
        }
    }

    private async Task EnsureTessDataAsync(CancellationToken ct)
    {
        var rusFile = Path.Combine(_tessDataPath, "rus.traineddata");
        var engFile = Path.Combine(_tessDataPath, "eng.traineddata");
        
        if (!File.Exists(rusFile) || !File.Exists(engFile))
        {
            _logger.LogInformation("Downloading Tesseract language data...");
            
            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromMinutes(5);
            
            if (!File.Exists(rusFile))
            {
                _logger.LogInformation("Downloading rus.traineddata...");
                var rusData = await httpClient.GetByteArrayAsync(
                    "https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata", ct);
                await File.WriteAllBytesAsync(rusFile, rusData, ct);
            }
            
            if (!File.Exists(engFile))
            {
                _logger.LogInformation("Downloading eng.traineddata...");
                var engData = await httpClient.GetByteArrayAsync(
                    "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata", ct);
                await File.WriteAllBytesAsync(engFile, engData, ct);
            }
        }
    }
}
