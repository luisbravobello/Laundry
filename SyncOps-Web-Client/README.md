# SyncOps — Cliente Web (Checkpoint 3)

Mismo HTML/CSS de siempre — **cero cambios visuales**. Lo único que
cambió es de dónde vienen y a dónde van los datos.

## Qué cambió por archivo

| Archivo | Cambio |
|---|---|
| `api.js` | **Nuevo.** Cliente fetch con JWT, renovación automática y manejo de sesión. |
| `login.html` | El formulario ahora llama `api.login()` / `api.register()` de verdad. Se borró toda la lógica de `localStorage` que aceptaba cualquier contraseña. |
| `app.js` | `state` pasó de vivir en `localStorage` a ser una caché en memoria que se llena desde la API al arrancar. Las funciones `render*()` (dashboard, POS, facturación, etc.) **no se tocaron** — siguen leyendo `state` exactamente igual. |
| `index.html` / `styles.css` | Solo se agregó `<script src="api.js">`. Nada más. |

## Cómo correrlo

1. Corre primero el backend (`SyncOps.Laundry.WebApi`) — debe quedar
   escuchando en `https://localhost:5443`.
2. Corre `SyncOps.Laundry.WebClient.Host` (proyecto hermano, en el mismo
   zip) — sirve exactamente esta carpeta por HTTPS en
   `https://localhost:5501`, que es el origen que ya espera el CORS del
   backend. No hace falta configurar Live Server ni ninguna otra
   herramienta.
3. Abre `https://localhost:5501/login.html`. La primera vez, regístrate
   como administrador; las siguientes veces, inicia sesión normal.

## El guardia de acceso real

Antes, entrar directo a `index.html` sin pasar por `login.html` te dejaba
adentro igual (`checkAuth()` inventaba una sesión). Ahora:

- `bootstrapApp()` revisa si hay un `accessToken` guardado; si no lo hay,
  redirige a `login.html` **antes de pintar nada**.
- Aunque alguien lograra saltarse esa redirección editando el JS del
  navegador, **ningún dato cargaría**: `cargarEstadoInicial()` llama a la
  API, y todos los endpoints exigen `[Authorize]` — sin JWT válido, el
  servidor responde 401 y no entrega ni un cliente, ni una orden, ni un
  insumo.

Esa es la diferencia real entre "esconder el botón" y "proteger el dato":
la protección vive en el servidor.

## Qué se desactivó a propósito (y por qué)

| Función | Antes | Ahora |
|---|---|---|
| "Editar Factura" (lápiz, edición libre de total/pagado) | Sobrescribía cualquier valor a mano | Desactivada — el backend nunca acepta un total que no haya calculado él mismo. Usa "Registrar Pago" para abonar saldo. |
| "Reiniciar datos demo" (en Ayuda/QA) | Borraba `localStorage` | Desactivada — ahora borraría datos reales de la base de datos, así que no se dejó funcionando a medias |

## Ya resuelto en el checkpoint 4

- Editar perfil de usuario (nombre) en Configuración — ya funciona de verdad, contra `PUT /api/auth/perfil`.
- Cliente "Mostrador (General)" — ya no hace falta registrar un cliente manualmente antes de poder facturar; el backend lo siembra solo.
- El host HTTPS local (`SyncOps.Laundry.WebClient.Host`) reemplaza la necesidad de Live Server u otra herramienta externa.
- **Pantalla de "Gestión de Usuarios"** (checkpoint 5) — nuevo ítem de menú, visible solo para Administrador (oculto por JS y bloqueado también por el backend). Permite crear cajeros/administradores y bloquear/desbloquear el acceso de cualquiera sin borrar su cuenta ni su historial de órdenes atendidas.
- **"Olvidé mi contraseña"** (checkpoint 6) — link nuevo en `login.html`, más una página `reset-password.html`. Usa tokens reales de Identity (30 min de vida), nunca revela si un correo existe, limita a 3 intentos cada 15 min, y cierra todas las sesiones activas al cambiar la contraseña. El "envío" de correo por ahora imprime el enlace en la consola del servidor — swap-eable por un proveedor real cuando lo necesites.

## Pendiente

- Guía de despliegue con HTTPS real (certificado válido, dominio) cuando quieras sacar esto de local
- Conectar un proveedor de correo real (SendGrid/SMTP) para que "Olvidé mi contraseña" envíe correos de verdad
