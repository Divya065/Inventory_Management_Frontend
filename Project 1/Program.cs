using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json.Serialization;
using Project_1.Configuration;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;
using Project_1.Repository;
using Project_1.Service;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSwaggerGen(option =>
{
    option.SwaggerDoc("v1", new OpenApiInfo { Title = "Demo API", Version = "v1" });
    option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    option.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
    // Use camelCase to match JavaScript conventions
    options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
});

builder.Services.AddDbContext<ApplicationDBContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddIdentity<AppUser, IdentityRole>(Options =>
{
    Options.Password.RequireDigit = true;
    Options.Password.RequireLowercase = true;
    Options.Password.RequireUppercase = true;
    Options.Password.RequireNonAlphanumeric = true;
    Options.Password.RequiredLength = 8;
})
.AddEntityFrameworkStores<ApplicationDBContext>();

builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme =
    options.DefaultChallengeScheme =
    options.DefaultForbidScheme =
    options.DefaultScheme =
    options.DefaultSignInScheme =
    options.DefaultSignOutScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options => {
  var config = builder.Configuration;

  // .NET 8 defaults to JsonWebTokenHandler which breaks some symmetric-key JWTs on IIS/Somee
  options.TokenHandlers.Clear();
  options.TokenHandlers.Add(new JwtSecurityTokenHandler());

  options.TokenValidationParameters = new TokenValidationParameters
  {
    ValidateIssuer = true,
    ValidIssuer = config["Jwt:Issuer"],
    ValidateAudience = true,
    ValidAudience = config["Jwt:Audience"],
    ValidateIssuerSigningKey = true,
    ValidateLifetime = true,
    RoleClaimType = ClaimTypes.Role,
    NameClaimType = ClaimTypes.Name,
    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha512 },
    IssuerSigningKeyResolver = (_, __, ___, ____) =>
    {
      var keyBytes = Encoding.UTF8.GetBytes(GetJwtSigningKey(config));
      return new[] { new SymmetricSecurityKey(keyBytes) };
    },
  };
});
builder.Services.AddScoped<IOfferRepository, OfferRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<ICartParkingRepository, CartParkingRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IPaymentOrderRepository, PaymentOrderRepository>();
builder.Services.AddScoped<RazorpayService>();
builder.Services.Configure<UpiSettings>(builder.Configuration.GetSection("Upi"));
builder.Services.Configure<RazorpaySettings>(builder.Configuration.GetSection("Razorpay"));
builder.Services.Configure<SubscriptionSettings>(builder.Configuration.GetSection("Subscription"));

