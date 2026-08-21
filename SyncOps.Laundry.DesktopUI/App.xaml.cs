using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SyncOps.Laundry.Application.Features.Dashboard.Queries;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.DesktopUI.Services;
using SyncOps.Laundry.DesktopUI.ViewModels;
using SyncOps.Laundry.Infrastructure.Persistence;
using SyncOps.Laundry.Infrastructure.Printing;

namespace SyncOps.Laundry.DesktopUI;

public partial class App : System.Windows.Application
{
    public static IHost Host { get; private set; } = null!;

    public App()
    {
        Host = Microsoft.Extensions.Hosting.Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                // 1. Capa de Infraestructura & Base de Datos
                services.AddDbContext<AppDbContext>(options =>
                    options.UseSqlite("Data Source=syncops_laundry.db;Mode=ReadWriteCreate;Cache=Shared;"));

                services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
                services.AddSingleton<ITicketPrinterService, TicketPrinterService>();

                // 2. Capa de Aplicación (MediatR CQRS)
                services.AddMediatR(cfg => 
                    cfg.RegisterServicesFromAssembly(typeof(GetDashboardDataQuery).Assembly));

                // 3. Servicios de UI
                services.AddSingleton<INavigationService>(sp =>
                    new NavigationService(type => (ObservableObject)sp.GetRequiredService(type)));

                // 4. ViewModels
                services.AddSingleton<MainViewModel>();
                services.AddTransient<DashboardViewModel>();
                services.AddTransient<PosRecepcionViewModel>();
                services.AddTransient<TallerKanbanViewModel>();
                services.AddTransient<AutoservicioViewModel>();
                services.AddTransient<InventarioViewModel>();
                services.AddTransient<ClientesViewModel>();
                services.AddTransient<ControlCajaViewModel>();

                // 5. Ventanas
                services.AddSingleton<MainWindow>();
            })
            .Build();
    }

    protected override async void OnStartup(StartupEventArgs e)
    {
        await Host.StartAsync();

        // Inicializar base de datos y datos semilla de prueba
        using (var scope = Host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await DataSeeder.SeedAsync(db);
        }

        var mainWindow = Host.Services.GetRequiredService<MainWindow>();
        mainWindow.Show();

        base.OnStartup(e);
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        using (Host)
        {
            await Host.StopAsync(TimeSpan.FromSeconds(5));
        }
        base.OnExit(e);
    }
}
