using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northward.Game.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerCharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Season = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerCharacters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CustomName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsUnlocked = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerCharacters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameSessions_PlayerCharacterId",
                table: "GameSessions",
                column: "PlayerCharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_GameSessions_UserId",
                table: "GameSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerCharacters_UserId",
                table: "PlayerCharacters",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameSessions");

            migrationBuilder.DropTable(
                name: "PlayerCharacters");
        }
    }
}
