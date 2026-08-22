namespace SyncOps.Laundry.WebApi.Email;

// Implementación SOLO para desarrollo local: no envía nada por red, imprime
// el contenido en la consola donde corre "dotnet run". Así el flujo de
// recuperación de contraseña es real de punta a punta (token real de
// Identity, expira, se invalida al usarse) sin necesitar credenciales de
// un proveedor de correo todavía.
//
// Para producción: implementa IEmailSender con un proveedor real (SendGrid,
// SES, SMTP, etc.) y regístralo en Program.cs en vez de este. El resto del
// código (AuthController) no cambia nada.
public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;

    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger)
    {
        _logger = logger;
    }

    public Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml)
    {
        _logger.LogWarning(
            "\n========== CORREO (MODO DESARROLLO — NO SE ENVIÓ REALMENTE) ==========\n" +
            "Para: {Destinatario}\nAsunto: {Asunto}\n{Cuerpo}\n" +
            "========================================================================",
            destinatario, asunto, cuerpoHtml);

        return Task.CompletedTask;
    }
}
