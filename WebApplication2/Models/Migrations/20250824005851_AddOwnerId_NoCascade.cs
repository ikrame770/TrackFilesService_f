using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplication2.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnerId_NoCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OwnerId",
                table: "Entities",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Entities_OwnerId",
                table: "Entities",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Entities_Users_OwnerId",
                table: "Entities",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Entities_Users_OwnerId",
                table: "Entities");

            migrationBuilder.DropIndex(
                name: "IX_Entities_OwnerId",
                table: "Entities");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Entities");
        }
    }
}
