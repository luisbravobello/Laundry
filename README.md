# SyncOps Laundry & Tailoring Suite (.NET 10 WPF)

> **Sistema Empresarial Integral de Escritorio** para Lavandería por Pieza, Planchado, Taller de Sastrería / Arreglo de Prendas, Hoteles por Volumen y Autoservicio de Torres con Monedas (*Laundromat*).

---

## 🏛️ Arquitectura del Sistema (Clean Architecture + MVVM)

Construido bajo los principios **SOLID**, patrón **MVVM** con `CommunityToolkit.Mvvm`, **CQRS** con `MediatR` y diseño **SyncOps Sapphire**:

```
SyncOps.Laundry/
├── 📦 SyncOps.Laundry.Domain/          # Núcleo Puro: Entidades, Enums e Interfaces
├── 📦 SyncOps.Laundry.Application/     # Casos de Uso (CQRS MediatR, DTOs, Validaciones)
├── 📦 SyncOps.Laundry.Infrastructure/  # EF Core 10 (SQLite WAL Mode), Seeder, Impresión POS
└── 📦 SyncOps.Laundry.DesktopUI/       # Presentación WPF XAML, Estilos Sapphire, ViewModels
```

---

## 🚀 Funcionalidades Principales

1. **Punto de Venta (POS) & Recepción:**
   - Catálogo rápido de prendas y servicios.
   - Panel de sastrería: tipo de arreglo, medidas exactas e indicaciones.
   - Emisión de ticket térmico con código de barras y talón para reclamo.
2. **Tablero Kanban de Taller:**
   - Flujo visual: *Recibido* ➔ *En Lavado/Taller* ➔ *En Planchado* ➔ *Listo en Mostrador*.
   - Búsqueda por escaneo de código de barras.
3. **Autoservicio & Torres con Monedas:**
   - Control de torres combo operadas por monedas (estilo EE. UU.).
   - Monitoreo de lavadoras industriales de gran volumen (75-80 Lbs).
   - Venta de fichas y recaudación acumulada por cajetín.
4. **Inventario & Insumos:**
   - Control de detergentes, suavizantes, fundas, ganchos e hilos.
   - Alertas automáticas de bajo stock mínimo.
5. **Clientes & Cuentas de Hoteles:**
   - Cuentas corrientes a crédito y facturación acumulada.
6. **Control de Caja:**
   - Apertura, desglose por método de pago y arqueo/cierre de turno.

---

## 💻 Instrucciones de Ejecución

```powershell
# Restaurar y ejecutar la aplicación de escritorio
dotnet run --project SyncOps.Laundry.DesktopUI/SyncOps.Laundry.DesktopUI.csproj
```
