using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TourMate.Application.Interfaces;
using TourMate.Infrastructure;
using TourMate.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Bind to all interfaces so Android emulator (10.0.2.2) and LAN devices can reach the API
builder.WebHost.UseUrls("http://0.0.0.0:5000");

// 1. Add Infrastructure Services (EF Core, Neon PostgreSQL / InMemory, Repositories, Security, AI Client)
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. Add JWT Authentication
var jwtSecret = builder.Configuration["Jwt:SecretKey"] ?? "TourMate_Super_Secret_Production_Key_2026_SriLanka_Tourism_Platform!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TourMateApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TourMateClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();

// 3. Add CORS for React Web & Flutter Mobile Clients
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllClients", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// 4. Swagger with JWT Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TourMate Unified Tourism Platform API",
        Version = "v1",
        Description = "Authoritative REST API for Sri Lanka Tourism Discovery, Bookings, Accommodations, and Multi-Agent AI Itinerary Planning."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 5. Seed Database on Startup + Apply Missing Schema Patches
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<TourMateDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        logger.LogInformation("Verifying database schema in Neon Cloud PostgreSQL...");
        await context.Database.EnsureCreatedAsync();

        // ── Schema Patch: safely add columns/tables added after initial deployment ──
        // EnsureCreatedAsync never alters existing tables, so we patch manually.
        logger.LogInformation("Applying schema patches (missing columns / tables)...");
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                -- Patch 1: Add HasWarning / WarningMessage / HasComplaint / ComplaintText to Bookings if missing
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""HasWarning"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""WarningMessage"" text NULL;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""HasComplaint"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""ComplaintText"" text NULL;

                -- Patch 2: Create BookingComplaints table if it doesn't exist
                CREATE TABLE IF NOT EXISTS ""BookingComplaints"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""BookingId"" uuid NOT NULL,
                    ""TouristUserId"" uuid NOT NULL,
                    ""TouristId"" uuid NULL,
                    ""BusinessId"" uuid NOT NULL,
                    ""ComplaintText"" text NOT NULL DEFAULT '',
                    ""Status"" text NOT NULL DEFAULT 'Pending',
                    ""AdminWarningMessage"" text NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""ResolvedAt"" timestamp with time zone NULL,
                    CONSTRAINT ""PK_BookingComplaints"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_BookingComplaints_Bookings"" FOREIGN KEY (""BookingId"") REFERENCES ""Bookings""(""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_BookingComplaints_Users_Tourist"" FOREIGN KEY (""TouristUserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_BookingComplaints_Businesses"" FOREIGN KEY (""BusinessId"") REFERENCES ""Businesses""(""Id"") ON DELETE CASCADE
                );

                -- Patch 3: Ensure TouristId column exists and matches TouristUserId in BookingComplaints
                ALTER TABLE ""BookingComplaints"" ADD COLUMN IF NOT EXISTS ""TouristId"" uuid NULL;
                UPDATE ""BookingComplaints"" SET ""TouristId"" = ""TouristUserId"" WHERE ""TouristId"" IS NULL;

                -- Patch 4: Add booking review columns to Reviews table
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""BookingId"" uuid NULL;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""OwnerReply"" text NULL;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""OwnerRepliedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""IsHeartedByOwner"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""OwnerHeartedAt"" timestamp with time zone NULL;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""IsDeletedByOwner"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""IsDeletedByTourist"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Reviews"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone NULL;
            ";
            await cmd.ExecuteNonQueryAsync();
        }
        await conn.CloseAsync();
        logger.LogInformation("Schema patches applied successfully.");

        logger.LogInformation("Database tables ready. Seeding seed data if needed...");
        await DatabaseSeeder.SeedAsync(context, hasher);
        logger.LogInformation("Database initialization and seed complete.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database schema check or seed encountered an issue; proceeding to start web server.");
    }
}

// 6. HTTP Request Pipeline
app.UseCors("AllowAllClients");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TourMate API v1");
    c.RoutePrefix = string.Empty; // Swagger available at root URL
});

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapGet("/api/v1/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "TourMate.Api",
    timestamp = DateTime.UtcNow,
    database = "PostgreSQL (Neon Cloud target / EF Core)"
}));

app.MapControllers();

app.Run();

// For integration test accessibility
public partial class Program { }
