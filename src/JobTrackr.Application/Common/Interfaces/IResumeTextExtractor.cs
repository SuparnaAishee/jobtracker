namespace JobTrackr.Application.Common.Interfaces;

public interface IResumeTextExtractor
{
    /// <summary>
    /// Extract plain text from a resume file. Throws InvalidOperationException
    /// if the content type is not supported.
    /// </summary>
    Task<string> ExtractAsync(Stream content, string contentType, CancellationToken ct = default);
}
