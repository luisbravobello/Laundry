using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Domain;
using SyncOps.Laundry.WebApi.DTOs;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/configuracion")]
public class ConfiguracionController : ControllerBase
{
    private readonly AppDbContext _db;
    public ConfiguracionController(AppDbContext db) => _db = db;

    private static ConfiguracionResponse Map(ConfiguracionNegocio c) => new(
        c.BusinessName, c.Rnc, c.Phone, c.Address, c.Email,
        c.PrinterWidth, c.PrinterModel, c.InvoicePrefix, c.NextInvoiceNumber, c.TicketFooter);

    [HttpGet]
    public async Task<ActionResult<ConfiguracionResponse>> Obtener()
    {
        var config = await _db.Configuracion.AsNoTracking().FirstOrDefaultAsync() ?? new ConfiguracionNegocio();
        return Map(config);
    }

    // Solo el administrador puede cambiar los datos fiscales/impresora del negocio.
    [HttpPut]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<ConfiguracionResponse>> Actualizar(ConfiguracionRequest request)
    {
        var config = await _db.Configuracion.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new ConfiguracionNegocio();
            _db.Configuracion.Add(config);
        }

        config.BusinessName = request.BusinessName;
        config.Rnc = request.Rnc;
        config.Phone = request.Phone;
        config.Address = request.Address;
        config.Email = request.Email;
        config.PrinterWidth = request.PrinterWidth;
        config.PrinterModel = request.PrinterModel;
        config.InvoicePrefix = request.InvoicePrefix;
        config.TicketFooter = request.TicketFooter;

        await _db.SaveChangesAsync();
        return Map(config);
    }
}
