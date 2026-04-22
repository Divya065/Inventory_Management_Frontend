using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project_1.Migrations
{
    /// <inheritdoc />
    public partial class FixStocksPriceQuantityColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix Stocks table when it still has old columns (Purchase, LastDiv, Industry)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Purchase')
                BEGIN
                    EXEC sp_rename 'Stocks.Purchase', 'Price', 'COLUMN';
                END
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Quantity')
                BEGIN
                    ALTER TABLE Stocks ADD Quantity INT NOT NULL DEFAULT 0;
                END
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'LastDiv')
                BEGIN
                    UPDATE Stocks SET Quantity = CAST(ISNULL(LastDiv, 0) AS INT) WHERE 1=1;
                END
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'LastDiv')
                BEGIN
                    ALTER TABLE Stocks DROP COLUMN LastDiv;
                END
            ");
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Industry')
                BEGIN
                    ALTER TABLE Stocks DROP COLUMN Industry;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
