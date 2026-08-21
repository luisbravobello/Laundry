using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class CatalogoPrendaServicio : BaseEntity
{
    public string NombrePrenda { get; set; } = string.Empty; // Ej. Camisa, Pantalón, Vestido de Fiesta, Edredón King, Mantel Hotel
    public string CategoriaPrenda { get; set; } = string.Empty; // Ej. Ropa Casual, Ropa Formal, Ropa de Cama, Mantelería, Piel/Gamuza
    public TipoServicio TipoServicio { get; set; }
    public decimal PrecioSugerido { get; set; }
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
    public string Icono { get; set; } = "TShirt";
}
