/**
 * VoltBid Africa Platform Constants
 */

// UI Constants
export const UPCOMING_LOTS_DISPLAY_COUNT = 10; // Number of upcoming lots to show in auction room
export const RECENT_ITEMS_DISPLAY_COUNT = 5; // Number of recent items to show in dashboard
export const BID_HISTORY_MAX_HEIGHT = 256; // Max height for bid history scroll area (px)

// Membership Tiers
export const MEMBERSHIP_TIERS = {
  GUEST: {
    name: "Guest",
    value: "guest",
    fee: 0,
    dailyBids: 0,
    maxBuyingPower: 0,
    features: [
      "Browse all vehicle listings",
      "View auction schedules",
      "Set vehicle alerts",
      "Access educational resources",
    ],
  },
  BASIC: {
    name: "Basic",
    value: "basic",
    fee: 75_000,
    dailyBids: 3,
    maxBuyingPower: 5_000_000,
    deposit: 150_000,
    features: [
      "All Guest features",
      "Bid on up to 3 vehicles per day",
      "Maximum bid limit: ₦5,000,000",
      "Email support (48-hour response)",
      "Basic vehicle history reports",
    ],
  },
  PREMIER: {
    name: "Premier",
    value: "premier",
    fee: 150_000,
    dailyBids: 10,
    maxBuyingPower: 50_000_000,
    deposit: 500_000,
    features: [
      "All Basic features",
      "Bid on up to 10 vehicles per day",
      "Maximum bid limit: ₦50,000,000",
      "Priority support (24-hour response)",
      "Comprehensive battery health reports",
      "Dedicated account manager",
      "Early access to new listings",
      "Discounted shipping rates",
    ],
  },
  BUSINESS: {
    name: "Business",
    value: "business",
    fee: 500_000,
    dailyBids: Infinity,
    maxBuyingPower: Infinity,
    deposit: 1_000_000,
    features: [
      "All Premier features",
      "Unlimited daily bids",
      "Custom bid limits (negotiated)",
      "API access for inventory feeds",
      "Bulk shipping arrangements",
      "White-label documentation",
      "Dedicated logistics coordinator",
      "Priority port clearance processing",
      "Monthly market intelligence reports",
    ],
  },
} as const;

// Vehicle Makes (Chinese EV Manufacturers)
export const VEHICLE_MAKES = [
  "BYD",
  "NIO",
  "XPeng",
  "Geely",
  "Li Auto",
  "Changan",
  "GAC Aion",
  "Hongqi",
  "Zeekr",
  "Avatr",
  "Voyah",
  "Hozon (Neta)",
  "Leapmotor",
  "Weltmeister",
  "Aiways",
] as const;

// Battery Health Thresholds (State of Health %)
export const BATTERY_HEALTH_THRESHOLDS = {
  EXCELLENT: 95, // 95-100%
  GOOD: 85, // 85-94%
  FAIR: 70, // 70-84%
  POOR: 0, // Below 70%
} as const;

// Charging Types
export const CHARGING_TYPES = [
  "AC Level 1 (Standard 220V)",
  "AC Level 2 (7-22kW)",
  "DC Fast Charging (50kW+)",
  "DC Ultra Fast (150kW+)",
  "Battery Swap Compatible",
] as const;

// Vehicle Conditions
export const VEHICLE_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "salvage", label: "Salvage" },
] as const;

// Simplified for upload form
export const CONDITION_OPTIONS = ["new", "like_new", "excellent", "good", "fair", "salvage"] as const;

// Battery Types
export const BATTERY_TYPES = [
  "Lithium-ion (Li-ion)",
  "Lithium Iron Phosphate (LFP)",
  "Nickel Manganese Cobalt (NMC)",
  "Nickel Cobalt Aluminum (NCA)",
  "Solid State",
] as const;

