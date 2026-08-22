using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Domain;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/clientes")]
public class ClientesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ClientesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClienteResponse>>> Listar([FromQuery] string? busqueda)
    {
        var query = _db.Clientes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            query = query.Where(c => c.Nombre.Contains(busqueda) || c.Telefono.Contains(busqueda));
        }

        var clientes = await query
            .OrderBy(c => c.Nombre)
            .Select(c => new ClienteResponse(c.Id, c.Nombre, c.Telefono, c.EsHotel, c.Saldo, c.LimiteCredito, c.CantidadOrdenes))
            .ToListAsync();

        return Ok(clientes);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClienteResponse>> Obtener(Guid id)
    {
        var c = await _db.Clientes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return NotFound();
        return new ClienteResponse(c.Id, c.Nombre, c.Telefono, c.EsHotel, c.Saldo, c.LimiteCredito, c.CantidadOrdenes);
    }

    [HttpPost]
    public async Task<ActionResult<ClienteResponse>> Crear(ClienteRequest request)
    {
        var cliente = new Cliente
        {
            Nombre = request.Nombre,
            Telefono = request.Telefono,
            EsHotel = request.EsHotel,
            LimiteCredito = request.LimiteCredito
        };

        _db.Clientes.Add(cliente);
        await _db.SaveChangesAsync();

        var response = new ClienteResponse(cliente.Id, cliente.Nombre, cliente.Telefono, cliente.EsHotel, cliente.Saldo, cliente.LimiteCredito, cliente.CantidadOrdenes);
        return CreatedAtAction(nameof(Obtener), new { id = cliente.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ClienteResponse>> Actualizar(Guid id, ClienteRequest request)
    {
        var cliente = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id);
        if (cliente == null) return NotFound();

        cliente.Nombre = request.Nombre;
        cliente.Telefono = request.Telefono;
        cliente.EsHotel = request.EsHotel;
        cliente.LimiteCredito = request.LimiteCredito;
        cliente.FechaModificacion = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return new ClienteResponse(cliente.Id, cliente.Nombre, cliente.Telefono, cliente.EsHotel, cliente.Saldo, cliente.LimiteCredito, cliente.CantidadOrdenes);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var cliente = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id);
        if (cliente == null) return NotFound();

        var tieneOrdenes = await _db.OrdenesServicio.AnyAsync(o => o.ClienteId == id);
        if (tieneOrdenes)
        {
            return Conflict(new { message = "No se puede eliminar: el cliente tiene órdenes registradas." });
        }

        _db.Clientes.Remove(cliente);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
