using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northward.Game.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLastPlayedAndSaveSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastPlayedAt",
                table: "GameSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // a journey nobody has played since this column arrived was last played when it started
            migrationBuilder.Sql(@"UPDATE ""GameSessions"" SET ""LastPlayedAt"" = ""StartedAt"";");

            // the save slots, applied to what's already here: finished journeys aren't kept
            // (their kindness is on the leaderboard), and of the rest each player keeps
            // their four most recent — the ones the journeys board was showing anyway
            migrationBuilder.Sql(@"DELETE FROM ""GameSessions"" WHERE ""IsCompleted"";");
            migrationBuilder.Sql(@"
                DELETE FROM ""GameSessions"" WHERE ""Id"" IN (
                    SELECT ""Id"" FROM (
                        SELECT ""Id"", ROW_NUMBER() OVER (PARTITION BY ""UserId"" ORDER BY ""StartedAt"" DESC) AS ""Slot""
                        FROM ""GameSessions""
                    ) AS ranked
                    WHERE ""Slot"" > 4
                );");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // (the journeys cleared out on the way up can't be brought back)
            migrationBuilder.DropColumn(
                name: "LastPlayedAt",
                table: "GameSessions");
        }
    }
}
