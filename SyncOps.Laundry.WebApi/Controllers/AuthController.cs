using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.DTOs;
using SyncOps.Laundry.WebApi.Email;
using SyncOps.Laundry.WebApi.Services;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ITokenService _tokenService;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IEmailSender _emailSender;

    private const string CookieRefresh = "syncops_refresh";

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        ITokenService tokenService,
        AppDbContext db,
        IConfiguration config,
        IEmailSender emailSender)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _tokenService = tokenService;
        _db = db;
        _config = config;
        _emailSender = emailSender;
    }

    // Registro abierto SOLO si todavía no existe ningún usuario (arranque del
    // sistema). Una vez creado el primer administrador, este endpoint queda
    // bloqueado — coincide con el flujo que ya usas en StaffCoreRD.
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var yaExisteAlguien = _userManager.Users.Any();
        if (yaExisteAlguien)
        {
            return Conflict(new { message = "Ya existe un administrador registrado. Inicia sesión." });
        }

        var usuario = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            NombreCompleto = request.NombreCompleto,
            Tienda = request.Tienda
        };

        var resultado = await _userManager.CreateAsync(usuario, request.Password);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { errors = resultado.Errors.Select(e => e.Description) });
        }

        if (!await _roleManager.RoleExistsAsync("Administrador"))
        {
            await _roleManager.CreateAsync(new IdentityRole("Administrador"));
        }
        await _userManager.AddToRoleAsync(usuario, "Administrador");

        return await EmitirTokens(usuario);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario == null)
        {
            // Mensaje genérico: nunca revelar si el email existe o no.
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var resultado = await _signInManager.CheckPasswordSignInAsync(usuario, request.Password, lockoutOnFailure: true);

        if (resultado.IsLockedOut)
        {
            return StatusCode(StatusCodes.Status423Locked,
                new { message = "Cuenta bloqueada temporalmente por múltiples intentos fallidos." });
        }

        if (!resultado.Succeeded)
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        return await EmitirTokens(usuario);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        if (!Request.Cookies.TryGetValue(CookieRefresh, out var tokenPlano) || string.IsNullOrEmpty(tokenPlano))
        {
            return Unauthorized(new { message = "No hay sesión activa." });
        }

        var hash = _tokenService.HashToken(tokenPlano);
        var almacenado = _db.RefreshTokens.FirstOrDefault(r => r.TokenHash == hash);

        if (almacenado == null || !almacenado.EstaVigente)
        {
            return Unauthorized(new { message = "Sesión expirada. Inicia sesión de nuevo." });
        }

        var usuario = await _userManager.FindByIdAsync(almacenado.UserId);
        if (usuario == null)
        {
            return Unauthorized();
        }

        // Rotación: el refresh token usado queda revocado de inmediato.
        almacenado.Revocado = true;

        return await EmitirTokens(usuario);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(CookieRefresh, out var tokenPlano) && !string.IsNullOrEmpty(tokenPlano))
        {
            var hash = _tokenService.HashToken(tokenPlano);
            var almacenado = _db.RefreshTokens.FirstOrDefault(r => r.TokenHash == hash);
            if (almacenado != null)
            {
                almacenado.Revocado = true;
                await _db.SaveChangesAsync();
            }
        }

        Response.Cookies.Delete(CookieRefresh);
        return NoContent();
    }

    // Limitado a 3 solicitudes cada 15 minutos por IP (configurado en
    // Program.cs) — sin esto, cualquiera podría usar este endpoint para
    // bombardear de correos a una cuenta ajena.
    [HttpPost("forgot-password")]
    [EnableRateLimiting("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var usuario = await _userManager.FindByEmailAsync(request.Email);

        // Mismo mensaje exista o no la cuenta: si respondiéramos distinto,
        // cualquiera podría usar este endpoint para averiguar qué correos
        // están registrados en el sistema (enumeración de cuentas).
        const string mensaje = "Si el correo está registrado, se envió un enlace para restablecer la contraseña.";

        if (usuario != null)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(usuario);
            var tokenCodificado = Uri.EscapeDataString(token);
            var origen = _config["ClientOrigin"] ?? "https://localhost:5501";
            var enlace = $"{origen}/reset-password.html?email={Uri.EscapeDataString(usuario.Email!)}&token={tokenCodificado}";

            await _emailSender.EnviarAsync(
                usuario.Email!,
                "Restablece tu contraseña — SyncOps Laundry",
                $"Hola {usuario.NombreCompleto}, haz clic para restablecer tu contraseña (válido 30 minutos):<br/><a href=\"{enlace}\">{enlace}</a>");
        }

        return Ok(new { message = mensaje });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario == null)
        {
            // Mismo mensaje genérico que si el token fuera inválido — no
            // revela si el correo existe.
            return BadRequest(new { message = "El enlace es inválido o expiró. Solicita uno nuevo." });
        }

        var resultado = await _userManager.ResetPasswordAsync(usuario, request.Token, request.NuevaPassword);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { message = "El enlace es inválido o expiró. Solicita uno nuevo." });
        }

        // Cambiar la contraseña invalida TODAS las sesiones activas de este
        // usuario — si alguien más tenía un refresh token robado, deja de
        // servirle en cuanto el dueño real recupera el acceso.
        var tokensActivos = _db.RefreshTokens.Where(r => r.UserId == usuario.Id && !r.Revocado);
        foreach (var t in tokensActivos) t.Revocado = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Contraseña actualizada. Ya puedes iniciar sesión con la nueva." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioActualResponse>> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        var usuario = userId == null ? null : await _userManager.FindByIdAsync(userId);
        if (usuario == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(usuario);
        return new UsuarioActualResponse(usuario.Id, usuario.NombreCompleto, usuario.Email ?? string.Empty, roles);
    }

    // Solo el nombre es editable por ahora. El email se deja fuera a
    // propósito: cambiarlo en Identity implica reconfirmarlo (si no, cualquiera
    // podría "robar" una cuenta cambiando el email a uno que controle) — se
    // deja para cuando se agregue el flujo de confirmación por correo.
    [HttpPut("perfil")]
    [Authorize]
    public async Task<ActionResult<UsuarioActualResponse>> ActualizarPerfil(ActualizarPerfilRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        var usuario = userId == null ? null : await _userManager.FindByIdAsync(userId);
        if (usuario == null) return Unauthorized();

        usuario.NombreCompleto = request.NombreCompleto;
        await _userManager.UpdateAsync(usuario);

        var roles = await _userManager.GetRolesAsync(usuario);
        return new UsuarioActualResponse(usuario.Id, usuario.NombreCompleto, usuario.Email ?? string.Empty, roles);
    }

    // Alta de personal (cajeros, etc.). Solo un Administrador puede crear
    // cuentas nuevas — a diferencia de /register, aquí SÍ puede haber
    // usuarios existentes; de hecho lo normal es que ya haya al menos uno
    // (el admin que está creando la cuenta).
    [HttpPost("usuarios")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<UsuarioActualResponse>> CrearUsuario(CrearUsuarioRequest request)
    {
        if (request.Rol is not ("Administrador" or "Empleado"))
        {
            return BadRequest(new { message = "El rol debe ser 'Administrador' o 'Empleado'." });
        }

        var usuario = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            NombreCompleto = request.NombreCompleto
        };

        var resultado = await _userManager.CreateAsync(usuario, request.Password);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { errors = resultado.Errors.Select(e => e.Description) });
        }

        if (!await _roleManager.RoleExistsAsync(request.Rol))
        {
            await _roleManager.CreateAsync(new IdentityRole(request.Rol));
        }
        await _userManager.AddToRoleAsync(usuario, request.Rol);

        return new UsuarioActualResponse(usuario.Id, usuario.NombreCompleto, usuario.Email ?? string.Empty, new[] { request.Rol });
    }

    // Lista de todo el personal con acceso al sistema. Solo Administrador.
    [HttpGet("usuarios")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<IEnumerable<UsuarioListItemResponse>>> ListarUsuarios()
    {
        var usuarios = _userManager.Users.OrderBy(u => u.NombreCompleto).ToList();
        var resultado = new List<UsuarioListItemResponse>();

        foreach (var u in usuarios)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var bloqueado = await _userManager.IsLockedOutAsync(u);
            resultado.Add(new UsuarioListItemResponse(u.Id, u.NombreCompleto, u.Email ?? string.Empty, roles, bloqueado));
        }

        return Ok(resultado);
    }

    // Revoca el acceso sin borrar la cuenta ni su historial (órdenes
    // atendidas, etc. quedan intactas — solo deja de poder iniciar sesión).
    [HttpPost("usuarios/{id}/bloquear")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> BloquearUsuario(string id)
    {
        var usuario = await _userManager.FindByIdAsync(id);
        if (usuario == null) return NotFound();

        var idAdminActual = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (usuario.Id == idAdminActual)
        {
            return BadRequest(new { message = "No puedes bloquear tu propia cuenta." });
        }

        usuario.LockoutEnabled = true;
        await _userManager.SetLockoutEndDateAsync(usuario, DateTimeOffset.MaxValue);
        return NoContent();
    }

    [HttpPost("usuarios/{id}/desbloquear")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> DesbloquearUsuario(string id)
    {
        var usuario = await _userManager.FindByIdAsync(id);
        if (usuario == null) return NotFound();

        await _userManager.SetLockoutEndDateAsync(usuario, null);
        await _userManager.ResetAccessFailedCountAsync(usuario);
        return NoContent();
    }

    private async Task<ActionResult<AuthResponse>> EmitirTokens(ApplicationUser usuario)
    {
        var roles = await _userManager.GetRolesAsync(usuario);
        var accessToken = _tokenService.GenerarAccessToken(usuario, roles, out var accessExpiraUtc);
        var (refreshPlano, refreshEntidad) = _tokenService.GenerarRefreshToken(
            usuario.Id, HttpContext.Connection.RemoteIpAddress?.ToString());

        _db.RefreshTokens.Add(refreshEntidad);
        await _db.SaveChangesAsync();

        // httpOnly: JavaScript no puede leer esta cookie (mitiga robo por XSS).
        // Secure: solo viaja por HTTPS. SameSite=Strict: no se envía en
        // navegación cross-site.
        Response.Cookies.Append(CookieRefresh, refreshPlano, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = refreshEntidad.FechaExpiracion,
            Path = "/api/auth"
        });

        return new AuthResponse(accessToken, accessExpiraUtc, usuario.NombreCompleto, usuario.Email ?? string.Empty);
    }
}
