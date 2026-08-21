using MediatR;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.Features.Ordenes.Commands;

public record ItemOrdenInput(
    string PrendaDescripcion,
    TipoServicio TipoServicio,
    int Cantidad,
    decimal PesoKg,
    decimal PrecioUnitario,
    string? ColorPrenda,
    string? Marca,
    string? Defectos,
    string? UbicacionEstante,
    // Datos de sastrería si aplica
    string? SastreriaTipoArreglo,
    string? SastreriaMedidas,
    string? SastreriaObservaciones,
    string? SastreAsignado
);

public record CrearOrdenServicioCommand(
    Guid ClienteId,
    DateTime FechaPromesaEntrega,
    bool EsUrgente,
    string? Observaciones,
    string AtendidoPor,
    decimal Descuento,
    decimal MontoAbonadoInicial,
    MetodoPago MetodoPagoAbono,
    List<ItemOrdenInput> Items
) : IRequest<OrdenServicioDto>;

public class CrearOrdenServicioCommandHandler : IRequestHandler<CrearOrdenServicioCommand, OrdenServicioDto>
{
    private readonly IApplicationDbContext _context;

    public CrearOrdenServicioCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrdenServicioDto> Handle(CrearOrdenServicioCommand request, CancellationToken cancellationToken)
    {
        var cliente = await _context.Clientes.FindAsync(new object[] { request.ClienteId }, cancellationToken);
        if (cliente == null) throw new InvalidOperationException("El cliente especificado no existe.");

        var countHoy = await _context.OrdenesServicio.CountAsync(cancellationToken) + 1;
        var prefix = request.Items.Any(i => i.TipoServicio == TipoServicio.Sastreria) ? "SAS" : "LAV";
        var ticket = $"{prefix}-{DateTime.Now:yyMMdd}-{countHoy:D3}";
        var barcode = $"{DateTime.Now:yyyyMMdd}{countHoy:D4}";

        var orden = new OrdenServicio
        {
            NumeroTicket = ticket,
            CodigoBarras = barcode,
            ClienteId = cliente.Id,
            Estado = EstadoOrden.Recibido,
            FechaRecepcion = DateTime.Now,
            FechaPromesaEntrega = request.FechaPromesaEntrega,
            EsUrgente = request.EsUrgente,
            ObservacionesRecepcion = request.Observaciones,
            AtendidoPor = request.AtendidoPor,
            Descuento = request.Descuento
        };

        decimal subtotal = 0;
        foreach (var item in request.Items)
        {
            var itemEntity = new DetalleOrdenItem
            {
                PrendaDescripcion = item.PrendaDescripcion,
                TipoServicio = item.TipoServicio,
                Cantidad = item.Cantidad,
                PesoKg = item.PesoKg,
                PrecioUnitario = item.PrecioUnitario,
                ColorPrenda = item.ColorPrenda,
                MarcaOEtiqueta = item.Marca,
                DefectosPrevios = item.Defectos,
                UbicacionEstante = item.UbicacionEstante,
                EstadoItem = item.TipoServicio == TipoServicio.Sastreria ? EstadoOrden.EnSastreria : EstadoOrden.Recibido
            };

            subtotal += itemEntity.Subtotal;

            if (item.TipoServicio == TipoServicio.Sastreria && !string.IsNullOrWhiteSpace(item.SastreriaTipoArreglo))
            {
                itemEntity.Sastreria = new DetalleSastreria
                {
                    TipoArreglo = item.SastreriaTipoArreglo,
                    MedidasEspecificas = item.SastreriaMedidas,
                    ObservacionesTaller = item.SastreriaObservaciones,
                    SastreAsignado = item.SastreAsignado
                };
            }

            orden.Items.Add(itemEntity);
        }

        orden.Subtotal = subtotal;
        orden.Total = Math.Max(0, subtotal - request.Descuento);
        orden.TotalAbonado = Math.Min(orden.Total, request.MontoAbonadoInicial);

        if (orden.SaldoPendiente > 0 && cliente.EsCorporativoHotel)
        {
            cliente.SaldoPendiente += orden.SaldoPendiente;
        }

        _context.OrdenesServicio.Add(orden);

        // Si se abonó dinero, registrar movimiento en caja
        if (request.MontoAbonadoInicial > 0)
        {
            var turnoAbierto = await _context.TurnosCaja
                .OrderByDescending(t => t.FechaHoraApertura)
                .FirstOrDefaultAsync(t => t.Estado == EstadoTurnoCaja.Abierto, cancellationToken);

            if (turnoAbierto != null)
            {
                var trans = new TransaccionCaja
                {
                    TurnoCajaId = turnoAbierto.Id,
                    OrdenServicio = orden,
                    TipoTransaccion = TipoTransaccionCaja.CobroOrden,
                    MetodoPago = request.MetodoPagoAbono,
                    Monto = orden.TotalAbonado,
                    Concepto = $"Abono/Pago Ticket {orden.NumeroTicket}",
                    ClienteNombre = cliente.NombreCompleto
                };
                _context.TransaccionesCaja.Add(trans);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new OrdenServicioDto
        {
            Id = orden.Id,
            NumeroTicket = orden.NumeroTicket,
            CodigoBarras = orden.CodigoBarras,
            ClienteId = cliente.Id,
            ClienteNombre = cliente.NombreCompleto,
            ClienteTelefono = cliente.Telefono,
            ClienteEsHotel = cliente.EsCorporativoHotel,
            Estado = orden.Estado,
            FechaRecepcion = orden.FechaRecepcion,
            FechaPromesaEntrega = orden.FechaPromesaEntrega,
            Subtotal = orden.Subtotal,
            Descuento = orden.Descuento,
            Total = orden.Total,
            TotalAbonado = orden.TotalAbonado,
            EsUrgente = orden.EsUrgente,
            ObservacionesRecepcion = orden.ObservacionesRecepcion,
            AtendidoPor = orden.AtendidoPor,
            Items = orden.Items.Select(i => new DetalleOrdenItemDto
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
        };
    }
}
