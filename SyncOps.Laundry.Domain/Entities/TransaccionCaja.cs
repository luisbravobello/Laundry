using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class TransaccionCaja : BaseEntity
{
    public Guid TurnoCajaId { get; set; }
    public TurnoCaja? TurnoCaja { get; set; }

    public Guid? OrdenServicioId { get; set; }
    public OrdenServicio? OrdenServicio { get; set; }

    public TipoTransaccionCaja TipoTransaccion { get; set; }
    public MetodoPago MetodoPago { get; set; }
    public decimal Monto { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string? ReferenciaComprobante { get; set; } // Número de voucher o transferencia
    public string? ClienteNombre { get; set; }
}
