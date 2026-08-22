using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SyncOps.Laundry.WebApi.Data;
using SyncOps.Laundry.WebApi.Email;
using SyncOps.Laundry.WebApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---------------------------------------------------------------------
// Identity: maneja hash de password (PBKDF2), lockout por intentos
// fallidos y políticas de contraseña. Nada de esto se implementa a mano.
// ---------------------------------------------------------------------
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// El token de "olvidé mi contraseña" usa el mismo proveedor que el resto
// de los tokens de Identity (email de confirmación, etc.); acá se acorta
// su vida específicamente a 30 minutos — el valor por defecto es 1 día,
// demasiado tiempo para un enlace de recuperación.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromMinutes(30);
});

builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();

// Máximo 3 solicitudes de recuperación de contraseña cada 15 minutos por
// IP — evita que alguien use ese endpoint para bombardear de correos a
// una cuenta ajena (o para tantear si un email existe a fuerza bruta).
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("forgot-password", limiterOptions =>
    {
        limiterOptions.PermitLimit = 3;
        limiterOptions.Window = TimeSpan.FromMinutes(15);
        limiterOptions.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ---------------------------------------------------------------------
// JWT: la clave NUNCA vive en appsettings.json versionado en git.
// En desarrollo: dotnet user-secrets set "Jwt:Key" "<valor-largo-aleatorio>"
// En producción: variable de entorno o Azure Key Vault / similar.
// ---------------------------------------------------------------------
var jwtKey = builder.Configuration["Jwt:Key"];
if (builder.Environment.IsDevelopment() && string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException(
        "Falta Jwt:Key. Corre: dotnet user-secrets set \"Jwt:Key\" \"<valor-de-al-menos-32-caracteres>\"");
}

builder.Services.AddScoped<ITokenService, TokenService>();

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = true; // nunca aceptar tokens por HTTP plano
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey ?? string.Empty)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------
// CORS: solo el origen exacto del frontend puede llamar a la API, y solo
// con credentials (necesario para que la cookie de refresh viaje).
// "*" nunca se usa junto con AllowCredentials.
// ---------------------------------------------------------------------
var clientOrigin = builder.Configuration["ClientOrigin"] ?? "https://localhost:5501";
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientPolicy", policy =>
    {
        policy.WithOrigins(clientOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serializa enums como texto ("Efectivo", "Pagada") en vez de
        // números — así el JS del frontend puede usar los mismos nombres
        // que ya usaba en las etiquetas de los botones, sin tabla de mapeo.
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

var app = builder.Build();

// Manejo Global de Excepciones: garantiza que cualquier error no controlado
// devuelva una respuesta JSON estructurada y segura, en lugar de HTML o stacktraces crudos.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var ex = exceptionHandlerPathFeature?.Error;

        var response = new
        {
            status = 500,
            message = "Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde.",
            detail = app.Environment.IsDevelopment() ? ex?.Message : null
        };

        await context.Response.WriteAsJsonAsync(response);
    });
});

// HSTS: le dice al navegador "solo hables conmigo por HTTPS, nunca por
// HTTP" incluso si alguien escribe la URL sin https:// a propósito.
app.UseHsts();
app.UseHttpsRedirection();

app.UseCors("ClientPolicy");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Aplica migraciones pendientes y siembra el catálogo/configuración inicial.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DataSeeder.SeedAsync(db);
}

app.Run();
