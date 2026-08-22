using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SyncOps.Laundry.WebApi.Migrations
{
    /// <inheritdoc />
    public partial class AgregarItbisAOrdenes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ImpuestoItbis",
                table: "OrdenesServicio",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImpuestoItbis",
                table: "OrdenesServicio");
        }
    }
}
