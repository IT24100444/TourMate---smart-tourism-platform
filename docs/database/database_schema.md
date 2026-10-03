# TourMate - PostgreSQL Database Schema & Neon Cloud Integration

## 1. Overview
TourMate uses a normalized PostgreSQL schema hosted on Neon Cloud. Foreign key constraints enforce relational integrity, while soft-deletes (`Archived` status) preserve historical references used by itineraries, bookings, and audit logs.

## 2. Table Schemas by Component

### Component A: Tourism Place Discovery & Destination Management
- **`PlaceCategories`**: `Id (UUID PK)`, `Name (VARCHAR)`, `Slug (VARCHAR UQ)`, `IconName`, `Description`
- **`TourismPlaces`**: `Id (UUID PK)`, `CategoryId (FK)`, `Name`, `District`, `Description`, `Latitude`, `Longitude`, `OpeningHours`, `EstimatedVisitDurationMinutes`, `EntryFeeLkr`, `AverageRating`, `ReviewCount`, `Status (Draft, PendingReview, Approved, Rejected, Archived)`, `CreatedAt`, `UpdatedAt`
- **`PlaceMedias`**: `Id (UUID PK)`, `PlaceId (FK)`, `Url`, `Caption`, `IsCover`
- **`PlaceApprovalHistories`**: `Id (UUID PK)`, `PlaceId (FK)`, `ReviewedByUserId`, `Decision`, `Comments`, `Timestamp`

### Component B: Accommodation & Restaurant Management
- **`Businesses`**: `Id (UUID PK)`, `OwnerUserId (FK)`, `Name`, `Type (Hotel, Restaurant)`, `District`, `Address`, `Latitude`, `Longitude`, `ContactPhone`, `ContactEmail`, `PriceRange`, `Rating`, `ReviewCount`, `VerificationStatus`, `CreatedAt`, `UpdatedAt`
- **`Hotels`**: `Id (UUID PK)`, `BusinessId (FK UQ)`, `StarRating`, `CheckInTime`, `CheckOutTime`, `AmenitiesJson`, `RoomTypesJson`
- **`Restaurants`**: `Id (UUID PK)`, `BusinessId (FK UQ)`, `CuisineType`, `OpeningHours`, `DiningFeaturesJson`, `AverageCostPerPersonLkr`
- **`AvailabilitySlots`**: `Id (UUID PK)`, `BusinessId (FK)`, `Date`, `TotalCapacity`, `BookedCount`, `PricePerUnitLkr`
- **`Offers`**: `Id (UUID PK)`, `BusinessId (FK)`, `Title`, `Description`, `DiscountPercent`, `StartDate`, `EndDate`, `Status`

### Component C: Booking, Reservation & Traveller Engagement
- **`Users`**: `Id (UUID PK)`, `Email (UQ)`, `PasswordHash`, `FullName`, `PhoneNumber`, `Role`, `Status`, `CreatedAt`
- **`Bookings`**: `Id (UUID PK)`, `BookingReference (UQ)`, `TouristUserId (FK)`, `BusinessId (FK)`, `StartDate`, `EndDate`, `GuestsCount`, `TotalAmountLkr`, `Status`, `SpecialRequests`, `CreatedAt`, `UpdatedAt`
- **`BookingStatusHistories`**: `Id (UUID PK)`, `BookingId (FK)`, `PreviousStatus`, `NewStatus`, `ChangedByUserId`, `Reason`, `Timestamp`
- **`Reviews`**: `Id (UUID PK)`, `TouristUserId (FK)`, `TargetType`, `TargetId`, `Rating`, `Comment`, `Status`, `CreatedAt`
- **`Favourites`**: `Id (UUID PK)`, `UserId (FK)`, `TargetType`, `TargetId`, `CreatedAt` (Composite Unique: UserId + TargetType + TargetId)
- **`Notifications`**: `Id (UUID PK)`, `UserId (FK)`, `Title`, `Message`, `ActionUrl`, `IsRead`, `CreatedAt`

### Component D: Intelligent Trip Planning & Recommendation
- **`Trips`**: `Id (UUID PK)`, `TouristUserId (FK)`, `Title`, `Destination`, `StartDate`, `EndDate`, `BudgetLkr`, `Status`, `CreatedAt`, `UpdatedAt`
- **`TripPreferences`**: `Id (UUID PK)`, `TripId (FK UQ)`, `Pace`, `InterestsJson`, `DietaryRestrictionsJson`, `AdultsCount`, `ChildrenCount`
- **`Itineraries`**: `Id (UUID PK)`, `TripId (FK)`, `Version`, `TotalEstimatedCostLkr`, `Status`, `CreatedAt`
- **`ItineraryDays`**: `Id (UUID PK)`, `ItineraryId (FK)`, `DayNumber`, `Date`, `Summary`
- **`ItineraryItems`**: `Id (UUID PK)`, `DayId (FK)`, `TimeSlot`, `ItemType`, `Title`, `Description`, `Location`, `ReferenceId`, `EstimatedCostLkr`, `OrderIndex`
- **`AIWorkflowRuns`**: `Id (UUID PK)`, `TripId (FK)`, `Objective`, `Status`, `CurrentNode`, `StateJson`, `FinalSummaryJson`, `CreatedAt`, `CompletedAt`
- **`ApprovalRequests`**: `Id (UUID PK)`, `WorkflowId (FK)`, `ActionType`, `PayloadJson`, `Status`, `DecidedByUserId`, `DecisionNotes`, `CreatedAt`, `DecidedAt`
