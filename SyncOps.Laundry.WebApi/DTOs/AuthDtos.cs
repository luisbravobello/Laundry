using System.ComponentModel.DataAnnotations;

namespace SyncOps.Laundry.WebApi.DTOs;

public record RegisterRequest(
    [Required, MaxLength(120)] string NombreCompleto,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    string? Tienda
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiraUtc,
    string NombreCompleto,
    string Email
);

public record UsuarioActualResponse(
    string Id,
    string NombreCompleto,
    string Email,
    IEnumerable<string> Roles
);

public record ActualizarPerfilRequest(
    [Required, MaxLength(120)] string NombreCompleto
);

// Alta de personal adicional (cajeros/empleados) — solo un Administrador
// puede llamarla. A diferencia de /register, esta NO exige que no exista
// nadie todavía: es la forma de agregar cuentas después del arranque.
public record CrearUsuarioRequest(
    [Required, MaxLength(120)] string NombreCompleto,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string Rol // "Administrador" o "Empleado"
);

public record UsuarioListItemResponse(
    string Id,
    string NombreCompleto,
    string Email,
    IEnumerable<string> Roles,
    bool Bloqueado
);

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required, EmailAddress] string Email,
    [Required] string Token,
    [Required, MinLength(8)] string NuevaPassword
);
