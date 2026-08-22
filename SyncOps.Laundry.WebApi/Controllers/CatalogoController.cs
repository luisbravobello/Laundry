using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Domain;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/catalogo")]
public class CatalogoController : ControllerBase
{
    private readonly AppDbContext _db;
    public CatalogoController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CatalogoResponse>>> Listar()
    {
        var items = await _db.CatalogoServicios
            .AsNoTracking()
            .Where(c => c.Activo)
            .OrderBy(c => c.Categoria).ThenBy(c => c.Nombre)
            .Select(c => new CatalogoResponse(c.Id, c.Nombre, c.Categoria, c.Servicio, c.Precio))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CatalogoResponse>> Obtener(Guid id)
    {
        var c = await _db.CatalogoServicios.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.Activo);
        if (c == null) return NotFound();
        return new CatalogoResponse(c.Id, c.Nombre, c.Categoria, c.Servicio, c.Precio);
    }

    [HttpPost]
    public async Task<ActionResult<CatalogoResponse>> Crear(CatalogoItemRequest request)
    {
        var item = new CatalogoServicio
        {
            Nombre = request.Nombre.Trim(),
            Categoria = request.Categoria.Trim(),
            Servicio = string.IsNullOrWhiteSpace(request.Servicio) ? request.Categoria.Trim() : request.Servicio.Trim(),
            Precio = request.Precio,
            Activo = true
        };

        _db.CatalogoServicios.Add(item);
        await _db.SaveChangesAsync();

        var response = new CatalogoResponse(item.Id, item.Nombre, item.Categoria, item.Servicio, item.Precio);
        return CreatedAtAction(nameof(Obtener), new { id = item.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CatalogoResponse>> Actualizar(Guid id, CatalogoItemRequest request)
    {
        var item = await _db.CatalogoServicios.FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return NotFound();

        item.Nombre = request.Nombre.Trim();
        item.Categoria = request.Categoria.Trim();
        item.Servicio = string.IsNullOrWhiteSpace(request.Servicio) ? request.Categoria.Trim() : request.Servicio.Trim();
        item.Precio = request.Precio;
        item.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return new CatalogoResponse(item.Id, item.Nombre, item.Categoria, item.Servicio, item.Precio);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var item = await _db.CatalogoServicios.FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return NotFound();

        item.Activo = false;
        item.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
