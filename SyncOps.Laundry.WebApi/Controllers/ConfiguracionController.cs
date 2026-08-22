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

    // Administrador u operador autorizado puede cambiar los datos de la tienda / negocio
    [HttpPut]
    [Authorize]
    public async Task<ActionResult<ConfiguracionResponse>> Actualizar(ConfiguracionRequest request)
    {
        var config = await _db.Configuracion.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new ConfiguracionNegocio();
            _db.Configuracion.Add(config);
        }

        config.BusinessName = request.BusinessName ?? config.BusinessName;
        config.Rnc = request.Rnc ?? config.Rnc;
        config.Phone = request.Phone ?? config.Phone;
        config.Address = request.Address ?? config.Address;
        config.Email = request.Email ?? config.Email;
        config.PrinterWidth = request.PrinterWidth ?? config.PrinterWidth;
        config.PrinterModel = request.PrinterModel ?? config.PrinterModel;
        config.InvoicePrefix = string.IsNullOrWhiteSpace(request.InvoicePrefix) ? config.InvoicePrefix : request.InvoicePrefix.Trim().ToUpperInvariant();
        if (request.NextInvoiceNumber.HasValue && request.NextInvoiceNumber.Value > 0)
        {
            config.NextInvoiceNumber = request.NextInvoiceNumber.Value;
        }
        config.TicketFooter = request.TicketFooter ?? config.TicketFooter;

        await _db.SaveChangesAsync();
        return Map(config);
    }
}
