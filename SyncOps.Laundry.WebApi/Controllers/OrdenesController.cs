using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Domain;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/ordenes")]
public class OrdenesController : ControllerBase
{
    private readonly AppDbContext _db;
    public OrdenesController(AppDbContext db) => _db = db;

    private static OrdenResponse Map(OrdenServicio o) => new(
        o.Id, o.Ticket, o.CodigoBarras, o.ClienteId, o.Cliente?.Nombre ?? string.Empty, o.Cliente?.Telefono ?? string.Empty,
        o.Estado, o.EstadoProceso, o.FechaRecepcion, o.FechaPromesaEntrega, o.Subtotal, o.Descuento, o.ImpuestoItbis, o.Total, o.Pagado, o.Saldo, o.EsUrgente,
        o.Items.Select(i => new OrdenItemResponse(i.Id, i.Nombre, i.Servicio, i.Cantidad, i.Precio, i.Subtotal, i.Color, i.Defectos, i.Arreglo)).ToList()
    );

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrdenResponse>>> Listar([FromQuery] EstadoOrden? estado, [FromQuery] EstadoProceso? estadoProceso, [FromQuery] string? busqueda)
    {
        var query = _db.OrdenesServicio.AsNoTracking().Include(o => o.Cliente).Include(o => o.Items).AsQueryable();

        if (estado.HasValue) query = query.Where(o => o.Estado == estado);
        if (estadoProceso.HasValue) query = query.Where(o => o.EstadoProceso == estadoProceso);
        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            query = query.Where(o => o.Ticket.Contains(busqueda) || (o.Cliente != null && o.Cliente.Nombre.Contains(busqueda)));
        }

        var ordenes = await query.OrderByDescending(o => o.FechaRecepcion).ToListAsync();
        return Ok(ordenes.Select(Map));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrdenResponse>> Obtener(Guid id)
    {
        var orden = await _db.OrdenesServicio.AsNoTracking()
            .Include(o => o.Cliente).Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        return orden == null ? NotFound() : Map(orden);
    }

