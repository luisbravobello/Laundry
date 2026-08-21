using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Ordenes.Queries;

public record GetOrdenesQuery(EstadoOrden? EstadoFiltro = null, string? TerminoBusqueda = null) : IRequest<List<OrdenServicioDto>>;

public class GetOrdenesQueryHandler : IRequestHandler<GetOrdenesQuery, List<OrdenServicioDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrdenesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrdenServicioDto>> Handle(GetOrdenesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.OrdenesServicio
            .Include(o => o.Cliente)
            .Include(o => o.Items)
                .ThenInclude(i => i.Sastreria)
            .AsQueryable();

        if (request.EstadoFiltro.HasValue)
        {
            query = query.Where(o => o.Estado == request.EstadoFiltro.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.TerminoBusqueda))
        {
            var term = request.TerminoBusqueda.Trim().ToLower();
            query = query.Where(o => 
                o.NumeroTicket.ToLower().Contains(term) ||
                o.CodigoBarras.Contains(term) ||
                (o.Cliente != null && o.Cliente.NombreCompleto.ToLower().Contains(term)) ||
                (o.Cliente != null && o.Cliente.Telefono.Contains(term)));
        }

        var list = await query
            .OrderByDescending(o => o.FechaRecepcion)
            .ToListAsync(cancellationToken);

        return list.Select(o => new OrdenServicioDto
        {
            Id = o.Id,
            NumeroTicket = o.NumeroTicket,
            CodigoBarras = o.CodigoBarras,
            ClienteId = o.ClienteId,
            ClienteNombre = o.Cliente?.NombreCompleto ?? "Cliente Mostrador",
            ClienteTelefono = o.Cliente?.Telefono ?? "",
            ClienteEsHotel = o.Cliente?.EsCorporativoHotel ?? false,
            Estado = o.Estado,
            FechaRecepcion = o.FechaRecepcion,
            FechaPromesaEntrega = o.FechaPromesaEntrega,
            FechaEntregaReal = o.FechaEntregaReal,
            Subtotal = o.Subtotal,
            Descuento = o.Descuento,
            Total = o.Total,
            TotalAbonado = o.TotalAbonado,
            EsUrgente = o.EsUrgente,
            ObservacionesRecepcion = o.ObservacionesRecepcion,
            AtendidoPor = o.AtendidoPor,
            Items = o.Items.Select(i => new DetalleOrdenItemDto
            {
                Id = i.Id,
                PrendaDescripcion = i.PrendaDescripcion,
                TipoServicio = i.TipoServicio,
                Cantidad = i.Cantidad,
                PesoKg = i.PesoKg,
                PrecioUnitario = i.PrecioUnitario,
                ColorPrenda = i.ColorPrenda,
                MarcaOEtiqueta = i.MarcaOEtiqueta,
                DefectosPrevios = i.DefectosPrevios,
                UbicacionEstante = i.UbicacionEstante,
                EstadoItem = i.EstadoItem,
                Sastreria = i.Sastreria == null ? null : new DetalleSastreriaDto
                {
                    Id = i.Sastreria.Id,
                    TipoArreglo = i.Sastreria.TipoArreglo,
                    MedidasEspecificas = i.Sastreria.MedidasEspecificas,
                    ObservacionesTaller = i.Sastreria.ObservacionesTaller,
                    SastreAsignado = i.Sastreria.SastreAsignado
                }
            }).ToList()
        }).ToList();
    }
}

public record GetCatalogosQuery : IRequest<List<CatalogoPrendaServicioDto>>;

public class GetCatalogosQueryHandler : IRequestHandler<GetCatalogosQuery, List<CatalogoPrendaServicioDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCatalogosQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CatalogoPrendaServicioDto>> Handle(GetCatalogosQuery request, CancellationToken cancellationToken)
    {
        return await _context.CatalogoPrendas
            .Where(c => c.Activo)
            .OrderBy(c => c.CategoriaPrenda)
            .ThenBy(c => c.NombrePrenda)
            .Select(c => new CatalogoPrendaServicioDto
            {
                Id = c.Id,
                NombrePrenda = c.NombrePrenda,
                CategoriaPrenda = c.CategoriaPrenda,
                TipoServicio = c.TipoServicio,
                PrecioSugerido = c.PrecioSugerido,
                Descripcion = c.Descripcion,
                Icono = c.Icono
            })
            .ToListAsync(cancellationToken);
    }
}
