using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northward.Game.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrentSceneToGameSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentScene",
                table: "GameSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "MorningScene");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentScene",
                table: "GameSessions");
        }
    }
}
