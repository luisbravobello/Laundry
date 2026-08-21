using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;

namespace SyncOps.Laundry.Infrastructure.Persistence;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<OrdenServicio> OrdenesServicio => Set<OrdenServicio>();
    public DbSet<DetalleOrdenItem> DetalleOrdenItems => Set<DetalleOrdenItem>();
    public DbSet<DetalleSastreria> DetalleSastrerias => Set<DetalleSastreria>();
    public DbSet<CatalogoPrendaServicio> CatalogoPrendas => Set<CatalogoPrendaServicio>();
    public DbSet<MaquinaAutoservicio> MaquinasAutoservicio => Set<MaquinaAutoservicio>();
    public DbSet<InsumoInventario> InsumosInventario => Set<InsumoInventario>();
    public DbSet<TurnoCaja> TurnosCaja => Set<TurnoCaja>();
    public DbSet<TransaccionCaja> TransaccionesCaja => Set<TransaccionCaja>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Indices para búsqueda ultrarrápida
        modelBuilder.Entity<OrdenServicio>()
            .HasIndex(o => o.NumeroTicket)
            .IsUnique();

        modelBuilder.Entity<OrdenServicio>()
            .HasIndex(o => o.CodigoBarras);

        modelBuilder.Entity<OrdenServicio>()
            .HasIndex(o => o.FechaRecepcion);

        modelBuilder.Entity<Cliente>()
            .HasIndex(c => c.Telefono);

        modelBuilder.Entity<InsumoInventario>()
            .HasIndex(i => i.CodigoBarras);

        modelBuilder.Entity<MaquinaAutoservicio>()
            .HasIndex(m => m.CodigoIdentificador)
            .IsUnique();

        // Relaciones
        modelBuilder.Entity<DetalleOrdenItem>()
            .HasOne(d => d.Sastreria)
            .WithOne(s => s.DetalleOrdenItem)
            .HasForeignKey<DetalleSastreria>(s => s.DetalleOrdenItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrdenServicio>()
            .HasMany(o => o.Items)
            .WithOne(i => i.OrdenServicio)
            .HasForeignKey(i => i.OrdenServicioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TurnoCaja>()
            .HasMany(t => t.Transacciones)
            .WithOne(tr => tr.TurnoCaja)
            .HasForeignKey(tr => tr.TurnoCajaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
