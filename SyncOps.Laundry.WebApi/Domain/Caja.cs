namespace SyncOps.Laundry.WebApi.Domain;

public class MovimientoCaja : BaseEntity
{
    public string Tipo { get; set; } = string.Empty; // ej. "Cobro Factura"
    public string Concepto { get; set; } = string.Empty;
    public MetodoPago Metodo { get; set; }
    public decimal Monto { get; set; }

    public Guid? OrdenServicioId { get; set; }
    public string? RegistradoPor { get; set; }
}
