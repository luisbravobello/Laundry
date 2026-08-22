using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/caja")]
public class CajaController : ControllerBase
{
    private readonly AppDbContext _db;
    public CajaController(AppDbContext db) => _db = db;

    [HttpGet("movimientos")]
    public async Task<ActionResult<IEnumerable<MovimientoCajaResponse>>> Listar(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta)
    {
        var query = _db.MovimientosCaja.AsNoTracking().AsQueryable();

        if (desde.HasValue) query = query.Where(m => m.FechaCreacion >= desde);
        if (hasta.HasValue) query = query.Where(m => m.FechaCreacion <= hasta);

        var movimientos = await query
            .OrderByDescending(m => m.FechaCreacion)
            .Select(m => new MovimientoCajaResponse(m.Id, m.FechaCreacion, m.Tipo, m.Concepto, m.Metodo, m.Monto))
            .ToListAsync();

        return Ok(movimientos);
    }

    [HttpGet("resumen-hoy")]
    public async Task<ActionResult> ResumenHoy()
    {
        var hoy = DateTime.UtcNow.Date;
        var movimientosHoy = await _db.MovimientosCaja.AsNoTracking()
            .Where(m => m.FechaCreacion >= hoy)
            .ToListAsync();

        var totalPorMetodo = movimientosHoy
            .GroupBy(m => m.Metodo)
            .ToDictionary(g => g.Key.ToString(), g => g.Sum(m => m.Monto));

        return Ok(new
        {
            totalDelDia = movimientosHoy.Sum(m => m.Monto),
            porMetodoPago = totalPorMetodo,
            cantidadTransacciones = movimientosHoy.Count
        });
    }
}
