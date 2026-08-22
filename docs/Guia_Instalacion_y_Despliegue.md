# Guía Completa de Instalación, Configuración y Ejecución
## SyncOps — Laundry, Dry Cleaning, Tailoring & Billing Suite

Esta guía detalla los pasos exactos para instalar, configurar, ejecutar y probar la suite completa de **SyncOps** en entornos de desarrollo y producción local.

---

## 1. Requisitos Previos del Sistema

Asegúrate de tener instaladas las siguientes herramientas en tu equipo:

| Herramienta | Versión Mínima Requerida | Propósito |
|---|---|---|
| **.NET SDK** | **8.0 LTS** o superior | Compilación y ejecución del Backend Web API y Host del Cliente |
| **PowerShell / Terminal** | PowerShell 5.1+ / bash / zsh | Ejecución de comandos de compilación y base de datos |
| **Navegador Web Moderno** | Chrome 100+, Edge 100+, Firefox 100+ | Renderizado de cliente web y soporte de impresión térmica |
| **Impresora Térmica (Opcional)** | EPSON TM-T20II, POS-58, POS-80 | Impresión de tickets de 58mm o 80mm por USB/Red |

Para verificar tu versión de .NET instalada, ejecuta en la terminal:
```powershell
dotnet --version
# Debe responder 8.0.xxx o superior
```

---

## 2. Estructura del Repositorio

El proyecto está organizado en 3 carpetas principales:

```
SyncOps-Completo/
├── SyncOps.Laundry.WebApi/        # Backend real en ASP.NET Core 8 Web API + SQLite + JWT
├── SyncOps.Laundry.WebClient.Host/# Servidor estático HTTPS en .NET 8 (sirve el cliente en wwwroot)
├── SyncOps-Web-Client/            # Código fuente frontend HTML5/CSS/JS (espejo de wwwroot)
├── docs/                          # Documentación formal ISO/IEEE 830, ADRs y Guías
│   ├── SRS_ISO_IEC_IEEE_830_Requisitos.md
│   ├── ADR_Decisiones_de_Diseno.md
│   └── Guia_Instalacion_y_Despliegue.md
└── README.md                      # Documento principal del repositorio
```

---

## 3. Instalación Paso a Paso

### Paso 1: Configurar el Certificado HTTPS de Desarrollo
SyncOps utiliza HTTPS obligatorio tanto en backend como en frontend para proteger las cookies seguras y los tokens JWT.

Ejecuta el siguiente comando para generar y confiar en el certificado local:
```powershell
dotnet dev-certs https --trust
```
*(Si Windows te solicita confirmación, presiona **"Sí"** para confiar en el certificado de localhost).*

---

### Paso 2: Configurar la Clave Secreta JWT y la Base de Datos

Abre una terminal en la carpeta del backend:

```powershell
cd SyncOps.Laundry.WebApi

# 1. Inicializar Secretos de Usuario
dotnet user-secrets init

# 2. Configurar la clave secreta JWT (mínimo 32 caracteres)
dotnet user-secrets set "Jwt:Key" "SyncOpsLaundrySecureEnterpriseSecretKey2026!#"

# 3. Aplicar migraciones y crear la base de datos SQLite
dotnet ef database update
```

*(Nota: Si no tienes instalada la herramienta global de Entity Framework Core, puedes instalarla con: `dotnet tool install --global dotnet-ef` o correr `dotnet run` que ejecutará las migraciones y sembrado de datos automáticamente en `Program.cs`).*

---

### Paso 3: Sembrado Inicial de Datos (Data Seeding)
Al ejecutarse por primera vez, el backend siembra automáticamente:
- **Usuario Administrador:** `admin@syncopslaundry.do` / `Password123!`
- **Usuario Cajero:** `cajero@syncopslaundry.do` / `Password123!`
- **Cliente por Defecto:** `Cliente Mostrador` (ID: 1)
- **Catálogo Base:** Prendas y servicios comunes (Lavado, Planchado, Sastrería, Autoservicio)
- **Configuración de Tienda:** Nombre, RNC, Dirección, Teléfono y Políticas fiscales

---

## 4. Ejecución del Sistema

Se requieren **dos terminales** para ejecutar el sistema completo:

### 🔹 Terminal 1: Iniciar el Backend Web API

```powershell
cd SyncOps.Laundry.WebApi
dotnet run --launch-profile https
```
- **URL del Backend:** `https://localhost:5443`
- **Documentación Swagger / OpenAPI:** `https://localhost:5443/swagger`

---

### 🔹 Terminal 2: Iniciar el Cliente Web (Host Frontend)

```powershell
cd SyncOps.Laundry.WebClient.Host
dotnet run --launch-profile https
```
- **URL de la Aplicación:** `https://localhost:5501`

---

## 5. Acceso y Pruebas Iniciales

1. Abre tu navegador en:  
   👉 **`https://localhost:5501`** (o `https://localhost:5501/login.html`)
2. Inicia sesión con cualquiera de las siguientes cuentas:

### 👑 Cuenta Administrador General (Control Total)
- **Email:** `admin@syncopslaundry.do`
- **Contraseña:** `Password123!`
- **Permisos:** Dashboard, POS, Operaciones, Facturas, Reportes, Inventario de Insumos, Configuración de Tienda, Gestión de Usuarios y Descarga de Backups.

### 💼 Cuenta Cajero / Mostrador (Operativo)
- **Email:** `cajero@syncopslaundry.do`
- **Contraseña:** `Password123!`
- **Permisos:** Punto de Venta (POS) predeterminado, Operaciones & Taller, Facturación y Cobros, Clientes & Hoteles, FAQ y Ayuda. *(Módulos financieros y de configuración ocultos).*

---

## 6. Comandos y Atajos Rápidos

- **`Ctrl + K`**: Abre la Paleta de Búsqueda Global adaptada por rol.
- **Botón Hamburguesa (☰)**: Alterna la barra lateral entre modo extendido (240px) y compacto (70px).
- **`Ctrl + P`**: Imprime el ticket térmico interactivo cuando esté abierto en pantalla.
- **`Ctrl + F5`**: Fuerza la recarga de estilos CSS y scripts JS en el navegador.

---

## 7. Solución de Problemas Frecuentes (Troubleshooting)

### Error: "No se puede acceder a este sitio / Certificado no confiable"
Ejecuta en PowerShell con permisos de administrador:
```powershell
dotnet dev-certs https --clean
dotnet dev-certs https --trust
```
Reinicia el navegador y vuelve a abrir `https://localhost:5501`.

### Error: "Database is locked" o error de migración en SQLite
Asegúrate de que no haya otra instancia de `dotnet run` ejecutándose en segundo plano:
```powershell
# En Windows (PowerShell):
Get-Process -Name "SyncOps.Laundry.WebApi" -ErrorAction SilentlyContinue | Stop-Process
```

### Sincronización de Archivos Frontend
Si editas el diseño en `SyncOps-Web-Client/`, asegúrate de sincronizar los cambios a `SyncOps.Laundry.WebClient.Host/wwwroot/` ejecutando:
```powershell
Copy-Item -Path "SyncOps-Web-Client/*" -Destination "SyncOps.Laundry.WebClient.Host/wwwroot/" -Recurse -Force
```
