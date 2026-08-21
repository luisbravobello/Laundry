using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Inventario;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class InventarioViewModel : ObservableObject
{
    private readonly ISender _mediator;

    [ObservableProperty]
    private InsumoInventarioDto? _insumoSeleccionado;

    [ObservableProperty]
    private string _filtroCategoria = "Todas";

    [ObservableProperty]
    private decimal _cantidadAjuste = 1;

    [ObservableProperty]
    private string _motivoAjuste = "Reabastecimiento";

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    // Formulario de nuevo insumo
    [ObservableProperty]
    private string _nuevoCodigo = string.Empty;

    [ObservableProperty]
    private string _nuevoNombre = string.Empty;

    [ObservableProperty]
    private CategoriaInsumo _nuevaCategoria = CategoriaInsumo.Detergentes;

    [ObservableProperty]
    private string _nuevaUnidad = "Galones";

    [ObservableProperty]
    private decimal _nuevoStockInicial = 10;

    [ObservableProperty]
    private decimal _nuevoStockMinimo = 5;

    [ObservableProperty]
    private decimal _nuevoCosto = 350;

    [ObservableProperty]
    private decimal? _nuevoPrecioVenta;

    [ObservableProperty]
    private string _nuevoProveedor = string.Empty;

    public ObservableCollection<InsumoInventarioDto> Insumos { get; } = new();

    public InventarioViewModel(ISender mediator)
    {
        _mediator = mediator;
    }

    [RelayCommand]
    public async Task CargarInsumosAsync()
    {
        var list = await _mediator.Send(new GetInsumosQuery());
        Insumos.Clear();
        foreach (var i in list) Insumos.Add(i);
        if (InsumoSeleccionado == null && Insumos.Any())
        {
            InsumoSeleccionado = Insumos.First();
        }
    }

    [RelayCommand]
    public async Task ReabastecerInsumoAsync(InsumoInventarioDto insumo)
    {
        if (CantidadAjuste <= 0) return;

        var res = await _mediator.Send(new AjustarStockCommand(insumo.Id, CantidadAjuste, MotivoAjuste));
        if (res)
        {
            MensajeEstado = $"Stock de '{insumo.NombreInsumo}' incrementado en +{CantidadAjuste} {insumo.UnidadMedida}.";
            await CargarInsumosAsync();
        }
    }

    [RelayCommand]
    public async Task RegistrarNuevoInsumoAsync()
    {
        if (string.IsNullOrWhiteSpace(NuevoNombre))
        {
            MensajeEstado = "El nombre del insumo es obligatorio.";
            return;
        }

        var cmd = new GuardarInsumoCommand(
            Id: null,
            CodigoBarras: string.IsNullOrWhiteSpace(NuevoCodigo) ? DateTime.Now.Ticks.ToString()[..10] : NuevoCodigo,
            NombreInsumo: NuevoNombre,
            Categoria: NuevaCategoria,
            UnidadMedida: NuevaUnidad,
            StockActual: NuevoStockInicial,
            StockMinimoAlerta: NuevoStockMinimo,
            CostoUnitarioCompra: NuevoCosto,
            PrecioVentaDirecta: NuevoPrecioVenta,
            ProveedorPrincipal: NuevoProveedor
        );

        var guardado = await _mediator.Send(cmd);
        MensajeEstado = $"Insumo '{guardado.NombreInsumo}' registrado exitosamente.";

        // Limpiar formulario
        NuevoNombre = string.Empty;
        NuevoCodigo = string.Empty;
        NuevoProveedor = string.Empty;
        await CargarInsumosAsync();
    }
}
