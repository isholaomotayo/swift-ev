"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Heart,
  FileText,
  MapPin,
  Zap,
  ArrowLeft,
  Gauge,
  Info,
  ShieldCheck,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { ImageGallery } from "@/components/autoexports/image-gallery";
import { BatteryHealthBadge } from "@/components/autoexports/battery-health-badge";
import { AuctionTimer } from "@/components/autoexports/auction-timer";
import { BidButton } from "@/components/autoexports/bid-button";
import { PriceDisplay } from "@/components/autoexports/price-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  formatCurrency,
  formatVIN,
  formatLotNumber,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { LandedCostCalculator } from "@/components/autoexports/landed-cost-calculator";

interface Bid {
  _id: string;
  amount: number;
  createdAt: number;
  userId: string;
  type: string;
}

interface AuctionLot {
  _id: Id<"auctionLots">;
  currentBid: number;
  bidCount: number;
  status: string;
  bidIncrement: number;
  buyItNowPrice?: number;
  buyItNowEnabled?: boolean;
  endsAt?: number;
}

interface Vehicle {
  _id: Id<"vehicles">;
  lotNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  batteryCapacity: number;
  estimatedRange: number;
  batteryHealthPercent?: number;
  odometer: number;
  currentLocation: {
    city: string;
    country: string;
  };
  startingBid?: number;
  status: string;
  images: Array<{
    url: string;
    alt: string;
    type:
      | "hero"
      | "exterior"
      | "interior"
      | "damage"
      | "document"
      | "vin_plate";
  }>;
  heroImage?: string;
  auctionLot?: AuctionLot;
  bids: Bid[];
  damageDescription?: string;
  bodyType?: string;
  transmission?: string;
  drivetrain?: string;
  motorPower?: number;
}

interface VehicleDetailClientProps {
  initialVehicle: Vehicle;
  vehicleId: Id<"vehicles">;
}

