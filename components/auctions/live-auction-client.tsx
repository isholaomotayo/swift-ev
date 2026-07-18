"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuctionTimer } from "@/components/autoexports/auction-timer";
import { BidButton } from "@/components/autoexports/bid-button";
import { PriceDisplay } from "@/components/autoexports/price-display";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gavel,
  RotateCcw,
  TrendingUp,
  Users,
  Zap,
  Battery,
  MapPin,
  Gauge,
  Key,
  FileText,
  Plug,
} from "lucide-react";
import { formatCurrency, formatLotNumber, cn } from "@/lib/utils";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
import { ImageCarousel } from "@/components/ui/image-carousel";

const COMPLETED_STATUSES = new Set(["sold", "no_sale", "passed"]);

type LotFilter = "all" | "active" | "pending" | "completed";

type PublicLot = {
  lot: {
    _id: string;
    lotOrder: number;
    status: string;
    currentBid?: number;
    startingBid?: number;
    bidIncrement?: number;
    bidCount?: number;
    winningBid?: number;
    soldAt?: number;
    startsAt?: number;
    endsAt?: number;
    buyItNowPrice?: number;
    buyItNowEnabled?: boolean;
    remainingMs?: number | null;
  };
  vehicle: {
    _id: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    condition?: string;
    batteryHealthPercent?: number;
    batteryCapacity?: number;
    estimatedRange?: number;
    odometer?: number;
    exteriorColor?: string;
    interiorColor?: string;
    drivetrain?: string;
    titleType?: string;
    hasKeys?: boolean;
    motorPower?: number;
    chargingType?: string[];
    damageDescription?: string;
    currentLocation?: { city?: string; country?: string };
    image?: string;
    images?: Array<{ url: string; type?: string }>;
  };
  winnerFirstName?: string;
};

function getLotThumbnail(vehicle: PublicLot["vehicle"]): string | undefined {
  if (vehicle.image) return vehicle.image;
  return vehicle.images?.[0]?.url;
}

function completedLotResultLabel(item: PublicLot): string {
  const { lot, winnerFirstName } = item;
  if (lot.status === "sold") {
    const price = formatCurrency(lot.winningBid ?? lot.currentBid ?? 0);
    return winnerFirstName ? `${price} · ${winnerFirstName}` : price;
  }
  if (lot.status === "no_sale") return "No sale";
  return "Passed";
}

function lotStatusBadgeClass(status: string): string {
  if (status === "active") {
    return "bg-volt-green/20 text-volt-green border-volt-green/30 font-bold";
  }
  if (status === "sold") {
    return "bg-electric-blue/20 text-electric-blue border-electric-blue/30";
  }
  return "bg-muted text-muted-foreground";
}

function toCarouselImages(vehicle: PublicLot["vehicle"] | null | undefined) {
  if (!vehicle) return [];
  if (vehicle.images?.length) {
    return vehicle.images.map((image, index) => ({
      url: image.url,
      type: image.type || (index === 0 ? "hero" : "exterior"),
    }));
  }
  const thumb = getLotThumbnail(vehicle);
  return thumb ? [{ url: thumb, type: "hero" }] : [];
}

interface LiveAuctionClientProps {
  initialRoomData: any;
  auctionId: Id<"auctions">;
}

