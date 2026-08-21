using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Application.DTOs;

public class ClienteDto
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? RNC { get; set; }
    public string? Direccion { get; set; }
    public bool EsCorporativoHotel { get; set; }
    public decimal SaldoPendiente { get; set; }
    public decimal LimiteCredito { get; set; }
    public string? Notas { get; set; }
    public int TotalOrdenes { get; set; }
}

public class CatalogoPrendaServicioDto
{
    public Guid Id { get; set; }
    public string NombrePrenda { get; set; } = string.Empty;
    public string CategoriaPrenda { get; set; } = string.Empty;
    public TipoServicio TipoServicio { get; set; }
    public decimal PrecioSugerido { get; set; }
    public string? Descripcion { get; set; }
    public string Icono { get; set; } = "TShirt";
}

public class DetalleSastreriaDto
{
    public Guid Id { get; set; }
    public string TipoArreglo { get; set; } = string.Empty;
    public string? MedidasEspecificas { get; set; }
    public string? ObservacionesTaller { get; set; }
    public string? SastreAsignado { get; set; }
    public bool RequierePruebaPrevia { get; set; }
    public DateTime? FechaPrueba { get; set; }
}

public class DetalleOrdenItemDto
{
    public Guid Id { get; set; }
    public string PrendaDescripcion { get; set; } = string.Empty;
    public TipoServicio TipoServicio { get; set; }
    public int Cantidad { get; set; } = 1;
    public decimal PesoKg { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal => Cantidad > 0 && PesoKg > 0 ? PesoKg * PrecioUnitario : Cantidad * PrecioUnitario;
    public string? ColorPrenda { get; set; }
    public string? MarcaOEtiqueta { get; set; }
    public string? DefectosPrevios { get; set; }
    public string? UbicacionEstante { get; set; }
    public EstadoOrden EstadoItem { get; set; } = EstadoOrden.Recibido;
    public DetalleSastreriaDto? Sastreria { get; set; }
}

public class OrdenServicioDto
{
    public Guid Id { get; set; }
    public string NumeroTicket { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;
    public Guid ClienteId { get; set; }
    public string ClienteNombre { get; set; } = string.Empty;
    public string ClienteTelefono { get; set; } = string.Empty;
    public bool ClienteEsHotel { get; set; }
    
    public EstadoOrden Estado { get; set; } = EstadoOrden.Recibido;
    public DateTime FechaRecepcion { get; set; } = DateTime.Now;
    public DateTime FechaPromesaEntrega { get; set; } = DateTime.Now.AddDays(1);
    public DateTime? FechaEntregaReal { get; set; }

    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal ImpuestoITBIS { get; set; }
    public decimal Total { get; set; }
    public decimal TotalAbonado { get; set; }
    public decimal SaldoPendiente => Total - TotalAbonado;

    public bool EsUrgente { get; set; }
    public string? ObservacionesRecepcion { get; set; }
    public string? AtendidoPor { get; set; }

    public List<DetalleOrdenItemDto> Items { get; set; } = new();
    public int CantidadTotalPiezas => Items.Sum(i => i.Cantidad);
}

public class MaquinaAutoservicioDto
{
    public Guid Id { get; set; }
    public string CodigoIdentificador { get; set; } = string.Empty;
    public string NombreDescriptivo { get; set; } = string.Empty;
    public TipoMaquina Tipo { get; set; }
    public EstadoMaquina Estado { get; set; } = EstadoMaquina.Disponible;

    public decimal CapacidadLibras { get; set; }
    public decimal PrecioPorCicloMonedas { get; set; }
    public int CantidadMonedasPorCiclo { get; set; }
    public int DuracionCicloMinutos { get; set; }

    public DateTime? HoraInicioCicloActual { get; set; }
    public int MinutosRestantes { get; set; }
    public int TotalCiclosHistoricos { get; set; }
    public decimal RecaudacionCajetinActual { get; set; }
    public DateTime? UltimoMantenimiento { get; set; }
    public string? NotasOperativas { get; set; }
}

public class InsumoInventarioDto
{
    public Guid Id { get; set; }
    public string CodigoBarras { get; set; } = string.Empty;
    public string NombreInsumo { get; set; } = string.Empty;
    public CategoriaInsumo Categoria { get; set; }
    public string UnidadMedida { get; set; } = "Unidades";
    public decimal StockActual { get; set; }
    public decimal StockMinimoAlerta { get; set; }
    public decimal CostoUnitarioCompra { get; set; }
    public decimal? PrecioVentaDirecta { get; set; }
    public bool EstaBajoStockMinimo => StockActual <= StockMinimoAlerta;
    public string? ProveedorPrincipal { get; set; }
}

public class TransaccionCajaDto
{
    public Guid Id { get; set; }
    public DateTime FechaHora { get; set; }
    public TipoTransaccionCaja TipoTransaccion { get; set; }
    public MetodoPago MetodoPago { get; set; }
    public decimal Monto { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string? ReferenciaComprobante { get; set; }
    public string? ClienteNombre { get; set; }
}

public class TurnoCajaDto
{
    public Guid Id { get; set; }
    public string CajeroUsuario { get; set; } = string.Empty;
    public DateTime FechaHoraApertura { get; set; }
    public decimal FondoInicialEfectivo { get; set; }
    public DateTime? FechaHoraCierre { get; set; }
    public decimal TotalEfectivoCalculado { get; set; }
    public decimal TotalTarjetaCalculado { get; set; }
    public decimal TotalTransferenciaCalculado { get; set; }
    public decimal TotalMonedasFichasCalculado { get; set; }
    public decimal TotalIngresosDia => TotalEfectivoCalculado + TotalTarjetaCalculado + TotalTransferenciaCalculado + TotalMonedasFichasCalculado;
    public EstadoTurnoCaja Estado { get; set; } = EstadoTurnoCaja.Abierto;
    public List<TransaccionCajaDto> Transacciones { get; set; } = new();
}

public class DashboardMetricasDto
{
    public decimal VentasHoy { get; set; }
    public int OrdenesPendientes { get; set; }
    public int PrendasEnTaller { get; set; }
    public int MaquinasEnUso { get; set; }
    public int MaquinasDisponibles { get; set; }
    public int AlertasInsumosBajoStock { get; set; }
    public decimal SaldoPendienteCobroHoteles { get; set; }
    public List<OrdenServicioDto> UltimasOrdenes { get; set; } = new();
    public List<InsumoInventarioDto> InsumosCriticos { get; set; } = new();
}
