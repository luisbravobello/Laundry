namespace SyncOps.Laundry.Domain.Enums;

public enum TipoServicio
{
    LavadoPieza = 1,
    Planchado = 2,
    LavadoYPlanchado = 3,
    Sastreria = 4,
    HotelVolumen = 5,
    AutoservicioMonedas = 6
}

public enum EstadoOrden
{
    Recibido = 1,
    EnLavado = 2,
    EnSastreria = 3,
    EnPlanchado = 4,
    ListoParaEntrega = 5,
    Entregado = 6,
    Cancelado = 7
}

public enum TipoMaquina
{
    TorreLavadoraSecadoraMonedas = 1,
    IndustrialGranVolumen = 2
}

public enum EstadoMaquina
{
    Disponible = 1,
    EnCiclo = 2,
    Mantenimiento = 3,
    FueraServicio = 4
}

public enum MetodoPago
{
    Efectivo = 1,
    Tarjeta = 2,
    Transferencia = 3,
    MonedasFichas = 4,
    CreditoCorporativo = 5
}

public enum TipoTransaccionCaja
{
    AperturaTurno = 1,
    CobroOrden = 2,
    VentaFichas = 3,
    VentaInsumo = 4,
    GastoOperativo = 5,
    CierreTurno = 6
}

public enum EstadoTurnoCaja
{
    Abierto = 1,
    Cerrado = 2
}

public enum CategoriaInsumo
{
    Detergentes = 1,
    Suavizantes = 2,
    Quitamanchas = 3,
    FundasYGanchos = 4,
    SastreriaCostura = 5,
    Accesorios = 6
}
