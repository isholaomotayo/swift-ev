"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import {
  Play,
  Pause,
  SkipForward,
  Clock,
  XCircle,
  Trophy,
  Bell,
  Eye,
  Layers,
  User,
  Zap,
  LayoutGrid,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Car,
  Send,
  Timer,
  Activity,
  ChevronLeft,
  ChevronRight,
  History,
  RotateCcw,
  ArrowRight,
  Filter,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCountdownClock, formatCurrency, formatDate } from "@/lib/utils";
import { getMutationErrorMessage } from "@/lib/auth-errors";

const getFormattedLotStatus = (status: string, hasBidder: boolean) => {
  if (status === "no_sale") return hasBidder ? "Reserve Not Met" : "No Sale";
  return status.replace(/_/g, " ");
};

interface LiveControlCenterProps {
  initialAuctionId?: Id<"auctions">;
}

export function LiveControlCenter({ initialAuctionId }: LiveControlCenterProps) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [selectedAuctionId, setSelectedAuctionId] = useState<Id<"auctions"> | undefined>(
    initialAuctionId
  );
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);

  // Selected Lot ID for Historical / Stepper Inspection (null means default active lot)
  const [inspectedLotId, setInspectedLotId] = useState<Id<"auctionLots"> | null>(null);
  const [lotFilter, setLotFilter] = useState<"all" | "completed" | "active" | "pending">("all");

  // Queries
  const allAuctions = useQuery(api.auctions.listAuctions, {}) ?? [];
  const controlData = useQuery(
    api.auctions.getLiveControlCenterData,
    token
      ? { token, auctionId: selectedAuctionId }
      : "skip"
  );

  // Mutations
  const startAuction = useMutation(api.auctions.startAuction);
  const pauseAuction = useMutation(api.auctions.pauseAuction);
  const advanceLot = useMutation(api.auctions.advanceLot);
  const extendLotTime = useMutation(api.auctions.extendLotTime);
  const forceCloseLot = useMutation(api.auctions.forceCloseLot);
  const notifyAuctionWinner = useMutation(api.auctions.notifyAuctionWinner);
  const setCurrentActiveLot = useMutation(api.auctions.setCurrentActiveLot);
  const quickAddVehicleToAuction = useMutation(api.auctions.quickAddVehicleToAuction);

  // Client-side timer state for smooth seconds update
  const [clientRemainingMs, setClientRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!controlData?.timing?.activeLotRemainingMs) {
      setClientRemainingMs(0);
      return;
    }

    setClientRemainingMs(controlData.timing.activeLotRemainingMs);

    const interval = setInterval(() => {
      setClientRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [controlData?.timing?.activeLotRemainingMs, controlData?.activeLot?.lot._id]);


  useEffect(() => {
    if (inspectedLotId) {
      setTimeout(() => {
        const el = document.getElementById("inspection-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [inspectedLotId]);

  const currentAuction = controlData?.auction;
  const activeLot = controlData?.activeLot;
  const activeLots = controlData?.activeLots ?? [];
  const nextLot = controlData?.nextLot;
  const nextLotAfter = controlData?.nextLotAfter;
  const completedLots = controlData?.completedLots ?? [];
  const allHydratedLots = controlData?.allHydratedLots ?? [];
  const timing = controlData?.timing;
  const isSequential = currentAuction?.auctionType === "live";
  const isConcurrent = currentAuction?.auctionType === "timed";

  // Selected or active lot for display
  const currentDisplayedLot = useMemo(() => {
    if (inspectedLotId && allHydratedLots.length > 0) {
      const found = allHydratedLots.find((item) => item.lot._id === inspectedLotId);
      if (found) return found;
    }
    return activeLot || allHydratedLots[0] || null;
  }, [inspectedLotId, allHydratedLots, activeLot]);

  // Concurrent: other active lots ending soonest (no sequential "pending" queue)
  const concurrentPeerLots = useMemo(() => {
    if (!isConcurrent) return [];
    const currentId = currentDisplayedLot?.lot._id;
    return [...activeLots]
      .filter((item) => item.lot._id !== currentId)
      .sort((a, b) => (a.lot.endsAt ?? Infinity) - (b.lot.endsAt ?? Infinity));
  }, [isConcurrent, activeLots, currentDisplayedLot?.lot._id]);

  const queuePreviewA = isConcurrent ? concurrentPeerLots[0] ?? null : nextLot;
  const queuePreviewB = isConcurrent ? concurrentPeerLots[1] ?? null : nextLotAfter;

  const controlTargetLot = useMemo(() => {
    if (
      currentDisplayedLot &&
      currentDisplayedLot.lot.status === "active" &&
      (isConcurrent || currentDisplayedLot.lot._id === activeLot?.lot._id)
    ) {
      return currentDisplayedLot;
    }
    return activeLot;
  }, [currentDisplayedLot, activeLot, isConcurrent]);

  const isInspectingHistorical =
    currentDisplayedLot &&
    activeLot &&
    currentDisplayedLot.lot._id !== activeLot.lot._id &&
    !(isConcurrent && currentDisplayedLot.lot.status === "active");

  // Lot Stepper navigation index
  const currentLotIndex = useMemo(() => {
    if (!currentDisplayedLot) return -1;
    return allHydratedLots.findIndex((item) => item.lot._id === currentDisplayedLot.lot._id);
  }, [allHydratedLots, currentDisplayedLot]);

  const handlePrevLot = () => {
    if (currentLotIndex > 0) {
      setInspectedLotId(allHydratedLots[currentLotIndex - 1].lot._id);
      setSelectedImageIndex(0);
    }
  };

  const handleNextLot = () => {
    if (currentLotIndex < allHydratedLots.length - 1) {
      setInspectedLotId(allHydratedLots[currentLotIndex + 1].lot._id);
      setSelectedImageIndex(0);
    }
  };

  // Formatting helpers
  const formatTimerSeconds = (ms: number) => formatCountdownClock(ms);

  const formatDurationMs = (ms: number) => {
    if (!ms || ms <= 0) return "0m 0s";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Action Handlers
  const handleStartAuction = async () => {
    if (!token || !currentAuction) return;
    setIsPerformingAction("start");
    try {
      const res = await startAuction({ token, auctionId: currentAuction._id });
      toast({ title: "Auction Started", description: res.message });
      setInspectedLotId(null);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Failed to start auction"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handlePauseAuction = async () => {
    if (!token || !currentAuction) return;
    setIsPerformingAction("pause");
    try {
      const res = await pauseAuction({ token, auctionId: currentAuction._id });
      toast({ title: "Auction Paused", description: res.message });
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Failed to pause auction"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleAdvanceLot = async () => {
    if (!token || !currentAuction) return;
    setIsPerformingAction("advance");
    try {
      const res = await advanceLot({ token, auctionId: currentAuction._id });
      toast({ title: "Lot Advanced", description: res.message });
      setInspectedLotId(null);
      setSelectedImageIndex(0);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Failed to advance lot"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleSetCurrentActiveLot = async (lotId: Id<"auctionLots">) => {
    if (!token || !currentAuction) return;
    setIsPerformingAction(`set_active_${lotId}`);
    try {
      const res = await setCurrentActiveLot({
        token,
        auctionId: currentAuction._id,
        lotId,
      });
      toast({ title: "Active Lot Set", description: res.message });
      setInspectedLotId(null);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Could not set active lot"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleExtendLot = async (seconds: number) => {
    if (!token || !controlTargetLot) return;
    setIsPerformingAction(`extend_${seconds}`);
    try {
      const res = await extendLotTime({
        token,
        lotId: controlTargetLot.lot._id,
        seconds,
      });
      toast({ title: "Timer Extended", description: res.message });
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Failed to extend lot time"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleForceCloseLot = async () => {
    if (!token || !controlTargetLot) return;
    setIsPerformingAction("force_close");
    try {
      const res = await forceCloseLot({
        token,
        lotId: controlTargetLot.lot._id,
      });
      toast({
        title: res.outcome === "sold" ? "High bidder awarded" : "Lot closed — no sale",
        description: res.message,
      });
      setInspectedLotId(null);
      setSelectedImageIndex(0);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getMutationErrorMessage(err, "Failed to close lot"),
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  const handleNotifyWinner = async (lotId: Id<"auctionLots">) => {
    if (!token) return;
    setIsPerformingAction(`notify_${lotId}`);
    try {
      const res = await notifyAuctionWinner({ token, lotId });
      toast({ title: "Notification Sent", description: res.message });
    } catch (err) {
      toast({
        title: "Notification Failed",
        description: err instanceof Error ? err.message : "Could not notify winner",
        variant: "destructive",
      });
    } finally {
      setIsPerformingAction(null);
    }
  };

  if (!controlData || !currentAuction) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-4 text-muted-foreground animate-spin" />
        <p className="text-lg font-medium">Loading Live Auction Control Center...</p>
      </Card>
    );
  }

  const isLive = currentAuction.status === "live";
  const isPaused = currentAuction.status === "paused";
  const isScheduled = currentAuction.status === "scheduled";
  const isEnded = currentAuction.status === "ended" || currentAuction.status === "cancelled";
  const needsLotRecovery = Boolean(controlData.needsLotRecovery);
  const canStartOrRecover =
    isScheduled ||
    isPaused ||
    (isLive && needsLotRecovery) ||
    (isEnded && needsLotRecovery);

  // Calculate percentage of timer remaining for active lot
  const totalLotDuration = activeLot?.lot.lotDuration ?? 5 * 60 * 1000;
  const timerPercent = Math.min(
    100,
    Math.max(0, (clientRemainingMs / totalLotDuration) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center text-electric-blue">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{currentAuction.name}</h1>
                <Badge
                  className={
                    isLive
                      ? "bg-volt-green/20 text-volt-green border-volt-green/30 animate-pulse"
                      : isPaused
                        ? "bg-warning-amber/20 text-warning-amber border-warning-amber/30"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {isLive && <span className="h-2 w-2 rounded-full bg-volt-green mr-1.5 animate-ping" />}
                  {currentAuction.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Format:{" "}
                <span className="text-foreground font-medium">
                  {currentAuction.auctionType === "live"
                    ? "Live · Sequential"
                    : currentAuction.auctionType === "timed"
                      ? "Timed · Concurrent"
                      : currentAuction.auctionType}
                </span>{" "}
                • Total Lots:{" "}
                <span className="text-foreground font-medium">{controlData.allLotsCount}</span> • Completed:{" "}
                <span className="text-foreground font-medium">{completedLots.length}</span> • Queue Remaining:{" "}
                <span className="text-foreground font-medium">{controlData.pendingLotsCount}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Switch Auction Dropdown */}
            {allAuctions.length > 1 && (
              <Select
                value={selectedAuctionId || currentAuction._id}
                onValueChange={(val) => {
                  setSelectedAuctionId(val as Id<"auctions">);
                  setInspectedLotId(null);
                }}
              >
                <SelectTrigger className="w-[220px] h-9 text-xs">
                  <SelectValue placeholder="Select Auction" />
                </SelectTrigger>
                <SelectContent>
                  {allAuctions.map((auc) => (
                    <SelectItem key={auc._id} value={auc._id}>
                      {auc.name} ({auc.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* View Mode Toggle Button */}
            <div className="bg-muted p-0.5 rounded-lg border flex items-center text-xs">
              <Button
                variant={viewMode === "detailed" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("detailed")}
                className="h-8 px-2.5"
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                Detailed View
              </Button>
              <Button
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("compact")}
                className="h-8 px-2.5"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Compact View
              </Button>
            </div>

            {/* Live Auction Page Link */}
            {isLive && (
              <Button variant="outline" size="sm" asChild className="h-9">
                <Link href={`/auctions/${currentAuction._id}`}>
                  <Eye className="h-3.5 w-3.5 mr-1.5 text-electric-blue" />
                  View Live Page
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleStartAuction}
              disabled={isPerformingAction !== null || !canStartOrRecover}
              className="bg-volt-green text-black hover:bg-volt-green/90 font-medium"
            >
              <Play className="h-4 w-4 mr-1.5 fill-current" />
              {isPerformingAction === "start"
                ? needsLotRecovery
                  ? "Recovering..."
                  : "Starting..."
                : needsLotRecovery
                  ? isEnded
                    ? "Reopen Auction"
                    : "Recover Active Lot"
                  : isPaused
                    ? "Resume Auction"
                    : "Start Auction"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseAuction}
              disabled={isPerformingAction !== null || !isLive}
            >
              <Pause className="h-4 w-4 mr-1.5 text-warning-amber fill-current" />
              {isPerformingAction === "pause" ? "Pausing..." : "Pause Auction"}
            </Button>

            {isSequential ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceLot}
                disabled={isPerformingAction !== null || !isLive || isEnded}
              >
                <SkipForward className="h-4 w-4 mr-1.5 text-electric-blue" />
                {isPerformingAction === "advance" ? "Advancing..." : "Next Lot"}
              </Button>
            ) : isConcurrent ? (
              <p className="text-xs text-muted-foreground self-center px-2">
                Timed · Concurrent — lots close independently (use Force Close / timers per lot)
              </p>
            ) : null}
            {isSequential && currentAuction.autoAdvanceLots !== false && (
              <p className="text-xs text-muted-foreground self-center px-2">
                Auto-advance on — next lot opens after sold or no sale
              </p>
            )}
            {isSequential && currentAuction.autoAdvanceLots === false && (
              <p className="text-xs text-muted-foreground self-center px-2">
                Auto-advance off — use Next Lot after each close
              </p>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceCloseLot}
              disabled={isPerformingAction !== null || !controlTargetLot}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              {isPerformingAction === "force_close"
                ? "Closing..."
                : "Close & Award High Bidder"}
            </Button>
          </div>

          {/* Time Extenders for Active Lot */}
          {controlTargetLot && isLive && (
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
              <span className="text-xs font-semibold px-2 text-muted-foreground flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1 text-electric-blue" />
                Add Time:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExtendLot(30)}
                disabled={isPerformingAction !== null}
                className="h-7 text-xs px-2 font-mono bg-background hover:bg-muted border shadow-2xs"
              >
                +30s
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExtendLot(60)}
                disabled={isPerformingAction !== null}
                className="h-7 text-xs px-2 font-mono bg-background hover:bg-muted border shadow-2xs"
              >
                +1m
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExtendLot(120)}
                disabled={isPerformingAction !== null}
                className="h-7 text-xs px-2 font-mono bg-background hover:bg-muted border shadow-2xs"
              >
                +2m
              </Button>
            </div>
          )}
        </div>

        {needsLotRecovery && (
          <div className="rounded-lg border border-warning-amber/40 bg-warning-amber/10 px-4 py-3 text-sm">
            {isEnded ? (
              <>
                <p className="font-semibold text-warning-amber">
                  Auction marked ended but lots are still active
                </p>
                <p className="text-muted-foreground mt-1">
                  Buyers see bidding closed. Click{" "}
                  <span className="font-medium text-foreground">Reopen Auction</span>{" "}
                  to set status back to live so concurrent lots can accept bids again.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-warning-amber">
                  Auction is live but no lot is active
                </p>
                <p className="text-muted-foreground mt-1">
                  Click{" "}
                  <span className="font-medium text-foreground">Recover Active Lot</span>{" "}
                  (or Next Lot) to open the next runnable pending lot. Unrunnable lots
                  (bad vehicle status) are skipped automatically.
                </p>
              </>
            )}
          </div>
        )}

        {isConcurrent && activeLots.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Activity className="h-4 w-4 text-volt-green" />
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Concurrent Active Lots ({activeLots.length})
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeLots.map((item) => {
                const remaining =
                  item.lot.endsAt != null ? Math.max(0, item.lot.endsAt - (timing?.now ?? Date.now())) : 0;
                const selected = currentDisplayedLot?.lot._id === item.lot._id;
                return (
                  <button
                    key={item.lot._id}
                    type="button"
                    onClick={() => {
                      setInspectedLotId(item.lot._id);
                      setSelectedImageIndex(0);
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-volt-green bg-volt-green/10"
                        : "border-border bg-muted/40 hover:bg-muted/70"
                    }`}
                  >
                    <p className="text-xs font-semibold">
                      Lot {item.lot.lotOrder} · {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                    </p>
                    <p className="mt-1 text-sm font-bold">{formatCurrency(item.lot.currentBid)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.lot.bidCount} bids · {formatDurationMs(remaining)} left
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORICAL & FUTURE LOT TIMELINE STEPPER BAR */}
        {allHydratedLots.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-electric-blue" />
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Interactive Lot History & Navigation Stepper
                </span>
                {isInspectingHistorical && (
                  <Badge variant="outline" className="text-warning-amber border-warning-amber/30 text-[10px]">
                    Previewing Lot #{currentDisplayedLot?.lot.lotOrder} ({currentDisplayedLot?.lot.status})
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isInspectingHistorical && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setInspectedLotId(null);
                      setSelectedImageIndex(0);
                    }}
                    className="h-7 text-xs bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/20"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Return to Live Active Lot
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevLot}
                  disabled={currentLotIndex <= 0}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs text-muted-foreground font-semibold">
                  {currentLotIndex >= 0 ? currentLotIndex + 1 : 1} / {allHydratedLots.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextLot}
                  disabled={currentLotIndex >= allHydratedLots.length - 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stepper Pills Scroll Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {allHydratedLots.map(({ lot, vehicle }) => {
                const isSelected = currentDisplayedLot?.lot._id === lot._id;
                const isActive = activeLot?.lot._id === lot._id;

                let badgeColor = "bg-muted text-muted-foreground";
                if (lot.status === "sold") badgeColor = "bg-electric-blue/20 text-electric-blue border-electric-blue/30";
                if (lot.status === "no_sale" || lot.status === "passed") badgeColor = "bg-muted text-muted-foreground";
                if (lot.status === "active") badgeColor = "bg-volt-green/20 text-volt-green border-volt-green/30 font-bold";

                return (
                  <button
                    key={lot._id}
                    onClick={() => {
                      setInspectedLotId(lot._id);
                      setSelectedImageIndex(0);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs shrink-0 transition-all ${
                      isSelected
                        ? "border-electric-blue bg-electric-blue/10 ring-2 ring-electric-blue/30"
                        : "bg-card hover:bg-muted/60"
                    }`}
                  >
                    <Badge className={`text-[10px] ${badgeColor}`}>
                      #{lot.lotOrder} {getFormattedLotStatus(lot.status, !!(lot.currentBidderId || lot.winnerId)).toUpperCase()}
                    </Badge>
                    <span className="font-semibold truncate max-w-[120px]">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-volt-green animate-ping shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* COMPACT VIEW MODE */}
      {viewMode === "compact" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Active Lot Quick Card */}
            <Card className="p-4 border bg-gradient-to-br from-card via-card to-electric-blue/5">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="font-mono">
                  ACTIVE LOT #{activeLot?.lot.lotOrder ?? "-"}
                </Badge>
                {activeLot && (
                  <div className="font-mono font-bold text-lg text-volt-green flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {formatTimerSeconds(clientRemainingMs)}
                  </div>
                )}
              </div>

              {activeLot ? (
                <div className="flex gap-3">
                  <div className="relative h-20 w-28 rounded-lg overflow-hidden bg-muted border shrink-0">
                    <Image
                      src={activeLot.vehicle.images[0]?.url || "/placeholder-car.jpg"}
                      alt={activeLot.vehicle.make}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm truncate">
                      {activeLot.vehicle.year} {activeLot.vehicle.make} {activeLot.vehicle.model}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lot {activeLot.vehicle.lotNumber}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Current Bid</p>
                      <p className="text-lg font-bold text-electric-blue">
                        {formatCurrency(activeLot.lot.currentBid)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No active lot right now.</p>
              )}
            </Card>

            {/* Winning Bidder Quick Card */}
            <Card className="p-4 border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Winning Bidder
              </p>
              {activeLot?.currentBidder ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-electric-blue/10 border border-electric-blue/30 flex items-center justify-center text-electric-blue font-bold text-sm">
                    {activeLot.currentBidder.firstName.charAt(0)}
                    {activeLot.currentBidder.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {activeLot.currentBidder.firstName} {activeLot.currentBidder.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeLot.currentBidder.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                  <p className="text-xs text-muted-foreground">No bids placed yet</p>
                </div>
              )}
            </Card>

            {/* Next / peer lot quick card */}
            <Card className="p-4 border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                {isConcurrent
                  ? `Also bidding (Lot #${queuePreviewA?.lot.lotOrder ?? "-"})`
                  : `Up Next (Lot #${nextLot?.lot.lotOrder ?? "-"})`}
              </p>
              {queuePreviewA ? (
                <button
                  type="button"
                  className="flex gap-3 w-full text-left"
                  onClick={() => {
                    setInspectedLotId(queuePreviewA.lot._id);
                    setSelectedImageIndex(0);
                  }}
                >
                  <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-muted border shrink-0">
                    <Image
                      src={queuePreviewA.vehicle.image || "/placeholder-car.jpg"}
                      alt={queuePreviewA.vehicle.make}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate">
                      {queuePreviewA.vehicle.year} {queuePreviewA.vehicle.make}{" "}
                      {queuePreviewA.vehicle.model}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {isConcurrent
                        ? `Bid: ${formatCurrency(queuePreviewA.lot.currentBid || 0)}`
                        : `Starting: ${formatCurrency(queuePreviewA.lot.startingBid || 0)}`}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {isConcurrent
                        ? queuePreviewA.lot.endsAt
                          ? formatCountdownClock(
                              Math.max(0, queuePreviewA.lot.endsAt - (timing?.now ?? Date.now()))
                            )
                          : "Active"
                        : "Queued"}
                    </Badge>
                  </div>
                </button>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {isConcurrent
                    ? "No other lots bidding right now"
                    : "No more upcoming lots."}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* DETAILED CONTROL & HISTORICAL INSPECTION VIEW MODE */}
      {viewMode === "detailed" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT/CENTER MAIN COLUMN (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Active or Inspected Historical Vehicle Display Card */}
            {currentDisplayedLot ? (
              <Card id="inspection-card" className="overflow-hidden border-2 border-electric-blue/30 shadow-md">
                {/* Header Ticker Bar */}
                <div className="bg-gradient-to-r from-card via-card to-electric-blue/10 p-4 border-b flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-volt-green text-black font-mono font-bold">
                      LOT #{currentDisplayedLot.lot.lotOrder}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-xs font-semibold">
                      Status: {getFormattedLotStatus(currentDisplayedLot.lot.status, !!(currentDisplayedLot.lot.currentBidderId || currentDisplayedLot.lot.winnerId))}
                    </Badge>
                    {isInspectingHistorical && (
                      <span className="text-xs font-semibold text-warning-amber">
                        (Historical Inspection)
                      </span>
                    )}
                  </div>

                  {/* If active lot, display live timer */}
                  {!isInspectingHistorical && activeLot && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">
                          Time Remaining
                        </p>
                        <p
                          className={`text-2xl font-mono font-extrabold tracking-tight ${
                            clientRemainingMs < 15000
                              ? "text-error-red animate-pulse"
                              : clientRemainingMs < 60000
                                ? "text-warning-amber"
                                : "text-volt-green"
                          }`}
                        >
                          {formatTimerSeconds(clientRemainingMs)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Live/sequential only: jump queue to a pending/upcoming lot */}
                  {isInspectingHistorical && isSequential && (
                    <Button
                      size="sm"
                      onClick={() => handleSetCurrentActiveLot(currentDisplayedLot.lot._id)}
                      disabled={isPerformingAction !== null}
                      className="bg-electric-blue text-white hover:bg-electric-blue/90 font-medium h-8 text-xs"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Make Active Lot
                    </Button>
                  )}
                </div>

                {!isInspectingHistorical && activeLot && (
                  <Progress value={timerPercent} className="h-1.5 rounded-none bg-muted" />
                )}

                <div className="p-5 grid gap-6 md:grid-cols-2">
                  {/* Vehicle Gallery & Media Preview */}
                  <div className="space-y-3">
                    <div className="relative h-64 w-full rounded-xl overflow-hidden bg-black/90 border shadow-inner">
                      {currentDisplayedLot.vehicle.images[selectedImageIndex]?.url ? (
                        <Image
                          src={currentDisplayedLot.vehicle.images[selectedImageIndex].url}
                          alt={currentDisplayedLot.vehicle.make}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                          <Car className="h-12 w-12 mb-2 stroke-1" />
                          <p className="text-xs">No image available</p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-semibold">
                        Image {selectedImageIndex + 1} of {currentDisplayedLot.vehicle.images.length || 1}
                      </div>
                    </div>

                    {/* Image Thumbnails Strip */}
                    {currentDisplayedLot.vehicle.images.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {currentDisplayedLot.vehicle.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                              selectedImageIndex === idx
                                ? "border-electric-blue ring-2 ring-electric-blue/30 scale-105"
                                : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                          >
                            <Image src={img.url} alt="" fill className="object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Details & Pricing Box */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {currentDisplayedLot.vehicle.year} {currentDisplayedLot.vehicle.make}{" "}
                        {currentDisplayedLot.vehicle.model}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        VIN:{" "}
                        <span className="font-mono text-foreground font-medium">
                          {currentDisplayedLot.vehicle.vin || "N/A"}
                        </span>{" "}
                        • Stock Lot:{" "}
                        <span className="font-mono text-foreground font-medium">
                          {currentDisplayedLot.vehicle.lotNumber}
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                          Odometer
                        </span>
                        <span className="font-semibold text-sm">
                          {currentDisplayedLot.vehicle.odometer.toLocaleString()} km
                        </span>
                      </div>
                      <div className="bg-muted/50 p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                          Condition
                        </span>
                        <span className="font-semibold text-sm capitalize">
                          {currentDisplayedLot.vehicle.condition}
                        </span>
                      </div>
                      <div className="bg-muted/50 p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                          Fuel / Engine
                        </span>
                        <span className="font-semibold text-sm capitalize">
                          {currentDisplayedLot.vehicle.fuelType || "EV"}
                        </span>
                      </div>
                      <div className="bg-muted/50 p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                          Location
                        </span>
                        <span className="font-semibold text-sm truncate block">
                          {currentDisplayedLot.vehicle.currentLocation?.city},{" "}
                          {currentDisplayedLot.vehicle.currentLocation?.country}
                        </span>
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div className="bg-gradient-to-r from-electric-blue/10 via-electric-blue/5 to-transparent p-4 rounded-xl border border-electric-blue/20 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Reserve Status</span>
                        {currentDisplayedLot.lot.reserveMet ? (
                          <Badge className="bg-volt-green/20 text-volt-green border-volt-green/30 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Reserve Met
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning-amber border-warning-amber/30 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-1" /> Reserve Pending
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                            {currentDisplayedLot.lot.status === "sold" ? "Winning Price" : "Current Bid"}
                          </p>
                          <p className="text-3xl font-extrabold text-electric-blue tracking-tight">
                            {formatCurrency(currentDisplayedLot.lot.currentBid)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Starting Bid</p>
                          <p className="text-lg font-bold text-foreground font-mono">
                            {formatCurrency(currentDisplayedLot.lot.startingBid || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-bold">No Lot Selected</h3>
              </Card>
            )}

            {/* Queue preview: sequential pending OR concurrent peers ending soon */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-electric-blue" />
                  {isConcurrent
                    ? "Other lots bidding now"
                    : "Upcoming Auction Lots Queue & Available Vehicles"}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {isConcurrent
                    ? `${concurrentPeerLots.length} other active lot${
                        concurrentPeerLots.length === 1 ? "" : "s"
                      }`
                    : `${controlData.pendingLotsCount} vehicles in upcoming queue`}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 border bg-card hover:border-electric-blue/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {isConcurrent ? "ENDING SOON" : "UP NEXT"} • LOT #
                      {queuePreviewA?.lot.lotOrder ?? "-"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {isConcurrent ? "Also active" : "Position N+1"}
                    </span>
                  </div>

                  {queuePreviewA ? (
                    <button
                      type="button"
                      className="flex gap-3 w-full text-left"
                      onClick={() => {
                        setInspectedLotId(queuePreviewA.lot._id);
                        setSelectedImageIndex(0);
                      }}
                    >
                      <div className="relative h-20 w-28 rounded-lg overflow-hidden bg-muted border shrink-0">
                        <Image
                          src={queuePreviewA.vehicle.image || "/placeholder-car.jpg"}
                          alt={queuePreviewA.vehicle.make}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm truncate">
                          {queuePreviewA.vehicle.year} {queuePreviewA.vehicle.make}{" "}
                          {queuePreviewA.vehicle.model}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Lot {queuePreviewA.vehicle.lotNumber}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {isConcurrent ? "Current bid:" : "Starting:"}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(
                              isConcurrent
                                ? queuePreviewA.lot.currentBid || 0
                                : queuePreviewA.lot.startingBid || 0
                            )}
                          </span>
                        </div>
                        {isConcurrent && queuePreviewA.lot.endsAt && (
                          <p className="mt-1 text-[11px] font-mono text-volt-green">
                            {formatCountdownClock(
                              Math.max(
                                0,
                                queuePreviewA.lot.endsAt - (timing?.now ?? Date.now())
                              )
                            )}{" "}
                            left
                          </p>
                        )}
                      </div>
                    </button>
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      {isConcurrent
                        ? "No other lots bidding right now"
                        : "No upcoming lot (queue empty)"}
                    </div>
                  )}
                </Card>

                <Card className="p-4 border bg-card/60 hover:border-electric-blue/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {isConcurrent ? "NEXT ENDING" : "FOLLOWING"} • LOT #
                      {queuePreviewB?.lot.lotOrder ?? "-"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {isConcurrent ? "Also active" : "Position N+2"}
                    </span>
                  </div>

                  {queuePreviewB ? (
                    <button
                      type="button"
                      className="flex gap-3 w-full text-left"
                      onClick={() => {
                        setInspectedLotId(queuePreviewB.lot._id);
                        setSelectedImageIndex(0);
                      }}
                    >
                      <div className="relative h-20 w-28 rounded-lg overflow-hidden bg-muted border shrink-0">
                        <Image
                          src={queuePreviewB.vehicle.image || "/placeholder-car.jpg"}
                          alt={queuePreviewB.vehicle.make}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm truncate">
                          {queuePreviewB.vehicle.year} {queuePreviewB.vehicle.make}{" "}
                          {queuePreviewB.vehicle.model}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Lot {queuePreviewB.vehicle.lotNumber}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {isConcurrent ? "Current bid:" : "Starting:"}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(
                              isConcurrent
                                ? queuePreviewB.lot.currentBid || 0
                                : queuePreviewB.lot.startingBid || 0
                            )}
                          </span>
                        </div>
                        {isConcurrent && queuePreviewB.lot.endsAt && (
                          <p className="mt-1 text-[11px] font-mono text-volt-green">
                            {formatCountdownClock(
                              Math.max(
                                0,
                                queuePreviewB.lot.endsAt - (timing?.now ?? Date.now())
                              )
                            )}{" "}
                            left
                          </p>
                        )}
                      </div>
                    </button>
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      {isConcurrent
                        ? "No additional active lot to show"
                        : "No N+2 lot available"}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* FULL HISTORICAL LOTS & WINNERS LOG TABLE WITH FILTERS */}
            <Card className="overflow-hidden border space-y-0">
              <div className="p-4 border-b bg-muted/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning-amber" />
                  <h3 className="font-bold text-base">Auction Lots History & Winners Log</h3>
                </div>

                {/* Filter Tabs for Lot History */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border text-xs">
                  <button
                    onClick={() => setLotFilter("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lotFilter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    All ({allHydratedLots.length})
                  </button>
                  <button
                    onClick={() => setLotFilter("completed")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lotFilter === "completed" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Completed ({completedLots.length})
                  </button>
                  <button
                    onClick={() => setLotFilter("active")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lotFilter === "active" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Active ({activeLots.length})
                  </button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Lot</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Winning / High Bid</TableHead>
                    <TableHead>Winner / High Bidder</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {allHydratedLots
                    .filter((item) => {
                      if (lotFilter === "completed")
                        return (
                          item.lot.status === "sold" ||
                          item.lot.status === "no_sale" ||
                          item.lot.status === "passed"
                        );
                      if (lotFilter === "active") return item.lot.status === "active";
                      return true;
                    })
                    .map(({ lot, vehicle, winner, currentBidder }) => {
                      const bidderOrWinner = winner || currentBidder;
                      const isInspectingThis = currentDisplayedLot?.lot._id === lot._id;

                      return (
                        <TableRow
                          key={lot._id}
                          className={isInspectingThis ? "bg-electric-blue/5 font-semibold" : undefined}
                        >
                          <TableCell className="font-mono font-bold">#{lot.lotOrder}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Lot {vehicle.lotNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="capitalize text-[10px]" variant="outline">
                              {getFormattedLotStatus(lot.status, !!(lot.currentBidderId || lot.winnerId))}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-electric-blue font-mono">
                            {formatCurrency(lot.currentBid || 0)}
                          </TableCell>
                          <TableCell>
                            {bidderOrWinner ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-electric-blue/10 flex items-center justify-center font-bold text-[10px] text-electric-blue">
                                  {bidderOrWinner.firstName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold">
                                    {bidderOrWinner.firstName} {bidderOrWinner.lastName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{bidderOrWinner.email}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">No Bids</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant={isInspectingThis ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => {
                                setInspectedLotId(lot._id);
                                setSelectedImageIndex(0);

                              }}
                              className="h-7 px-2 text-[11px]"
                            >
                              <Eye className="h-3 w-3 mr-1 text-electric-blue" />
                              Inspect
                            </Button>
                            {lot.status === "sold" && winner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNotifyWinner(lot._id)}
                                disabled={isPerformingAction === `notify_${lot._id}`}
                                className="h-7 px-2 text-[11px]"
                              >
                                <Send className="h-3 w-3 mr-1 text-electric-blue" />
                                Re-notify
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* RIGHT SIDEBAR COLUMN (4 COLS): WINNER CARD & LIVE/HISTORICAL BID STREAM */}
          <div className="lg:col-span-4 space-y-6">
            {/* Bidder Card for Displayed Lot */}
            <Card className="p-5 border bg-gradient-to-br from-card to-electric-blue/5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-warning-amber" />
                <h3 className="font-bold text-base">
                  {currentDisplayedLot?.lot.status === "sold"
                    ? "Auction Winner"
                    : "High Bidder"}
                </h3>
              </div>

              {currentDisplayedLot?.winner || currentDisplayedLot?.currentBidder ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border">
                    <div className="h-12 w-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {(currentDisplayedLot.winner || currentDisplayedLot.currentBidder)!.firstName.charAt(0)}
                      {(currentDisplayedLot.winner || currentDisplayedLot.currentBidder)!.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">
                        {(currentDisplayedLot.winner || currentDisplayedLot.currentBidder)!.firstName}{" "}
                        {(currentDisplayedLot.winner || currentDisplayedLot.currentBidder)!.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(currentDisplayedLot.winner || currentDisplayedLot.currentBidder)!.email}
                      </p>
                    </div>
                  </div>

                  <div className="bg-background p-3 rounded-lg border text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Winning / High Bid:</span>
                      <span className="font-bold text-electric-blue font-mono">
                        {formatCurrency(currentDisplayedLot.lot.currentBid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bids Placed:</span>
                      <span className="font-medium">{currentDisplayedLot.lot.bidCount} bids</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <User className="h-10 w-10 mx-auto text-muted-foreground/40 stroke-1" />
                  <p className="text-xs">No winner / bidder on this lot yet.</p>
                </div>
              )}
            </Card>

            {/* Bidding Activity Stream for Displayed Lot */}
            <Card className="p-5 border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-volt-green" />
                  Bid Log (Lot #{currentDisplayedLot?.lot.lotOrder ?? "-"})
                </h3>
              </div>

              {currentDisplayedLot?.recentBids && currentDisplayedLot.recentBids.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 text-xs">
                  {currentDisplayedLot.recentBids.map((bid) => (
                    <div
                      key={bid._id}
                      className="p-2.5 rounded-lg border bg-muted/40 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold">{bid.bidderName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(bid.createdAt, "p")} • <span className="capitalize">{bid.bidType}</span>
                        </p>
                      </div>
                      <span className="font-mono font-bold text-electric-blue text-sm">
                        {formatCurrency(bid.bidAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No bids recorded for this lot.
                </p>
              )}
            </Card>

            {/* Event Timers Summary */}
            <Card className="p-5 border space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-electric-blue" />
                Event Timers & Clocks
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-muted/50 border">
                  <span className="text-muted-foreground">Auction Elapsed:</span>
                  <span className="font-mono font-semibold">
                    {formatDurationMs(timing?.auctionElapsedMs || 0)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50 border">
                  <span className="text-muted-foreground">Scheduled Start:</span>
                  <span className="font-medium">
                    {currentAuction.scheduledStart
                      ? formatDate(currentAuction.scheduledStart, "PPp")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
