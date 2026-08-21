using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class OrdenServicio : BaseEntity
{
    public string NumeroTicket { get; set; } = string.Empty; // Ej. "LAV-1048" o "SAS-209"
    public string CodigoBarras { get; set; } = string.Empty; // Para escanear con pistola POS
    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }

    public EstadoOrden Estado { get; set; } = EstadoOrden.Recibido;
    public DateTime FechaRecepcion { get; set; } = DateTime.Now;
    public DateTime FechaPromesaEntrega { get; set; } = DateTime.Now.AddDays(1);
    public DateTime? FechaEntregaReal { get; set; }

    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal ImpuestoITBIS { get; set; }
    public decimal Total { get; set; }
    public decimal TotalAbonado { get; set; }
    public decimal SaldoPendiente => Total - TotalAbonado;

    public bool EsUrgente { get; set; }
    public string? ObservacionesRecepcion { get; set; }
    public string? AtendidoPor { get; set; }

    public ICollection<DetalleOrdenItem> Items { get; set; } = new List<DetalleOrdenItem>();
    public ICollection<TransaccionCaja> Pagos { get; set; } = new List<TransaccionCaja>();
}
