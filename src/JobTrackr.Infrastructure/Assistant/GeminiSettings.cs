namespace JobTrackr.Infrastructure.Assistant;

public class GeminiSettings
{
    public const string SectionName = "Gemini";

    public string? ApiKey { get; set; }
    public List<string> ApiKeys { get; set; } = new();
    public string Model { get; set; } = "gemini-2.5-flash";
    public int MaxOutputTokens { get; set; } = 1500;
    public double Temperature { get; set; } = 0.7;
}
