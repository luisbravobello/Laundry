using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Caja;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class ControlCajaViewModel : ObservableObject
{
    private readonly ISender _mediator;

    [ObservableProperty]
    private TurnoCajaDto? _turnoActual;

    [ObservableProperty]
    private bool _cajaAbierta;

    // Formulario Apertura
    [ObservableProperty]
    private string _cajeroNombre = "Luis Bravo";

    [ObservableProperty]
    private decimal _fondoInicial = 3000;

    // Formulario Cierre / Arqueo
    [ObservableProperty]
    private decimal _efectivoDeclarado;

    [ObservableProperty]
    private decimal _monedasDeclarado;

    [ObservableProperty]
    private string _observacionesCierre = string.Empty;

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    public ObservableCollection<TransaccionCajaDto> MovimientosTurno { get; } = new();

    public ControlCajaViewModel(ISender mediator)
    {
        _mediator = mediator;
    }

    [RelayCommand]
    public async Task CargarCajaAsync()
    {
        TurnoActual = await _mediator.Send(new GetCajaActualQuery());
        CajaAbierta = TurnoActual != null && TurnoActual.Estado == EstadoTurnoCaja.Abierto;

        MovimientosTurno.Clear();
        if (TurnoActual != null)
        {
            foreach (var m in TurnoActual.Transacciones)
            {
                MovimientosTurno.Add(m);
            }
        }
    }

    [RelayCommand]
    public async Task AbrirCajaAsync()
    {
        try
        {
            var turno = await _mediator.Send(new AbrirTurnoCajaCommand(CajeroNombre, FondoInicial));
            MensajeEstado = $"Turno de caja abierto correctamente con fondo de RD${FondoInicial:N2}.";
            await CargarCajaAsync();
        }
        catch (Exception ex)
        {
            MensajeEstado = ex.Message;
        }
    }

    [RelayCommand]
    public async Task CerrarCajaAsync()
    {
        if (TurnoActual == null) return;

        try
        {
            var turno = await _mediator.Send(new CerrarTurnoCajaCommand(
                TurnoActual.Id,
                EfectivoDeclarado,
                MonedasDeclarado,
                ObservacionesCierre
            ));

            MensajeEstado = "Turno de caja cerrado exitosamente. Arqueo completado.";
            await CargarCajaAsync();
        }
        catch (Exception ex)
        {
            MensajeEstado = ex.Message;
        }
    }
}
