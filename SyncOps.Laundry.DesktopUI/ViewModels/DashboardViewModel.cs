using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Dashboard.Queries;
using SyncOps.Laundry.Application.Features.Ordenes.Commands;
using SyncOps.Laundry.DesktopUI.Services;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class DashboardViewModel : ObservableObject
{
    private readonly ISender _mediator;
    private readonly INavigationService _navigationService;

    [ObservableProperty]
    private decimal _ventasHoy;

    [ObservableProperty]
    private int _ordenesPendientes;

    [ObservableProperty]
    private int _prendasEnTaller;

    [ObservableProperty]
    private int _maquinasEnUso;

    [ObservableProperty]
    private int _maquinasDisponibles;

    [ObservableProperty]
    private int _alertasInsumosBajoStock;

    [ObservableProperty]
    private decimal _saldoPendienteCobroHoteles;

    [ObservableProperty]
    private bool _isCargando;

    public ObservableCollection<OrdenServicioDto> UltimasOrdenes { get; } = new();
    public ObservableCollection<InsumoInventarioDto> InsumosCriticos { get; } = new();

    public DashboardViewModel(ISender mediator, INavigationService navigationService)
    {
        _mediator = mediator;
        _navigationService = navigationService;
    }

    [RelayCommand]
    public async Task CargarDashboardAsync()
    {
        if (IsCargando) return;
        try
        {
            IsCargando = true;
            var data = await _mediator.Send(new GetDashboardDataQuery());
            
            VentasHoy = data.VentasHoy;
            OrdenesPendientes = data.OrdenesPendientes;
            PrendasEnTaller = data.PrendasEnTaller;
            MaquinasEnUso = data.MaquinasEnUso;
            MaquinasDisponibles = data.MaquinasDisponibles;
            AlertasInsumosBajoStock = data.AlertasInsumosBajoStock;
            SaldoPendienteCobroHoteles = data.SaldoPendienteCobroHoteles;

            UltimasOrdenes.Clear();
            foreach (var o in data.UltimasOrdenes) UltimasOrdenes.Add(o);

            InsumosCriticos.Clear();
            foreach (var i in data.InsumosCriticos) InsumosCriticos.Add(i);
        }
        finally
        {
            IsCargando = false;
        }
    }

    [RelayCommand]
    private void IrANuevaOrden() => _navigationService.NavigateTo<PosRecepcionViewModel>();

    [RelayCommand]
    private void IrATaller() => _navigationService.NavigateTo<TallerKanbanViewModel>();

    [RelayCommand]
    private void IrAAutoservicio() => _navigationService.NavigateTo<AutoservicioViewModel>();

    [RelayCommand]
    private void IrAInventario() => _navigationService.NavigateTo<InventarioViewModel>();
}
