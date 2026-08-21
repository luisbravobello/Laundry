using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediatR;
using SyncOps.Laundry.Application.DTOs;
using SyncOps.Laundry.Application.Features.Clientes;
using SyncOps.Laundry.Application.Features.Ordenes.Commands;
using SyncOps.Laundry.Application.Features.Ordenes.Queries;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;
using System.Collections.ObjectModel;

namespace SyncOps.Laundry.DesktopUI.ViewModels;

public partial class PosRecepcionViewModel : ObservableObject
{
    private readonly ISender _mediator;
    private readonly ITicketPrinterService _ticketPrinter;

    [ObservableProperty]
    private ClienteDto? _clienteSeleccionado;

    [ObservableProperty]
    private string _busquedaCliente = string.Empty;

    [ObservableProperty]
    private DateTime _fechaPromesaEntrega = DateTime.Now.AddDays(1);

    [ObservableProperty]
    private bool _esUrgente;

    [ObservableProperty]
    private string _observaciones = string.Empty;

    [ObservableProperty]
    private decimal _descuento;

    [ObservableProperty]
    private decimal _montoAbonado;

    [ObservableProperty]
    private MetodoPago _metodoPagoAbono = MetodoPago.Efectivo;

    // Item actual en edición / adición
    [ObservableProperty]
    private CatalogoPrendaServicioDto? _prendaSeleccionada;

    [ObservableProperty]
    private string _descripcionPersonalizada = string.Empty;

    [ObservableProperty]
    private TipoServicio _tipoServicioSeleccionado = TipoServicio.LavadoYPlanchado;

    [ObservableProperty]
    private int _cantidadItem = 1;

    [ObservableProperty]
    private decimal _pesoKgItem;

    [ObservableProperty]
    private decimal _precioUnitarioItem;

    [ObservableProperty]
    private string _colorPrenda = string.Empty;

    [ObservableProperty]
    private string _marcaPrenda = string.Empty;

    [ObservableProperty]
    private string _defectosPrenda = string.Empty;

    [ObservableProperty]
    private string _ubicacionEstante = "G-01";

    // Campos específicos para Sastrería
    [ObservableProperty]
    private bool _esServicioSastreria;

    [ObservableProperty]
    private string _sastreriaTipoArreglo = string.Empty;

    [ObservableProperty]
    private string _sastreriaMedidas = string.Empty;

    [ObservableProperty]
    private string _sastreriaObservaciones = string.Empty;

    [ObservableProperty]
    private string _sastreAsignado = "Maestro Costura";

    // Estado del ticket generado
    [ObservableProperty]
    private string? _ticketGeneradoTexto;

    [ObservableProperty]
    private bool _mostrarModalTicket;

    [ObservableProperty]
    private string _mensajeEstado = string.Empty;

    public ObservableCollection<ClienteDto> Clientes { get; } = new();
    public ObservableCollection<CatalogoPrendaServicioDto> CatalogoPrendas { get; } = new();
    public ObservableCollection<ItemOrdenInput> ItemsAgregados { get; } = new();

    public decimal SubtotalCalculado => ItemsAgregados.Sum(i => i.Cantidad > 0 && i.PesoKg > 0 ? i.PesoKg * i.PrecioUnitario : i.Cantidad * i.PrecioUnitario);
    public decimal TotalCalculado => Math.Max(0, SubtotalCalculado - Descuento);
    public decimal SaldoPendienteCalculado => Math.Max(0, TotalCalculado - MontoAbonado);

    public PosRecepcionViewModel(ISender mediator, ITicketPrinterService ticketPrinter)
    {
        _mediator = mediator;
        _ticketPrinter = ticketPrinter;
    }

    [RelayCommand]
    public async Task InicializarAsync()
    {
        await CargarClientesAsync();
        await CargarCatalogoAsync();
    }

    [RelayCommand]
    public async Task CargarClientesAsync()
    {
        var list = await _mediator.Send(new GetClientesQuery());
        Clientes.Clear();
        foreach (var c in list) Clientes.Add(c);
        if (ClienteSeleccionado == null && Clientes.Any())
        {
            ClienteSeleccionado = Clientes.First();
        }
    }

    [RelayCommand]
    public async Task CargarCatalogoAsync()
    {
        var list = await _mediator.Send(new GetCatalogosQuery());
        CatalogoPrendas.Clear();
        foreach (var c in list) CatalogoPrendas.Add(c);
    }

    partial void OnPrendaSeleccionadaChanged(CatalogoPrendaServicioDto? value)
    {
        if (value != null)
        {
            DescripcionPersonalizada = value.NombrePrenda;
            TipoServicioSeleccionado = value.TipoServicio;
            PrecioUnitarioItem = value.PrecioSugerido;
            EsServicioSastreria = value.TipoServicio == TipoServicio.Sastreria;
            if (EsServicioSastreria && string.IsNullOrWhiteSpace(SastreriaTipoArreglo))
            {
                SastreriaTipoArreglo = value.NombrePrenda;
            }
        }
    }

    partial void OnTipoServicioSeleccionadoChanged(TipoServicio value)
    {
        EsServicioSastreria = value == TipoServicio.Sastreria;
    }

    partial void OnDescuentoChanged(decimal value)
    {
        OnPropertyChanged(nameof(TotalCalculado));
        OnPropertyChanged(nameof(SaldoPendienteCalculado));
    }

    partial void OnMontoAbonadoChanged(decimal value)
    {
        OnPropertyChanged(nameof(SaldoPendienteCalculado));
    }

    [RelayCommand]
    public void SeleccionarCatalogo(CatalogoPrendaServicioDto item)
    {
        PrendaSeleccionada = item;
    }

