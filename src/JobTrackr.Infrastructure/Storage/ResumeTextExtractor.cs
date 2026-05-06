using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using JobTrackr.Application.Common.Interfaces;
using UglyToad.PdfPig;

namespace JobTrackr.Infrastructure.Storage;

public class ResumeTextExtractor : IResumeTextExtractor
{
    public async Task<string> ExtractAsync(Stream content, string contentType, CancellationToken ct = default)
    {
        // Buffer once so PDF/DOCX libraries that need seekable streams can rewind.
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        ms.Position = 0;

        return contentType.ToLowerInvariant() switch
        {
            "application/pdf" => ExtractPdf(ms),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ExtractDocx(ms),
            "text/plain" or "text/markdown" => Encoding.UTF8.GetString(ms.ToArray()).Trim(),
            _ => throw new InvalidOperationException(
                $"Cannot extract text from content type '{contentType}'. Supported: PDF, DOCX, TXT, MD.")
        };
    }

    private static string ExtractPdf(MemoryStream ms)
    {
        using var pdf = PdfDocument.Open(ms);
        var sb = new StringBuilder();
        foreach (var page in pdf.GetPages())
        {
            sb.AppendLine(page.Text);
            sb.AppendLine();
        }
        return sb.ToString().Trim();
    }

    private static string ExtractDocx(MemoryStream ms)
    {
        using var doc = WordprocessingDocument.Open(ms, isEditable: false);
        var body = doc.MainDocumentPart?.Document.Body;
        if (body is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var paragraph in body.Descendants<Paragraph>())
        {
            sb.AppendLine(paragraph.InnerText);
        }
        return sb.ToString().Trim();
    }
}
