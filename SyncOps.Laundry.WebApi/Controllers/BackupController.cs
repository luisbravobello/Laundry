using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Data;

namespace SyncOps.Laundry.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/backup")]
public class BackupController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public BackupController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("info")]
    public async Task<IActionResult> ObtenerInfo()
    {
        var dbPath = Path.Combine(AppContext.BaseDirectory, "syncops_web.db");
        if (!System.IO.File.Exists(dbPath))
        {
            dbPath = Path.Combine(Directory.GetCurrentDirectory(), "syncops_web.db");
        }

        long fileSizeBytes = 0;
        DateTime lastModified = DateTime.UtcNow;

        if (System.IO.File.Exists(dbPath))
        {
            var fileInfo = new FileInfo(dbPath);
            fileSizeBytes = fileInfo.Length;
            lastModified = fileInfo.LastWriteTimeUtc;
        }

        var totalOrdenes = await _db.OrdenesServicio.CountAsync();
        var totalClientes = await _db.Clientes.CountAsync();
        var totalCatalogo = await _db.CatalogoServicios.CountAsync();
        var totalMovimientos = await _db.MovimientosCaja.CountAsync();

        return Ok(new
        {
            DatabaseFile = Path.GetFileName(dbPath),
            FileSizeBytes = fileSizeBytes,
            FileSizeFormatted = $"{fileSizeBytes / 1024.0:F1} KB",
            LastModified = lastModified,
            TotalOrdenes = totalOrdenes,
            TotalClientes = totalClientes,
            TotalCatalogo = totalCatalogo,
            TotalMovimientos = totalMovimientos
        });
    }

    [HttpGet("download")]
    public IActionResult DescargarBackup()
    {
        var dbPath = Path.Combine(AppContext.BaseDirectory, "syncops_web.db");
        if (!System.IO.File.Exists(dbPath))
        {
            dbPath = Path.Combine(Directory.GetCurrentDirectory(), "syncops_web.db");
        }

        if (!System.IO.File.Exists(dbPath))
        {
            return NotFound(new { message = "El archivo de base de datos no fue encontrado." });
        }

        // Crear una copia temporal para evitar bloqueos de lectura mientras la app escribe
        var tempFile = Path.Combine(Path.GetTempPath(), $"syncops_backup_{Guid.NewGuid():N}.db");
        System.IO.File.Copy(dbPath, tempFile, true);

        var bytes = System.IO.File.ReadAllBytes(tempFile);
        try
        {
            System.IO.File.Delete(tempFile);
        }
        catch
        {
            // Ignore temp deletion fail
        }

        var fileName = $"SyncOps_Backup_{DateTime.Now:yyyyMMdd_HHmmss}.db";
        return File(bytes, "application/x-sqlite3", fileName);
    }
}
