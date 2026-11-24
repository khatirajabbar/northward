using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northward.Leaderboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialLeaderboardSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LeaderboardEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CharacterType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Season = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    CompletionTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaderboardEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeaderboardEntries_Score",
                table: "LeaderboardEntries",
                column: "Score");

            migrationBuilder.CreateIndex(
                name: "IX_LeaderboardEntries_Season",
                table: "LeaderboardEntries",
                column: "Season");

            migrationBuilder.CreateIndex(
                name: "IX_LeaderboardEntries_UserId",
                table: "LeaderboardEntries",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeaderboardEntries");
        }
    }
}
