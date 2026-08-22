namespace SyncOps.Laundry.WebApi.Domain;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? FechaModificacion { get; set; }
}

// Catálogo de precios — de solo lectura para el POS, editable solo por admin.
public class CatalogoServicio : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty; // Lavandería, Sastrería, Autoservicio
    public string Servicio { get; set; } = string.Empty;
    public decimal Precio { get; set; }
    public bool Activo { get; set; } = true;
}

public class Cliente : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public bool EsHotel { get; set; }
    public decimal Saldo { get; set; }
    public decimal LimiteCredito { get; set; }
    public int CantidadOrdenes { get; set; }

    public ICollection<OrdenServicio> Ordenes { get; set; } = new List<OrdenServicio>();
}

public class InsumoInventario : BaseEntity
{
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public decimal Stock { get; set; }
    public decimal StockMinimo { get; set; }
    public string Unidad { get; set; } = string.Empty;
    public decimal Costo { get; set; }
    public string Proveedor { get; set; } = string.Empty;
}
