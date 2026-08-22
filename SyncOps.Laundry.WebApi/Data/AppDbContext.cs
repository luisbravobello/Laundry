using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Domain;

namespace SyncOps.Laundry.WebApi.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<CatalogoServicio> CatalogoServicios => Set<CatalogoServicio>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<InsumoInventario> InsumosInventario => Set<InsumoInventario>();
    public DbSet<OrdenServicio> OrdenesServicio => Set<OrdenServicio>();
    public DbSet<OrdenItem> OrdenItems => Set<OrdenItem>();
    public DbSet<MovimientoCaja> MovimientosCaja => Set<MovimientoCaja>();
    public DbSet<ConfiguracionNegocio> Configuracion => Set<ConfiguracionNegocio>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>()
            .HasIndex(r => r.TokenHash)
            .IsUnique();

        builder.Entity<OrdenServicio>()
            .HasIndex(o => o.Ticket)
            .IsUnique();

        builder.Entity<OrdenServicio>()
            .HasIndex(o => o.CodigoBarras)
            .IsUnique();

        builder.Entity<OrdenServicio>()
            .HasOne(o => o.Cliente)
            .WithMany(c => c.Ordenes)
            .HasForeignKey(o => o.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<OrdenItem>()
            .HasOne(i => i.OrdenServicio)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.OrdenServicioId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InsumoInventario>()
            .HasIndex(i => i.Codigo)
            .IsUnique();

        // decimal sin especificar precisión pierde datos silenciosamente en
        // SQLite/SQL Server — lo fijamos explícito en todos los montos.
        foreach (var prop in builder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            prop.SetPrecision(18);
            prop.SetScale(2);
        }
    }
}