// Add CORS — set Cors:AllowedOrigins in appsettings (include your Vercel + Somee URLs)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://127.0.0.1:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                if (string.IsNullOrWhiteSpace(origin)) return false;
                if (corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;
                return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                       && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Ensure Offers table exists: rename Comments to Offers if DB still has old name (idempotent)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDBContext>();
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comments')
            AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Offers')
            BEGIN
                EXEC sp_rename 'Comments', 'Offers';
            END
        ");
    }
    catch { /* ignore if already applied or not applicable */ }

    // Phase 2 table rename: Stocks → Products, Portfolios → CartItems (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID(N'dbo.Stocks', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Products', N'U') IS NULL
                EXEC sp_rename N'dbo.Stocks', N'Products';

            IF OBJECT_ID(N'dbo.Portfolios', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.CartItems', N'U') IS NULL
                EXEC sp_rename N'dbo.Portfolios', N'CartItems';

            IF COL_LENGTH(N'dbo.CartItems', N'StockID') IS NOT NULL AND COL_LENGTH(N'dbo.CartItems', N'ProductID') IS NULL
                EXEC sp_rename N'dbo.CartItems.StockID', N'ProductID', N'COLUMN';

            IF COL_LENGTH(N'dbo.Offers', N'StockId') IS NOT NULL AND COL_LENGTH(N'dbo.Offers', N'ProductId') IS NULL
                EXEC sp_rename N'dbo.Offers.StockId', N'ProductId', N'COLUMN';
        ");
    }
    catch { /* ignore if already renamed */ }

    // Ensure Transactions table exists (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Transactions')
            BEGIN
                CREATE TABLE [Transactions] (
                    [Id] int NOT NULL IDENTITY(1,1),
                    [CustomerName] nvarchar(max) NOT NULL,
                    [Total] decimal(18,2) NOT NULL,
                    [Type] nvarchar(max) NOT NULL,
                    [CreatedOn] datetime2 NOT NULL,
                    [AppUserId] nvarchar(450) NULL,
                    CONSTRAINT [PK_Transactions] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Transactions_AspNetUsers_AppUserId] FOREIGN KEY ([AppUserId]) REFERENCES [AspNetUsers] ([Id])
                );
                CREATE INDEX [IX_Transactions_AppUserId] ON [Transactions] ([AppUserId]);
            END;

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Transactions' AND COLUMN_NAME = 'ItemsSummary')
            BEGIN
                ALTER TABLE [Transactions] ADD [ItemsSummary] nvarchar(max) NULL;
            END

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Transactions' AND COLUMN_NAME = 'PaymentMethod')
            BEGIN
                ALTER TABLE [Transactions] ADD [PaymentMethod] nvarchar(20) NULL;
            END

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Transactions' AND COLUMN_NAME = 'ItemsJson')
            BEGIN
                ALTER TABLE [Transactions] ADD [ItemsJson] nvarchar(max) NULL;
            END
        ");
    }
    catch { /* ignore if table already exists */ }

    // Ensure PaymentOrders table exists (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PaymentOrders')
            BEGIN
                CREATE TABLE [PaymentOrders] (
                    [Id] uniqueidentifier NOT NULL,
                    [Provider] nvarchar(50) NOT NULL,
                    [ProviderOrderId] nvarchar(200) NOT NULL,
                    [ProviderPaymentId] nvarchar(200) NULL,
                    [Amount] decimal(18,2) NOT NULL,
                    [Currency] nvarchar(10) NOT NULL,
                    [Status] nvarchar(30) NOT NULL,
                    [CustomerName] nvarchar(200) NOT NULL,
                    [ItemsSummary] nvarchar(max) NULL,
                    [OrderItemsJson] nvarchar(max) NULL,
                    [CreatedOn] datetime2 NOT NULL,
                    [PaidOn] datetime2 NULL,
                    [AppUserId] nvarchar(450) NULL,
                    CONSTRAINT [PK_PaymentOrders] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_PaymentOrders_AspNetUsers_AppUserId] FOREIGN KEY ([AppUserId]) REFERENCES [AspNetUsers] ([Id])
                );
                CREATE INDEX [IX_PaymentOrders_AppUserId] ON [PaymentOrders] ([AppUserId]);
                CREATE INDEX [IX_PaymentOrders_ProviderOrderId] ON [PaymentOrders] ([ProviderOrderId]);
            END
        ");
    }
    catch { /* ignore if table already exists */ }

    // Ensure CartItems has Quantity column (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CartItems' AND COLUMN_NAME = 'Quantity')
            BEGIN
                ALTER TABLE CartItems ADD Quantity INT NOT NULL DEFAULT 1;
            END
        ");
    }
    catch { /* ignore if column already exists */ }

    // Multi-cart parking tables (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ParkedCarts')
            BEGIN
                CREATE TABLE [ParkedCarts] (
                    [Id] int NOT NULL IDENTITY(1,1),
                    [AppUserId] nvarchar(450) NOT NULL,
                    [CustomerName] nvarchar(200) NOT NULL,
                    [ItemsJson] nvarchar(max) NOT NULL,
                    [ItemCount] int NOT NULL,
                    [EstimatedTotal] decimal(18,2) NOT NULL,
                    [CreatedOn] datetime2 NOT NULL,
                    CONSTRAINT [PK_ParkedCarts] PRIMARY KEY ([Id])
                );
                CREATE INDEX [IX_ParkedCarts_AppUserId] ON [ParkedCarts] ([AppUserId]);
            END

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CartStates')
            BEGIN
                CREATE TABLE [CartStates] (
                    [AppUserId] nvarchar(450) NOT NULL,
                    [ActiveCustomerName] nvarchar(200) NULL,
                    CONSTRAINT [PK_CartStates] PRIMARY KEY ([AppUserId])
                );
            END
        ");
    }
    catch { /* ignore if tables already exist */ }

    // Products.Barcode for USB scanner checkout (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'Barcode')
            BEGIN
                ALTER TABLE [Products] ADD [Barcode] nvarchar(64) NULL;
            END
        ");
    }
    catch { /* ignore if column already exists */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            SET QUOTED_IDENTIFIER ON;
            IF COL_LENGTH('Products', 'Barcode') IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name IN ('IX_Products_Barcode', 'IX_Stocks_Barcode') AND object_id = OBJECT_ID('Products')
            )
            BEGIN
                CREATE UNIQUE INDEX [IX_Products_Barcode]
                ON [Products] ([Barcode])
                WHERE [Barcode] IS NOT NULL;
            END
        ");
    }
    catch { /* ignore if index already exists */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'Brand')
            BEGIN
                ALTER TABLE [Products] ADD [Brand] nvarchar(120) NULL;
            END
        ");
    }
    catch { /* ignore if column already exists */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF COL_LENGTH('Products', 'Brand') IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name IN ('IX_Products_Brand', 'IX_Stocks_Brand') AND object_id = OBJECT_ID('Products')
            )
            BEGIN
                CREATE INDEX [IX_Products_Brand] ON [Products] ([Brand]);
            END
        ");
    }
    catch { /* ignore if index already exists */ }

    // Offers.IsBuyOneGetOne for cart BOGO (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Offers' AND COLUMN_NAME = 'IsBuyOneGetOne')
            BEGIN
                ALTER TABLE [Offers] ADD [IsBuyOneGetOne] bit NOT NULL CONSTRAINT DF_Offers_IsBuyOneGetOne DEFAULT (0);
            END
        ");
    }
    catch { /* ignore if column already exists */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Offers' AND COLUMN_NAME = 'BuyQty')
            BEGIN
                ALTER TABLE [Offers] ADD [BuyQty] int NOT NULL CONSTRAINT DF_Offers_BuyQty DEFAULT (0);
            END
        ");
    }
    catch { /* ignore */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Offers' AND COLUMN_NAME = 'GetQty')
            BEGIN
                ALTER TABLE [Offers] ADD [GetQty] int NOT NULL CONSTRAINT DF_Offers_GetQty DEFAULT (0);
            END
        ");
    }
    catch { /* ignore */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE [Offers]
            SET [BuyQty] = 1, [GetQty] = 1
            WHERE [IsBuyOneGetOne] = 1 AND ([BuyQty] = 0 OR [GetQty] = 0);
        ");
    }
    catch { /* ignore */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CartItems' AND COLUMN_NAME = 'PaidQuantity')
            BEGIN
                ALTER TABLE [CartItems] ADD [PaidQuantity] int NULL;
            END
        ");
    }
    catch { /* ignore */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Offers' AND COLUMN_NAME = 'DiscountPercent')
            BEGIN
                ALTER TABLE [Offers] ADD [DiscountPercent] decimal(5,2) NOT NULL CONSTRAINT DF_Offers_DiscountPercent DEFAULT (0);
            END
        ");
    }
    catch { /* ignore */ }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'ExpiryDate')
            BEGIN
                ALTER TABLE [Products] ADD [ExpiryDate] datetime2 NULL;
            END
        ");
    }
    catch { /* ignore */ }

    // BatchNo removed from the app — drop leftover column if present
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'BatchNo')
            BEGIN
                ALTER TABLE [Products] DROP COLUMN [BatchNo];
            END
        ");
    }
    catch { /* ignore */ }

    // SaaS columns must exist before UserManager queries AppUser (FindByNameAsync).
    await EnsureColumnAsync(db, "AspNetUsers", "ShopName",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [ShopName] nvarchar(120) NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "IsActive",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [IsActive] bit NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "CreatedAt",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [CreatedAt] datetime2 NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "SubscriptionPlan",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [SubscriptionPlan] nvarchar(40) NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "PlanStartedAt",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [PlanStartedAt] datetime2 NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "PlanExpiresAt",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [PlanExpiresAt] datetime2 NULL");
    await EnsureColumnAsync(db, "AspNetUsers", "HasUsedTrial",
        "ALTER TABLE [dbo].[AspNetUsers] ADD [HasUsedTrial] bit NULL");
    await EnsureColumnAsync(db, "Products", "OwnerUserId",
        "ALTER TABLE [dbo].[Products] ADD [OwnerUserId] nvarchar(450) NULL");

    await ExecSqlAsync(db, @"
        UPDATE [dbo].[AspNetUsers]
        SET [HasUsedTrial] = 0
        WHERE [HasUsedTrial] IS NULL;
    ");

    await ExecSqlAsync(db, @"
        UPDATE [dbo].[AspNetUsers]
        SET [SubscriptionPlan] = N'None'
        WHERE [SubscriptionPlan] IS NULL OR LTRIM(RTRIM([SubscriptionPlan])) = '';
    ");

    // One-time: clear legacy auto-started trials (before Trial required Get on Plans).
    // After this, login/register never grant access until the user chooses a plan.
    await ExecSqlAsync(db, @"
        IF OBJECT_ID(N'[dbo].[__SubscriptionMigration]', N'U') IS NULL
        BEGIN
            CREATE TABLE [dbo].[__SubscriptionMigration] (
                [Id] int NOT NULL PRIMARY KEY,
                [AppliedOn] datetime2 NOT NULL
            );

            INSERT INTO [dbo].[__SubscriptionMigration] ([Id], [AppliedOn])
            VALUES (1, SYSUTCDATETIME());

            UPDATE u
            SET
                u.[SubscriptionPlan] = N'None',
                u.[HasUsedTrial] = 0,
                u.[PlanStartedAt] = NULL,
                u.[PlanExpiresAt] = NULL
            FROM [dbo].[AspNetUsers] u
            WHERE (u.[SubscriptionPlan] = N'Trial' OR u.[SubscriptionPlan] = N'None' OR u.[SubscriptionPlan] IS NULL)
              AND NOT EXISTS (
                SELECT 1
                FROM [dbo].[AspNetUserRoles] ur
                INNER JOIN [dbo].[AspNetRoles] r ON r.[Id] = ur.[RoleId]
                WHERE ur.[UserId] = u.[Id] AND r.[NormalizedName] = N'SUPERADMIN'
              );
        END
    ");

    await ExecSqlAsync(db, @"
        UPDATE [dbo].[AspNetUsers] SET [ShopName] = [UserName] WHERE [ShopName] IS NULL OR LTRIM(RTRIM([ShopName])) = '';
        UPDATE [dbo].[AspNetUsers] SET [IsActive] = 1 WHERE [IsActive] IS NULL;
        UPDATE [dbo].[AspNetUsers] SET [CreatedAt] = SYSUTCDATETIME() WHERE [CreatedAt] IS NULL;
    ");
    await ExecSqlAsync(db, @"
        UPDATE p
        SET p.[OwnerUserId] = u.[Id]
        FROM [dbo].[Products] p
        CROSS APPLY (
            SELECT TOP 1 usr.[Id]
            FROM [dbo].[AspNetUsers] usr
            WHERE NOT EXISTS (
                SELECT 1
                FROM [dbo].[AspNetUserRoles] ur
                INNER JOIN [dbo].[AspNetRoles] r ON r.[Id] = ur.[RoleId]
                WHERE ur.[UserId] = usr.[Id] AND r.[NormalizedName] = N'SUPERADMIN'
            )
            ORDER BY usr.[Id]
        ) u
        WHERE p.[OwnerUserId] IS NULL;
    ");

    try
    {
        await ExecSqlAsync(db, @"
            SET QUOTED_IDENTIFIER ON;
            IF EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Products_Barcode' AND object_id = OBJECT_ID('dbo.Products')
            )
                DROP INDEX [IX_Products_Barcode] ON [dbo].[Products];

            IF COL_LENGTH('dbo.Products', 'OwnerUserId') IS NOT NULL
            AND COL_LENGTH('dbo.Products', 'Barcode') IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Products_Owner_Barcode' AND object_id = OBJECT_ID('dbo.Products')
            )
                CREATE UNIQUE INDEX [IX_Products_Owner_Barcode]
                ON [dbo].[Products] ([OwnerUserId], [Barcode])
                WHERE [Barcode] IS NOT NULL AND [OwnerUserId] IS NOT NULL;
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Product barcode index skipped: {ex.Message}");
    }

    try
    {
        await SeedPlatformIdentityAsync(scope.ServiceProvider, app.Configuration);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SuperAdmin seed failed: {ex.Message}");
        if (ex.InnerException != null)
            Console.WriteLine($"Inner: {ex.InnerException.Message}");
    }
}

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

// Use CORS - must be before UseAuthentication and UseAuthorization
app.UseCors("AllowReactApp");

// Disable HTTPS redirection completely in development
// This prevents redirects from http://localhost:5032 to https://localhost:7167

app.UseAuthentication();
app.UseAuthorization();


app.MapGet("/", () => Results.Ok(new { status = "running", service = "Inventory API" }));
app.MapGet("/api/health", () => Results.Ok("ok"));

app.MapControllers();

app.Run();

static async Task EnsureColumnAsync(ApplicationDBContext db, string table, string column, string addSql)
{
    var connection = db.Database.GetDbConnection();
    if (connection.State != System.Data.ConnectionState.Open)
        await db.Database.OpenConnectionAsync();

    using var check = connection.CreateCommand();
    check.CommandText = @"
        SELECT COUNT(*)
        FROM sys.columns
        WHERE object_id = OBJECT_ID(@table) AND name = @column";
    var tableParam = check.CreateParameter();
    tableParam.ParameterName = "@table";
    tableParam.Value = "dbo." + table;
    check.Parameters.Add(tableParam);
    var columnParam = check.CreateParameter();
    columnParam.ParameterName = "@column";
    columnParam.Value = column;
    check.Parameters.Add(columnParam);

    var exists = Convert.ToInt32(await check.ExecuteScalarAsync());
    if (exists > 0)
        return;

    using var alter = connection.CreateCommand();
    alter.CommandText = addSql;
    await alter.ExecuteNonQueryAsync();
}

static async Task ExecSqlAsync(ApplicationDBContext db, string sql)
{
    var connection = db.Database.GetDbConnection();
    if (connection.State != System.Data.ConnectionState.Open)
        await db.Database.OpenConnectionAsync();

    using var cmd = connection.CreateCommand();
    cmd.CommandText = sql;
    await cmd.ExecuteNonQueryAsync();
}

static string GetJwtSigningKey(IConfiguration config)
{
    var key = config["Jwt:SigningKey"];
    if (string.IsNullOrWhiteSpace(key) || key.StartsWith("__SET_IN_", StringComparison.Ordinal))
        throw new InvalidOperationException(
            "JWT SigningKey is not configured. Create appsettings.json (copy from appsettings.Public.json) or set Jwt__SigningKey.");
    return key;
}

static async Task SeedPlatformIdentityAsync(IServiceProvider services, IConfiguration config)
{
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = services.GetRequiredService<UserManager<AppUser>>();

    foreach (var roleName in new[] { "User", "Admin", "SuperAdmin" })
    {
        if (!await roleManager.RoleExistsAsync(roleName))
            await roleManager.CreateAsync(new IdentityRole(roleName));
    }

    var userName = (config["SuperAdmin:UserName"] ?? "superadmin").Trim();
    var email = (config["SuperAdmin:Email"] ?? "superadmin@localhost").Trim();
    var password = config["SuperAdmin:Password"];

    if (string.IsNullOrWhiteSpace(password) || password.StartsWith("__SET_IN_", StringComparison.Ordinal))
    {
        Console.WriteLine("SuperAdmin password is not configured. Set SuperAdmin:Password to seed the platform owner.");
        return;
    }

    var existing = await userManager.FindByNameAsync(userName);
    if (existing == null)
    {
        var admin = new AppUser
        {
            UserName = userName,
            Email = email,
            ShopName = "Platform",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var created = await userManager.CreateAsync(admin, password);
        if (!created.Succeeded)
        {
            var errors = string.Join("; ", created.Errors.Select(e => e.Description));
            Console.WriteLine($"SuperAdmin seed failed: {errors}");
            return;
        }
        existing = admin;
    }

    existing.IsActive = true;
    if (string.IsNullOrWhiteSpace(existing.ShopName))
        existing.ShopName = "Platform";
    await userManager.UpdateAsync(existing);

    if (!await userManager.IsInRoleAsync(existing, "SuperAdmin"))
    {
        var roleResult = await userManager.AddToRoleAsync(existing, "SuperAdmin");
        if (!roleResult.Succeeded)
        {
            var errors = string.Join("; ", roleResult.Errors.Select(e => e.Description));
            Console.WriteLine($"SuperAdmin role assign failed: {errors}");
        }
    }
}
