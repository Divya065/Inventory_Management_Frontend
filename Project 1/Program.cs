using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
        System.Text.Encoding.UTF8.GetBytes(GetJwtSigningKey(builder.Configuration))
        )
    };
});
builder.Services.AddScoped<IOfferRepository, OfferRepository>();
builder.Services.AddScoped<IStockRepository, StockRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPortfolioRepository, PortfolioRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IPaymentOrderRepository, PaymentOrderRepository>();
builder.Services.AddScoped<RazorpayService>();
builder.Services.Configure<UpiSettings>(builder.Configuration.GetSection("Upi"));
builder.Services.Configure<RazorpaySettings>(builder.Configuration.GetSection("Razorpay"));

// Add CORS — set Cors:AllowedOrigins in appsettings (include your Vercel + Somee URLs)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://127.0.0.1:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(corsOrigins)
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

    // Ensure Portfolios has Quantity column (idempotent)
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Portfolios' AND COLUMN_NAME = 'Quantity')
            BEGIN
                ALTER TABLE Portfolios ADD Quantity INT NOT NULL DEFAULT 1;
            END
        ");
    }
    catch { /* ignore if column already exists */ }
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

static string GetJwtSigningKey(IConfiguration config)
{
    var key = config["Jwt:SigningKey"];
    if (string.IsNullOrWhiteSpace(key) || key.StartsWith("__SET_IN_", StringComparison.Ordinal))
        throw new InvalidOperationException(
            "JWT SigningKey is not configured. Create appsettings.json (copy from appsettings.Public.json) or set Jwt__SigningKey.");
    return key;
}
