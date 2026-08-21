using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Domain.Entities;

public class InsumoInventario : BaseEntity
{
    public string CodigoBarras { get; set; } = string.Empty;
    public string NombreInsumo { get; set; } = string.Empty; // Ej. Detergente Líquido Industrial, Suavizante Aroma Fresco, Ganchos de Alambre 16", Fundas Plásticas Rollo 1000m, Cremalleras Jeans 15cm
    public CategoriaInsumo Categoria { get; set; }
    public string UnidadMedida { get; set; } = "Unidades"; // Galón, Litro, Kilo, Rollo, Caja, Unidades

    public decimal StockActual { get; set; }
    public decimal StockMinimoAlerta { get; set; }
    public decimal CostoUnitarioCompra { get; set; }
    public decimal? PrecioVentaDirecta { get; set; } // Si se vende al cliente en autoservicio (ej. sobrecitos de jabón)

    public bool EstaBajoStockMinimo => StockActual <= StockMinimoAlerta;
    public string? ProveedorPrincipal { get; set; }
    public DateTime? FechaUltimoReabastecimiento { get; set; }
}
