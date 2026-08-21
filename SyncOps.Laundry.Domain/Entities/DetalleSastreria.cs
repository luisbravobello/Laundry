namespace SyncOps.Laundry.Domain.Entities;

public class DetalleSastreria : BaseEntity
{
    public Guid DetalleOrdenItemId { get; set; }
    public DetalleOrdenItem? DetalleOrdenItem { get; set; }

    public string TipoArreglo { get; set; } = string.Empty; // Ej. Dobladillo / Ruedo, Ajuste de Cintura, Cambio de Zipper, Entalle de Mangas, Parche/Zurcido
    public string? MedidasEspecificas { get; set; } // Ej. Reducir 2cm de cintura, Ruedo a 38 pulgadas
    public string? ObservacionesTaller { get; set; } // Ej. Hilo azul marino oscuro, conservar corte original
    public string? SastreAsignado { get; set; }
    public bool RequierePruebaPrevia { get; set; }
    public DateTime? FechaPrueba { get; set; }
}
