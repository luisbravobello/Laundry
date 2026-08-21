using System.Text;
using SyncOps.Laundry.Application.Interfaces;
using SyncOps.Laundry.Domain.Entities;
using SyncOps.Laundry.Domain.Enums;

namespace SyncOps.Laundry.Infrastructure.Printing;

public class TicketPrinterService : ITicketPrinterService
{
    public string GenerarTextoTicket(OrdenServicio orden)
    {
        var sb = new StringBuilder();
        sb.AppendLine("========================================");
        sb.AppendLine("        SYNCOPS LAUNDRY & SUITE         ");
        sb.AppendLine("     LAVANDERIA, SASTRERIA & TALLER     ");
        sb.AppendLine("      Av. Winston Churchill #102        ");
        sb.AppendLine("         Tel: (809) 555-7962            ");
        sb.AppendLine("           RNC: 131-89745-1             ");
        sb.AppendLine("========================================");
        sb.AppendLine($"TICKET: {orden.NumeroTicket}");
        sb.AppendLine($"FECHA RECEPCION: {orden.FechaRecepcion:dd/MM/yyyy hh:mm tt}");
        sb.AppendLine($"ENTREGA ESTIMADA: {orden.FechaPromesaEntrega:dd/MM/yyyy hh:mm tt}");
        sb.AppendLine($"CLIENTE: {orden.Cliente?.NombreCompleto ?? "Cliente Mostrador"}");
        sb.AppendLine($"TEL: {orden.Cliente?.Telefono ?? "N/A"}");
        if (orden.EsUrgente)
        {
            sb.AppendLine(">>> SERVICIO URGENTE / PRIORITARIO <<<");
        }
        sb.AppendLine("----------------------------------------");
        sb.AppendLine("CANT  DESCRIPCION             PRECIO    ");
        sb.AppendLine("----------------------------------------");

        foreach (var item in orden.Items)
        {
            var desc = item.PrendaDescripcion.Length > 20 ? item.PrendaDescripcion[..20] : item.PrendaDescripcion.PadRight(20);
            var precio = $"RD${item.Subtotal:N2}".PadLeft(12);
            sb.AppendLine($"{item.Cantidad,3}   {desc} {precio}");

            if (item.TipoServicio == TipoServicio.Sastreria && item.Sastreria != null)
            {
                sb.AppendLine($"    * Arreglo: {item.Sastreria.TipoArreglo}");
                if (!string.IsNullOrWhiteSpace(item.Sastreria.MedidasEspecificas))
                {
                    sb.AppendLine($"      Medidas: {item.Sastreria.MedidasEspecificas}");
                }
            }
            if (!string.IsNullOrWhiteSpace(item.DefectosPrevios))
            {
                sb.AppendLine($"    * Obs/Defectos: {item.DefectosPrevios}");
            }
        }

        sb.AppendLine("----------------------------------------");
        sb.AppendLine($"SUBTOTAL:                     RD${orden.Subtotal,9:N2}");
        if (orden.Descuento > 0)
        {
            sb.AppendLine($"DESCUENTO:                   -RD${orden.Descuento,9:N2}");
        }
        sb.AppendLine($"TOTAL GENERAL:                RD${orden.Total,9:N2}");
        sb.AppendLine($"MONTO ABONADO:                RD${orden.TotalAbonado,9:N2}");
        sb.AppendLine($"SALDO PENDIENTE:              RD${orden.SaldoPendiente,9:N2}");
        sb.AppendLine("========================================");
        sb.AppendLine("  CODIGO DE BARRAS / CONTROL PRENDAS:   ");
        sb.AppendLine($"          ||| | |||| || ||| |           ");
        sb.AppendLine($"             *{orden.CodigoBarras}*           ");
        sb.AppendLine("========================================");
        sb.AppendLine(" * Conserve este ticket para retirar.");
        sb.AppendLine(" * Prendas no retiradas tras 30 dias");
        sb.AppendLine("   pasan a disposicion de la empresa.");
        sb.AppendLine("   ¡Gracias por su preferencia!         ");
        sb.AppendLine("========================================");

        return sb.ToString();
    }

    public string GenerarEtiquetaPrenda(OrdenServicio orden, DetalleOrdenItem item)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"[SYNCOPS] TICKET: {orden.NumeroTicket}");
        sb.AppendLine($"CLIENTE: {orden.Cliente?.NombreCompleto}");
        sb.AppendLine($"PRENDA: {item.PrendaDescripcion} ({item.ColorPrenda})");
        sb.AppendLine($"SERVICIO: {item.TipoServicio}");
        sb.AppendLine($"UBICACION: {item.UbicacionEstante ?? "G-00"}");
        sb.AppendLine($"BARCODE: *{orden.CodigoBarras}*");
        return sb.ToString();
    }

    public Task ImprimirTicketAsync(OrdenServicio orden)
    {
        // Genera el ticket para impresión térmica / spooler
        var ticket = GenerarTextoTicket(orden);
        // En entorno de producción se enviaría a la impresora POS vía RawPrinter / ESC/POS
        return Task.CompletedTask;
    }
}
