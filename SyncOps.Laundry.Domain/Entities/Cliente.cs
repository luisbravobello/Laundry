namespace SyncOps.Laundry.Domain.Entities;

public class Cliente : BaseEntity
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? RNC { get; set; }
    public string? Direccion { get; set; }
    public bool EsCorporativoHotel { get; set; }
    public decimal SaldoPendiente { get; set; }
    public decimal LimiteCredito { get; set; }
    public string? Notas { get; set; }

    public ICollection<OrdenServicio> Ordenes { get; set; } = new List<OrdenServicio>();
}