// Title Types
export const TITLE_TYPES = [
  { value: "clean", label: "Clean Title" },
  { value: "salvage", label: "Salvage Title" },
  { value: "rebuilt", label: "Rebuilt Title" },
  { value: "export_only", label: "Export Only" },
] as const;

// Service Fee Structure
export const SERVICE_FEE_STRUCTURE = [
  { min: 0, max: 1_000_000, type: "flat", amount: 75_000 },
  { min: 1_000_001, max: 5_000_000, type: "percentage", amount: 0.07 }, // 7%
  { min: 5_000_001, max: 15_000_000, type: "percentage", amount: 0.06 }, // 6%
  { min: 15_000_001, max: Infinity, type: "percentage", amount: 0.05 }, // 5%
] as const;

// Additional Fees
export const ADDITIONAL_FEES = {
  DOCUMENTATION: 25_000,
  INSPECTION_REPORT: 15_000,
  BATTERY_HEALTH_CERT: 20_000, // Included with Premier+
  PORT_HANDLING_LAGOS: 35_000,
} as const;

// Shipping Methods
export const SHIPPING_METHODS = [
  {
    value: "container",
    label: "Container Shipping",
    costRange: [1_200, 2_500], // USD
    duration: "35-40 days",
  },
  {
    value: "roro",
    label: "RoRo Shipping",
    costRange: [800, 1_500], // USD
    duration: "40-45 days",
  },
] as const;

// Shipping Routes
export const SHIPPING_ROUTES = [
  {
    origin: "Shanghai",
    destination: "Lagos",
    ports: ["Shanghai Port", "Apapa Port", "Tin Can Island Port"],
    duration: "35-40 days",
  },
  {
    origin: "Shenzhen",
    destination: "Lagos",
    ports: ["Shenzhen Port", "Apapa Port", "Tin Can Island Port"],
    duration: "35-40 days",
  },
  {
    origin: "Ningbo",
    destination: "Lagos",
    ports: ["Ningbo Port", "Apapa Port", "Tin Can Island Port"],
    duration: "38-42 days",
  },
] as const;

// Nigerian Import Duties (for EVs - 2025)
export const IMPORT_DUTIES = {
  DUTY_RATE: { min: 0.1, max: 0.2 }, // 10-20%
  NAC_LEVY: 0.15, // 15%
  VAT: 0, // EXEMPT for EVs
  IAT: 0, // EXEMPT for EVs
  SONCAP_COST_USD: { min: 350, max: 500 },
} as const;

// Nigerian States and Cities
export const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Ogun",
  "Oyo",
  "Kano",
  "Rivers",
  "Kaduna",
  "Enugu",
  "Delta",
  "Edo",
  "Anambra",
  "Imo",
  "Kwara",
  "Osun",
  "Plateau",
  "Benue",
  "Bauchi",
  "Cross River",
  "Akwa Ibom",
  "Adamawa",
  "Abia",
  "Bayelsa",
  "Borno",
  "Ebonyi",
  "Ekiti",
  "Gombe",
  "Jigawa",
  "Kebbi",
  "Kogi",
  "Nasarawa",
  "Niger",
  "Ondo",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

// Delivery Fees by Region (in NGN)
export const DELIVERY_FEES = {
  LAGOS_METRO: 0, // Included in port handling
  SOUTH_WEST: { min: 50_000, max: 100_000 },
  SOUTH_EAST: { min: 100_000, max: 150_000 },
  NORTH_CENTRAL: { min: 150_000, max: 200_000 },
  NORTH_EAST: { min: 200_000, max: 250_000 },
  NORTH_WEST: { min: 200_000, max: 250_000 },
  SOUTH_SOUTH: { min: 100_000, max: 150_000 },
} as const;

// Auction Types
export const AUCTION_TYPES = [
  {
    value: "live",
    label: "Live Auction",
    description: "Real-time competitive bidding with live auctioneer",
  },
  {
    value: "timed",
    label: "Timed Auction",
    description: "Online auction with fixed end time",
  },
  {
    value: "buy_it_now",
    label: "Buy It Now",
    description: "Fixed price purchase, no bidding required",
  },
] as const;

