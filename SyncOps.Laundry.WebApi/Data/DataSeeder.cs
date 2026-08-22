using Microsoft.EntityFrameworkCore;
using SyncOps.Laundry.WebApi.Domain;

namespace SyncOps.Laundry.WebApi.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();

        if (!await db.CatalogoServicios.AnyAsync())
        {
            db.CatalogoServicios.AddRange(
                new CatalogoServicio { Nombre = "Camisa de Vestir / Manga Larga", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 180 },
                new CatalogoServicio { Nombre = "Pantalón de Vestir / Gabardina", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 200 },
                new CatalogoServicio { Nombre = "Traje Completo (2 Piezas)", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 450 },
                new CatalogoServicio { Nombre = "Vestido Casual / Fiesta", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 350 },
                new CatalogoServicio { Nombre = "Edredón / Acolchado King Size", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 600 },
                new CatalogoServicio { Nombre = "Juego de Sábanas Completo", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 350 },
                new CatalogoServicio { Nombre = "Polo / Camiseta Casual", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 130 },
                new CatalogoServicio { Nombre = "Chaqueta / Blazer Casual", Categoria = "Lavandería", Servicio = "Lavandería", Precio = 300 },
                new CatalogoServicio { Nombre = "Ruedo / Dobladillo de Pantalón", Categoria = "Sastrería", Servicio = "Sastrería", Precio = 250 },
                new CatalogoServicio { Nombre = "Ajuste de Cintura / Entalle", Categoria = "Sastrería", Servicio = "Sastrería", Precio = 350 },
                new CatalogoServicio { Nombre = "Cambio de Zipper / Cremallera", Categoria = "Sastrería", Servicio = "Sastrería", Precio = 300 },
                new CatalogoServicio { Nombre = "Ajuste de Mangas / Hombros", Categoria = "Sastrería", Servicio = "Sastrería", Precio = 400 },
                new CatalogoServicio { Nombre = "Torre — Servicio Asistido (Lavado + Secado)", Categoria = "Autoservicio", Servicio = "Autoservicio", Precio = 1000 },
                new CatalogoServicio { Nombre = "Torre — Autoservicio Cliente (Lavado + Secado)", Categoria = "Autoservicio", Servicio = "Autoservicio", Precio = 800 },
                new CatalogoServicio { Nombre = "Industrial — Servicio Asistido (Lavado + Secado)", Categoria = "Autoservicio", Servicio = "Autoservicio", Precio = 1400 },
                new CatalogoServicio { Nombre = "Industrial — Autoservicio Cliente (Lavado + Secado)", Categoria = "Autoservicio", Servicio = "Autoservicio", Precio = 1200 },
                new CatalogoServicio { Nombre = "Suavizante Downy", Categoria = "Autoservicio", Servicio = "Autoservicio", Precio = 150 }
            );
        }

        if (!await db.Configuracion.AnyAsync())
        {
            db.Configuracion.Add(new ConfiguracionNegocio
            {
                BusinessName = "SyncOps Laundry & Tailoring Suite",
                Rnc = "131-89745-1",
                Phone = "(809) 555-7962",
                Address = "Av. Winston Churchill #102, Santo Domingo",
                Email = "contacto@syncopslaundry.do",
                TicketFooter = "Prendas no retiradas tras 30 días pasan a disposición legal. ¡Gracias por su preferencia!"
            });
        }

        // Cliente genérico para ventas de mostrador sin datos del cliente —
        // así el POS nunca queda bloqueado esperando que alguien registre
        // un cliente primero. Se identifica por nombre porque no hay una
        // columna de "es sistema"; si se borra por error, se vuelve a crear
        // solo la próxima vez que arranque la API.
        if (!await db.Clientes.AnyAsync(c => c.Nombre == "Cliente Mostrador (General)"))
        {
            db.Clientes.Add(new Cliente
            {
                Nombre = "Cliente Mostrador (General)",
                Telefono = "000-000-0000",
                EsHotel = false
            });
        }

        await db.SaveChangesAsync();
    }
}
