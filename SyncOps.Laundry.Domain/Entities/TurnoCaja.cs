using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class TurnoCaja : BaseEntity
{
    public string CajeroUsuario { get; set; } = "Cajero Principal";
    public DateTime FechaHoraApertura { get; set; } = DateTime.Now;
    public decimal FondoInicialEfectivo { get; set; } = 3000;
    
    public DateTime? FechaHoraCierre { get; set; }
    public decimal? TotalEfectivoDeclarado { get; set; }
    public decimal? TotalMonedasDeclarado { get; set; }
    public decimal? TotalTarjetaCalculado { get; set; }
    public decimal? TotalTransferenciaCalculado { get; set; }
    public decimal? DiferenciaArqueo { get; set; }
    
    public EstadoTurnoCaja Estado { get; set; } = EstadoTurnoCaja.Abierto;
    public string? ObservacionesCierre { get; set; }

    public ICollection<TransaccionCaja> Transacciones { get; set; } = new List<TransaccionCaja>();
}
