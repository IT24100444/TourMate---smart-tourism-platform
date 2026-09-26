using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TourMate.Application.Interfaces;
using TourMate.Application.Services;
using TourMate.Infrastructure.AI;
using TourMate.Infrastructure.Persistence;
using TourMate.Infrastructure.Security;

namespace TourMate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        // If PostgreSQL connection string is provided, use Npgsql (Neon Cloud); otherwise use InMemory for development/testing
        if (!string.IsNullOrWhiteSpace(connectionString) && !connectionString.Contains("YOUR_NEON_POSTGRES_CONNECTION_STRING"))
        {
            services.AddDbContext<TourMateDbContext>(options =>
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(TourMateDbContext).Assembly.FullName)));
        }
        else
        {
            services.AddDbContext<TourMateDbContext>(options =>
                options.UseInMemoryDatabase("TourMateDevDb"));
        }

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        services.AddHttpClient<IAIServiceClient, AIServiceClient>();

        // Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITourismPlaceService, TourismPlaceService>();
        services.AddScoped<IBusinessService, BusinessService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<ITripWorkflowService, TripWorkflowService>();

        return services;
    }
}
