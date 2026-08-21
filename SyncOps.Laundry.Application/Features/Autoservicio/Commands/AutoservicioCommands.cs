using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Autoservicio.Commands;

public record IniciarCicloMaquinaCommand(Guid MaquinaId, int DuracionMinutos) : IRequest<bool>;

public class IniciarCicloMaquinaCommandHandler : IRequestHandler<IniciarCicloMaquinaCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public IniciarCicloMaquinaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(IniciarCicloMaquinaCommand request, CancellationToken cancellationToken)
    {
        var maquina = await _context.MaquinasAutoservicio.FindAsync(new object[] { request.MaquinaId }, cancellationToken);
        if (maquina == null) return false;

        maquina.Estado = EstadoMaquina.EnCiclo;
        maquina.HoraInicioCicloActual = DateTime.Now;
        maquina.DuracionCicloMinutos = request.DuracionMinutos > 0 ? request.DuracionMinutos : maquina.DuracionCicloMinutos;
        maquina.TotalCiclosHistoricos += 1;
        maquina.RecaudacionCajetinActual += maquina.PrecioPorCicloMonedas;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public record RecaudarMonedasCommand(Guid MaquinaId) : IRequest<decimal>;

public class RecaudarMonedasCommandHandler : IRequestHandler<RecaudarMonedasCommand, decimal>
{
    private readonly IApplicationDbContext _context;

    public RecaudarMonedasCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> Handle(RecaudarMonedasCommand request, CancellationToken cancellationToken)
    {
        var maquina = await _context.MaquinasAutoservicio.FindAsync(new object[] { request.MaquinaId }, cancellationToken);
        if (maquina == null) return 0;

        var montoRecaudado = maquina.RecaudacionCajetinActual;
        maquina.RecaudacionCajetinActual = 0;

        var turnoAbierto = await _context.TurnosCaja
            .OrderByDescending(t => t.FechaHoraApertura)
            .FirstOrDefaultAsync(t => t.Estado == EstadoTurnoCaja.Abierto, cancellationToken);

        if (turnoAbierto != null && montoRecaudado > 0)
        {
            var trans = new TransaccionCaja
            {
                TurnoCajaId = turnoAbierto.Id,
                TipoTransaccion = TipoTransaccionCaja.VentaFichas,
                MetodoPago = MetodoPago.MonedasFichas,
                Monto = montoRecaudado,
                Concepto = $"Vaciado / Recaudación Monedas Cajetín {maquina.CodigoIdentificador}"
            };
            _context.TransaccionesCaja.Add(trans);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return montoRecaudado;
    }
}

public record VenderFichasMonedasCommand(int CantidadFichas, decimal PrecioUnitario, MetodoPago MetodoPago, string? ClienteNombre) : IRequest<bool>;

public class VenderFichasMonedasCommandHandler : IRequestHandler<VenderFichasMonedasCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public VenderFichasMonedasCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(VenderFichasMonedasCommand request, CancellationToken cancellationToken)
    {
        var total = request.CantidadFichas * request.PrecioUnitario;
        if (total <= 0) return false;

        var turnoAbierto = await _context.TurnosCaja
            .OrderByDescending(t => t.FechaHoraApertura)
            .FirstOrDefaultAsync(t => t.Estado == EstadoTurnoCaja.Abierto, cancellationToken);

        if (turnoAbierto != null)
        {
            var trans = new TransaccionCaja
            {
                TurnoCajaId = turnoAbierto.Id,
                TipoTransaccion = TipoTransaccionCaja.VentaFichas,
                MetodoPago = request.MetodoPago,
                Monto = total,
                Concepto = $"Venta de {request.CantidadFichas} Monedas/Fichas de Autoservicio",
                ClienteNombre = request.ClienteNombre
            };
            _context.TransaccionesCaja.Add(trans);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        return false;
    }
}
