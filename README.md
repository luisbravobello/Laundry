# SyncOps — Laundry, Dry Cleaning, Tailoring & Billing Suite

<div align="center">

![SyncOps Suite](https://img.shields.io/badge/SyncOps-Laundry%20ERP%20v2.0-2563EB?style=for-the-badge&logo=dotnet&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-.NET%208%20%7C%20Vanilla%20JS-0B132B?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-JWT%20%2B%20RBAC%20%2B%20HttpOnly-059669?style=for-the-badge)
![Standard](https://img.shields.io/badge/Standard-ISO%2FIEEE%20830%20SRS-D97706?style=for-the-badge)

**Plataforma Integral ERP y Punto de Venta (POS) para Tintorerías, Lavanderías Comerciales, Sastrerías y Cuentas Corporativas/Hoteleras.**

[Documentación ISO/IEEE 830](docs/SRS_ISO_IEC_IEEE_830_Requisitos.md) • [Decisiones de Diseño (ADR)](docs/ADR_Decisiones_de_Diseno.md) • [Guía de Instalación](docs/Guia_Instalacion_y_Despliegue.md)

</div>

---

## 🌟 Módulos del Sistema

- **Punto de Venta (POS):** Catálogo por categorías, precios editables, cálculo de ITBIS y entrega express.
- **Sastrería & Taller:** Control de medidas, arreglos textiles y tablero Kanban de 4 fases.
- **Facturación & Cobros:** Comprobantes correlativos, abonos parciales y control de saldos.
- **Impresión Térmica ESC/POS:** Tickets de 58mm/80mm con código de barras Code128 para EPSON TM-T20II.
- **Roles & Seguridad (RBAC):** Accesos diferenciados para Administrador y Cajero con JWT y cookies seguras.
- **Búsqueda Rápida (Ctrl + K):** Paleta de comandos universal adaptada al rol activo.

---

## 🏗️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────┐
│                   Cliente Web (SPA)                   │
│   HTML5 + Vanilla JS (ES6+) + CSS3 Fortexa ERP UI     │
│   (https://localhost:5501)                            │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON REST API
                            │ JWT (Header) + HttpOnly Cookie
┌───────────────────────────▼────────────────────────────┐
│              SyncOps.Laundry.WebApi (.NET 8)           │
│   Controllers: Auth, POS, Ordenes, Caja, Clientes...  │
│   Security: ASP.NET Identity + JWT RBAC Middleware     │
│   ORM: Entity Framework Core 8                         │
└───────────────────────────┬────────────────────────────┘
                            │ SQLite WAL Mode Engine
┌───────────────────────────▼────────────────────────────┐
│             Base de Datos Local (SQLite 3)             │
│   `syncops_web.db` (Transacciones ACID, Backup API)   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido (Quick Start)

### 1. Configurar Certificado HTTPS
```powershell
dotnet dev-certs https --trust
```

### 2. Iniciar el Backend Web API (Terminal 1)
```powershell
cd SyncOps.Laundry.WebApi
dotnet run --launch-profile https
```
> El backend se iniciará en `https://localhost:5443` (Swagger en `/swagger`).

### 3. Iniciar el Cliente Web (Terminal 2)
```powershell
cd SyncOps.Laundry.WebClient.Host
dotnet run --launch-profile https
```
> El cliente web se iniciará en `https://localhost:5501`.

---

## 🔑 Credenciales de Acceso

| Perfil | Correo Electrónico | Contraseña | Alcance |
|---|---|---|---|
| **👑 Administrador General** | `admin@syncopslaundry.do` | `Password123!` | Todos los módulos, reportes, usuarios y configuración |
| **💼 Cajero / Ventas** | `cajero@syncopslaundry.do` | `Password123!` | POS, Operaciones, Facturas y Clientes |

---

## 📚 Documentación Técnica

La documentación completa de ingeniería de software se encuentra disponible en la carpeta [`/docs`](docs/):

1. **[Especificación de Requisitos de Software (SRS — ISO/IEC/IEEE 830)](docs/SRS_ISO_IEC_IEEE_830_Requisitos.md):**
   - 15 Requisitos Funcionales (RF-01 a RF-15) especificados formalmente.
   - 10 Requisitos No Funcionales (RNF-01 a RNF-10) con métricas de calidad y rendimiento.
   - Matriz de trazabilidad de requisitos vs endpoints de API y vistas.

2. **[Registro de Decisiones de Diseño y Arquitectura (ADR)](docs/ADR_Decisiones_de_Diseno.md):**
   - Justificación técnica de las 10 decisiones de arquitectura y diseño clave (Monolito modular, eliminación total de emojis, RBAC estricto, JWT en memoria + cookie HttpOnly, motor ESC/POS con Code128, persistencia SQLite WAL, etc.).

3. **[Guía de Instalación, Configuración y Despliegue](docs/Guia_Instalacion_y_Despliegue.md):**
   - Pasos detallados para configurar certificados TLS, variables de entorno, migraciones de base de datos y solución de problemas comunes.

---

## 💻 Atajos de Teclado del Sistema

- **`Ctrl + K`**: Abrir Paleta de Búsqueda Global y Comandos Rápidos.
- **`Botón ☰`**: Contraer / expandir el menú lateral a 70px compactos.
- **`Ctrl + P`**: Imprimir Ticket Térmico en la vista previa del recibo.
- **`Ctrl + F5`**: Forzar recarga limpia de recursos en el navegador.

---

## 📄 Licencia y Derechos

Desarrollado como solución empresarial de grado de producción para la industria de lavandería, tintorería y confección textil. Todos los derechos reservados.
