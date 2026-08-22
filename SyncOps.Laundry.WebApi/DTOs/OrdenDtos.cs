using System.ComponentModel.DataAnnotations;
using SyncOps.Laundry.WebApi.Domain;

namespace SyncOps.Laundry.WebApi.DTOs;

public record OrdenItemRequest(
    [Required, MaxLength(200)] string Nombre,
    [Required] string Servicio,
    [Range(0.01, double.MaxValue)] decimal Cantidad,
    [Range(0, double.MaxValue)] decimal Precio,
    string? Color,
    string? Defectos,
    string? Arreglo
);

public record CrearOrdenRequest(
    [Required] Guid ClienteId,
    [Required] DateTime FechaPromesaEntrega,
    bool EsUrgente,
    bool AplicaItbis,
    [Range(0, double.MaxValue)] decimal Descuento,
    [Range(0, double.MaxValue)] decimal MontoPagado,
    MetodoPago MetodoPago,
    [MinLength(1)] List<OrdenItemRequest> Items
);

public record OrdenItemResponse(
    Guid Id, string Nombre, string Servicio, decimal Cantidad,
    decimal Precio, decimal Subtotal, string? Color, string? Defectos, string? Arreglo
);

public record OrdenResponse(
    Guid Id, string Ticket, string CodigoBarras,
    Guid ClienteId, string ClienteNombre, string ClienteTelefono,
    EstadoOrden Estado, EstadoProceso EstadoProceso, DateTime FechaRecepcion, DateTime FechaPromesaEntrega,
    decimal Subtotal, decimal Descuento, decimal ImpuestoItbis, decimal Total, decimal Pagado, decimal Saldo,
    bool EsUrgente, List<OrdenItemResponse> Items
);

public record RegistrarPagoRequest(
    [Range(0.01, double.MaxValue)] decimal Monto,
    MetodoPago MetodoPago
);

public record ActualizarEstadoProcesoRequest(
    [Required] EstadoProceso EstadoProceso
);
