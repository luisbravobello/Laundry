// Servidor estático mínimo: solo entrega index.html/login.html/app.js/api.js/
// styles.css por HTTPS en un puerto fijo. No tiene ninguna lógica de negocio
// ni acceso a datos — toda esa lógica vive en SyncOps.Laundry.WebApi. Existe
// solo para que "https://localhost:5501" (el ClientOrigin que espera el
// backend en su config de CORS) funcione sin depender de Live Server u otra
// herramienta externa.
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseHttpsRedirection();
app.UseDefaultFiles();   // sirve index.html en "/"
app.UseStaticFiles();

app.Run();
