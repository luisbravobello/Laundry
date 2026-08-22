# Especificación de Requisitos de Software (SRS)
## SyncOps — Laundry, Dry Cleaning, Tailoring & Billing Suite
**Estándar de Referencia:** IEEE Std 830-1998 / ISO/IEC/IEEE 29148  
**Versión:** 2.0 (Producción)  
**Fecha de Emisión:** Agosto 2026  
**Estado:** Aprobado / En Producción  

---

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es especificar de manera formal y detallada los **Requisitos Funcionales (RF)** y **Requisitos No Funcionales (RNF)** para el sistema **SyncOps Suite**, una plataforma integral de planificación de recursos empresariales (ERP) y Punto de Venta (POS) diseñada para tintorerías, lavanderías comerciales, talleres de sastrería y atención a clientes corporativos/hoteleros.

### 1.2 Alcance del Software
SyncOps centraliza y automatiza el ciclo de vida completo del negocio de lavandería:
- Recepción rápida en mostrador y autoservicio.
- Registro detallado de prendas con medidas y especificaciones de sastrería.
- Flujo de producción y lavado en taller bajo metodología Kanban de 4 etapas.
- Facturación electrónica comercial con cálculo de ITBIS, descuentos y recargos express.
- Control de caja chica, abonos parciales, créditos hoteleros y arqueos diarios.
- Impresión térmica directa con código de barras Code128 para impresoras EPSON TM-T20II (58mm/80mm).
- Control de acceso basado en roles (RBAC) con separación estricta entre Administrador y Cajero.
- Generación y exportación de reportes a Microsoft Excel y respaldos de base de datos en caliente.

### 1.3 Definiciones, Acrónimos y Abreviaturas
- **POS:** *Point of Sale* (Punto de Venta / Mostrador).
- **RBAC:** *Role-Based Access Control* (Control de Acceso Basado en Roles).
- **JWT:** *JSON Web Token* (Estándar abierto para autenticación segura RFC 7519).
- **ESC/POS:** Lenguaje de comandos estándar para impresoras térmicas de tickets.
- **Kanban:** Tablero visual de gestión del flujo de trabajo por columnas de estado.
- **RNC:** Registro Nacional de Contribuyentes (Identificación fiscal).
- **ITBIS:** Impuesto sobre Transferencias de Bienes Industrializados y Servicios (18%).

---

## 2. Descripción General

