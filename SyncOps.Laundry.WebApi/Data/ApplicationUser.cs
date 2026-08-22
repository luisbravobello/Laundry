using Microsoft.AspNetCore.Identity;

namespace SyncOps.Laundry.WebApi.Data;

// Identity ya maneja el hash de contraseña (PBKDF2), el email, lockout por
// intentos fallidos, etc. Aquí solo agregamos los campos propios del negocio.
public class ApplicationUser : IdentityUser
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Tienda { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
