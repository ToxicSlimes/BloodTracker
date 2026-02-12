using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Middleware;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation Failed"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Bad Request"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden"),
            OperationCanceledException => (StatusCodes.Status499ClientClosedRequest, "Client Closed Request"),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
        else
            logger.LogWarning("Handled exception ({StatusCode}): {Message}", statusCode, exception.Message);

        httpContext.Response.StatusCode = statusCode;
        
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        };

        if (exception is ValidationException validationException)
        {
            problemDetails.Extensions["errors"] = validationException.Errors
                .Select(e => new { e.PropertyName, e.ErrorMessage })
                .ToList();
        }

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
