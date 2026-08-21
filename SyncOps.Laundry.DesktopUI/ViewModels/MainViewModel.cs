using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SyncOps.Laundry.DesktopUI.Services;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly INavigationService _navigationService;

    [ObservableProperty]
    private ObservableObject? _currentViewModel;

    [ObservableProperty]
    private string _paginaActualTitulo = "Panel Principal";

    [ObservableProperty]
    private string _usuarioActual = "Luis Bravo (Administrador)";

    [ObservableProperty]
    private string _estadoCajaBadge = "Caja Abierta (Turno Activo)";

    public MainViewModel(INavigationService navigationService)
    {
        _navigationService = navigationService;
        _navigationService.CurrentViewModelChanged += OnCurrentViewModelChanged;

        // Iniciar en el Dashboard
        _navigationService.NavigateTo<DashboardViewModel>();
    }

    private void OnCurrentViewModelChanged()
    {
        CurrentViewModel = _navigationService.CurrentViewModel;
        PaginaActualTitulo = CurrentViewModel switch
        {
            DashboardViewModel => "Panel Principal & Métricas",
            PosRecepcionViewModel => "Punto de Venta / Recepción de Prendas",
            TallerKanbanViewModel => "Tablero de Taller & Flujo de Lavandería",
            AutoservicioViewModel => "Monitoreo de Autoservicio & Torres con Monedas",
            InventarioViewModel => "Inventario de Insumos & Suministros",
            ClientesViewModel => "Directorio de Clientes & Cuentas de Hoteles",
            ControlCajaViewModel => "Control de Caja & Arqueo de Turno",
            _ => "SyncOps Laundry Suite"
        };
    }

    [RelayCommand]
    private void Navegar(string destino)
    {
        switch (destino)
        {
            case "Dashboard":
                _navigationService.NavigateTo<DashboardViewModel>();
                break;
            case "POS":
                _navigationService.NavigateTo<PosRecepcionViewModel>();
                break;
            case "Kanban":
                _navigationService.NavigateTo<TallerKanbanViewModel>();
                break;
            case "Autoservicio":
                _navigationService.NavigateTo<AutoservicioViewModel>();
                break;
            case "Inventario":
                _navigationService.NavigateTo<InventarioViewModel>();
                break;
            case "Clientes":
                _navigationService.NavigateTo<ClientesViewModel>();
                break;
            case "Caja":
                _navigationService.NavigateTo<ControlCajaViewModel>();
                break;
        }
    }
}
