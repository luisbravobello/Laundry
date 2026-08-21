using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Autoservicio.Queries;

public record GetMaquinasQuery : IRequest<List<MaquinaAutoservicioDto>>;

public class GetMaquinasQueryHandler : IRequestHandler<GetMaquinasQuery, List<MaquinaAutoservicioDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMaquinasQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MaquinaAutoservicioDto>> Handle(GetMaquinasQuery request, CancellationToken cancellationToken)
    {
        var list = await _context.MaquinasAutoservicio
            .OrderBy(m => m.Tipo)
            .ThenBy(m => m.CodigoIdentificador)
            .ToListAsync(cancellationToken);

        // Actualizar estados si el tiempo de ciclo ya pasó
        bool huboCambios = false;
        foreach (var m in list)
        {
            if (m.Estado == EstadoMaquina.EnCiclo && m.HoraInicioCicloActual.HasValue)
            {
                var transcurrido = (DateTime.Now - m.HoraInicioCicloActual.Value).TotalMinutes;
                if (transcurrido >= m.DuracionCicloMinutos)
                {
                    m.Estado = EstadoMaquina.Disponible;
                    m.HoraInicioCicloActual = null;
                    huboCambios = true;
                }
            }
        }

        if (huboCambios)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return list.Select(m => new MaquinaAutoservicioDto
        {
            Id = m.Id,
            CodigoIdentificador = m.CodigoIdentificador,
            NombreDescriptivo = m.NombreDescriptivo,
            Tipo = m.Tipo,
            Estado = m.Estado,
            CapacidadLibras = m.CapacidadLibras,
            PrecioPorCicloMonedas = m.PrecioPorCicloMonedas,
            CantidadMonedasPorCiclo = m.CantidadMonedasPorCiclo,
            DuracionCicloMinutos = m.DuracionCicloMinutos,
            HoraInicioCicloActual = m.HoraInicioCicloActual,
            MinutosRestantes = m.MinutosRestantes,
            TotalCiclosHistoricos = m.TotalCiclosHistoricos,
            RecaudacionCajetinActual = m.RecaudacionCajetinActual,
            UltimoMantenimiento = m.UltimoMantenimiento,
            NotasOperativas = m.NotasOperativas
        }).ToList();
    }
}
