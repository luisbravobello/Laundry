using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class DetalleOrdenItem : BaseEntity
{
    public Guid OrdenServicioId { get; set; }
    public OrdenServicio? OrdenServicio { get; set; }

    public string PrendaDescripcion { get; set; } = string.Empty;
    public TipoServicio TipoServicio { get; set; }
    public int Cantidad { get; set; } = 1;
    public decimal PesoKg { get; set; } // Para hoteles y lotes industriales
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal => Cantidad > 0 && PesoKg > 0 ? PesoKg * PrecioUnitario : Cantidad * PrecioUnitario;
    public string? ColorPrenda { get; set; }
    public string? MarcaOEtiqueta { get; set; }
    public string? DefectosPrevios { get; set; } // Ej. Botón faltante, manchas preexistentes
    public string? UbicacionEstante { get; set; } // Ej. G-04, E-12 (Gancho/Estante)
    public EstadoOrden EstadoItem { get; set; } = EstadoOrden.Recibido;

    // Relación opcional si es un servicio de sastrería
    public DetalleSastreria? Sastreria { get; set; }
}