    [HttpPost]
    public async Task<ActionResult<OrdenResponse>> Crear(CrearOrdenRequest request)
    {
        var cliente = await _db.Clientes.FirstOrDefaultAsync(c => c.Id == request.ClienteId);
        if (cliente == null) return BadRequest(new { message = "El cliente especificado no existe." });

        // Todos los montos se recalculan aquí, nunca se confía en lo que
        // mande el cliente por precio/subtotal — evita manipulación del
        // payload desde el navegador.
        var items = request.Items.Select(i => new OrdenItem
        {
            Nombre = i.Nombre,
            Servicio = i.Servicio,
            Cantidad = i.Cantidad,
            Precio = i.Precio,
            Subtotal = i.Cantidad * i.Precio,
            Color = i.Color,
            Defectos = i.Defectos,
            Arreglo = i.Arreglo
        }).ToList();

        var subtotal = items.Sum(i => i.Subtotal);
        var recargoUrgente = request.EsUrgente ? subtotal * 0.15m : 0;
        // ITBIS (18%) se calcula sobre la base ya con recargo de urgencia y
        // descuento aplicados — nunca sobre el subtotal bruto.
        var baseImponible = Math.Max(0, subtotal + recargoUrgente - request.Descuento);
        var itbis = request.AplicaItbis ? baseImponible * 0.18m : 0;
        var total = baseImponible + itbis;
        var pagado = Math.Min(total, request.MontoPagado);

        // Numeración atómica: se lee y se incrementa el consecutivo dentro
        // de la misma transacción que crea la orden, con un reintento si
        // otra petición ganó la carrera (choque contra el índice único).
        const int maxIntentos = 3;
        for (var intento = 1; intento <= maxIntentos; intento++)
        {
            await using var transaccion = await _db.Database.BeginTransactionAsync();
            try
            {
                var config = await _db.Configuracion.FirstOrDefaultAsync();
                var esConfigNueva = config == null;
                config ??= new ConfiguracionNegocio();
                if (esConfigNueva)
                {
                    _db.Configuracion.Add(config);
                }

                var numero = config.NextInvoiceNumber;
                var ticket = $"{config.InvoicePrefix}-{numero:D6}";
                var barcode = $"{DateTime.UtcNow:yyyyMMdd}{numero:D6}";

                var orden = new OrdenServicio
                {
                    Ticket = ticket,
                    CodigoBarras = barcode,
                    ClienteId = cliente.Id,
                    FechaPromesaEntrega = request.FechaPromesaEntrega,
                    EsUrgente = request.EsUrgente,
                    Subtotal = subtotal,
                    Descuento = request.Descuento,
                    ImpuestoItbis = itbis,
                    Total = total,
                    Pagado = pagado,
                    Estado = pagado >= total ? EstadoOrden.Pagada : EstadoOrden.Pendiente,
                    AtendidoPor = User.Identity?.Name,
                    Items = items
                };

                config.NextInvoiceNumber = numero + 1;
                cliente.CantidadOrdenes += 1;
                if (orden.Saldo > 0 && cliente.EsHotel)
                {
                    cliente.Saldo += orden.Saldo;
                }

                _db.OrdenesServicio.Add(orden);

                if (pagado > 0)
                {
                    _db.MovimientosCaja.Add(new MovimientoCaja
                    {
                        Tipo = "Cobro Factura",
                        Concepto = $"Pago Factura {ticket} ({cliente.Nombre})",
                        Metodo = request.MetodoPago,
                        Monto = pagado,
                        OrdenServicioId = orden.Id,
                        RegistradoPor = User.Identity?.Name
                    });
                }

                await _db.SaveChangesAsync();
                await transaccion.CommitAsync();

                var creada = await _db.OrdenesServicio.AsNoTracking()
                    .Include(o => o.Cliente).Include(o => o.Items)
                    .FirstAsync(o => o.Id == orden.Id);

                return CreatedAtAction(nameof(Obtener), new { id = orden.Id }, Map(creada));
            }
            catch (DbUpdateException) when (intento < maxIntentos)
            {
                await transaccion.RollbackAsync();
                // Otra orden tomó el mismo número de ticket en paralelo: se reintenta.
            }
        }

        return Conflict(new { message = "No se pudo generar un número de ticket único. Intenta de nuevo." });
    }

    [HttpPost("{id:guid}/pagos")]
    public async Task<ActionResult<OrdenResponse>> RegistrarPago(Guid id, RegistrarPagoRequest request)
    {
        var orden = await _db.OrdenesServicio.Include(o => o.Cliente).Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (orden == null) return NotFound();

        var montoAplicado = Math.Min(request.Monto, orden.Saldo);
        if (montoAplicado <= 0) return BadRequest(new { message = "La orden ya está totalmente pagada." });

        orden.Pagado += montoAplicado;
        orden.FechaModificacion = DateTime.UtcNow;
        if (orden.Saldo == 0) orden.Estado = EstadoOrden.Pagada;

        if (orden.Cliente is { EsHotel: true })
        {
            orden.Cliente.Saldo = Math.Max(0, orden.Cliente.Saldo - montoAplicado);
        }

        _db.MovimientosCaja.Add(new MovimientoCaja
        {
            Tipo = "Abono Factura",
            Concepto = $"Abono Factura {orden.Ticket}",
            Metodo = request.MetodoPago,
            Monto = montoAplicado,
            OrdenServicioId = orden.Id,
            RegistradoPor = User.Identity?.Name
        });

        await _db.SaveChangesAsync();
        return Map(orden);
    }

    [HttpPatch("{id:guid}/estado-proceso")]
    [HttpPut("{id:guid}/estado-proceso")]
    public async Task<ActionResult<OrdenResponse>> ActualizarEstadoProceso(Guid id, ActualizarEstadoProcesoRequest request)
    {
        var orden = await _db.OrdenesServicio.Include(o => o.Cliente).Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (orden == null) return NotFound(new { message = "Orden no encontrada." });

        orden.EstadoProceso = request.EstadoProceso;
        orden.FechaModificacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(Map(orden));
    }
}
