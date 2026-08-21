using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Caja;

public record AbrirTurnoCajaCommand(string CajeroUsuario, decimal FondoInicial) : IRequest<TurnoCajaDto>;

public class AbrirTurnoCajaCommandHandler : IRequestHandler<AbrirTurnoCajaCommand, TurnoCajaDto>
{
    private readonly IApplicationDbContext _context;

    public AbrirTurnoCajaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TurnoCajaDto> Handle(AbrirTurnoCajaCommand request, CancellationToken cancellationToken)
    {
        // Verificar si ya hay uno abierto
        var abierto = await _context.TurnosCaja
            .FirstOrDefaultAsync(t => t.Estado == EstadoTurnoCaja.Abierto, cancellationToken);

        if (abierto != null)
        {
            throw new InvalidOperationException("Ya existe un turno de caja abierto.");
        }

        var turno = new TurnoCaja
        {
            CajeroUsuario = request.CajeroUsuario,
            FechaHoraApertura = DateTime.Now,
            FondoInicialEfectivo = request.FondoInicial,
            Estado = EstadoTurnoCaja.Abierto
        };

        var transApertura = new TransaccionCaja
        {
            TurnoCaja = turno,
            TipoTransaccion = TipoTransaccionCaja.AperturaTurno,
            MetodoPago = MetodoPago.Efectivo,
            Monto = request.FondoInicial,
            Concepto = "Fondo Inicial de Caja / Apertura de Turno"
        };

        _context.TurnosCaja.Add(turno);
        _context.TransaccionesCaja.Add(transApertura);

        await _context.SaveChangesAsync(cancellationToken);

        return new TurnoCajaDto
        {
            Id = turno.Id,
            CajeroUsuario = turno.CajeroUsuario,
            FechaHoraApertura = turno.FechaHoraApertura,
            FondoInicialEfectivo = turno.FondoInicialEfectivo,
            Estado = turno.Estado
        };
    }
}

public record CerrarTurnoCajaCommand(
    Guid TurnoId,
    decimal EfectivoDeclarado,
    decimal MonedasDeclarado,
    string? Observaciones
) : IRequest<TurnoCajaDto>;

public class CerrarTurnoCajaCommandHandler : IRequestHandler<CerrarTurnoCajaCommand, TurnoCajaDto>
{
    private readonly IApplicationDbContext _context;

    public CerrarTurnoCajaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TurnoCajaDto> Handle(CerrarTurnoCajaCommand request, CancellationToken cancellationToken)
    {
        var turno = await _context.TurnosCaja
            .Include(t => t.Transacciones)
            .FirstOrDefaultAsync(t => t.Id == request.TurnoId, cancellationToken);

        if (turno == null) throw new InvalidOperationException("Turno no encontrado.");

        var efectivoCalculado = turno.FondoInicialEfectivo + turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Efectivo && t.TipoTransaccion != TipoTransaccionCaja.AperturaTurno && t.TipoTransaccion != TipoTransaccionCaja.GastoOperativo)
            .Sum(t => t.Monto)
            - turno.Transacciones.Where(t => t.TipoTransaccion == TipoTransaccionCaja.GastoOperativo).Sum(t => t.Monto);

        var monedasCalculadas = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.MonedasFichas)
            .Sum(t => t.Monto);

        var tarjetas = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Tarjeta)
            .Sum(t => t.Monto);

        var transferencias = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Transferencia)
            .Sum(t => t.Monto);

        turno.FechaHoraCierre = DateTime.Now;
        turno.TotalEfectivoDeclarado = request.EfectivoDeclarado;
        turno.TotalMonedasDeclarado = request.MonedasDeclarado;
        turno.TotalTarjetaCalculado = tarjetas;
        turno.TotalTransferenciaCalculado = transferencias;
        turno.DiferenciaArqueo = (request.EfectivoDeclarado + request.MonedasDeclarado) - (efectivoCalculado + monedasCalculadas);
        turno.Estado = EstadoTurnoCaja.Cerrado;
        turno.ObservacionesCierre = request.Observaciones;

        await _context.SaveChangesAsync(cancellationToken);

        return new TurnoCajaDto
        {
            Id = turno.Id,
            CajeroUsuario = turno.CajeroUsuario,
            FechaHoraApertura = turno.FechaHoraApertura,
            FechaHoraCierre = turno.FechaHoraCierre,
            FondoInicialEfectivo = turno.FondoInicialEfectivo,
            TotalEfectivoCalculado = efectivoCalculado,
            TotalMonedasFichasCalculado = monedasCalculadas,
            TotalTarjetaCalculado = tarjetas,
            TotalTransferenciaCalculado = transferencias,
            Estado = turno.Estado
        };
    }
}

public record GetCajaActualQuery : IRequest<TurnoCajaDto?>;

public class GetCajaActualQueryHandler : IRequestHandler<GetCajaActualQuery, TurnoCajaDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCajaActualQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TurnoCajaDto?> Handle(GetCajaActualQuery request, CancellationToken cancellationToken)
    {
        var turno = await _context.TurnosCaja
            .Include(t => t.Transacciones)
            .OrderByDescending(t => t.FechaHoraApertura)
            .FirstOrDefaultAsync(cancellationToken);

        if (turno == null) return null;

        var efectivoCalculado = turno.FondoInicialEfectivo + turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Efectivo && t.TipoTransaccion != TipoTransaccionCaja.AperturaTurno && t.TipoTransaccion != TipoTransaccionCaja.GastoOperativo)
            .Sum(t => t.Monto)
            - turno.Transacciones.Where(t => t.TipoTransaccion == TipoTransaccionCaja.GastoOperativo).Sum(t => t.Monto);

        var monedasCalculadas = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.MonedasFichas)
            .Sum(t => t.Monto);

        var tarjetas = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Tarjeta)
            .Sum(t => t.Monto);

        var transferencias = turno.Transacciones
            .Where(t => t.MetodoPago == MetodoPago.Transferencia)
            .Sum(t => t.Monto);

        return new TurnoCajaDto
        {
            Id = turno.Id,
            CajeroUsuario = turno.CajeroUsuario,
            FechaHoraApertura = turno.FechaHoraApertura,
            FechaHoraCierre = turno.FechaHoraCierre,
            FondoInicialEfectivo = turno.FondoInicialEfectivo,
            TotalEfectivoCalculado = efectivoCalculado,
            TotalMonedasFichasCalculado = monedasCalculadas,
            TotalTarjetaCalculado = tarjetas,
            TotalTransferenciaCalculado = transferencias,
            Estado = turno.Estado,
            Transacciones = turno.Transacciones
                .OrderByDescending(t => t.FechaCreacion)
                .Select(t => new TransaccionCajaDto
                {
                    Id = t.Id,
                    FechaHora = t.FechaCreacion,
                    TipoTransaccion = t.TipoTransaccion,
                    MetodoPago = t.MetodoPago,
                    Monto = t.Monto,
                    Concepto = t.Concepto,
                    ReferenciaComprobante = t.ReferenciaComprobante,
                    ClienteNombre = t.ClienteNombre
                }).ToList()
        };
    }
}
