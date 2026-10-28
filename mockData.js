/* ==========================================================================
   MYBARBERHUB MOCK DATA STORAGE (CLEAN TESTING STATE)
   Barber profiles are present, but all slots & active bookings start EMPTY.
   ========================================================================== */

const mockData = {
  // Current logged in user state
  currentUser: {
    id: "usr_101",
    name: "Alex Student",
    email: "alex@university.edu",
    role: "customer", // 'customer' or 'barber'
    dorm: "Hall 3, Room 204",
    isVerifiedBarber: true
  },

  // Directory of student barbers (Schedules start empty!)
  barbers: [
    {
      id: "barber_1",
      name: "Marcus Tan",
      dorm: "Hall 3, Room 412",
      experience: "2 Years",
      cutsCount: 0,
      rating: 5.0,
      badge: "🥇 Campus Champion",
      specialties: ["Skin Fade", "Taper Cut", "Line-Up"],
      priceRange: "RM10 - RM15",
      services: [
        { id: "s1", name: "Classic Skin Fade", price: 15, duration: 30 },
        { id: "s2", name: "Quick Line-Up & Edging", price: 10, duration: 15 },
        { id: "s3", name: "Beard Trim & Shape", price: 10, duration: 20 }
      ],
      slots: [] // Starts completely empty
    },
    {
      id: "barber_2",
      name: "Danial Afiq",
      dorm: "Hall 1, Room 108",
      experience: "1 Year",
      cutsCount: 0,
      rating: 5.0,
      badge: "🥈 Master Fade",
      specialties: ["Scissor Cut", "Textured Crop"],
      priceRange: "RM12 - RM15",
      services: [
        { id: "s4", name: "Textured Crop & Fade", price: 15, duration: 35 },
        { id: "s5", name: "Scissor Haircut", price: 12, duration: 30 }
      ],
      slots: [] // Starts completely empty
    },
    {
      id: "barber_3",
      name: "Kevin Lim",
      dorm: "Hall 5, Room 302",
      experience: "6 Months",
      cutsCount: 0,
      rating: 5.0,
      badge: "🥉 Crowd Favorite",
      specialties: ["Buzz Cut", "Low Fade"],
      priceRange: "RM10",
      services: [
        { id: "s6", name: "Buzz Cut / Crew Cut", price: 10, duration: 20 },
        { id: "s7", name: "Low Taper Fade", price: 12, duration: 30 }
      ],
      slots: [] // Starts completely empty
    }
  ],

  // Active bookings list (Starts completely empty)
  activeBookings: [],

  // Leaderboard data
  leaderboard: [
    { rank: 1, name: "Marcus Tan", cuts: 0, badge: "🥇 Campus Champion", dorm: "Hall 3" },
    { rank: 2, name: "Danial Afiq", cuts: 0, badge: "🥈 Master Fade", dorm: "Hall 1" },
    { rank: 3, name: "Kevin Lim", cuts: 0, badge: "🥉 Crowd Favorite", dorm: "Hall 5" }
  ],

  // Community Channels & Direct Messages
  channels: {
    announcements: [
      { sender: "Admin", time: "System", text: "📢 Welcome to MyBarberHub! Switch roles to create open slots and test bookings." }
    ],
    general: []
  },

  directMessages: []
};