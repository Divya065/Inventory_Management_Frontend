using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project_1.Migrations
{
    /// <inheritdoc />
    public partial class StockPriceQuantity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Purchase",
                table: "Stocks",
                newName: "Price");

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "Stocks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE Stocks SET Quantity = CAST(LastDiv AS INT) WHERE LastDiv IS NOT NULL");

            migrationBuilder.DropColumn(
                name: "LastDiv",
                table: "Stocks");

            migrationBuilder.DropColumn(
                name: "Industry",
                table: "Stocks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LastDiv",
                table: "Stocks",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Industry",
                table: "Stocks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("UPDATE Stocks SET LastDiv = Quantity");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Stocks");

            migrationBuilder.RenameColumn(
                name: "Price",
                table: "Stocks",
                newName: "Purchase");
        }
    }
}
