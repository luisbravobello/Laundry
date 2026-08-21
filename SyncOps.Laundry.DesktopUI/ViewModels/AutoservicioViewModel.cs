using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Autoservicio.Commands;
using SyncOps.Laundry.Application.Features.Autoservicio.Queries;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class AutoservicioViewModel : ObservableObject
{
    private readonly ISender _mediator;

    [ObservableProperty]
    private int _fichasAVender = 3;

    [ObservableProperty]
    private decimal _precioPorFicha = 60;

    [ObservableProperty]
    private MetodoPago _metodoPagoVentaFichas = MetodoPago.Efectivo;

    [ObservableProperty]
    private string _clienteFichasNombre = string.Empty;

    [ObservableProperty]
    private decimal _totalRecaudadoGeneral;

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    public decimal TotalVentaFichasCalculado => FichasAVender * PrecioPorFicha;

    public ObservableCollection<MaquinaAutoservicioDto> TorresMonedas { get; } = new();
    public ObservableCollection<MaquinaAutoservicioDto> MaquinasIndustriales { get; } = new();

    public AutoservicioViewModel(ISender mediator)
    {
        _mediator = mediator;
    }

    [RelayCommand]
    public async Task CargarMaquinasAsync()
    {
        var list = await _mediator.Send(new GetMaquinasQuery());

        TorresMonedas.Clear();
        MaquinasIndustriales.Clear();

        decimal recaudacion = 0;
        foreach (var m in list)
        {
            recaudacion += m.RecaudacionCajetinActual;
            if (m.Tipo == TipoMaquina.TorreLavadoraSecadoraMonedas)
            {
                TorresMonedas.Add(m);
            }
            else
            {
                MaquinasIndustriales.Add(m);
            }
        }

        TotalRecaudadoGeneral = recaudacion;
    }

    partial void OnFichasAVenderChanged(int value)
    {
        OnPropertyChanged(nameof(TotalVentaFichasCalculado));
    }

    partial void OnPrecioPorFichaChanged(decimal value)
    {
        OnPropertyChanged(nameof(TotalVentaFichasCalculado));
    }

    [RelayCommand]
    public async Task IniciarCicloAsync(MaquinaAutoservicioDto maquina)
    {
        var res = await _mediator.Send(new IniciarCicloMaquinaCommand(maquina.Id, maquina.DuracionCicloMinutos));
        if (res)
        {
            MensajeEstado = $"Ciclo de {maquina.DuracionCicloMinutos} min iniciado en {maquina.CodigoIdentificador}.";
            await CargarMaquinasAsync();
        }
    }

    [RelayCommand]
    public async Task VaciarCajetinMonedasAsync(MaquinaAutoservicioDto maquina)
    {
        var recaudado = await _mediator.Send(new RecaudarMonedasCommand(maquina.Id));
        MensajeEstado = $"Se vació el cajetín de {maquina.CodigoIdentificador}. Recaudado: RD${recaudado:N2}";
        await CargarMaquinasAsync();
    }

    [RelayCommand]
    public async Task VenderFichasAsync()
    {
        if (FichasAVender <= 0) return;

        var res = await _mediator.Send(new VenderFichasMonedasCommand(
            FichasAVender,
            PrecioPorFicha,
            MetodoPagoVentaFichas,
            string.IsNullOrWhiteSpace(ClienteFichasNombre) ? "Cliente Autoservicio" : ClienteFichasNombre
        ));

        if (res)
        {
            MensajeEstado = $"Venta de {FichasAVender} fichas registrada por RD${TotalVentaFichasCalculado:N2}.";
            ClienteFichasNombre = string.Empty;
        }
        else
        {
            MensajeEstado = "No se pudo registrar la venta. Verifique que la caja esté abierta.";
        }
    }
}
