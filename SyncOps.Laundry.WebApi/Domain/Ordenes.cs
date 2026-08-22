namespace SyncOps.Laundry.WebApi.Domain;

public enum EstadoOrden
{
    Pendiente,
    Pagada
}

public enum MetodoPago
{
    Efectivo,
    Tarjeta,
    Transferencia,
    MonedasFichas
}

public class OrdenServicio : BaseEntity
{
    public string Ticket { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;

    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }

    public EstadoOrden Estado { get; set; } = EstadoOrden.Pendiente;
    public DateTime FechaRecepcion { get; set; } = DateTime.UtcNow;
    public DateTime FechaPromesaEntrega { get; set; }

    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Total { get; set; }
    public decimal Pagado { get; set; }
    public decimal Saldo => Math.Max(0, Total - Pagado);

    public bool EsUrgente { get; set; }
    public string? AtendidoPor { get; set; }

    public ICollection<OrdenItem> Items { get; set; } = new List<OrdenItem>();
}

public class OrdenItem : BaseEntity
{
    public Guid OrdenServicioId { get; set; }
    public OrdenServicio? OrdenServicio { get; set; }

    public string Nombre { get; set; } = string.Empty;
    public string Servicio { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal Precio { get; set; }
    public decimal Subtotal { get; set; }
    public string? Color { get; set; }
    public string? Defectos { get; set; }
    public string? Arreglo { get; set; } // sastrería: tipo + medidas
}
