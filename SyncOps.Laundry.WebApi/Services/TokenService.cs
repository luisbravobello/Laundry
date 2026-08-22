using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SyncOps.Laundry.WebApi.Data;

namespace SyncOps.Laundry.WebApi.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerarAccessToken(ApplicationUser usuario, IList<string> roles, out DateTime expiraUtc)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "Falta configurar Jwt:Key. Usa 'dotnet user-secrets set \"Jwt:Key\" \"<valor>\"' en desarrollo.");

        var minutos = _config.GetValue<int>("Jwt:AccessTokenMinutes", 15);
        expiraUtc = DateTime.UtcNow.AddMinutes(minutos);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id),
            new(JwtRegisteredClaimNames.Email, usuario.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("nombre", usuario.NombreCompleto),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiraUtc,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string tokenPlano, RefreshToken entidad) GenerarRefreshToken(string userId, string? ip)
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var tokenPlano = Convert.ToBase64String(bytes);
        var dias = _config.GetValue<int>("Jwt:RefreshTokenDays", 7);

        var entidad = new RefreshToken
        {
            UserId = userId,
            TokenHash = HashToken(tokenPlano),
            FechaExpiracion = DateTime.UtcNow.AddDays(dias),
            IpOrigen = ip
        };

        return (tokenPlano, entidad);
    }

    public string HashToken(string tokenPlano)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(tokenPlano));
        return Convert.ToHexString(bytes);
    }
}
