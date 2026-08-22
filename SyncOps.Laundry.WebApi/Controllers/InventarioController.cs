using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Domain;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/inventario")]
public class InventarioController : ControllerBase
{
    private readonly AppDbContext _db;
    public InventarioController(AppDbContext db) => _db = db;

    private static InsumoResponse Map(InsumoInventario i) =>
        new(i.Id, i.Codigo, i.Nombre, i.Categoria, i.Stock, i.StockMinimo, i.Unidad, i.Costo, i.Proveedor);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InsumoResponse>>> Listar()
    {
        var insumos = await _db.InsumosInventario.AsNoTracking().OrderBy(i => i.Nombre).ToListAsync();
        return Ok(insumos.Select(Map));
    }

    [HttpPost]
    public async Task<ActionResult<InsumoResponse>> Crear(InsumoRequest request)
    {
        var existe = await _db.InsumosInventario.AnyAsync(i => i.Codigo == request.Codigo);
        if (existe) return Conflict(new { message = "Ya existe un insumo con ese código." });

        var insumo = new InsumoInventario
        {
            Codigo = request.Codigo,
            Nombre = request.Nombre,
            Categoria = request.Categoria,
            Stock = request.Stock,
            StockMinimo = request.StockMinimo,
            Unidad = request.Unidad,
            Costo = request.Costo,
            Proveedor = request.Proveedor ?? string.Empty
        };

        _db.InsumosInventario.Add(insumo);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Listar), null, Map(insumo));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<InsumoResponse>> Actualizar(Guid id, InsumoRequest request)
    {
        var insumo = await _db.InsumosInventario.FirstOrDefaultAsync(i => i.Id == id);
        if (insumo == null) return NotFound();

        insumo.Codigo = request.Codigo;
        insumo.Nombre = request.Nombre;
        insumo.Categoria = request.Categoria;
        insumo.Stock = request.Stock;
        insumo.StockMinimo = request.StockMinimo;
        insumo.Unidad = request.Unidad;
        insumo.Costo = request.Costo;
        insumo.Proveedor = request.Proveedor ?? string.Empty;
        insumo.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Map(insumo);
    }

    [HttpPost("{id:guid}/ajustar-stock")]
    public async Task<ActionResult<InsumoResponse>> AjustarStock(Guid id, AjusteStockRequest request)
    {
        var insumo = await _db.InsumosInventario.FirstOrDefaultAsync(i => i.Id == id);
        if (insumo == null) return NotFound();

        var nuevoStock = insumo.Stock + request.Delta;
        if (nuevoStock < 0) return BadRequest(new { message = "El stock no puede quedar negativo." });

        insumo.Stock = nuevoStock;
        insumo.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(insumo);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var insumo = await _db.InsumosInventario.FirstOrDefaultAsync(i => i.Id == id);
        if (insumo == null) return NotFound();

        _db.InsumosInventario.Remove(insumo);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
