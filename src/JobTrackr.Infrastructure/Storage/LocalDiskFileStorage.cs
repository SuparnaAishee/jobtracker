using JobTrackr.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace JobTrackr.Infrastructure.Storage;

public class LocalDiskFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalDiskFileStorage(IConfiguration configuration)
    {
        _root = configuration["Storage:Root"] ?? "/var/jobtrackr/uploads";
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Stream content, string originalFileName, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(originalFileName);
        var key = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(_root, key);

        await using var fs = File.Create(path);
        await content.CopyToAsync(fs, ct);
        return key;
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        var path = Path.Combine(_root, storageKey);
        if (!File.Exists(path)) throw new FileNotFoundException(storageKey);
        Stream stream = File.OpenRead(path);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var path = Path.Combine(_root, storageKey);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }
}
