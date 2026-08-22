# SyncOps — Web (backend + frontend), reestructurado

Tres proyectos, cada uno con su propio `README.md` con los detalles:

1. **`SyncOps.Laundry.WebApi`** — el backend real (ASP.NET Core, Identity,
   JWT, EF Core/SQLite). Todos los datos y la seguridad viven aquí.
2. **`SyncOps.Laundry.WebClient.Host`** — servidor estático mínimo que
   sirve el cliente web por HTTPS en `https://localhost:5501`.
3. **`SyncOps-Web-Client`** — el HTML/CSS/JS "fuente" (mismo diseño de
   siempre). Es una copia idéntica a `wwwroot/` dentro del Host; edítalo
   aquí y luego cópialo a `SyncOps.Laundry.WebClient.Host/wwwroot/`.

## Orden para correrlo la primera vez

```powershell
# Terminal 1 — Backend
cd SyncOps.Laundry.WebApi
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<cadena-aleatoria-de-32+-caracteres>"
dotnet ef migrations add InicialCompleta
dotnet ef database update
dotnet dev-cert https --trust
dotnet run --launch-profile https
```

```powershell
# Terminal 2 — Cliente web
cd SyncOps.Laundry.WebClient.Host
dotnet run --launch-profile https
```

Abre `https://localhost:5501/login.html`, regístrate como administrador
la primera vez, y ya.

## Resumen de todo lo hecho hasta ahora

| Checkpoint | Qué se resolvió |
|---|---|
| 1 | Identity + JWT + refresh token en cookie httpOnly + HTTPS forzado + CORS restringido |
| 2 | Clientes, inventario, órdenes, caja, configuración en EF Core, todo `[Authorize]`. Bug de tickets duplicados corregido. Montos siempre recalculados en servidor |
| 3 | `app.js`/`login.html` conectados a la API real. Guardia de acceso real (sin JWT válido, no hay datos) |
| 4 | Perfil de usuario editable, alta de personal (cajeros), cliente "Mostrador" sembrado automático, host HTTPS local sin depender de herramientas externas |
| 5 | Pantalla de "Gestión de Usuarios": listar, crear y bloquear/desbloquear cuentas — solo visible y usable por Administrador |
| 6 | "Olvidé mi contraseña" real (tokens de Identity, rate limiting, revoca sesiones activas al cambiar la contraseña) |

## Lo que queda pendiente (avísame cuál sigue)

- Conectar un proveedor de correo real (SendGrid/SMTP) — hoy el enlace de recuperación se imprime en la consola del servidor
- Flujo de confirmación de email (para poder permitir cambiarlo)
- Guía de despliegue con HTTPS real / dominio, cuando quieras salir de local
