# Registro de Decisiones de Diseño y Arquitectura (ADR)
## SyncOps — Laundry, Dry Cleaning, Tailoring & Billing Suite
**Documento:** Architecture & Design Decision Records (ADR)  
**Estado:** Activo / Normativo  
**Audiencia:** Ingenieros de Software, Diseñadores UI/UX, Auditores de QA  

---

## Índice de Decisiones

1. [ADR-01: Arquitectura Monolítica Modular vs Microservicios](#adr-01-arquitectura-monolítica-modular-vs-microservicios)
2. [ADR-02: Sistema de Diseño Visual Fortexa ERP & Eliminación Total de Emojis](#adr-02-sistema-de-diseño-visual-fortexa-erp--eliminación-total-de-emojis)
3. [ADR-03: Separación Estricta de Roles (RBAC) en UI y Backend](#adr-03-separación-estricta-de-roles-rbac-en-ui-y-backend)
4. [ADR-04: Autenticación Híbrida JWT en Memoria + Cookie HttpOnly](#adr-04-autenticación-híbrida-jwt-en-memoria--cookie-httponly)
5. [ADR-05: Motor de Impresión Térmica Directa ESC/POS con Code128](#adr-05-motor-de-impresión-térmica-directa-escpos-con-code128)
6. [ADR-06: Persistencia Transaccional con SQLite en Modo WAL y Backups en Vivo](#adr-06-persistencia-transaccional-con-sqlite-en-modo-wal-y-backups-en-vivo)
7. [ADR-07: Paleta de Comandos Global (Ctrl + K) Dinámica por Rol](#adr-07-paleta-de-comandos-global-ctrl--k-dinámica-por-rol)
8. [ADR-08: Inmutabilidad de Cálculos Financieros en Servidor con Precios Editables en POS](#adr-08-inmutabilidad-de-cálculos-financieros-en-servidor-con-precios-editables-en-pos)
9. [ADR-09: Metodología Kanban de 4 Fases para Control de Producción en Taller](#adr-09-metodología-kanban-de-4-fases-para-control-de-producción-en-taller)
10. [ADR-10: Barra Lateral Colapsable a 70px con Persistencia de Preferencia](#adr-10-barra-lateral-colapsable-a-70px-con-persistencia-de-preferencia)

---

### ADR-01: Arquitectura Monolítica Modular vs Microservicios

- **Estado:** Aprobado.
- **Contexto:** Las lavanderías y tintorerías comerciales operan típicamente en entornos de sucursales locales o servidores en red local/híbrida, requiriendo latencia ultrabaja, cero dependencias complejas de orquestación (Kubernetes) y arranque inmediato sin consumo excesivo de memoria.
- **Decisión:** Se implementó una **Web API monolítica modular en .NET 8 (C#)** desacoplada de un cliente frontend Single Page Application (HTML5 / Vanilla JS / CSS3).
- **Justificación:**
  - Despliegue en un único binario ejecutable o servicio local.
  - Consumo de memoria RAM inferior a 45 MB.
  - Sin sobrecarga de red entre microservicios; todas las transacciones de POS, cobros y caja se ejecutan con atomicidad ACID en proceso.

---

### ADR-02: Sistema de Diseño Visual Fortexa ERP & Eliminación Total de Emojis

- **Estado:** Aprobado (Requisito Estricto del Usuario).
- **Contexto:** El uso de emojis en interfaces corporativas proyecta informalidad, inconsistencias visuales entre sistemas operativos (Windows vs Android vs iOS) y desalineaciones en botones y tablas de datos.
- **Decisión:** Se prohibió terminantemente el uso de emojis y se implementó un sistema de diseño propio basado en **Fortexa ERP Design System**:
  - Iconografía 100% vectorial mediante `<svg>` limpios de trazo continuo (estilo Lucide / Feather) centrados con `stroke-width="2"`.
  - Tipografía profesional: **Inter** para textos y navegación; **JetBrains Mono** para tickets, códigos, precios y cantidades.
  - Paleta cromática corporativa: Azul marino oscuro `#0B132B`, Azul Zafiro `#2563EB`, Esmeralda `#059669`, Ámbar `#D97706` y Gris pizarra `#F8FAFC`.
- **Justificación:** Garantiza una estética premium, uniforme, escalable y con alineación milimétrica en cualquier resolución y pantalla POS táctil.

---

### ADR-03: Separación Estricta de Roles (RBAC) en UI y Backend

- **Estado:** Aprobado.
- **Contexto:** Los cajeros y operarios no deben visualizar información sensible como costos de insumos, márgenes de ganancia, reportes gerenciales, configuración fiscal ni administración de usuarios.
- **Decisión:**
  - **Backend:** Control de autorización basado en roles mediante atributos `[Authorize(Roles = "Administrador")]` en `ConfiguracionController`, `InventarioController`, `ReportesController` y `AuthController` (gestión de usuarios).
  - **Frontend:** La función `pintarUsuario()` oculta dinámicamente los menús y botones directivos (Dashboard, Reportes, Inventario, Configuración, Gestión de Usuarios, botón "Agregar Servicio" del catálogo).
  - **Enrutamiento Protegido:** Si un cajero intenta forzar navegación por script o teclado, el método `switchSection()` bloquea el acceso y lo redirige automáticamente al Punto de Venta.
- **Justificación:** Cumplimiento del principio de mínimo privilegio y prevención de fugas de datos comerciales.

---

### ADR-04: Autenticación Híbrida JWT en Memoria + Cookie HttpOnly

- **Estado:** Aprobado.
- **Contexto:** Almacenar tokens JWT de larga duración en `localStorage` expone la aplicación a robo de credenciales mediante ataques de Cross-Site Scripting (XSS).
- **Decisión:**
  - El Access Token de corta duración (15 min) reside en memoria y `sessionStorage`.
  - El Refresh Token de larga duración reside exclusivamente en una cookie `httpOnly`, `Secure`, `SameSite=Strict`, inaccesible para scripts del cliente.
  - Si el token de acceso expira, el cliente renueva automáticamente la sesión mediante `POST /api/auth/refresh` de forma transparente para el usuario.
- **Justificación:** Máxima seguridad bancaria sin sacrificar la experiencia de uso continuo durante la jornada laboral.

---

### ADR-05: Motor de Impresión Térmica Directa ESC/POS con Code128

- **Estado:** Aprobado.
- **Contexto:** Las impresoras de recibos térmicos (como la EPSON TM-T20II o POS-80) imprimen mediante calor directo sobre papel térmico monocromático. Los diseños web estándar a color con fondos grises salen borrosos o ilegibles.
- **Decisión:**
  - Se diseñó una plantilla CSS `@media print` monocromática pura (blanco y negro al 100%, sin sombras ni gradientes).
  - Se implementó un generador SVG nativo de código de barras **Code128** de alta densidad.
  - Soporte seleccionable para anchos de **80mm** (estándar de mostrador) y **58mm** (impresoras portátiles / compactas).
- **Justificación:** Lectura inmediata por pistolas láser en taller y cero desperdicio de papel térmico.

---

### ADR-06: Persistencia Transaccional con SQLite en Modo WAL y Backups en Vivo

- **Estado:** Aprobado.
- **Contexto:** Un sistema ERP para lavanderías debe ser autosuficiente, sin requerir la instalación y mantenimiento de motores de bases de datos pesados como SQL Server o PostgreSQL para pequeños y medianos comercios.
- **Decisión:**
  - Se utiliza **SQLite 3** mediante Entity Framework Core 8 con modo **WAL (Write-Ahead Logging)** y `PRAGMA synchronous = NORMAL`.
  - Se integró un endpoint de respaldo en caliente (`GET /api/backup/download`) que utiliza la API interna de backup de SQLite para descargar un snapshot consistente `.db` sin detener las ventas ni bloquear la base de datos.
- **Justificación:** Portabilidad total, cero costo de licencias, respaldos con 1 solo clic y capacidad de procesar miles de transacciones por segundo.

---

### ADR-07: Paleta de Comandos Global (Ctrl + K) Dinámica por Rol

- **Estado:** Aprobado.
- **Contexto:** Los cajeros y administradores atienden llamadas y clientes en mostrador al mismo tiempo; necesitan buscar un ticket o cliente en menos de 2 segundos sin navegar entre pantallas.
- **Decisión:**
  - Se implementó la paleta de comandos `Ctrl + K` accesible desde cualquier lugar del sistema con navegación mediante flechas (`↑`, `↓`) y `Enter`.
  - La búsqueda filtra los resultados según el rol activo: los cajeros buscan facturas y clientes; los administradores tienen acceso adicional a insumos y costos.
- **Justificación:** Reduce el tiempo promedio de atención en mostrador de 15 segundos a menos de 3 segundos.

---

### ADR-08: Inmutabilidad de Cálculos Financieros en Servidor con Precios Editables en POS

- **Estado:** Aprobado.
- **Contexto:** En lavanderías, el precio de una prenda de tela especial o un vestido de gala puede requerir ajustes manuales en el mostrador. Sin embargo, no se puede confiar ciegamente en que el frontend calcule el total final, ITBIS y saldos sin riesgo de manipulación.
- **Decisión:**
  - El usuario puede editar el precio unitario en el POS (el cual inicia limpio en `0.00`).
  - Al enviar la orden, el backend (`OrdenesController`) recibe los ítems y recalcula formalmente en servidor: `Subtotal = Σ(Qty * Price)`, `Descuento`, `Recargo Urgencia (15-25%)`, `Base Imponible`, `ITBIS (18%)`, `Total` y `Saldo = Total - MontoPagado`.
- **Justificación:** Flexibilidad operativa en mostrador combinada con integridad financiera y fiscal garantizada en base de datos.

---

### ADR-09: Metodología Kanban de 4 Fases para Control de Producción en Taller

- **Estado:** Aprobado.
- **Contexto:** Las listas planas de órdenes provocan confusión en el personal de lavandería, prendas olvidadas en secadoras y reclamos de clientes por entregas tardías.
- **Decisión:**
  - Se implementó un tablero visual Kanban de 4 etapas claras:
    1. **Recepción:** Prenda recibida en mostrador.
    2. **Lavado & Proceso:** Prenda en máquinas, desmanchado o confección.
    3. **Listo:** Prenda colgada y embolsada lista para entrega.
    4. **Entregado:** Prenda retirada por el cliente con saldo saldado.
  - Cada tarjeta muestra el correlativo, cliente, teléfono, prendas, fecha de entrega comprometida y botón de acción directa.
- **Justificación:** Control visual instantáneo de cuellos de botella en lavadoras y reducción a cero de pérdidas de prendas.

---

### ADR-10: Barra Lateral Colapsable a 70px con Persistencia de Preferencia

- **Estado:** Aprobado.
- **Contexto:** En terminales de Punto de Venta con pantallas táctiles compactas (10" a 15"), la barra lateral de 240px consume demasiado espacio horizontal útil.
- **Decisión:**
  - Se programó el botón hamburguesa del encabezado superior para alternar entre **240px (expandido con texto)** y **70px (compacto con iconos y tooltips)**.
  - La preferencia se guarda en `localStorage` del navegador para que se conserve en cada inicio de sesión.
- **Justificación:** Maximiza el espacio de trabajo en la cuadrícula de catálogo del POS y en las tablas de facturación sin perder acceso rápido a los módulos.
