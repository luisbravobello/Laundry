using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
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
}
