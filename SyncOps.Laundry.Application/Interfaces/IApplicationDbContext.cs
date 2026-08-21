using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.Domain.Entities;

namespace SyncOps.Laundry.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Cliente> Clientes { get; }
    DbSet<OrdenServicio> OrdenesServicio { get; }
    DbSet<DetalleOrdenItem> DetalleOrdenItems { get; }
    DbSet<DetalleSastreria> DetalleSastrerias { get; }
    DbSet<CatalogoPrendaServicio> CatalogoPrendas { get; }
    DbSet<MaquinaAutoservicio> MaquinasAutoservicio { get; }
    DbSet<InsumoInventario> InsumosInventario { get; }
    DbSet<TurnoCaja> TurnosCaja { get; }
    DbSet<TransaccionCaja> TransaccionesCaja { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ITicketPrinterService
{
    string GenerarTextoTicket(OrdenServicio orden);
    string GenerarEtiquetaPrenda(OrdenServicio orden, DetalleOrdenItem item);
    Task ImprimirTicketAsync(OrdenServicio orden);
}
