namespace JobTrackr.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string originalFileName, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct = default);
    Task DeleteAsync(string storageKey, CancellationToken ct = default);
}