    [RelayCommand]
    public void AgregarItemAOrden()
    {
        if (string.IsNullOrWhiteSpace(DescripcionPersonalizada))
        {
            MensajeEstado = "Por favor selecciona o escribe la descripción de la prenda.";
            return;
        }

        var item = new ItemOrdenInput(
            PrendaDescripcion: DescripcionPersonalizada,
            TipoServicio: TipoServicioSeleccionado,
            Cantidad: CantidadItem > 0 ? CantidadItem : 1,
            PesoKg: PesoKgItem,
            PrecioUnitario: PrecioUnitarioItem,
            ColorPrenda: ColorPrenda,
            Marca: MarcaPrenda,
            Defectos: DefectosPrenda,
            UbicacionEstante: UbicacionEstante,
            SastreriaTipoArreglo: EsServicioSastreria ? SastreriaTipoArreglo : null,
            SastreriaMedidas: EsServicioSastreria ? SastreriaMedidas : null,
            SastreriaObservaciones: EsServicioSastreria ? SastreriaObservaciones : null,
            SastreAsignado: EsServicioSastreria ? SastreAsignado : null
        );

        ItemsAgregados.Add(item);
        OnPropertyChanged(nameof(SubtotalCalculado));
        OnPropertyChanged(nameof(TotalCalculado));
        OnPropertyChanged(nameof(SaldoPendienteCalculado));

        // Limpiar para siguiente prenda
        DescripcionPersonalizada = string.Empty;
        PrendaSeleccionada = null;
        CantidadItem = 1;
        PesoKgItem = 0;
        ColorPrenda = string.Empty;
        DefectosPrenda = string.Empty;
        SastreriaMedidas = string.Empty;
        MensajeEstado = "Prenda agregada a la orden.";
    }

    [RelayCommand]
    public void RemoverItem(ItemOrdenInput item)
    {
        ItemsAgregados.Remove(item);
        OnPropertyChanged(nameof(SubtotalCalculado));
        OnPropertyChanged(nameof(TotalCalculado));
        OnPropertyChanged(nameof(SaldoPendienteCalculado));
    }

    [RelayCommand]
    public void CobrarTodo()
    {
        MontoAbonado = TotalCalculado;
    }

    [RelayCommand]
    public async Task GuardarYEmitirTicketAsync()
    {
        if (ClienteSeleccionado == null)
        {
            MensajeEstado = "Debe seleccionar un cliente.";
            return;
        }

        if (!ItemsAgregados.Any())
        {
            MensajeEstado = "Debe agregar al menos una prenda a la orden.";
            return;
        }

        try
        {
            var command = new CrearOrdenServicioCommand(
                ClienteId: ClienteSeleccionado.Id,
                FechaPromesaEntrega: FechaPromesaEntrega,
                EsUrgente: EsUrgente,
                Observaciones: Observaciones,
                AtendidoPor: "Recepción SyncOps",
                Descuento: Descuento,
                MontoAbonadoInicial: MontoAbonado,
                MetodoPagoAbono: MetodoPagoAbono,
                Items: ItemsAgregados.ToList()
            );

            var ordenCreada = await _mediator.Send(command);

            // Generar vista previa de ticket
            var ordenEntity = new OrdenServicio
            {
                NumeroTicket = ordenCreada.NumeroTicket,
                CodigoBarras = ordenCreada.CodigoBarras,
                FechaRecepcion = ordenCreada.FechaRecepcion,
                FechaPromesaEntrega = ordenCreada.FechaPromesaEntrega,
                Subtotal = ordenCreada.Subtotal,
                Descuento = ordenCreada.Descuento,
                Total = ordenCreada.Total,
                TotalAbonado = ordenCreada.TotalAbonado,
                EsUrgente = ordenCreada.EsUrgente,
                Cliente = new Cliente
                {
                    NombreCompleto = ordenCreada.ClienteNombre,
                    Telefono = ordenCreada.ClienteTelefono
                },
                Items = ordenCreada.Items.Select(i => new DetalleOrdenItem
                {
                    PrendaDescripcion = i.PrendaDescripcion,
                    TipoServicio = i.TipoServicio,
                    Cantidad = i.Cantidad,
                    PesoKg = i.PesoKg,
                    PrecioUnitario = i.PrecioUnitario,
                    ColorPrenda = i.ColorPrenda,
                    DefectosPrevios = i.DefectosPrevios,
                    UbicacionEstante = i.UbicacionEstante,
                    Sastreria = i.Sastreria == null ? null : new DetalleSastreria
                    {
                        TipoArreglo = i.Sastreria.TipoArreglo,
                        MedidasEspecificas = i.Sastreria.MedidasEspecificas
                    }
                }).ToList()
            };

            TicketGeneradoTexto = _ticketPrinter.GenerarTextoTicket(ordenEntity);
            MostrarModalTicket = true;

            // Limpiar formulario para la siguiente orden
            ItemsAgregados.Clear();
            Descuento = 0;
            MontoAbonado = 0;
            Observaciones = string.Empty;
            EsUrgente = false;
            OnPropertyChanged(nameof(SubtotalCalculado));
            OnPropertyChanged(nameof(TotalCalculado));
            OnPropertyChanged(nameof(SaldoPendienteCalculado));
            MensajeEstado = $"¡Orden {ordenCreada.NumeroTicket} generada exitosamente!";
        }
        catch (Exception ex)
        {
            MensajeEstado = $"Error al procesar orden: {ex.Message}";
        }
    }

    [RelayCommand]
    public void CerrarModalTicket()
    {
        MostrarModalTicket = false;
    }
}
