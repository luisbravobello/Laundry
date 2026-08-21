using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Inventario;

public record AjustarStockCommand(Guid InsumoId, decimal CantidadDelta, string Motivo) : IRequest<bool>;

public class AjustarStockCommandHandler : IRequestHandler<AjustarStockCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public AjustarStockCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(AjustarStockCommand request, CancellationToken cancellationToken)
    {
        var insumo = await _context.InsumosInventario.FindAsync(new object[] { request.InsumoId }, cancellationToken);
        if (insumo == null) return false;

        insumo.StockActual += request.CantidadDelta;
        if (insumo.StockActual < 0) insumo.StockActual = 0;
        if (request.CantidadDelta > 0)
        {
            insumo.FechaUltimoReabastecimiento = DateTime.Now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public record GuardarInsumoCommand(
    Guid? Id,
    string CodigoBarras,
    string NombreInsumo,
    CategoriaInsumo Categoria,
    string UnidadMedida,
    decimal StockActual,
    decimal StockMinimoAlerta,
    decimal CostoUnitarioCompra,
    decimal? PrecioVentaDirecta,
    string? ProveedorPrincipal
) : IRequest<InsumoInventarioDto>;

public class GuardarInsumoCommandHandler : IRequestHandler<GuardarInsumoCommand, InsumoInventarioDto>
{
    private readonly IApplicationDbContext _context;

    public GuardarInsumoCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InsumoInventarioDto> Handle(GuardarInsumoCommand request, CancellationToken cancellationToken)
    {
        InsumoInventario? insumo = null;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            insumo = await _context.InsumosInventario.FindAsync(new object[] { request.Id.Value }, cancellationToken);
        }

        if (insumo == null)
        {
            insumo = new InsumoInventario();
            _context.InsumosInventario.Add(insumo);
        }

        insumo.CodigoBarras = request.CodigoBarras;
        insumo.NombreInsumo = request.NombreInsumo;
        insumo.Categoria = request.Categoria;
        insumo.UnidadMedida = request.UnidadMedida;
        insumo.StockActual = request.StockActual;
        insumo.StockMinimoAlerta = request.StockMinimoAlerta;
        insumo.CostoUnitarioCompra = request.CostoUnitarioCompra;
        insumo.PrecioVentaDirecta = request.PrecioVentaDirecta;
        insumo.ProveedorPrincipal = request.ProveedorPrincipal;

        await _context.SaveChangesAsync(cancellationToken);

        return new InsumoInventarioDto
        {
            Id = insumo.Id,
            CodigoBarras = insumo.CodigoBarras,
            NombreInsumo = insumo.NombreInsumo,
            Categoria = insumo.Categoria,
            UnidadMedida = insumo.UnidadMedida,
            StockActual = insumo.StockActual,
            StockMinimoAlerta = insumo.StockMinimoAlerta,
            CostoUnitarioCompra = insumo.CostoUnitarioCompra,
            PrecioVentaDirecta = insumo.PrecioVentaDirecta,
            ProveedorPrincipal = insumo.ProveedorPrincipal
        };
    }
}

public record GetInsumosQuery : IRequest<List<InsumoInventarioDto>>;

public class GetInsumosQueryHandler : IRequestHandler<GetInsumosQuery, List<InsumoInventarioDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInsumosQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InsumoInventarioDto>> Handle(GetInsumosQuery request, CancellationToken cancellationToken)
    {
        return await _context.InsumosInventario
            .OrderBy(i => i.Categoria)
            .ThenBy(i => i.NombreInsumo)
            .Select(i => new InsumoInventarioDto
            {
                Id = i.Id,
                CodigoBarras = i.CodigoBarras,
                NombreInsumo = i.NombreInsumo,
                Categoria = i.Categoria,
                UnidadMedida = i.UnidadMedida,
                StockActual = i.StockActual,
                StockMinimoAlerta = i.StockMinimoAlerta,
                CostoUnitarioCompra = i.CostoUnitarioCompra,
                PrecioVentaDirecta = i.PrecioVentaDirecta,
                ProveedorPrincipal = i.ProveedorPrincipal
            })
            .ToListAsync(cancellationToken);
    }
}
