namespace JobTrackr.Application.Resumes.Dtos;

public record ResumeDto(
    Guid Id,
    string Label,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    DateTime CreatedAt);

public record UploadResumeMetadata(
    string Label,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    Stream Content);