export function LiveAuctionClient({
  initialRoomData,
  auctionId,
}: LiveAuctionClientProps) {
  const router = useRouter();
  const [inspectedLotId, setInspectedLotId] = useState<string | null>(null);
  const [lotFilter, setLotFilter] = useState<LotFilter>("all");
  const stepperRef = useRef<HTMLDivElement>(null);

  const roomData =
    useQuery(api.auctions.getPublicLiveAuctionRoom, { auctionId }) ??
    initialRoomData;

  const auction = roomData?.auction;
  const allLots = (roomData?.lots ?? []) as PublicLot[];
  const isSequential = auction?.executionMode === "sequential";
  const isConcurrent = auction?.executionMode === "concurrent";
  const isAuctionLive = auction?.status === "live";
  const isAuctionPaused = auction?.status === "paused";
  const isAuctionEnded =
    auction?.status === "ended" || auction?.status === "cancelled";

  const activeLots = useMemo(
    () => allLots.filter((item) => item.lot.status === "active"),
    [allLots]
  );
  const primaryActiveLot = activeLots[0] ?? null;

  const displayItem = useMemo(() => {
    if (inspectedLotId) {
      return allLots.find((item) => item.lot._id === inspectedLotId) ?? null;
    }
    return primaryActiveLot ?? allLots[0] ?? null;
  }, [allLots, inspectedLotId, primaryActiveLot]);

  const displayLotClosed =
    Boolean(displayItem) && COMPLETED_STATUSES.has(displayItem!.lot.status);

  // Mode-aware bid target:
  // - Live/sequential: always the primary active lot
  // - Timed/concurrent: selected lot if active, else primary active
  const bidTargetLot = useMemo(() => {
    if (!isAuctionLive || isAuctionPaused) return null;
    if (isConcurrent) {
      if (displayItem?.lot.status === "active") return displayItem;
      return primaryActiveLot;
    }
    return primaryActiveLot;
  }, [
    isAuctionLive,
    isAuctionPaused,
    isConcurrent,
    displayItem,
    primaryActiveLot,
  ]);

  const isInspectingAway =
    Boolean(displayItem) &&
    Boolean(primaryActiveLot) &&
    displayItem!.lot._id !== primaryActiveLot!.lot._id &&
    isSequential;

  const feedLotId = (displayItem?.lot._id ??
    bidTargetLot?.lot._id) as Id<"auctionLots"> | undefined;

  const bids = useQuery(
    api.bids.getBidsForLot,
    feedLotId ? { lotId: feedLotId } : "skip"
  );

  const filteredLots = useMemo(() => {
    if (lotFilter === "active") {
      return allLots.filter((item) => item.lot.status === "active");
    }
    if (lotFilter === "pending") {
      return allLots.filter((item) => item.lot.status === "pending");
    }
    if (lotFilter === "completed") {
      return allLots.filter((item) => COMPLETED_STATUSES.has(item.lot.status));
    }
    return allLots;
  }, [allLots, lotFilter]);

  const currentLotIndex = displayItem
    ? allLots.findIndex((item) => item.lot._id === displayItem.lot._id)
    : -1;

  useEffect(() => {
    if (!inspectedLotId) return;
    const stillExists = allLots.some((item) => item.lot._id === inspectedLotId);
    if (!stillExists) setInspectedLotId(null);
  }, [allLots, inspectedLotId]);

  useEffect(() => {
    const selectedId = displayItem?.lot._id;
    if (!selectedId || !stepperRef.current) return;
    const el = stepperRef.current.querySelector(`[data-lot-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [displayItem?.lot._id]);

  if (!roomData || !auction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Card className="p-8 max-w-md w-full border-dashed border-2 bg-muted/30">
          <h2 className="text-xl font-bold mb-2">Auction Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The auction you&apos;re looking for differs or has been removed.
          </p>
          <Button onClick={() => router.push("/auctions")} className="w-full">
            Back to Auctions
          </Button>
        </Card>
      </div>
    );
  }

  const displayLot = displayItem?.lot;
  const displayVehicle = displayItem?.vehicle;
  const bidHistory = bids || [];
  const bidAmount =
    bidTargetLot?.lot.currentBid || bidTargetLot?.lot.startingBid || 0;
  const canAcceptBids =
    isAuctionLive &&
    !isAuctionPaused &&
    bidTargetLot?.lot.status === "active";

  const carouselImages = toCarouselImages(displayVehicle);
  const formatLabel =
    auction.auctionType === "live"
      ? "Live · Sequential"
      : auction.auctionType === "timed"
        ? "Timed · Concurrent"
        : auction.auctionType;

  const goToLotIndex = (index: number) => {
    const item = allLots[index];
    if (!item) return;
    setInspectedLotId(item.lot._id);
  };

  const returnToLive = () => setInspectedLotId(null);

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-20">
      {/* Sticky chrome */}
      <div className="bg-background/80 border-b border-border/50 sticky top-16 z-20 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/auctions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-muted shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bold text-lg leading-tight truncate max-w-[180px] sm:max-w-md">
                    {auction.name}
                  </h1>
                  <Badge
                    variant={isAuctionLive ? "default" : "secondary"}
                    className={cn(
                      isAuctionLive
                        ? "bg-volt-green/10 text-volt-green border-volt-green/20 animate-pulse"
                        : ""
                    )}
                  >
                    {isAuctionLive ? "LIVE NOW" : auction.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {formatLabel}
                  </Badge>
                </div>
                <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{" "}
                    {new Date(auction.scheduledStart).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {roomData.counts.total} Lots
                  </span>
                  <span>
                    {roomData.counts.active} bidding · {roomData.counts.pending}{" "}
                    upcoming · {roomData.counts.completed} closed
                  </span>
                </div>
              </div>
            </div>

            {isInspectingAway && (
              <Button
                variant="secondary"
                size="sm"
                onClick={returnToLive}
                className="h-8 text-xs bg-volt-green/10 text-volt-green hover:bg-volt-green/20 shrink-0"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Back to Live
              </Button>
            )}
          </div>

          {/* Filters + stepper */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `All (${roomData.counts.total})`],
                ["active", `Bidding (${roomData.counts.active})`],
                ["pending", `Upcoming (${roomData.counts.pending})`],
                ["completed", `Closed (${roomData.counts.completed})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLotFilter(key)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  lotFilter === key
                    ? "bg-electric-blue text-white border-electric-blue"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToLotIndex(Math.max(0, currentLotIndex - 1))}
                disabled={currentLotIndex <= 0}
                className="h-7 w-7 p-0"
                aria-label="Previous lot"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-mono text-xs text-muted-foreground tabular-nums min-w-14 text-center">
                {currentLotIndex >= 0 ? currentLotIndex + 1 : 1} / {allLots.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  goToLotIndex(Math.min(allLots.length - 1, currentLotIndex + 1))
                }
                disabled={currentLotIndex >= allLots.length - 1}
                className="h-7 w-7 p-0"
                aria-label="Next lot"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={stepperRef}
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {filteredLots.map(({ lot, vehicle }) => {
              const isSelected = displayLot?._id === lot._id;
              const isLiveActive = activeLots.some((a) => a.lot._id === lot._id);
              const thumb = getLotThumbnail(vehicle);
              return (
                <button
                  key={lot._id}
                  type="button"
                  data-lot-id={lot._id}
                  onClick={() => setInspectedLotId(lot._id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs shrink-0 transition-all min-w-[200px]",
                    isSelected
                      ? "border-electric-blue bg-electric-blue/10 ring-2 ring-electric-blue/30"
                      : "bg-card hover:bg-muted/60"
                  )}
                >
                  <div className="relative h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                    {thumb && (
                      <RemoteImage
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5",
                          lotStatusBadgeClass(lot.status)
                        )}
                      >
                        #{lot.lotOrder} {lot.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      {isLiveActive && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-green opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-volt-green" />
                        </span>
                      )}
                    </div>
                    <p className="font-semibold truncate max-w-[140px]">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatCurrency(lot.currentBid || lot.startingBid || 0)}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredLots.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No lots in this filter.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {!displayLot || !displayVehicle ? (
          <Card className="p-12 text-center border-dashed border-2 bg-muted/20">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isAuctionLive
                ? "Waiting for the next lot…"
                : "Auction has not started"}
            </h2>
            <p className="text-muted-foreground">
              {isAuctionLive
                ? "Lots advance automatically when the timer ends."
                : "This auction will go live at the scheduled start time."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: selected lot */}
            <div className="lg:col-span-8 flex flex-col gap-6 min-w-0 order-2 lg:order-1">
              {isInspectingAway && (
                <div className="rounded-lg border border-warning-amber/30 bg-warning-amber/10 px-4 py-2 text-sm text-warning-amber flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Viewing Lot #{displayLot.lotOrder} (
                    {displayLot.status.replace("_", " ")}) · Live bidding stays on
                    Lot #{primaryActiveLot?.lot.lotOrder}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={returnToLive}
                    className="h-7 text-xs text-warning-amber hover:text-warning-amber"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Back to Live
                  </Button>
                </div>
              )}

              <ImageCarousel
                key={displayLot._id}
                images={carouselImages}
                vehicleName={`${displayVehicle.year} ${displayVehicle.make} ${displayVehicle.model}`}
              />

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge className="bg-electric-blue text-white border-none">
                    Lot #{formatLotNumber(displayLot.lotOrder.toString())}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      lotStatusBadgeClass(displayLot.status)
                    )}
                  >
                    {displayLot.status.replace("_", " ")}
                  </Badge>
                  {displayVehicle.year && (
                    <Badge variant="outline">{displayVehicle.year}</Badge>
                  )}
                </div>
                <h2 className="text-3xl font-black tracking-tight">
                  {displayVehicle.make} {displayVehicle.model}
                </h2>
                {displayVehicle.trim && (
                  <p className="text-muted-foreground">{displayVehicle.trim}</p>
                )}
                {COMPLETED_STATUSES.has(displayLot.status) && displayItem && (
                  <p className="font-mono text-sm font-bold mt-2 text-muted-foreground">
                    Result: {completedLotResultLabel(displayItem)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                    <Battery className="h-3.5 w-3.5" /> Battery
                  </div>
                  <span className="text-xl font-bold">
                    {displayVehicle.batteryHealthPercent || 0}%
                  </span>
                </Card>
                <Card className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                    <Zap className="h-3.5 w-3.5" /> Range
                  </div>
                  <span className="text-xl font-bold">
                    {displayVehicle.estimatedRange ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">km</span>
                </Card>
                <Card className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                    <Gauge className="h-3.5 w-3.5" /> Mileage
                  </div>
                  <span className="text-xl font-bold">
                    {displayVehicle.odometer?.toLocaleString() ?? "—"}
                  </span>
                </Card>
                <Card className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </div>
                  <p className="text-sm font-medium truncate">
                    {displayVehicle.currentLocation?.city}
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-card/50 border-border/50">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-electric-blue" /> Vehicle Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exterior</span>
                      <span className="font-medium">
                        {displayVehicle.exteriorColor || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interior</span>
                      <span className="font-medium">
                        {displayVehicle.interiorColor || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drivetrain</span>
                      <span className="font-medium">
                        {displayVehicle.drivetrain || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-medium capitalize">
                        {displayVehicle.titleType || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Has Keys</span>
                      <span className="font-medium flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" />{" "}
                        {displayVehicle.hasKeys ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">Charging</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(displayVehicle.chargingType || []).map((type, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs flex items-center gap-1"
                          >
                            <Plug className="h-3 w-3" /> {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {displayVehicle.damageDescription && (
                  <div className="mt-4 p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
                    <p className="text-sm font-medium text-warning-amber">
                      Damage Notes:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {displayVehicle.damageDescription}
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {/* Right: bidding + feed */}
            <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-44 lg:self-start min-w-0 w-full order-1 lg:order-2">
              <Card className="p-5 border-border/50 shadow-lg bg-card/80 backdrop-blur-xl shrink-0">
                <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span
                        className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          canAcceptBids ? "bg-volt-green" : "bg-warning-amber"
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-3 w-3",
                          canAcceptBids ? "bg-volt-green" : "bg-warning-amber"
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "font-bold text-sm uppercase tracking-wider",
                        canAcceptBids
                          ? "text-volt-green"
                          : isAuctionEnded
                            ? "text-muted-foreground"
                            : "text-warning-amber"
                      )}
                    >
                      {canAcceptBids
                        ? "Accepting Bids"
                        : isAuctionPaused
                          ? "Paused"
                          : isAuctionEnded
                            ? "Auction Ended"
                            : displayLotClosed
                              ? "Lot Closed"
                              : "Waiting"}
                    </span>
                  </div>
                  {canAcceptBids && bidTargetLot?.lot.endsAt && (
                    <AuctionTimer
                      endsAt={bidTargetLot.lot.endsAt}
                      variant="default"
                      onExpire={() => {}}
                      className="font-mono text-lg font-bold"
                    />
                  )}
                </div>

                {bidTargetLot ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2 text-center">
                      {isConcurrent
                        ? `Bidding on Lot #${bidTargetLot.lot.lotOrder}`
                        : `Live lot #${bidTargetLot.lot.lotOrder}${
                            isInspectingAway ? " (bidding stays here)" : ""
                          }`}
                    </p>
                    <div className="text-center py-4 bg-muted/10 rounded-xl mb-4 border border-border/50">
                      <p className="text-sm text-muted-foreground font-medium mb-1">
                        Current Highest Bid
                      </p>
                      <PriceDisplay
                        amount={bidAmount}
                        variant="large"
                        className="justify-center font-black tracking-tight"
                      />
                    </div>

                    {canAcceptBids ? (
                      <div className="space-y-3">
                        <BidButton
                          lotId={bidTargetLot.lot._id as Id<"auctionLots">}
                          currentBid={bidAmount}
                          bidIncrement={bidTargetLot.lot.bidIncrement || 50000}
                          buyNowPrice={bidTargetLot.lot.buyItNowPrice}
                          buyNowEnabled={false}
                          status={bidTargetLot.lot.status}
                          className="w-full h-14 text-xl shadow-lg shadow-volt-green/20 bg-volt-green text-slate-950 hover:bg-volt-green/90"
                        />
                        <p className="text-xs text-center text-muted-foreground">
                          Bid increment:{" "}
                          {formatCurrency(bidTargetLot.lot.bidIncrement || 50000)}
                        </p>
                      </div>
                    ) : (
                      <Button disabled className="w-full h-14 text-lg">
                        {isAuctionPaused
                          ? "Auction paused"
                          : isAuctionLive
                            ? isSequential
                              ? "Waiting for next lot…"
                              : "This lot is not accepting bids"
                            : "Auction Not Live"}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Gavel className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>
                      {isAuctionEnded
                        ? "This auction has ended"
                        : isAuctionPaused
                          ? "Auction is paused"
                          : isAuctionLive
                            ? displayLotClosed && isConcurrent
                              ? "This lot is closed — select an active lot to bid"
                              : "No active lot to bid on right now"
                            : "Auction has not started yet"}
                    </p>
                    {isAuctionEnded && activeLots.length > 0 && (
                      <p className="mt-2 text-xs">
                        Some lots still show as active from before the auction
                        ended. Bidding is closed.
                      </p>
                    )}
                  </div>
                )}
              </Card>

              <Card className="border-border/50 bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden h-[min(420px,50vh)] min-h-[220px] min-w-0">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20 shrink-0">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-electric-blue" />
                    {displayLot.status === "active"
                      ? `Live Feed · Lot #${displayLot.lotOrder}`
                      : `Bid History · Lot #${displayLot.lotOrder}`}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {bidHistory.length} Bids
                  </Badge>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-2">
                  {bidHistory.length > 0 ? (
                    bidHistory.map(
                      (bid: {
                        _id: string;
                        amount: number;
                        createdAt: number;
                        user?: { firstName?: string } | null;
                      }) => (
                        <div
                          key={bid._id}
                          className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-electric-blue/10 flex items-center justify-center shrink-0">
                              <Gavel className="h-4 w-4 text-electric-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">
                                User {bid.user?.firstName || "Guest"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(bid.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-electric-blue shrink-0 text-sm">
                            {formatCurrency(bid.amount)}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-8">
                      <p>No bids yet.</p>
                      {displayLot.status === "active" && <p>Be the first to bid!</p>}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Full lot grid for at-a-glance transparency */}
        <div>
          <h3 className="text-lg font-bold mb-4 px-1">All Lots in This Auction</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allLots.map((item) => {
              const thumb = getLotThumbnail(item.vehicle);
              const isSelected = displayLot?._id === item.lot._id;
              return (
                <button
                  key={item.lot._id}
                  type="button"
                  onClick={() => setInspectedLotId(item.lot._id)}
                  className="text-left"
                >
                  <Card
                    className={cn(
                      "p-3 flex items-center gap-3 transition-all",
                      isSelected
                        ? "border-electric-blue ring-1 ring-electric-blue/40"
                        : "border-border/50 hover:border-electric-blue/30"
                    )}
                  >
                    <div className="relative h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0">
                      {thumb && (
                        <RemoteImage
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-5",
                            lotStatusBadgeClass(item.lot.status)
                          )}
                        >
                          #{item.lot.lotOrder} {item.lot.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm truncate">
                        {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {COMPLETED_STATUSES.has(item.lot.status)
                          ? completedLotResultLabel(item)
                          : formatCurrency(
                              item.lot.currentBid || item.lot.startingBid || 0
                            )}
                      </p>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
