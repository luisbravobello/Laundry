namespace SyncOps.Laundry.WebApi.Email;

public interface IEmailSender
{
    Task EnviarAsync(string destinatario, string asunto, string cuerpoHtml);
}
