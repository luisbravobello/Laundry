namespace SyncOps.Laundry.WebApi.Domain;

// Fila única (siempre Id = 1). Guarda los datos que hoy viven en
// state.config dentro de localStorage.
public class ConfiguracionNegocio
{
    public int Id { get; set; } = 1;
    public string BusinessName { get; set; } = "SyncOps Laundry & Tailoring Suite";
    public string Rnc { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PrinterWidth { get; set; } = "80mm";
    public string PrinterModel { get; set; } = "epson-t20ii";
    public string InvoicePrefix { get; set; } = "FAC";
    public int NextInvoiceNumber { get; set; } = 1001;
    public string TicketFooter { get; set; } = string.Empty;
}
