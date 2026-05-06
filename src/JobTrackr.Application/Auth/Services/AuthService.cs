using FluentValidation;
using JobTrackr.Application.Auth.Dtos;
using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using UnauthorizedException = JobTrackr.Application.Common.Exceptions.UnauthorizedException;
using ValidationException = JobTrackr.Application.Common.Exceptions.ValidationException;

namespace JobTrackr.Application.Auth.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;

    public AuthService(
        IApplicationDbContext db,
        IPasswordHasher hasher,
        IJwtTokenService jwt,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator)
    {
        _db = db;
        _hasher = hasher;
        _jwt = jwt;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var validation = await _registerValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var emailNormalized = request.Email.Trim().ToLowerInvariant();

        var exists = await _db.Users.AnyAsync(u => u.Email == emailNormalized, ct);
        if (exists)
            throw new ValidationException(new[]
            {
                new FluentValidation.Results.ValidationFailure(nameof(request.Email), "Email is already registered.")
            });

        var user = new User
        {
            Email = emailNormalized,
            PasswordHash = _hasher.Hash(request.Password),
            DisplayName = request.DisplayName.Trim()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return BuildResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var validation = await _loginValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var emailNormalized = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailNormalized, ct);

        if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        return BuildResponse(user);
    }

    private AuthResponse BuildResponse(User user) =>
        new(_jwt.CreateToken(user), _jwt.GetExpiryUtc(), user.Id, user.Email, user.DisplayName);
}
