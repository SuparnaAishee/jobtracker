using JobTrackr.Application.Resumes.Dtos;

namespace JobTrackr.Application.Resumes.Services;

public interface IResumeService
{
    Task<IReadOnlyList<ResumeDto>> ListAsync(CancellationToken ct = default);
    Task<ResumeDto> UploadAsync(UploadResumeMetadata metadata, CancellationToken ct = default);
    Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid id, CancellationToken ct = default);
    Task<string> GetTextAsync(Guid id, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
