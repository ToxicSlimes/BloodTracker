using System.Globalization;
using System.Text.RegularExpressions;
using BloodTracker.Application.Common;
using Microsoft.Extensions.Logging;
using Tesseract;

namespace BloodTracker.Infrastructure.Services;

internal sealed class OcrPdfParser
{
    private readonly ILogger _logger;
    private readonly string _tessDataPath;
    private const float MinConfidence = 60f;

    public sealed record OcrWord(string Text, int X1, int Y1, int X2, int Y2, float Confidence);

    public OcrPdfParser(ILogger logger, string tessDataPath)
    {
        _logger = logger;
        _tessDataPath = tessDataPath;
    }

    public async Task EnsureTessDataAsync(CancellationToken ct)
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

    public List<OcrWord> ExtractWordsFromPage(TesseractEngine engine, byte[] imageBytes, int pageNumber)
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

    public List<List<OcrWord>> GroupWordsIntoLines(List<OcrWord> words)
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

    public void ProcessPageLines(List<List<OcrWord>> lines, PdfAnalysisResult result, int pageWidth)
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
            
            foreach (var mapping in BloodTestNameMapper.NameMappings)
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
                                if (testValue.HasValue && BloodTestNameMapper.ValidateValue(mapping.Key, testValue.Value))
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
                                if (testValue.HasValue && BloodTestNameMapper.ValidateValue(mapping.Key, testValue.Value))
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
                    if (BloodTestNameMapper.ValidateValue(mapping.Key, value.Value))
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
                        foreach (var mapping in BloodTestNameMapper.NameMappings)
                        {
                            if (result.Values.ContainsKey(mapping.Key))
                                continue;
                            
                            bool nameMatches = mapping.Value.Any(pattern =>
                                sameLineText.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                            
                            if (nameMatches)
                            {
                                var value = ExtractNumericValueFromLine(lineWords, mapping.Key, pageWidth);
                                
                                if (value.HasValue && BloodTestNameMapper.ValidateValue(mapping.Key, value.Value))
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
                        
                        foreach (var mapping in BloodTestNameMapper.NameMappings)
                        {
                            if (result.Values.ContainsKey(mapping.Key))
                                continue;
                            
                            bool nameMatches = mapping.Value.Any(pattern =>
                                prevLineText.Contains(pattern, StringComparison.OrdinalIgnoreCase));
                            
                            if (nameMatches)
                            {
                                var value = ExtractNumericValueFromLine(lineWords, mapping.Key, pageWidth);
                                
                                if (value.HasValue && BloodTestNameMapper.ValidateValue(mapping.Key, value.Value))
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
                            .ThenBy(c => Math.Abs(c.Value - BloodTestNameMapper.ExpectedRanges.GetValueOrDefault(c.Key, (0, 1000)).Min))
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
        
        if (BloodTestNameMapper.ExpectedRanges.TryGetValue(key, out var range))
        {
            var valid = sorted.FirstOrDefault(c => c.Value >= range.Min && c.Value <= range.Max);
            if (valid != default)
                return valid.Value;
        }
        
        return sorted.First().Value;
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
}
