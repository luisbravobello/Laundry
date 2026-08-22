using SyncOps.Laundry.WebApi.Data;

namespace SyncOps.Laundry.WebApi.Services;

public record TokenPair(string AccessToken, DateTime AccessTokenExpiraUtc, string RefreshToken, DateTime RefreshTokenExpiraUtc);

public interface ITokenService
{
    string GenerarAccessToken(ApplicationUser usuario, IList<string> roles, out DateTime expiraUtc);
    (string tokenPlano, RefreshToken entidad) GenerarRefreshToken(string userId, string? ip);
    string HashToken(string tokenPlano);
}
