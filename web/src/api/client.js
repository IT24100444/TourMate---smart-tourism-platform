import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tourmate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Fallback mock database for instant offline evaluation / demonstration
export const mockData = {
  places: [
    {
      id: 'p1',
      name: 'Nine Arch Bridge, Demodara',
      district: 'Badulla',
      categoryName: 'Adventure & Hiking',
      description: 'Iconic colonial-era viaduct bridge located in Ella amidst lush misty tea plantations.',
      averageRating: 4.9,
      reviewCount: 128,
      status: 3, // Approved
      statusName: 'Approved',
      openingHours: '06:00 - 18:30',
      entryFeeLkr: 0,
      estimatedVisitDurationMinutes: 90,
      images: ['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800']
    },
    {
      id: 'p2',
      name: 'Little Adam\'s Peak',
      district: 'Badulla',
      categoryName: 'Adventure & Hiking',
      description: 'An easy yet deeply rewarding hike in Ella offering 360-degree panoramic views across Ella Gap.',
      averageRating: 4.8,
      reviewCount: 95,
      status: 3, // Approved
      statusName: 'Approved',
      openingHours: 'Open 24 Hours',
      entryFeeLkr: 0,
      estimatedVisitDurationMinutes: 120,
      images: ['https://images.unsplash.com/photo-1546708973-b339540b5162?w=800']
    },
    {
      id: 'p3',
      name: 'Ella Rock Wilderness Trek',
      district: 'Badulla',
      categoryName: 'Adventure & Hiking',
      description: 'Exhilarating trek through eucalyptus forests and tea estates ending at a cliff precipice.',
      averageRating: 4.8,
      reviewCount: 42,
      status: 2, // PendingReview
      statusName: 'PendingReview',
      openingHours: '06:00 - 17:00',
      entryFeeLkr: 1000,
      estimatedVisitDurationMinutes: 240,
      images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800']
    },
    {
      id: 'p4',
      name: 'Sigiriya Ancient Rock Fortress',
      district: 'Matale',
      categoryName: 'Heritage & Culture',
      description: 'UNESCO World Heritage ancient citadel rising 200 meters above the central plains.',
      averageRating: 4.9,
      reviewCount: 310,
      status: 3, // Approved
      statusName: 'Approved',
      openingHours: '07:00 - 17:30',
      entryFeeLkr: 11000,
      estimatedVisitDurationMinutes: 180,
      images: ['https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800']
    }
  ],
  businesses: [
    {
      id: 'b1',
      name: 'Ella Gap Panoramic Eco Resort',
      type: 1, // Hotel
      typeName: 'Hotel',
      district: 'Badulla',
      address: 'Passara Road, Ella, Sri Lanka',
      rating: 4.8,
      reviewCount: 56,
      verificationStatus: 3, // Active
      statusName: 'Active',
      contactPhone: '+94 57 222 8899',
      contactEmail: 'stay@ellagapresort.lk',
      description: 'Luxury eco-lodge perched on the hillside of Ella with uninterrupted views of Ella Rock.',
      priceRange: '$$$',
      hotel: {
        starRating: 4,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        amenitiesJson: '["Infinity Pool", "Mountain View Balcony", "Tea Bar", "Free WiFi"]'
      },
      offers: [
        { id: 'o1', title: 'Green Season Getaway 15% Off', discountPercent: 15, status: 2 }
      ],
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800']
    },
    {
      id: 'b2',
      name: 'Cafe Chill Ella & Artisan Kitchen',
      type: 2, // Restaurant
      typeName: 'Restaurant',
      district: 'Badulla',
      address: 'Main Street, Ella, Sri Lanka',
      rating: 4.9,
      reviewCount: 210,
      verificationStatus: 3, // Active
      statusName: 'Active',
      contactPhone: '+94 57 222 9900',
      contactEmail: 'hello@cafechillella.lk',
      description: 'Famous relaxed social hub of Ella serving wood-fired artisanal pizzas and clay-pot curries.',
      priceRange: '$$',
      restaurant: {
        cuisineType: 'Sri Lankan Clay Pot & International Fusion',
        openingHours: '07:30 - 23:00',
        diningFeaturesJson: '["Wood-fired Oven", "Open Air Lounge", "Vegan Friendly"]',
        averageCostPerPersonLkr: 3500
      },
      offers: [],
      images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800']
    }
  ],
  bookings: [
    {
      id: 'bk1',
      bookingReference: 'TM-20260912-8821',
      touristName: 'Nimal Fernando (Explorer)',
      touristEmail: 'tourist@tourmate.lk',
      businessName: 'Ella Gap Panoramic Eco Resort',
      businessType: 1,
      startDate: '2026-09-20T00:00:00Z',
      endDate: '2026-09-22T00:00:00Z',
      guestsCount: 2,
      totalAmountLkr: 36000,
      status: 1, // Pending
      statusName: 'Pending',
      specialRequests: 'Quiet high-floor room with panoramic Ella Gap sunrise view.',
      createdAt: '2026-09-12T10:30:00Z',
      statusHistories: [
        { id: 'h1', previousStatus: 1, newStatus: 1, reason: 'Reservation request initiated by tourist.', timestamp: '2026-09-12T10:30:00Z' }
      ]
    },
    {
      id: 'bk2',
      bookingReference: 'TM-20260910-4419',
      touristName: 'Emma Watson',
      touristEmail: 'emma@traveler.com',
      businessName: 'Cafe Chill Ella & Artisan Kitchen',
      businessType: 2,
      startDate: '2026-09-18T19:00:00Z',
      endDate: '2026-09-18T21:00:00Z',
      guestsCount: 4,
      totalAmountLkr: 14000,
      status: 2, // Confirmed
      statusName: 'Confirmed',
      specialRequests: 'Balcony table for sunset dinner.',
      createdAt: '2026-09-10T14:15:00Z',
      statusHistories: [
        { id: 'h2', previousStatus: 1, newStatus: 2, reason: 'Table capacity confirmed by host.', timestamp: '2026-09-10T15:00:00Z' }
      ]
    },
    {
      id: 'bk3',
      bookingReference: 'TM-20260917-9825',
      touristName: 'Lakshitha (lakshithaperera1@gmail.com)',
      touristEmail: 'lakshithaperera1@gmail.com',
      businessName: 'Cafe Chill Ella & Artisan Kitchen',
      businessType: 2,
      startDate: '2026-09-18T00:00:00Z',
      endDate: '2026-09-18T00:00:00Z',
      guestsCount: 2,
      totalAmountLkr: 7000,
      status: 4, // Expired
      statusName: 'Expired',
      specialRequests: 'Outdoor terrace seating in Ella',
      createdAt: '2026-09-17T09:30:00Z',
      statusHistories: [
        { id: 'h3', previousStatus: 1, newStatus: 4, reason: 'Auto-expired: Business owner did not respond within 24 hours.', timestamp: '2026-09-18T09:30:00Z' }
      ]
    },
    {
      id: 'bk4',
      bookingReference: 'TM-20260917-4512',
      touristName: 'Lakshitha (lakshithaperera1@gmail.com)',
      touristEmail: 'lakshithaperera1@gmail.com',
      businessName: 'Cafe Chill Ella & Artisan Kitchen',
      businessType: 2,
      startDate: '2026-09-18T00:00:00Z',
      endDate: '2026-09-18T00:00:00Z',
      guestsCount: 7,
      totalAmountLkr: 24500,
      status: 4, // Expired
      statusName: 'Expired',
      specialRequests: 'Family dinner booking',
      createdAt: '2026-09-17T10:00:00Z',
      statusHistories: [
        { id: 'h4', previousStatus: 1, newStatus: 4, reason: 'Auto-expired: Business owner did not respond within 24 hours.', timestamp: '2026-09-18T10:00:00Z' }
      ]
    }
  ],
  complaints: [
    {
      id: 'c1',
      bookingId: 'bk3',
      bookingReference: 'TM-20260917-9825',
      touristUserId: 'u-lakshitha',
      touristName: 'Lakshitha (lakshithaperera1@gmail.com)',
      touristEmail: 'lakshithaperera1@gmail.com',
      businessId: 'b2',
      businessName: 'Cafe Chill Ella & Artisan Kitchen',
      businessType: 2,
      complaintText: 'I booked a table 24 hours in advance and the restaurant did not confirm. The reservation expired and we had to search for alternative food.',
      status: 'Pending',
      adminWarningMessage: null,
      createdAt: '2026-09-17T18:30:00Z'
    }
  ],
  workflows: [
    {
      id: 'wf-ella-40k',
      tripId: 'tr-1',
      objective: 'Plan a 2-day Ella trip for LKR 40,000. I like nature, hiking and local food.',
      status: 2, // WaitingApproval
      statusName: 'WaitingApproval',
      currentNode: 'deterministic_feasibility_validator',
      createdAt: '2026-09-12T11:00:00Z',
      finalSummary: {
        budgetCeilingLkr: 40000,
        totalProposedLkr: 35500,
        withinBudget: true,
        highImpactAction: 'Confirm Ella Gap Eco Resort reservation & guided trek pass',
        requiresApproval: true
      },
      planSteps: [
        { name: '1. Planner Agent', status: 'completed', desc: 'Decomposed objective into 2-day Ella nature itinerary.' },
        { name: '2. Tourism Discovery Agent', status: 'completed', desc: 'Selected Nine Arch Bridge & Little Adam\'s Peak.' },
        { name: '3. Accommodation & Dining Agent', status: 'completed', desc: 'Paired Ella Gap Eco Resort & Cafe Chill under budget.' },
        { name: '4. Booking Feasibility Agent', status: 'completed', desc: 'Verified availability windows & no time conflicts.' },
        { name: '5. Deterministic Validator', status: 'waiting_approval', desc: 'Validated LKR 35,500 <= LKR 40,000 ceiling. Paused for human approval.' }
      ]
    }
  ]
};

export default apiClient;