export function VehicleDetailClient({
  initialVehicle,
  vehicleId,
}: VehicleDetailClientProps) {
  const router = useRouter();

  // Use real-time data if available, otherwise use initial data
  const realtimeVehicle =
    (useQuery(api.vehicles.getVehicleById, { vehicleId }) as Vehicle | null) ??
    initialVehicle;

  const vehicle = realtimeVehicle;

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Info className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Vehicle Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          The vehicle you&apos;re looking for differs or has been removed.
        </p>
        <Button onClick={() => router.push("/vehicles")} size="lg">
          Browse All Vehicles
        </Button>
      </div>
    );
  }

  const { auctionLot, images, bids } = vehicle;
  const currentBid = auctionLot?.currentBid || vehicle.startingBid || 0;
  const bidCount = auctionLot?.bidCount || 0;
  const isLive = auctionLot?.status === "active";
  const isPreBid = auctionLot?.status === "pending";
  const canBid = isLive || isPreBid;

  // Hero Image Handling
  const heroImageUrl =
    vehicle.heroImage || (images && images.length > 0 ? images[0].url : null);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Immersive Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden bg-muted">
        {heroImageUrl ? (
          <>
            <Image
              src={heroImageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Zap className="h-24 w-24 text-muted-foreground/20" />
          </div>
        )}

        {/* Back Button */}
        <div className="absolute top-6 left-4 md:left-8 z-10">
          <Link href="/vehicles">
            <Button
              variant="outline"
              size="sm"
              className="bg-black/30 md:bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-md"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Listings
            </Button>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-4">
              <div className="space-y-2 mb-4 md:mb-0">
                <div className="flex items-center gap-3">
                  <Badge className="bg-electric-blue/90 hover:bg-electric-blue text-white border-none py-1.5 px-3 uppercase tracking-wide">
                    {vehicle.year}
                  </Badge>
                  {vehicle.batteryHealthPercent && (
                    <BatteryHealthBadge
                      healthPercent={vehicle.batteryHealthPercent}
                    />
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  {vehicle.make} {vehicle.model}
                </h1>
                <div className="flex items-center gap-4 text-white/90 font-medium text-sm md:text-base">
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <Gauge className="h-4 w-4 text-electric-blue" />
                    {vehicle.odometer.toLocaleString()} km
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <MapPin className="h-4 w-4 text-error-red" />
                    {vehicle.currentLocation.city},{" "}
                    {vehicle.currentLocation.country}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gallery & Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery (Thumbnails) */}
            <div className="bg-card rounded-2xl p-6 shadow-xl border border-border/50">
              {/* Gallery Component */}
              <ImageGallery
                images={images}
                vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              />
            </div>

            {/* Comprehensive Tabs */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-muted/30 scrollbar-hide overflow-x-auto">
                  <TabsTrigger
                    value="overview"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6 font-semibold"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="inspection"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6 font-semibold"
                  >
                    Inspection
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6 font-semibold"
                  >
                    Documents
                  </TabsTrigger>
                  <TabsTrigger
                    value="seller"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6 font-semibold"
                  >
                    Seller
                  </TabsTrigger>
                  <TabsTrigger
                    value="bids"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6 font-semibold"
                  >
                    Bid History ({bidCount})
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  {/* OVERVIEW TAB */}
                  <TabsContent value="overview" className="mt-0 space-y-8">
                    {/* Specs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">VIN</p>
                        <p className="font-mono font-medium">
                          {formatVIN(vehicle.vin)}
                        </p>
                      </div>
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">Mileage</p>
                        <p className="font-medium">
                          {vehicle.odometer.toLocaleString()} km
                        </p>
                      </div>
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">Body Type</p>
                        <p className="font-medium">
                          {vehicle.bodyType || "SUV"}
                        </p>
                      </div>
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">Transmission</p>
                        <p className="font-medium">
                          {vehicle.transmission || "Automatic"}
                        </p>
                      </div>
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">Drive Type</p>
                        <p className="font-medium">
                          {vehicle.drivetrain || "AWD"}
                        </p>
                      </div>
                      <div className="space-y-1 py-2 border-b border-dashed">
                        <p className="text-muted-foreground">Engine/Motor</p>
                        <p className="font-medium">
                          {vehicle.motorPower
                            ? `${vehicle.motorPower} kW`
                            : "2.0L 4-Cyl"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold mb-4 text-deep-navy">
                        Condition & Features
                      </h3>
                      <p className="text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg">
                        {vehicle.damageDescription ||
                          "Overall Condition: Excellent. Run & Drive: Yes. Keys Available: Yes (2 sets). Title Status: Clean. Export Eligible: Yes."}
                      </p>
                    </div>
                  </TabsContent>

                  {/* INSPECTION TAB */}
                  <TabsContent value="inspection" className="mt-0 space-y-6">
                    <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-green-600" />
                        <div>
                          <h4 className="font-bold text-green-800">
                            Inspection Passed
                          </h4>
                          <p className="text-sm text-green-700">
                            Verified by AutoCheck Guangzhou on Jan 10, 2026
                          </p>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-green-800">
                        92/100
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between font-bold mb-2">
                          <span>Exterior</span> <span>94/100</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ✓ Body panels: No dents. ⚠️ Minor: Small scratch on
                          rear bumper.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between font-bold mb-2">
                          <span>Interior</span> <span>95/100</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ✓ Seats: Excellent. ✓ Dashboard: No cracks. ✓
                          Electronics: All functioning.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between font-bold mb-2">
                          <span>Mechanical</span> <span>90/100</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ✓ Engine: Runs smoothly. ✓ Transmission: Shifts
                          smoothly.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Download Full Inspection Report (PDF)
                    </Button>
                  </TabsContent>

                  {/* DOCUMENTS TAB */}
                  <TabsContent value="documents" className="mt-0 space-y-4">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-deep-navy" />
                      Available Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/30 border rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success-green" />
                        <span>Title/Ownership Certificate</span>
                      </div>
                      <div className="p-3 bg-muted/30 border rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success-green" />
                        <span>Export Eligibility Certificate</span>
                      </div>
                      <div className="p-3 bg-muted/30 border rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success-green" />
                        <span>Service History Records</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      All documents provided to winning bidder upon payment.
                    </p>
                  </TabsContent>

                  {/* SELLER TAB */}
                  <TabsContent value="seller" className="mt-0 space-y-6">
                    <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/10">
                      <div className="h-16 w-16 rounded-full bg-deep-navy text-white flex items-center justify-center font-bold text-xl">
                        GAE
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">
                          Guangzhou Auto Export Ltd.
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Verified Dealer
                          </Badge>
                          <span>• Member since Mar 2024</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="font-black text-xl">234</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          Total Sales
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="font-black text-xl">4.8/5</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          Rating
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="font-black text-xl">100%</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          Response Rate
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* BIDS TAB */}
                  <TabsContent value="bids" className="mt-0">
                    {bids.length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground font-medium">
                          No bids yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Be the first to place a bid on this vehicle.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Bidder</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bids.map((bid: Bid) => (
                            <TableRow
                              key={bid._id}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="font-medium text-foreground">
                                User {bid.userId.slice(-4)}
                              </TableCell>
                              <TableCell className="font-bold text-foreground">
                                {formatCurrency(bid.amount)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatRelativeTime(bid.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Sale Card */}
              <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                {/* ... Auction Status Panel ... */}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Lot Number
                      </p>
                      <p className="font-mono font-bold text-lg">
                        {formatLotNumber(vehicle.lotNumber)}
                      </p>
                    </div>
                    <div className="text-right">
                      {isLive && (
                        <div className="flex flex-col items-end">
                          <Badge
                            variant="outline"
                            className="bg-volt-green/10 text-volt-green border-volt-green/20 animate-pulse px-3 py-1 mb-1"
                          >
                            • Live Auction
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Heart className="h-3 w-3" /> 156 Watchers
                          </span>
                        </div>
                      )}
                      {isPreBid && (
                        <Badge
                          variant="outline"
                          className="bg-electric-blue/10 text-electric-blue border-electric-blue/20 px-3 py-1"
                        >
                          • Pre-Bidding Open
                        </Badge>
                      )}
                      {!canBid && (
                        <Badge variant="secondary">
                          {vehicle.status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center mb-8 border-y border-dashed border-border/50 py-6">
                  <p className="text-sm text-muted-foreground mb-1 font-medium tracking-wide uppercase">
                    {isLive
                      ? "Current Highest Bid"
                      : isPreBid
                        ? "Current Pre-Bid"
                        : "Starting Price"}
                  </p>
                  <PriceDisplay
                    amount={currentBid}
                    variant="large"
                    className="text-5xl justify-center font-black tracking-tight text-deep-navy dark:text-white"
                  />
                  <div className="flex justify-center gap-4 mt-2 text-xs font-mono text-muted-foreground">
                    <span>{bidCount} Bids</span>
                    <span>|</span>
                    <span>Reserve: Met ✓</span>
                  </div>
                </div>

                {isLive && auctionLot?.endsAt && (
                  // ... Timer ...
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 mb-6 border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-red-600 uppercase tracking-widest">
                        Time Remaining
                      </span>
                      <Timer className="h-4 w-4 text-red-600 animate-pulse" />
                    </div>
                    <AuctionTimer
                      endsAt={auctionLot.endsAt}
                      variant="large"
                      className="justify-center text-3xl font-mono text-red-600 font-black"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {canBid ? (
                    <BidButton
                      lotId={auctionLot._id}
                      currentBid={currentBid}
                      bidIncrement={auctionLot?.bidIncrement || 50000}
                      buyNowPrice={auctionLot.buyItNowPrice}
                      buyNowEnabled={auctionLot.buyItNowEnabled}
                      status={auctionLot.status}
                      className={cn(
                        "w-full h-14 text-lg font-bold shadow-lg transition-all rounded-full",
                        isLive
                          ? "shadow-success-green/20 bg-success-green hover:bg-emerald-600 text-white"
                          : "shadow-trust-blue/20 bg-trust-blue hover:bg-blue-700 text-white",
                      )}
                      label={isPreBid ? "Place Pre-Bid" : "Place Bid Now"}
                    />
                  ) : (
                    <Button disabled className="w-full h-12">
                      Bidding Closed
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full rounded-full hover:bg-alert-red/5 hover:text-alert-red hover:border-alert-red/20 transition-colors"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => router.push("/faq#buy-now")}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      How it works
                    </Button>
                  </div>
                </div>
              </div>

              {/* Landed Cost Calculator */}
              <LandedCostCalculator currentBid={currentBid} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