### 2.1 Perspectiva del Producto
SyncOps opera bajo una arquitectura cliente-servidor desacoplada:
1. **Backend:** Web API RESTful desarrollada en .NET 8 (C#) con Entity Framework Core y SQLite en modo WAL (Write-Ahead Logging).
2. **Frontend:** Single Page Application (SPA) modular en JavaScript Vanilla (ES6+) y CSS nativo con diseño Fortexa ERP sin dependencias externas pesadas.
3. **Servicio de Impresión:** Controlador ESC/POS monocromático puro integrado para tickets térmicos de 58mm y 80mm.

### 2.2 Perfiles de Usuario y Roles del Sistema

| Rol | Descripción | Nivel de Acceso y Pantallas Permitidas |
|---|---|---|
| **Administrador General** (`Admin`) | Propietario o Gerente del negocio con control total. | Panel Principal (Dashboard), POS, Operaciones & Taller, Facturación, Reportes Financieros, Inventario Insumos, Clientes & Hoteles, Configuración de Tienda, Gestión de Usuarios, FAQ, Ayuda & Backups. |
| **Cajero / Ventas** (`Cajero`) | Personal de mostrador y cobros. | Acceso predeterminado al POS, Operaciones & Taller, Facturas & Cobros, Clientes & Hoteles, FAQ y Ayuda. **Restringido:** No tiene acceso a Dashboard gerencial, Reportes de ganancias, Inventario de costos, Configuración de tienda, ni Gestión de usuarios. |
| **Operario de Taller** (`Empleado`) | Personal de lavado, planchado y sastrería. | Operaciones & Taller (Kanban de producción), consulta de tickets y entrega física de prendas. |

---

## 3. Requisitos Funcionales (RF) — ISO / IEEE 830

### RF-01: Autenticación y Control de Acceso Basado en Roles (RBAC)
- **RF-01.1:** El sistema debe autenticar a los usuarios mediante credenciales únicas (correo electrónico y contraseña encriptada con ASP.NET Core Identity).
- **RF-01.2:** El sistema debe emitir un token de acceso JWT firmado con expiración corta (15 minutos) almacenado en memoria/sessionStorage y un Refresh Token seguro en cookie `httpOnly`, `Secure`, `SameSite=Strict`.
- **RF-01.3:** La interfaz de usuario debe ocultar dinámicamente los módulos administrativos (Dashboard, Reportes, Inventario, Configuración, Usuarios) a los usuarios con rol `Cajero` o `Empleado`.
- **RF-01.4:** El backend debe validar en cada endpoint de API los claims del token mediante atributos `[Authorize(Roles = "Administrador")]`.
- **RF-01.5:** Si un usuario sin privilegios intenta navegar mediante URL forzada o teclado a una sección restringida, el sistema debe bloquear la navegación y emitir una alerta toast de acceso restringido.

### RF-02: Punto de Venta (POS) y Recepción de Prendas
- **RF-02.1:** El POS debe permitir seleccionar un cliente existente por nombre o teléfono, o asociar automáticamente la orden al cliente por defecto "Cliente Mostrador".
- **RF-02.2:** El sistema debe permitir seleccionar artículos del catálogo rápido o ingresar prendas personalizadas con descripción, cantidad, categoría, color/tela y observaciones de defectos previos.
- **RF-02.3:** El campo de precio unitario en el POS debe iniciar vacío (`placeholder="0.00"`) para evitar cobros erróneos accidentales, pero autocompletarse al hacer clic en un ítem del catálogo.
- **RF-02.4:** El sistema debe soportar la casilla de verificación "Servicio Urgente / Entrega Express", aplicando automáticamente un recargo configurable del 25% y marcando la orden como prioritaria.
- **RF-02.5:** El sistema debe permitir aplicar descuentos en monto directo y activar/desactivar el cálculo del 18% de ITBIS con desglose transparente.

### RF-03: Módulo Especializado de Sastrería & Taller
- **RF-03.1:** Al seleccionar la categoría "Sastrería", el sistema debe desplegar un cajón específico con campos obligatorios para "Tipo de Arreglo" (ej. Dobladillo, cambio de zipper, entalle) y "Medidas / Indicaciones" (en cm o pulgadas).
- **RF-03.2:** Las especificaciones de sastrería deben imprimirse en una sección destacada del ticket térmico y mostrarse en la tarjeta de producción del taller.

### RF-04: Gestión de Catálogo de Precios (Solo Administrador)
- **RF-04.1:** El botón "Agregar Servicio" del catálogo debe ser visible y ejecutable exclusivamente para el rol `Administrador`.
- **RF-04.2:** El administrador debe poder crear, editar precios base, asignar categorías y previsualizar iconos vectoriales automáticos para cualquier prenda o servicio.

### RF-05: Flujo de Operaciones & Taller Kanban (4 Fases)
- **RF-05.1:** Las órdenes ingresadas deben organizarse en un tablero Kanban interactivo en cuatro columnas secuenciales:
  1. **Recepción:** Prenda recibida en mostrador, pendiente de ingresar a tina/máquina.
  2. **Lavado & Proceso:** Prenda en ciclo de lavado, desmanchado, secado o confección.
  3. **Listo:** Prenda planchada, doblada, embolsada y colgada en percha lista para entregar.
  4. **Entregado:** Prenda retirada físicamente por el cliente con pago validado.
- **RF-05.2:** El sistema debe permitir avanzar o retroceder el estado de una prenda con un solo clic según el control de calidad.
- **RF-05.3:** El módulo debe permitir búsqueda instantánea por número de ticket (`FAC-XXXXXX`) o nombre de cliente.

### RF-06: Facturación, Cobros & Abonos Parciales
- **RF-06.1:** El sistema debe generar números de comprobante correlativos secuenciales y únicos (ej. `FAC-001001`).
- **RF-06.2:** El sistema debe permitir registrar pagos completos o abonos parciales en múltiples métodos: Efectivo, Tarjeta de Crédito/Débito, Transferencia Bancaria o Crédito Hotelero.
- **RF-06.3:** Si el monto abonado es menor al total, la factura debe quedar en estado "Pendiente" reflejando el saldo deudor exacto en color rojo.
- **RF-06.4:** El sistema debe permitir reimprimir el ticket térmico interactivo de cualquier factura en cualquier momento.

### RF-07: Arqueo de Caja y Movimientos Diarios
- **RF-07.1:** Todo cobro o abono procesado debe registrar un movimiento de entrada en la caja chica vinculado al usuario de turno.
- **RF-07.2:** El sistema debe calcular el balance total de caja del día desglosado por método de pago.

### RF-08: Gestión de Clientes, Créditos y Cuentas Corporativas
- **RF-08.1:** El sistema debe almacenar nombre, teléfono, RNC/cédula, tipo de cliente (Particular o Hotel/Corporativo) y límite de crédito aprobado.
- **RF-08.2:** El sistema debe calcular el balance deudor total acumulado por cliente en tiempo real.

### RF-09: Inventario de Insumos & Costos (Solo Administrador)
- **RF-09.1:** Registro de insumos químicos, ganchos, fundas y detergentes con código, stock actual, stock mínimo de alerta, unidad de medida, costo unitario y proveedor.
- **RF-09.2:** Alerta visual automática cuando el stock caiga por debajo del umbral mínimo.

### RF-10: Impresión Térmica Directa ESC/POS con Código de Barras
- **RF-10.1:** Generación de tickets monocromáticos puros de 80mm y 58mm optimizados para impresoras térmicas EPSON TM-T20II.
- **RF-10.2:** Inclusión de código de barras Code128 de alta legibilidad para pistolas lectoras láser, corte de papel automático y datos fiscales de la tienda.

### RF-11: Reportes Financieros y Gráficas de Rendimiento
- **RF-11.1:** Métricas en vivo de Total Facturado, Ingresos Recaudados, Cuentas por Cobrar y Ganancia Neta.
- **RF-11.2:** Gráfica interactiva de distribución de ingresos por categoría de servicio.

### RF-12: Exportación a Microsoft Excel / CSV
- **RF-12.1:** Descarga inmediata de archivos `.csv` formateados con codificación UTF-8 con BOM (Byte Order Mark) para compatibilidad nativa con Microsoft Excel en español sin caracteres rotos.

### RF-13: Búsqueda Global y Paleta de Comandos (`Ctrl + K`)
- **RF-13.1:** Acceso mediante atajo de teclado `Ctrl + K` o barra superior a un buscador universal.
- **RF-13.2:** Adaptación según el rol activo: búsqueda en facturas, clientes e insumos de costos para Administrador; búsqueda restringida únicamente a facturas y clientes para Cajero.

### RF-14: Gestión de Usuarios y Seguridad
- **RF-14.1:** Panel exclusivo para Administrador para crear nuevas cuentas, asignar roles (`Administrador`, `Cajero`, `Empleado`) y bloquear/desbloquear accesos al instante.

### RF-15: Respaldo de Base de Datos en Caliente (SQLite Backup)
- **RF-15.1:** Descarga con un clic del archivo `.db` íntegro mediante la API de copia de seguridad en caliente de SQLite sin interrumpir las operaciones.

---

## 4. Requisitos No Funcionales (RNF) — Calidad del Software

### RNF-01: Rendimiento y Tiempos de Respuesta
- **RNF-01.1:** Las respuestas de los endpoints de la API deben completarse en menos de **150 ms** en condiciones estándar de operación local.
- **RNF-01.2:** Las transiciones de interfaz y cálculos reactivos en el POS deben procesarse en menos de **30 ms**.

### RNF-02: Seguridad y Protección de Datos
- **RNF-02.1:** Contraseñas hasheadas con algoritmo PBKDF2 con HMAC-SHA256 y sal aleatoria.
- **RNF-02.2:** Forzado estricto de HTTPS / TLS en transporte.
- **RNF-02.3:** Protección contra Cross-Site Scripting (XSS) y Cross-Origin Resource Sharing (CORS) configurado para orígenes de cliente explícitos.
- **RNF-02.4:** Prevención de inyección SQL mediante el uso de Entity Framework Core con consultas parametrizadas.

### RNF-03: Usabilidad y Estética Visual (Fortexa Design System)
- **RNF-03.1:** Prohibición absoluta de emojis en la interfaz de usuario; todos los elementos deben usar iconografía vectorial SVG simétrica y profesional.
- **RNF-03.2:** Tipografía corporativa legible basada en **Inter** para interfaces y **JetBrains Mono** para cifras numéricas, monedas y códigos correlativos.
- **RNF-03.3:** Paleta de colores armoniosa basada en azul marino `#0B132B`, azul zafiro `#2563EB`, esmeralda `#059669` y ámbar `#D97706`.

### RNF-04: Confiabilidad y Tolerancia a Fallos
- **RNF-04.1:** La base de datos SQLite debe operar en modo **WAL (Write-Ahead Logging)** garantizando transacciones ACID y previniendo bloqueos durante lecturas y escrituras simultáneas.

### RNF-05: Mantenibilidad y Modularidad
- **RNF-05.1:** Separación estricta entre capa de controladores Web API, DTOs de transferencia de datos, modelos de entidad de dominio y capa de presentación web.

### RNF-06: Compatibilidad de Hardware
- **RNF-06.1:** Soporte de impresión nativo para impresoras térmicas de 58mm y 80mm (EPSON, Star Micronics, Xprinter, Bixolon, POS-58/80).
- **RNF-06.2:** Compatibilidad con lectores de código de barras USB/Bluetooth en modo emulación de teclado.

---

## 5. Matriz de Trazabilidad de Requisitos

| ID Requisito | Módulo del Sistema | Rol Requerido | Endpoint Backend / Componente Frontend |
|---|---|---|---|
| **RF-01** | Autenticación | Todos / RBAC | `POST /api/auth/login`, `POST /api/auth/refresh` |
| **RF-02** | Punto de Venta (POS) | Administrador / Cajero | `POST /api/ordenes`, `GET /api/catalogo` |
| **RF-03** | Sastrería & Taller | Administrador / Cajero | `#tailoringDrawer`, `alteration` payload |
| **RF-04** | Catálogo de Precios | Administrador | `POST /api/catalogo`, `PUT /api/catalogo/{id}` |
| **RF-05** | Operaciones Kanban | Administrador / Cajero | `PATCH /api/ordenes/{id}/estado-proceso` |
| **RF-06** | Facturación & Cobros | Administrador / Cajero | `GET /api/ordenes`, `POST /api/ordenes/{id}/pagos` |
| **RF-07** | Caja & Arqueo | Administrador | `GET /api/caja/resumen-hoy`, `/api/caja/movimientos` |
| **RF-08** | Clientes & Hoteles | Administrador / Cajero | `GET /api/clientes`, `POST /api/clientes` |
| **RF-09** | Inventario Insumos | Administrador | `GET /api/inventario`, `POST /api/inventario` |
| **RF-10** | Impresión ESC/POS | Administrador / Cajero | `displayThermalTicket()`, Code128 engine |
| **RF-11** | Reportes Financieros | Administrador | Dashboard KPIs, Donut chart SVG engine |
| **RF-12** | Exportación Excel | Administrador / Cajero | `exportSpreadsheet()`, UTF-8 BOM CSV generator |
| **RF-13** | Búsqueda Ctrl + K | Adaptativo por Rol | `openSpotlight()`, `handleSpotlightSearch()` |
| **RF-14** | Gestión de Usuarios | Administrador | `GET /api/auth/usuarios`, `POST /api/auth/usuarios` |
| **RF-15** | Copias de Seguridad | Administrador | `GET /api/backup/download` |
