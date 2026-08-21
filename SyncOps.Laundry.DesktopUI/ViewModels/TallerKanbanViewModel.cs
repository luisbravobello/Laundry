using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Ordenes.Commands;
using SyncOps.Laundry.Application.Features.Ordenes.Queries;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class TallerKanbanViewModel : ObservableObject
{
    private readonly ISender _mediator;

    [ObservableProperty]
    private string _filtroBusqueda = string.Empty;

    [ObservableProperty]
    private OrdenServicioDto? _ordenSeleccionada;

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    public ObservableCollection<OrdenServicioDto> ColumnaRecibido { get; } = new();
    public ObservableCollection<OrdenServicioDto> ColumnaEnProceso { get; } = new(); // Lavado / Taller Sastrería
    public ObservableCollection<OrdenServicioDto> ColumnaEnPlanchado { get; } = new();
    public ObservableCollection<OrdenServicioDto> ColumnaListoParaEntrega { get; } = new();
    public ObservableCollection<OrdenServicioDto> ColumnaEntregado { get; } = new();

    public TallerKanbanViewModel(ISender mediator)
    {
        _mediator = mediator;
    }

    [RelayCommand]
    public async Task CargarKanbanAsync()
    {
        var ordenes = await _mediator.Send(new GetOrdenesQuery(null, FiltroBusqueda));

        ColumnaRecibido.Clear();
        ColumnaEnProceso.Clear();
        ColumnaEnPlanchado.Clear();
        ColumnaListoParaEntrega.Clear();
        ColumnaEntregado.Clear();

        foreach (var o in ordenes)
        {
            switch (o.Estado)
            {
                case EstadoOrden.Recibido:
                    ColumnaRecibido.Add(o);
                    break;
                case EstadoOrden.EnLavado:
                case EstadoOrden.EnSastreria:
                    ColumnaEnProceso.Add(o);
                    break;
                case EstadoOrden.EnPlanchado:
                    ColumnaEnPlanchado.Add(o);
                    break;
                case EstadoOrden.ListoParaEntrega:
                    ColumnaListoParaEntrega.Add(o);
                    break;
                case EstadoOrden.Entregado:
                    ColumnaEntregado.Add(o);
                    break;
            }
        }
    }

    [RelayCommand]
    public async Task AvanzarEstadoAsync(OrdenServicioDto orden)
    {
        EstadoOrden nuevoEstado = orden.Estado switch
        {
            EstadoOrden.Recibido => EstadoOrden.EnLavado,
            EstadoOrden.EnLavado => EstadoOrden.EnPlanchado,
            EstadoOrden.EnSastreria => EstadoOrden.EnPlanchado,
            EstadoOrden.EnPlanchado => EstadoOrden.ListoParaEntrega,
            EstadoOrden.ListoParaEntrega => EstadoOrden.Entregado,
            _ => orden.Estado
        };

        if (nuevoEstado != orden.Estado)
        {
            var res = await _mediator.Send(new ActualizarEstadoOrdenCommand(orden.Id, nuevoEstado));
            if (res)
            {
                MensajeEstado = $"Ticket {orden.NumeroTicket} actualizado a: {nuevoEstado}";
                await CargarKanbanAsync();
            }
        }
    }

    [RelayCommand]
    public async Task MarcarListoParaEntregaAsync(OrdenServicioDto orden)
    {
        var res = await _mediator.Send(new ActualizarEstadoOrdenCommand(orden.Id, EstadoOrden.ListoParaEntrega));
        if (res)
        {
            MensajeEstado = $"Ticket {orden.NumeroTicket} listo para retiro en mostrador.";
            await CargarKanbanAsync();
        }
    }

    [RelayCommand]
    public async Task EntregarAlClienteAsync(OrdenServicioDto orden)
    {
        var res = await _mediator.Send(new ActualizarEstadoOrdenCommand(orden.Id, EstadoOrden.Entregado));
        if (res)
        {
            MensajeEstado = $"Ticket {orden.NumeroTicket} entregado al cliente.";
            await CargarKanbanAsync();
        }
    }

    [RelayCommand]
    public async Task BuscarPorCodigoBarrasAsync()
    {
        if (string.IsNullOrWhiteSpace(FiltroBusqueda)) return;
        await CargarKanbanAsync();
    }
}