// Bid Increments (standard)
export const DEFAULT_BID_INCREMENT = 50_000; // ₦50,000

// User Roles
export const USER_ROLES = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "admin", label: "Administrator" },
  { value: "superadmin", label: "Super Administrator" },
] as const;

// KYC Document Types
export const KYC_DOCUMENT_TYPES = [
  {
    value: "government_id",
    label: "Government ID",
    description: "National ID, Driver's License, or International Passport",
  },
  {
    value: "proof_of_address",
    label: "Proof of Address",
    description: "Utility bill or bank statement (not older than 3 months)",
  },
  {
    value: "business_registration",
    label: "Business Registration",
    description: "CAC certificate for business accounts",
  },
  {
    value: "dealer_license",
    label: "Dealer License",
    description: "Valid vehicle dealer license",
  },
] as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  BID_PLACED: "bid_placed",
  OUTBID: "outbid",
  AUCTION_WON: "auction_won",
  AUCTION_LOST: "auction_lost",
  PAYMENT_REMINDER: "payment_reminder",
  PAYMENT_RECEIVED: "payment_received",
  SHIPMENT_UPDATE: "shipment_update",
  CUSTOMS_UPDATE: "customs_update",
  DELIVERY_SCHEDULED: "delivery_scheduled",
  VEHICLE_ALERT: "vehicle_alert",
  MEMBERSHIP_EXPIRING: "membership_expiring",
  SYSTEM: "system",
} as const;

// Order Statuses
export const ORDER_STATUSES = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "payment_partial", label: "Partial Payment" },
  { value: "payment_complete", label: "Payment Complete" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "customs_clearance", label: "Customs Clearance" },
  { value: "cleared", label: "Cleared" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

// Payment Deadlines
export const PAYMENT_DEADLINE_DAYS = 3; // 3 business days

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Query Limits
export const MAX_BIDS_PER_LOT = 100;
export const MAX_USER_BIDS = 50;

// File Upload Limits
export const MAX_VEHICLE_IMAGES = 20;
export const MAX_IMAGE_SIZE_MB = 10;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Contact Information
export const CONTACT_INFO = {
  EMAIL: "support@voltbid.africa",
  PHONE: "+234 XXX XXX XXXX",
  ADDRESS: "Lagos, Nigeria",
  SUPPORT_HOURS: "Monday - Friday, 9AM - 6PM WAT",
} as const;

// Social Media
export const SOCIAL_MEDIA = {
  TWITTER: "https://twitter.com/voltbidafrica",
  FACEBOOK: "https://facebook.com/voltbidafrica",
  INSTAGRAM: "https://instagram.com/voltbidafrica",
  LINKEDIN: "https://linkedin.com/company/voltbid-africa",
} as const;

// Government Incentives (Nigeria 2025)
export const GOVERNMENT_INCENTIVES = [
  {
    title: "VAT Exemption",
    description: "Electric vehicles are exempt from the 7.5% Value Added Tax",
    savings: "7.5%",
  },
  {
    title: "Reduced Import Duties",
    description: "EV duties range from 10-20%, compared to 35% for traditional vehicles",
    savings: "15-25%",
  },
  {
    title: "No Green Tax Surcharge",
    description: "EVs are excluded from environmental levies applied to petrol and diesel vehicles",
    savings: "Variable",
  },
  {
    title: "Import Adjustment Tax Exemption",
    description: "EVs are exempt from IAT charges",
    savings: "Variable",
  },
] as const;

// Nigerian EV Targets
export const EV_TARGETS = {
  YEAR_2033: "30% of vehicles sold to be locally manufactured EVs",
  YEAR_2040: "100% zero-emission new car/van sales",
  YEAR_2060: "Net-zero emissions target",
} as const;
