using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northward.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageShowing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MayShow",
                table: "Messages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Shown",
                table: "Messages",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MayShow",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "Shown",
                table: "Messages");
        }
    }
}
