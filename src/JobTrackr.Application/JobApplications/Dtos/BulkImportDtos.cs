namespace JobTrackr.Application.JobApplications.Dtos;

/// <summary>A batch of job applications to import (e.g. parsed from a spreadsheet).</summary>
public record BulkImportRequest(IReadOnlyList<CreateJobApplicationRequest> Items);

/// <summary>Validation failures for a single row, keyed by its zero-based position in the batch.</summary>
public record BulkImportRowError(int Index, IReadOnlyList<string> Errors);

/// <summary>Outcome of a bulk import: valid rows are saved, invalid rows are reported.</summary>
public record BulkImportResult(
    int Total,
    int Created,
    int Failed,
    IReadOnlyList<BulkImportRowError> Errors);
