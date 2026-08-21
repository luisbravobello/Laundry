using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Dashboard.Queries;

public record GetDashboardDataQuery : IRequest<DashboardMetricasDto>;

public class GetDashboardDataQueryHandler : IRequestHandler<GetDashboardDataQuery, DashboardMetricasDto>
{
    private readonly IApplicationDbContext _context;

    public GetDashboardDataQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardMetricasDto> Handle(GetDashboardDataQuery request, CancellationToken cancellationToken)
    {
        var hoy = DateTime.Today;
        
        var transaccionesHoy = await _context.TransaccionesCaja
            .Where(t => t.FechaCreacion >= hoy)
            .ToListAsync(cancellationToken);

        var ventasHoy = transaccionesHoy
            .Where(t => t.TipoTransaccion != TipoTransaccionCaja.AperturaTurno && t.TipoTransaccion != TipoTransaccionCaja.GastoOperativo)
            .Sum(t => t.Monto);

        var ordenesPendientes = await _context.OrdenesServicio
            .CountAsync(o => o.Estado != EstadoOrden.Entregado && o.Estado != EstadoOrden.Cancelado, cancellationToken);

        var prendasEnTaller = await _context.DetalleOrdenItems
            .CountAsync(i => i.EstadoItem == EstadoOrden.EnLavado || i.EstadoItem == EstadoOrden.EnSastreria || i.EstadoItem == EstadoOrden.EnPlanchado, cancellationToken);

        var maquinas = await _context.MaquinasAutoservicio.ToListAsync(cancellationToken);
        var maquinasEnUso = maquinas.Count(m => m.Estado == EstadoMaquina.EnCiclo);
        var maquinasDisponibles = maquinas.Count(m => m.Estado == EstadoMaquina.Disponible);

        var insumosBajoStock = await _context.InsumosInventario
            .Where(i => i.StockActual <= i.StockMinimoAlerta)
            .Select(i => new InsumoInventarioDto
            {
                Id = i.Id,
                CodigoBarras = i.CodigoBarras,
                NombreInsumo = i.NombreInsumo,
                Categoria = i.Categoria,
                StockActual = i.StockActual,
                StockMinimoAlerta = i.StockMinimoAlerta,
                UnidadMedida = i.UnidadMedida,
                ProveedorPrincipal = i.ProveedorPrincipal
            })
            .ToListAsync(cancellationToken);

        var saldoHoteles = await _context.Clientes
            .Where(c => c.EsCorporativoHotel)
            .SumAsync(c => c.SaldoPendiente, cancellationToken);

        var ultimasOrdenesEntities = await _context.OrdenesServicio
            .Include(o => o.Cliente)
            .Include(o => o.Items)
            .OrderByDescending(o => o.FechaRecepcion)
            .Take(6)
            .ToListAsync(cancellationToken);

        var ultimasOrdenes = ultimasOrdenesEntities.Select(o => new OrdenServicioDto
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
            Total = o.Total,
            TotalAbonado = o.TotalAbonado,
            EsUrgente = o.EsUrgente
        }).ToList();

        return new DashboardMetricasDto
        {
            VentasHoy = ventasHoy,
            OrdenesPendientes = ordenesPendientes,
            PrendasEnTaller = prendasEnTaller,
            MaquinasEnUso = maquinasEnUso,
            MaquinasDisponibles = maquinasDisponibles,
            AlertasInsumosBajoStock = insumosBajoStock.Count,
            SaldoPendienteCobroHoteles = saldoHoteles,
            UltimasOrdenes = ultimasOrdenes,
            InsumosCriticos = insumosBajoStock
        };
    }
}
