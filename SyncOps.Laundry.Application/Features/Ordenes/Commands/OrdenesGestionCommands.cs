using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Ordenes.Commands;

public record ActualizarEstadoOrdenCommand(Guid OrdenId, EstadoOrden NuevoEstado, string? NuevaUbicacionEstante = null) : IRequest<bool>;

public class ActualizarEstadoOrdenCommandHandler : IRequestHandler<ActualizarEstadoOrdenCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ActualizarEstadoOrdenCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ActualizarEstadoOrdenCommand request, CancellationToken cancellationToken)
    {
        var orden = await _context.OrdenesServicio
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.OrdenId, cancellationToken);

        if (orden == null) return false;

        orden.Estado = request.NuevoEstado;
        if (request.NuevoEstado == EstadoOrden.Entregado)
        {
            orden.FechaEntregaReal = DateTime.Now;
        }

        foreach (var item in orden.Items)
        {
            item.EstadoItem = request.NuevoEstado;
            if (!string.IsNullOrWhiteSpace(request.NuevaUbicacionEstante))
            {
                item.UbicacionEstante = request.NuevaUbicacionEstante;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public record RegistrarPagoOrdenCommand(Guid OrdenId, decimal Monto, MetodoPago MetodoPago, string? Referencia) : IRequest<bool>;

public class RegistrarPagoOrdenCommandHandler : IRequestHandler<RegistrarPagoOrdenCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public RegistrarPagoOrdenCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(RegistrarPagoOrdenCommand request, CancellationToken cancellationToken)
    {
        var orden = await _context.OrdenesServicio
            .Include(o => o.Cliente)
            .FirstOrDefaultAsync(o => o.Id == request.OrdenId, cancellationToken);

        if (orden == null) return false;

        var montoAPagar = Math.Min(orden.SaldoPendiente, request.Monto);
        if (montoAPagar <= 0) return true;

        orden.TotalAbonado += montoAPagar;

        if (orden.Cliente != null && orden.Cliente.EsCorporativoHotel && orden.Cliente.SaldoPendiente >= montoAPagar)
        {
            orden.Cliente.SaldoPendiente -= montoAPagar;
        }

        var turnoAbierto = await _context.TurnosCaja
            .OrderByDescending(t => t.FechaHoraApertura)
            .FirstOrDefaultAsync(t => t.Estado == EstadoTurnoCaja.Abierto, cancellationToken);

        if (turnoAbierto != null)
        {
            var trans = new TransaccionCaja
            {
                TurnoCajaId = turnoAbierto.Id,
                OrdenServicioId = orden.Id,
                TipoTransaccion = TipoTransaccionCaja.CobroOrden,
                MetodoPago = request.MetodoPago,
                Monto = montoAPagar,
                Concepto = $"Liquidación/Pago Ticket {orden.NumeroTicket}",
                ReferenciaComprobante = request.Referencia,
                ClienteNombre = orden.Cliente?.NombreCompleto
            };
            _context.TransaccionesCaja.Add(trans);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
