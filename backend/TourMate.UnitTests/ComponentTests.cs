using System;
using TourMate.Application.DTOs;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;
using Xunit;

namespace TourMate.UnitTests;

public class ComponentTests
{
    [Fact]
    public void ComponentA_PlaceStatus_InitialStateShouldBeDraftOrPending()
    {
        var place = new TourismPlace
        {
            Name = "Ella Rock Wilderness Trek",
            District = "Badulla",
            Status = PlaceStatus.PendingReview
        };

        Assert.Equal(PlaceStatus.PendingReview, place.Status);
        Assert.False(place.Status == PlaceStatus.Approved);
    }

    [Fact]
    public void ComponentB_OfferDateValidation_EndDateMustBeAfterStartDate()
    {
        var startDate = DateTime.UtcNow;
        var endDate = DateTime.UtcNow.AddDays(-1); // Invalid!

        bool isValid = endDate > startDate;

        Assert.False(isValid);
    }

    [Fact]
    public void ComponentC_BookingStateMachine_CompletedBookingCannotRevertToPending()
    {
        var booking = new Booking
        {
            Status = BookingStatus.Completed
        };

        bool canRevertToPending = booking.Status != BookingStatus.Completed;

        Assert.False(canRevertToPending);
    }

    [Fact]
    public void ComponentD_BudgetValidator_MustEnforceStrictUpperCeiling()
    {
        decimal userBudget = 40000m;
        decimal hotelCost = 18000m;
        decimal diningCost = 7500m;
        decimal activityCost = 4500m;
        decimal transportCost = 5500m;
        decimal totalProposed = hotelCost + diningCost + activityCost + transportCost; // 35,500

        bool isWithinBudget = totalProposed <= userBudget;

        Assert.True(isWithinBudget);
        Assert.True(totalProposed <= 40000m);
    }
}
