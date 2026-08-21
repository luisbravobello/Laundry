using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Clientes;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class ClientesViewModel : ObservableObject
{
    private readonly ISender _mediator;

    [ObservableProperty]
    private ClienteDto? _clienteSeleccionado;

    [ObservableProperty]
    private string _filtroTexto = string.Empty;

    [ObservableProperty]
    private bool _soloHoteles;

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    // Formulario Nuevo Cliente
    [ObservableProperty]
    private string _nuevoNombre = string.Empty;

    [ObservableProperty]
    private string _nuevoTelefono = string.Empty;

    [ObservableProperty]
    private string _nuevoEmail = string.Empty;

    [ObservableProperty]
    private string _nuevoRNC = string.Empty;

    [ObservableProperty]
    private string _nuevaDireccion = string.Empty;

    [ObservableProperty]
    private bool _nuevoEsHotel;

    [ObservableProperty]
    private decimal _nuevoLimiteCredito = 10000;

    [ObservableProperty]
    private string _nuevasNotas = string.Empty;

    public ObservableCollection<ClienteDto> Clientes { get; } = new();

    public ClientesViewModel(ISender mediator)
    {
        _mediator = mediator;
    }

    [RelayCommand]
    public async Task CargarClientesAsync()
    {
        var list = await _mediator.Send(new GetClientesQuery(FiltroTexto, SoloHoteles));
        Clientes.Clear();
        foreach (var c in list) Clientes.Add(c);
        if (ClienteSeleccionado == null && Clientes.Any())
        {
            ClienteSeleccionado = Clientes.First();
        }
    }

    [RelayCommand]
    public async Task GuardarNuevoClienteAsync()
    {
        if (string.IsNullOrWhiteSpace(NuevoNombre) || string.IsNullOrWhiteSpace(NuevoTelefono))
        {
            MensajeEstado = "El nombre y teléfono son obligatorios.";
            return;
        }

        var cmd = new GuardarClienteCommand(
            Id: null,
            NombreCompleto: NuevoNombre,
            Telefono: NuevoTelefono,
            Email: NuevoEmail,
            RNC: NuevoRNC,
            Direccion: NuevaDireccion,
            EsCorporativoHotel: NuevoEsHotel,
            LimiteCredito: NuevoLimiteCredito,
            Notas: NuevasNotas
        );

        var guardado = await _mediator.Send(cmd);
        MensajeEstado = $"Cliente '{guardado.NombreCompleto}' guardado exitosamente.";

        // Limpiar formulario
        NuevoNombre = string.Empty;
        NuevoTelefono = string.Empty;
        NuevoEmail = string.Empty;
        NuevoRNC = string.Empty;
        NuevaDireccion = string.Empty;
        NuevoEsHotel = false;

        await CargarClientesAsync();
    }
}
