namespace SyncOps.Laundry.WebApi.Data;

// Guardamos el HASH del refresh token, nunca el valor en texto plano.
// Así, aunque alguien acceda a la base de datos, no puede reconstruir
// tokens válidos.
public class RefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaExpiracion { get; set; }
    public bool Revocado { get; set; }
    public string? IpOrigen { get; set; }

    public bool EstaVigente => !Revocado && FechaExpiracion > DateTime.UtcNow;
}
