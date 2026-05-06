using JobTrackr.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;

namespace JobTrackr.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var (status, problem) = ex switch
        {
            ValidationException vex => (
                HttpStatusCode.BadRequest,
                new ValidationProblemDetails(vex.Errors)
                {
                    Title = "Validation failed",
                    Status = (int)HttpStatusCode.BadRequest,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
                } as ProblemDetails),
            NotFoundException => (
                HttpStatusCode.NotFound,
                new ProblemDetails
                {
                    Title = "Resource not found",
                    Detail = ex.Message,
                    Status = (int)HttpStatusCode.NotFound,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4"
                }),
            UnauthorizedException => (
                HttpStatusCode.Unauthorized,
                new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = ex.Message,
                    Status = (int)HttpStatusCode.Unauthorized,
                    Type = "https://tools.ietf.org/html/rfc7235#section-3.1"
                }),
            _ => (
                HttpStatusCode.InternalServerError,
                new ProblemDetails
                {
                    Title = "An unexpected error occurred",
                    Status = (int)HttpStatusCode.InternalServerError,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1"
                })
        };

        if (status == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
        else
            _logger.LogWarning(ex, "Handled exception: {Type}", ex.GetType().Name);

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)status;

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, options));
    }
}
