using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class MaquinaAutoservicio : BaseEntity
{
    public string CodigoIdentificador { get; set; } = string.Empty; // Ej. "TORRE-01", "TORRE-02", "IND-LAV-01", "IND-SEC-01"
    public string NombreDescriptivo { get; set; } = string.Empty; // Ej. "Torre Speed Queen Lavadora/Secadora #1"
    public TipoMaquina Tipo { get; set; }
    public EstadoMaquina Estado { get; set; } = EstadoMaquina.Disponible;

    public decimal CapacidadLibras { get; set; } = 30; // Ej. 30 lbs para torre, 75-100 lbs para industrial
    public decimal PrecioPorCicloMonedas { get; set; } = 150; // Costo en DOP por ficha/monedas
    public int CantidadMonedasPorCiclo { get; set; } = 3; // Ej. 3 fichas por ciclo
    public int DuracionCicloMinutos { get; set; } = 40;

    public DateTime? HoraInicioCicloActual { get; set; }
    public int MinutosRestantes => Estado == EstadoMaquina.EnCiclo && HoraInicioCicloActual.HasValue
        ? Math.Max(0, DuracionCicloMinutos - (int)(DateTime.Now - HoraInicioCicloActual.Value).TotalMinutes)
        : 0;

    public int TotalCiclosHistoricos { get; set; }
    public decimal RecaudacionCajetinActual { get; set; } // Dinero acumulado en el cajetín de monedas pendiente de vaciar
    public DateTime? UltimoMantenimiento { get; set; }
    public string? NotasOperativas { get; set; }
}
