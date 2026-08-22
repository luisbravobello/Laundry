# SyncOps.Laundry.WebClient.Host

Servidor estático mínimo. Su único trabajo es servir los archivos de
`wwwroot/` (`index.html`, `login.html`, `app.js`, `api.js`, `styles.css`)
por HTTPS en `https://localhost:5501` — sin base de datos, sin lógica de
negocio, sin nada más. Existe para que el `ClientOrigin` que espera el
CORS de `SyncOps.Laundry.WebApi` funcione de forma "turnkey" en local,
sin depender de Live Server ni de configurar un certificado aparte.

## Actualizar el cliente web

Si editas `index.html`/`app.js`/etc. en `SyncOps-Web-Client/` (el
proyecto "fuente"), cópialos de nuevo a `wwwroot/` de aquí antes de
correr — este proyecto no los importa automáticamente, son una copia.

## Ejecutar

```powershell
dotnet dev-cert https --trust   # si no lo hiciste ya para la API
dotnet run --launch-profile https
```

Abre `https://localhost:5501/login.html`. Asegúrate de que
`SyncOps.Laundry.WebApi` esté corriendo en paralelo en
`https://localhost:5443`.
