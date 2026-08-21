using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;
using SyncOps.Laundry.Infrastructure.Persistence;

namespace SyncOps.Laundry.Infrastructure.Persistence;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // 1. Catálogo de Prendas y Servicios
        if (!await context.CatalogoPrendas.AnyAsync())
        {
            var catalogo = new List<CatalogoPrendaServicio>
            {
                // Lavado / Planchado
                new() { NombrePrenda = "Camisa de Vestir / Manga Larga", CategoriaPrenda = "Ropa Formal", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 180, Icono = "Shirt" },
                new() { NombrePrenda = "Pantalón de Vestir / Gabardina", CategoriaPrenda = "Ropa Formal", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 200, Icono = "Pants" },
                new() { NombrePrenda = "Traje Completo (2 Piezas)", CategoriaPrenda = "Ropa Formal", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 450, Icono = "Suit" },
                new() { NombrePrenda = "Vestido Casual", CategoriaPrenda = "Ropa Casual", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 250, Icono = "Dress" },
                new() { NombrePrenda = "Vestido de Gala / Fiesta", CategoriaPrenda = "Ropa Formal", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 550, Icono = "Dress" },
                new() { NombrePrenda = "Jeans / Pantalón Casual", CategoriaPrenda = "Ropa Casual", TipoServicio = TipoServicio.LavadoPieza, PrecioSugerido = 150, Icono = "Pants" },
                new() { NombrePrenda = "T-Shirt / Poloshirt", CategoriaPrenda = "Ropa Casual", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 140, Icono = "TShirt" },
                new() { NombrePrenda = "Planchado Sólo Camisa", CategoriaPrenda = "Ropa Casual", TipoServicio = TipoServicio.Planchado, PrecioSugerido = 90, Icono = "Iron" },
                new() { NombrePrenda = "Planchado Sólo Pantalón", CategoriaPrenda = "Ropa Casual", TipoServicio = TipoServicio.Planchado, PrecioSugerido = 100, Icono = "Iron" },
                new() { NombrePrenda = "Edredón / Acolchado King Size", CategoriaPrenda = "Ropa de Cama", TipoServicio = TipoServicio.LavadoPieza, PrecioSugerido = 600, Icono = "Bed" },
                new() { NombrePrenda = "Juego de Sábanas Completo", CategoriaPrenda = "Ropa de Cama", TipoServicio = TipoServicio.LavadoYPlanchado, PrecioSugerido = 350, Icono = "Bed" },
                
                // Servicios Corporativos / Hoteles por Kilo o Lote
                new() { NombrePrenda = "Lote Toallas Hotel (x Kilo)", CategoriaPrenda = "Hotelería", TipoServicio = TipoServicio.HotelVolumen, PrecioSugerido = 75, Icono = "Towel" },
                new() { NombrePrenda = "Lote Mantelería y Servilletas (x Kilo)", CategoriaPrenda = "Restaurantes", TipoServicio = TipoServicio.HotelVolumen, PrecioSugerido = 95, Icono = "Restaurant" },

                // Sastrería y Costura
                new() { NombrePrenda = "Ruedo / Dobladillo de Pantalón", CategoriaPrenda = "Sastrería", TipoServicio = TipoServicio.Sastreria, PrecioSugerido = 250, Icono = "Scissors" },
                new() { NombrePrenda = "Ajuste de Cintura / Entalle", CategoriaPrenda = "Sastrería", TipoServicio = TipoServicio.Sastreria, PrecioSugerido = 350, Icono = "Scissors" },
                new() { NombrePrenda = "Cambio de Zipper / Cremallera", CategoriaPrenda = "Sastrería", TipoServicio = TipoServicio.Sastreria, PrecioSugerido = 300, Icono = "Zipper" },
                new() { NombrePrenda = "Entalle de Camisa / Mangas", CategoriaPrenda = "Sastrería", TipoServicio = TipoServicio.Sastreria, PrecioSugerido = 300, Icono = "Scissors" },
                new() { NombrePrenda = "Ajuste de Vestido a la Medida", CategoriaPrenda = "Sastrería", TipoServicio = TipoServicio.Sastreria, PrecioSugerido = 500, Icono = "Dress" },
            };

            await context.CatalogoPrendas.AddRangeAsync(catalogo);
        }

        // 2. Máquinas de Autoservicio (Torres con Monedas y Gran Volumen)
        if (!await context.MaquinasAutoservicio.AnyAsync())
        {
            var maquinas = new List<MaquinaAutoservicio>
            {
                new()
                {
                    CodigoIdentificador = "TORRE-01",
                    NombreDescriptivo = "Torre Speed Queen Monedas #1 (Lav/Sec)",
                    Tipo = TipoMaquina.TorreLavadoraSecadoraMonedas,
                    Estado = EstadoMaquina.Disponible,
                    CapacidadLibras = 30,
                    PrecioPorCicloMonedas = 175,
                    CantidadMonedasPorCiclo = 3,
                    DuracionCicloMinutos = 35,
                    TotalCiclosHistoricos = 142,
                    RecaudacionCajetinActual = 525,
                    NotasOperativas = "Ubicación en fila A. Acepta monedas de $25 o fichas SyncOps."
                },
                new()
                {
                    CodigoIdentificador = "TORRE-02",
                    NombreDescriptivo = "Torre Speed Queen Monedas #2 (Lav/Sec)",
                    Tipo = TipoMaquina.TorreLavadoraSecadoraMonedas,
                    Estado = EstadoMaquina.EnCiclo,
                    HoraInicioCicloActual = DateTime.Now.AddMinutes(-18),
                    CapacidadLibras = 30,
                    PrecioPorCicloMonedas = 175,
                    CantidadMonedasPorCiclo = 3,
                    DuracionCicloMinutos = 35,
                    TotalCiclosHistoricos = 198,
                    RecaudacionCajetinActual = 875,
                    NotasOperativas = "Ciclo en progreso. Tiempo restante aprox 17 min."
                },
                new()
                {
                    CodigoIdentificador = "TORRE-03",
                    NombreDescriptivo = "Torre Speed Queen Monedas #3 (Lav/Sec)",
                    Tipo = TipoMaquina.TorreLavadoraSecadoraMonedas,
                    Estado = EstadoMaquina.Disponible,
                    CapacidadLibras = 30,
                    PrecioPorCicloMonedas = 175,
                    CantidadMonedasPorCiclo = 3,
                    DuracionCicloMinutos = 35,
                    TotalCiclosHistoricos = 85,
                    RecaudacionCajetinActual = 350
                },
                new()
                {
                    CodigoIdentificador = "IND-LAV-01",
                    NombreDescriptivo = "Lavadora Industrial Gran Volumen 75 Lbs",
                    Tipo = TipoMaquina.IndustrialGranVolumen,
                    Estado = EstadoMaquina.Disponible,
                    CapacidadLibras = 75,
                    PrecioPorCicloMonedas = 450,
                    CantidadMonedasPorCiclo = 8,
                    DuracionCicloMinutos = 45,
                    TotalCiclosHistoricos = 320,
                    RecaudacionCajetinActual = 0,
                    NotasOperativas = "Para edredones grandes y lotes hoteleros."
                },
                new()
                {
                    CodigoIdentificador = "IND-SEC-01",
                    NombreDescriptivo = "Secadora Industrial Gas Alto Rendimiento 80 Lbs",
                    Tipo = TipoMaquina.IndustrialGranVolumen,
                    Estado = EstadoMaquina.EnCiclo,
                    HoraInicioCicloActual = DateTime.Now.AddMinutes(-10),
                    CapacidadLibras = 80,
                    PrecioPorCicloMonedas = 400,
                    CantidadMonedasPorCiclo = 8,
                    DuracionCicloMinutos = 40,
                    TotalCiclosHistoricos = 410,
                    RecaudacionCajetinActual = 1200,
                    NotasOperativas = "Secado rápido para clientes institucionales."
                }
            };

            await context.MaquinasAutoservicio.AddRangeAsync(maquinas);
        }

        // 3. Insumos e Inventario
        if (!await context.InsumosInventario.AnyAsync())
        {
            var insumos = new List<InsumoInventario>
            {
                new() { CodigoBarras = "746001001", NombreInsumo = "Detergente Líquido Industrial Bio-Clean (Galón)", Categoria = CategoriaInsumo.Detergentes, UnidadMedida = "Galones", StockActual = 18, StockMinimoAlerta = 5, CostoUnitarioCompra = 450, ProveedorPrincipal = "Químicos del Caribe" },
                new() { CodigoBarras = "746001002", NombreInsumo = "Suavizante Textil Aroma Fresh (Galón)", Categoria = CategoriaInsumo.Suavizantes, UnidadMedida = "Galones", StockActual = 4, StockMinimoAlerta = 6, CostoUnitarioCompra = 380, ProveedorPrincipal = "Químicos del Caribe" }, // Alerta bajo stock
                new() { CodigoBarras = "746001003", NombreInsumo = "Quitamanchas Grasa y Óxido Oxy-Power (Litro)", Categoria = CategoriaInsumo.Quitamanchas, UnidadMedida = "Litros", StockActual = 8, StockMinimoAlerta = 3, CostoUnitarioCompra = 320, ProveedorPrincipal = "Químicos del Caribe" },
                new() { CodigoBarras = "746001004", NombreInsumo = "Fundas Plásticas Protectoras para Ropa (Rollo 500 uds)", Categoria = CategoriaInsumo.FundasYGanchos, UnidadMedida = "Rollos", StockActual = 3, StockMinimoAlerta = 2, CostoUnitarioCompra = 1200, ProveedorPrincipal = "Plásticos Industriales" },
                new() { CodigoBarras = "746001005", NombreInsumo = "Ganchos de Alambre Reforzados (Caja 500 uds)", Categoria = CategoriaInsumo.FundasYGanchos, UnidadMedida = "Cajas", StockActual = 2, StockMinimoAlerta = 3, CostoUnitarioCompra = 1100, ProveedorPrincipal = "Plásticos Industriales" }, // Alerta bajo stock
                new() { CodigoBarras = "746001006", NombreInsumo = "Hilos Gutermann Surtidos Taller Sastrería (Cono)", Categoria = CategoriaInsumo.SastreriaCostura, UnidadMedida = "Conos", StockActual = 24, StockMinimoAlerta = 10, CostoUnitarioCompra = 180, ProveedorPrincipal = "Importadora Textil" },
                new() { CodigoBarras = "746001007", NombreInsumo = "Cremalleras / Zippers YKK Metálicas y Nylon (Pack 20)", Categoria = CategoriaInsumo.SastreriaCostura, UnidadMedida = "Packs", StockActual = 12, StockMinimoAlerta = 5, CostoUnitarioCompra = 450, ProveedorPrincipal = "Importadora Textil" },
                new() { CodigoBarras = "746001008", NombreInsumo = "Sobre Monodosis Detergente Autoservicio", Categoria = CategoriaInsumo.Detergentes, UnidadMedida = "Sobres", StockActual = 85, StockMinimoAlerta = 30, CostoUnitarioCompra = 15, PrecioVentaDirecta = 40, ProveedorPrincipal = "Químicos del Caribe" }
            };

            await context.InsumosInventario.AddRangeAsync(insumos);
        }

        // 4. Clientes Iniciales
        if (!await context.Clientes.AnyAsync())
        {
            var cliente1 = new Cliente
            {
                NombreCompleto = "Carlos Manuel Fernández",
                Telefono = "809-555-1234",
                Email = "carlos.fernandez@email.com",
                Direccion = "Av. Winston Churchill #45, Piantini",
                EsCorporativoHotel = false,
                SaldoPendiente = 0
            };

            var cliente2 = new Cliente
            {
                NombreCompleto = "Hotel Boutique Colonial Santo Domingo",
                Telefono = "809-688-9000",
                Email = "operaciones@hotelcolonial.do",
                RNC = "131-98765-4",
                Direccion = "Calle Las Damas #12, Zona Colonial",
                EsCorporativoHotel = true,
                SaldoPendiente = 18500,
                LimiteCredito = 50000,
                Notas = "Servicio semanal de toallas y sábanas. Facturación a crédito 30 días."
            };

            var cliente3 = new Cliente
            {
                NombreCompleto = "María Elena Almonte",
                Telefono = "829-444-7890",
                Email = "maria.almonte@gmail.com",
                Direccion = "C/ Federico Geraldino #88",
                EsCorporativoHotel = false,
                SaldoPendiente = 0
            };

            await context.Clientes.AddRangeAsync(cliente1, cliente2, cliente3);
            await context.SaveChangesAsync();

            // 5. Órdenes Iniciales de Prueba
            var orden1 = new OrdenServicio
            {
                NumeroTicket = "SAS-2608-001",
                CodigoBarras = "202608210001",
                ClienteId = cliente1.Id,
                Estado = EstadoOrden.EnSastreria,
                FechaRecepcion = DateTime.Now.AddHours(-3),
                FechaPromesaEntrega = DateTime.Now.AddDays(2),
                Subtotal = 550,
                Total = 550,
                TotalAbonado = 300,
                EsUrgente = false,
                AtendidoPor = "Luis Bravo (Recepción)",
                ObservacionesRecepcion = "Cliente solicita entalle ceñido y ruedo a 39 pulgadas.",
                Items = new List<DetalleOrdenItem>
                {
                    new()
                    {
                        PrendaDescripcion = "Pantalón de Vestir Azul Marino",
                        TipoServicio = TipoServicio.Sastreria,
                        Cantidad = 1,
                        PrecioUnitario = 350,
                        ColorPrenda = "Azul Marino",
                        MarcaOEtiqueta = "Zara Man",
                        UbicacionEstante = "TALLER-M1",
                        EstadoItem = EstadoOrden.EnSastreria,
                        Sastreria = new DetalleSastreria
                        {
                            TipoArreglo = "Ajuste de Cintura + Ruedo",
                            MedidasEspecificas = "Reducir 2.5 cm de cintura, ruedo a 39 pulg.",
                            ObservacionesTaller = "Usar hilo color marino exacto",
                            SastreAsignado = "Maestro Juan Costura"
                        }
                    },
                    new()
                    {
                        PrendaDescripcion = "Camisa de Lino Blanco",
                        TipoServicio = TipoServicio.LavadoYPlanchado,
                        Cantidad = 1,
                        PrecioUnitario = 200,
                        ColorPrenda = "Blanco",
                        UbicacionEstante = "G-08",
                        EstadoItem = EstadoOrden.Recibido
                    }
                }
            };

            var orden2 = new OrdenServicio
            {
                NumeroTicket = "HOT-2608-002",
                CodigoBarras = "202608210002",
                ClienteId = cliente2.Id,
                Estado = EstadoOrden.EnLavado,
                FechaRecepcion = DateTime.Now.AddHours(-1),
                FechaPromesaEntrega = DateTime.Now.AddDays(1),
                Subtotal = 4500,
                Total = 4500,
                TotalAbonado = 0,
                EsUrgente = true,
                AtendidoPor = "Luis Bravo",
                ObservacionesRecepcion = "Lote urgente para huéspedes del fin de semana.",
                Items = new List<DetalleOrdenItem>
                {
                    new()
                    {
                        PrendaDescripcion = "Lote Toallas Grandes Blancas (Hotel)",
                        TipoServicio = TipoServicio.HotelVolumen,
                        Cantidad = 1,
                        PesoKg = 60,
                        PrecioUnitario = 75,
                        UbicacionEstante = "LAV-IND-01",
                        EstadoItem = EstadoOrden.EnLavado
                    }
                }
            };

            var orden3 = new OrdenServicio
            {
                NumeroTicket = "LAV-2608-003",
                CodigoBarras = "202608210003",
                ClienteId = cliente3.Id,
                Estado = EstadoOrden.ListoParaEntrega,
                FechaRecepcion = DateTime.Now.AddDays(-1),
                FechaPromesaEntrega = DateTime.Now,
                Subtotal = 730,
                Total = 730,
                TotalAbonado = 730,
                EsUrgente = false,
                AtendidoPor = "Ana Recepción",
                Items = new List<DetalleOrdenItem>
                {
                    new()
                    {
                        PrendaDescripcion = "Vestido de Fiesta Rojo",
                        TipoServicio = TipoServicio.LavadoYPlanchado,
                        Cantidad = 1,
                        PrecioUnitario = 550,
                        ColorPrenda = "Rojo Carmín",
                        UbicacionEstante = "ENTREGA-G14",
                        EstadoItem = EstadoOrden.ListoParaEntrega
                    },
                    new()
                    {
                        PrendaDescripcion = "Camisa Manga Larga",
                        TipoServicio = TipoServicio.LavadoYPlanchado,
                        Cantidad = 1,
                        PrecioUnitario = 180,
                        ColorPrenda = "Rayas Azules",
                        UbicacionEstante = "ENTREGA-G14",
                        EstadoItem = EstadoOrden.ListoParaEntrega
                    }
                }
            };

            await context.OrdenesServicio.AddRangeAsync(orden1, orden2, orden3);
        }

        // 6. Turno de Caja Abierto
        if (!await context.TurnosCaja.AnyAsync())
        {
            var turno = new TurnoCaja
            {
                CajeroUsuario = "Luis Bravo (Admin / Cajero)",
                FechaHoraApertura = DateTime.Now.Date.AddHours(8),
                FondoInicialEfectivo = 3000,
                Estado = EstadoTurnoCaja.Abierto,
                Transacciones = new List<TransaccionCaja>
                {
                    new()
                    {
                        TipoTransaccion = TipoTransaccionCaja.AperturaTurno,
                        MetodoPago = MetodoPago.Efectivo,
                        Monto = 3000,
                        Concepto = "Apertura de Turno - Fondo Base",
                        ClienteNombre = "Sistema"
                    },
                    new()
                    {
                        TipoTransaccion = TipoTransaccionCaja.CobroOrden,
                        MetodoPago = MetodoPago.Efectivo,
                        Monto = 300,
                        Concepto = "Abono Inicial Ticket SAS-2608-001",
                        ClienteNombre = "Carlos Manuel Fernández"
                    },
                    new()
                    {
                        TipoTransaccion = TipoTransaccionCaja.CobroOrden,
                        MetodoPago = MetodoPago.Tarjeta,
                        Monto = 730,
                        Concepto = "Pago Completo Ticket LAV-2608-003",
                        ClienteNombre = "María Elena Almonte",
                        ReferenciaComprobante = "AUTH-9941"
                    },
                    new()
                    {
                        TipoTransaccion = TipoTransaccionCaja.VentaFichas,
                        MetodoPago = MetodoPago.Efectivo,
                        Monto = 525,
                        Concepto = "Venta 3 Fichas Autoservicio Torre 01",
                        ClienteNombre = "Cliente Autoservicio"
                    }
                }
            };

            await context.TurnosCaja.AddAsync(turno);
        }

        await context.SaveChangesAsync();
    }
}
