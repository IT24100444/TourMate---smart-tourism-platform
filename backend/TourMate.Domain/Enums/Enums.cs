namespace TourMate.Domain.Enums;

public enum UserRole
{
    Tourist = 1,
    BusinessOwner = 2,
    Administrator = 3
}

public enum UserStatus
{
    Active = 1,
    Suspended = 2,
    Inactive = 3
}

public enum PlaceStatus
{
    Draft = 1,
    PendingReview = 2,
    Approved = 3,
    Rejected = 4,
    Archived = 5
}

public enum BusinessType
{
    Hotel = 1,
    Restaurant = 2
}

public enum VerificationStatus
{
    Draft = 1,
    PendingVerification = 2,
    Active = 3,
    Rejected = 4,
    Suspended = 5
}

public enum OfferStatus
{
    Draft = 1,
    Active = 2,
    Expired = 3,
    Disabled = 4
}

public enum BookingStatus
{
    Pending = 1,
    Confirmed = 2,
    Completed = 3,
    Cancelled = 4,
    Rejected = 5,
    Expired = 6
}

public enum ReviewStatus
{
    Approved = 1,
    Flagged = 2,
    Removed = 3
}

public enum TripStatus
{
    Draft = 1,
    Planning = 2,
    Proposed = 3,
    ApprovalRequired = 4,
    Approved = 5,
    Active = 6,
    Completed = 7,
    Archived = 8
}

public enum AIWorkflowStatus
{
    Running = 1,
    WaitingApproval = 2,
    Succeeded = 3,
    FailedSafe = 4,
    Rejected = 5
}

public enum ApprovalDecision
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    RevisionRequested = 4
}
