using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SyncOps.Laundry.WebApi.Migrations
{
    /// <inheritdoc />
    public partial class AgregarEstadoProceso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EstadoProceso",
                table: "OrdenesServicio",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstadoProceso",
                table: "OrdenesServicio");
        }
    }
}
