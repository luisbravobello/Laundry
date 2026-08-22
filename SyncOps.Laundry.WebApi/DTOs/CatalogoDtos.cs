using System.ComponentModel.DataAnnotations;

namespace SyncOps.Laundry.WebApi.DTOs;

public record ClienteRequest(
    [Required, MaxLength(150)] string Nombre,
    [Required, MaxLength(30)] string Telefono,
    bool EsHotel,
    decimal LimiteCredito
);

public record ClienteResponse(
    Guid Id, string Nombre, string Telefono, bool EsHotel,
    decimal Saldo, decimal LimiteCredito, int CantidadOrdenes
);

public record InsumoRequest(
    [Required, MaxLength(40)] string Codigo,
    [Required, MaxLength(150)] string Nombre,
    [Required] string Categoria,
    decimal Stock,
    decimal StockMinimo,
    [Required] string Unidad,
    decimal Costo,
    string? Proveedor
);

public record InsumoResponse(
    Guid Id, string Codigo, string Nombre, string Categoria,
    decimal Stock, decimal StockMinimo, string Unidad, decimal Costo, string Proveedor
);

public record AjusteStockRequest(decimal Delta);

public record CatalogoResponse(Guid Id, string Nombre, string Categoria, string Servicio, decimal Precio);
