# SyncOps.Laundry.WebApi — Checkpoint 1: Autenticación

Backend nuevo y separado del WPF. Este checkpoint **solo** trae el módulo de
autenticación (registro del primer admin, login, refresh, logout, /me).
Todavía no tiene los endpoints de negocio (clientes, órdenes, inventario) —
eso es el checkpoint 2.

No pude compilar esto en el sandbox porque no tiene el SDK de .NET instalado,
así que ábrelo en Visual Studio y sigue estos pasos exactamente en orden.

## 1. Colocar el proyecto

Copia la carpeta `SyncOps.Laundry.WebApi` a donde quieras tener tu nueva
solución web (separada de `SyncOps.Laundry.sln`, el del WPF).

## 2. Configurar el secreto del JWT (nunca en appsettings.json)

Desde la carpeta del proyecto:

```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "PON-AQUI-UNA-CADENA-ALEATORIA-DE-AL-MENOS-32-CARACTERES"
```

Puedes generar una cadena aleatoria así (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 3. Crear la base de datos

```powershell
dotnet tool install --global dotnet-ef   # si no lo tienes ya
dotnet ef migrations add InitialIdentity
dotnet ef database update
```

Esto crea `syncops_web.db` (SQLite) con las tablas de Identity + `RefreshTokens`.

## 4. Confiar en el certificado HTTPS de desarrollo

```powershell
dotnet dev-cert https --trust
```

## 5. Ejecutar

```powershell
dotnet run --launch-profile https
```

Debe quedar escuchando en `https://localhost:5443`.

## 6. Probar los endpoints (con curl o Postman)

**Registrar el primer administrador** (solo funciona una vez — si ya hay un
usuario, responde 409):
```powershell
curl -k -X POST https://localhost:5443/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"nombreCompleto\":\"Luis Bravo\",\"email\":\"admin@syncopslaundry.do\",\"password\":\"Password123!\",\"tienda\":\"SyncOps Laundry\"}'
```

**Login:**
```powershell
curl -k -X POST https://localhost:5443/api/auth/login `
  -H "Content-Type: application/json" `
  -c cookies.txt `
  -d '{\"email\":\"admin@syncopslaundry.do\",\"password\":\"Password123!\"}'
```

Guarda el `accessToken` que devuelve. La cookie de refresh queda en `cookies.txt`.

**Endpoint protegido:**
```powershell
curl -k https://localhost:5443/api/auth/me `
  -H "Authorization: Bearer <PEGA_AQUI_EL_ACCESS_TOKEN>"
```

**Refrescar el access token cuando expire (15 min por defecto):**
```powershell
curl -k -X POST https://localhost:5443/api/auth/refresh -b cookies.txt -c cookies.txt
```

## Qué se resolvió en este checkpoint vs. la versión anterior

| Antes (login.html) | Ahora |
|---|---|
| Password en texto plano en `localStorage` | Hash PBKDF2 vía ASP.NET Core Identity |
| Cualquier email/password entraba igual | Login rechaza credenciales inválidas (401) |
| Sin protección contra fuerza bruta | Bloqueo de cuenta tras 5 intentos fallidos |
| Sesión "falsa" auto-creada por `checkAuth()` | Sin token JWT válido, no hay `/me`, no hay datos |
| Sin HTTPS forzado | `UseHttpsRedirection` + `UseHsts` |
| CORS abierto (no existía) | CORS restringido a un solo origen (`ClientOrigin`) |

## Checkpoint 2: datos de negocio (clientes, catálogo, órdenes, inventario, caja)

Se agregaron 5 controladores nuevos, todos protegidos con `[Authorize]`
(requieren el `accessToken` del login):

| Endpoint | Qué hace |
|---|---|
| `GET /api/catalogo` | Lista de precios (sembrada automáticamente al arrancar) |
| `GET/POST/PUT/DELETE /api/clientes` | CRUD de clientes/cuentas hotel |
| `GET/POST/PUT/DELETE /api/inventario` | CRUD de insumos + `POST /{id}/ajustar-stock` |
| `GET/POST /api/ordenes` + `POST /{id}/pagos` | Crear orden, listar, registrar abonos |
| `GET /api/caja/movimientos`, `/resumen-hoy` | Movimientos de caja (se generan solos al cobrar) |
| `GET/PUT /api/configuracion` | Datos del negocio — el `PUT` requiere rol `Administrador` |

### Volver a migrar la base de datos

Como se agregaron entidades nuevas, hay que generar otra migración antes
de correr:

```powershell
dotnet ef migrations add NegocioInicial
dotnet run --launch-profile https
```

Ya no hace falta correr `dotnet ef database update` a mano — `Program.cs`
llama `Database.MigrateAsync()` al arrancar y siembra el catálogo/config
automáticamente la primera vez.

### El bug de numeración de tickets, arreglado

En el WPF, el número de ticket salía de un `CountAsync()` de todas las
órdenes históricas, sin transacción — dos recepciones simultáneas podían
generar el mismo ticket y una fallaba sin reintento. Acá:

- El consecutivo vive en la tabla `Configuracion` (`NextInvoiceNumber`) y
  se lee + incrementa **dentro de la misma transacción** que crea la orden.
- Si dos peticiones chocan contra el índice único de `Ticket`, el `catch`
  hace **rollback y reintenta** (hasta 3 veces) en vez de fallar directo.

### Seguridad de los montos

`POST /api/ordenes` **recalcula todo en el servidor** (subtotal, recargo
por urgencia, descuento, total) usando solo cantidad y precio de cada
item — nunca confía en un `subtotal` o `total` que venga ya calculado
desde el navegador. Eso cierra una forma fácil de manipular precios
editando el payload con las herramientas de desarrollador del navegador.

## Siguiente checkpoint (cerrado — ver Checkpoint 3)

Se reescribió `app.js` para consumir esta API por `fetch()` en vez de
`localStorage`, sin tocar el HTML/CSS, y se agregó el guardia real de
acceso: sin `accessToken` válido, ninguna sección carga datos. Ver el
`README.md` de `SyncOps-Web-Client`.

## Checkpoint 4: perfil de usuario, alta de personal y host HTTPS local

### Perfil de usuario

- `PUT /api/auth/perfil` — el usuario logueado edita su propio nombre.
  El email queda fuera a propósito: cambiarlo requeriría un flujo de
  reconfirmación por correo que todavía no existe (si se permitiera sin
  eso, alguien podría "secuestrar" una cuenta cambiando el email a uno
  que controle).

### Alta de personal (cajeros/empleados)

Antes de este checkpoint, **solo podía existir un usuario en todo el
sistema** — `register` se bloqueaba después del primer admin y no había
forma de dar de alta a un cajero. Ahora:

- `POST /api/auth/usuarios` — `[Authorize(Roles = "Administrador")]`.
  Solo un administrador ya logueado puede crear cuentas nuevas, con rol
  `"Administrador"` o `"Empleado"`.

Todavía no hay pantalla en el HTML para esto (no quise agregar una
sección nueva sin que la pidieras). Se prueba así por ahora:

```powershell
curl -k -X POST https://localhost:5443/api/auth/usuarios `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <ACCESS_TOKEN_DEL_ADMIN>" `
  -d '{\"nombreCompleto\":\"Cajera Ana\",\"email\":\"ana@syncopslaundry.do\",\"password\":\"Password123!\",\"rol\":\"Empleado\"}'
```

Avísame si quieres que le agregue una pantalla de "Gestión de Usuarios"
al panel de Configuración.

**Actualización: ya se agregó.** Ver checkpoint 5 más abajo.

### Cliente "Mostrador (General)" sembrado automáticamente

El `DataSeeder` ahora crea un cliente genérico la primera vez que
arranca la API, para que el POS nunca quede bloqueado esperando que
alguien registre un cliente real primero.

### Host HTTPS local para el cliente web

Nuevo proyecto hermano: `SyncOps.Laundry.WebClient.Host`. Es un servidor
estático mínimo (sin lógica de negocio) que sirve `index.html`,
`login.html`, `app.js`, `api.js` y `styles.css` por HTTPS en
`https://localhost:5501` — exactamente el `ClientOrigin` que ya espera
el CORS de esta API. Reemplaza la necesidad de configurar Live Server u
otra herramienta con certificado propio. Ver su propio `README.md`.

## Checkpoint 5: pantalla de Gestión de Usuarios

3 endpoints nuevos, todos `[Authorize(Roles = "Administrador")]`:

| Endpoint | Qué hace |
|---|---|
| `GET /api/auth/usuarios` | Lista todos los usuarios con su rol y si están bloqueados |
| `POST /api/auth/usuarios/{id}/bloquear` | Revoca el acceso sin borrar la cuenta ni su historial (no puedes bloquearte a ti mismo) |
| `POST /api/auth/usuarios/{id}/desbloquear` | Restaura el acceso |

En el HTML: nuevo ítem "Gestión de Usuarios" en el menú lateral, oculto
por JS para quien no sea Administrador — aunque igual está protegido en
el backend por si alguien fuerza la URL o edita el DOM.

**Por qué "bloquear" y no "eliminar":** borrar la cuenta de un cajero
podría romper el historial (`AtendidoPor` en las órdenes que registró).
Bloquear revoca el acceso al instante sin perder esa trazabilidad.

## Checkpoint 6: "Olvidé mi contraseña"

Flujo real de recuperación usando los tokens de Identity, sin depender
todavía de un proveedor de correo real.

| Endpoint | Qué hace |
|---|---|
| `POST /api/auth/forgot-password` | Genera un token de reseteo (válido 30 min) y lo "envía" — limitado a 3 solicitudes cada 15 min por IP |
| `POST /api/auth/reset-password` | Valida el token y cambia la contraseña; revoca todas las sesiones activas de ese usuario |

### Por qué no envía un correo real todavía

No hay credenciales de un proveedor de correo (SendGrid, SMTP, etc.)
configuradas. En vez de eso, `ConsoleEmailSender` (en `Email/`) imprime
el enlace de recuperación en la consola donde corre `dotnet run` —
solo tú, con acceso al servidor, lo ves. Cuando tengas un proveedor real,
implementa `IEmailSender` con él y regístralo en `Program.cs`
(`builder.Services.AddScoped<IEmailSender, TuNuevoSender>();`); nada más
cambia.

### Decisiones de seguridad en este flujo

- **Nunca revela si un correo existe**: `forgot-password` responde
  siempre el mismo mensaje, exista la cuenta o no — si respondiera
  distinto, cualquiera podría usarlo para averiguar qué correos están
  registrados.
- **Rate limiting**: máximo 3 solicitudes cada 15 minutos por IP
  (`AddRateLimiter` en `Program.cs`), para que no se pueda bombardear de
  correos a una cuenta ajena.
- **Token de vida corta**: 30 minutos (el valor por defecto de Identity
  es 1 día — demasiado para un enlace de recuperación).
- **Cambiar la contraseña cierra todas las sesiones activas**: si un
  atacante tenía un refresh token robado, deja de servirle en cuanto el
  dueño real recupera el acceso.

## Checkpoint 7: ITBIS (18%) y cambio a devolver en el POS

### ITBIS

- Nuevo checkbox "Aplicar ITBIS (18%)" en el POS, junto al de "Urgente".
- **Se calcula solo en el servidor**, igual que el resto de los montos:
  `ITBIS = (subtotal + recargo urgente - descuento) * 0.18`, y el total
  final incluye ese monto. `CrearOrdenRequest` ahora trae `AplicaItbis`
  (bool); `OrdenServicio` guarda el monto calculado en `ImpuestoItbis`.
- Aparece como línea propia en el desglose del POS y en el ticket
  térmico impreso (solo si aplica; si no, la fila ni se muestra).

**Hace falta otra migración** antes de correr:
```powershell
dotnet ef migrations add AgregarItbisAOrdenes
dotnet ef database update
```

### Cambio a devolver

Cuando el monto cobrado es mayor al total, el POS ya no muestra "Saldo
Pendiente: RD$0.00" — muestra "Cambio a Devolver al Cliente" con el
monto exacto, tanto en pantalla como en el ticket impreso.

Esto es **puramente de la pantalla del cajero** — no toca el backend.
El servidor sigue capando `Pagado` en `Total` (`Math.Min(total,
montoPagado)`), como ya hacía desde el checkpoint 2: el excedente nunca
se registra como abono, es efectivo físico que se devuelve.
