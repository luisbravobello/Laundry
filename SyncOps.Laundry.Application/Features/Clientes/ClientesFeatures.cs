using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;

namespace SyncOps.Laundry.Application.Features.Clientes;

public record GuardarClienteCommand(
    Guid? Id,
    string NombreCompleto,
    string Telefono,
    string? Email,
    string? RNC,
    string? Direccion,
    bool EsCorporativoHotel,
    decimal LimiteCredito,
    string? Notas
) : IRequest<ClienteDto>;

public class GuardarClienteCommandHandler : IRequestHandler<GuardarClienteCommand, ClienteDto>
{
    private readonly IApplicationDbContext _context;

    public GuardarClienteCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ClienteDto> Handle(GuardarClienteCommand request, CancellationToken cancellationToken)
    {
        Cliente? cliente = null;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            cliente = await _context.Clientes.FindAsync(new object[] { request.Id.Value }, cancellationToken);
        }

        if (cliente == null)
        {
            cliente = new Cliente();
            _context.Clientes.Add(cliente);
        }

        cliente.NombreCompleto = request.NombreCompleto;
        cliente.Telefono = request.Telefono;
        cliente.Email = request.Email;
        cliente.RNC = request.RNC;
        cliente.Direccion = request.Direccion;
        cliente.EsCorporativoHotel = request.EsCorporativoHotel;
        cliente.LimiteCredito = request.LimiteCredito;
        cliente.Notas = request.Notas;

        await _context.SaveChangesAsync(cancellationToken);

        return new ClienteDto
        {
            Id = cliente.Id,
            NombreCompleto = cliente.NombreCompleto,
            Telefono = cliente.Telefono,
            Email = cliente.Email,
            RNC = cliente.RNC,
            Direccion = cliente.Direccion,
            EsCorporativoHotel = cliente.EsCorporativoHotel,
            SaldoPendiente = cliente.SaldoPendiente,
            LimiteCredito = cliente.LimiteCredito,
            Notas = cliente.Notas
        };
    }
}

public record GetClientesQuery(string? Termino = null, bool? SoloHoteles = null) : IRequest<List<ClienteDto>>;

public class GetClientesQueryHandler : IRequestHandler<GetClientesQuery, List<ClienteDto>>
{
    private readonly IApplicationDbContext _context;

    public GetClientesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClienteDto>> Handle(GetClientesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Clientes
            .Include(c => c.Ordenes)
            .AsQueryable();

        if (request.SoloHoteles.HasValue && request.SoloHoteles.Value)
        {
            query = query.Where(c => c.EsCorporativoHotel);
        }

        if (!string.IsNullOrWhiteSpace(request.Termino))
        {
            var term = request.Termino.Trim().ToLower();
            query = query.Where(c => 
                c.NombreCompleto.ToLower().Contains(term) ||
                c.Telefono.Contains(term) ||
                (c.RNC != null && c.RNC.Contains(term)));
        }

        var list = await query.OrderBy(c => c.NombreCompleto).ToListAsync(cancellationToken);

        return list.Select(c => new ClienteDto
        {
            Id = c.Id,
            NombreCompleto = c.NombreCompleto,
            Telefono = c.Telefono,
            Email = c.Email,
            RNC = c.RNC,
            Direccion = c.Direccion,
            EsCorporativoHotel = c.EsCorporativoHotel,
            SaldoPendiente = c.SaldoPendiente,
            LimiteCredito = c.LimiteCredito,
            Notas = c.Notas,
            TotalOrdenes = c.Ordenes.Count
        }).ToList();
    }
}
