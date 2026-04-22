-- Run this script on your database (finshark) if the Stocks table has old columns.
-- Use: sqlcmd -S "(localdb)\MSSQLLocalDB" -d finshark -i "FixStocksTable-Manual.sql"
-- Or run in Visual Studio: SQL Server Object Explorer -> finshark -> New Query, then paste and execute.

-- 1. Rename Purchase -> Price (if column exists)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Purchase')
BEGIN
    EXEC sp_rename 'Stocks.Purchase', 'Price', 'COLUMN';
END
GO

-- 2. Add Quantity (if missing)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Quantity')
BEGIN
    ALTER TABLE Stocks ADD Quantity INT NOT NULL DEFAULT 0;
END
GO

-- 3. Copy LastDiv into Quantity (if LastDiv exists)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'LastDiv')
BEGIN
    UPDATE Stocks SET Quantity = CAST(ISNULL(LastDiv, 0) AS INT);
END
GO

-- 4. Drop LastDiv (if exists)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'LastDiv')
BEGIN
    ALTER TABLE Stocks DROP COLUMN LastDiv;
END
GO

-- 5. Drop Industry (if exists)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stocks' AND COLUMN_NAME = 'Industry')
BEGIN
    ALTER TABLE Stocks DROP COLUMN Industry;
END
GO
