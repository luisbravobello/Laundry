using SyncOps.Laundry.WebApi.Domain;

namespace SyncOps.Laundry.WebApi.DTOs;

public record MovimientoCajaResponse(
    Guid Id, DateTime FechaCreacion, string Tipo, string Concepto,
    MetodoPago Metodo, decimal Monto
);

public record ConfiguracionRequest(
    string BusinessName, string Rnc, string Phone, string Address,
    string Email, string PrinterWidth, string PrinterModel,
    string InvoicePrefix, string TicketFooter
);

public record ConfiguracionResponse(
    string BusinessName, string Rnc, string Phone, string Address,
    string Email, string PrinterWidth, string PrinterModel,
    string InvoicePrefix, int NextInvoiceNumber, string TicketFooter
);
