"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Gavel,
  Pause,
  Play,
  SkipForward,
  Trash2,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LiveControlCenter } from "@/components/admin/auctions/live-control-center";
import { DeleteAuctionDialog } from "@/components/admin/auctions/delete-auction-dialog";

type AuctionLotWithVehicle = {
  lot: Doc<"auctionLots">;
  vehicle: Doc<"vehicles"> & {
    image?: string;
  };
};

type AuctionData = {
  auction: Doc<"auctions">;
  lots: AuctionLotWithVehicle[];
};

interface AdminAuctionDetailClientProps {
  auctionId: Id<"auctions">;
  initialAuctionData: AuctionData;
}

export function AdminAuctionDetailClient({
  auctionId,
  initialAuctionData,
}: AdminAuctionDetailClientProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<
    "start" | "pause" | "advance" | null
  >(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const auctionData =
    useQuery(api.auctions.getAuctionById, { auctionId }) ?? initialAuctionData;
  const startAuction = useMutation(api.auctions.startAuction);
  const pauseAuction = useMutation(api.auctions.pauseAuction);
  const advanceLot = useMutation(api.auctions.advanceLot);
  const updateAuctionType = useMutation(api.auctions.updateAuctionType);
  const updateAuctionAutoAdvance = useMutation(api.auctions.updateAuctionAutoAdvance);
  const [pendingFormatChange, setPendingFormatChange] = useState(false);
  const [pendingAutoAdvanceChange, setPendingAutoAdvanceChange] = useState(false);

  const lots = auctionData?.lots ?? [];
  const auction = auctionData?.auction;

  const lotStats = useMemo(() => {
    const activeLots = lots.filter(({ lot }) => lot.status === "active");
    const soldLots = lots.filter(({ lot }) => lot.status === "sold");
    const totalBids = lots.reduce(
      (sum, { lot }) => sum + (lot.bidCount || 0),
      0
    );

    return {
      activeLots: activeLots.length,
      soldLots: soldLots.length,
      totalBids,
    };
  }, [lots]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      scheduled: {
        className:
          "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
        label: "Scheduled",
      },
      live: {
        className: "bg-volt-green/20 text-volt-green border-volt-green/30",
        label: "Live",
      },
      paused: {
        className:
          "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
        label: "Paused",
      },
      ended: {
        className: "bg-muted text-muted-foreground",
        label: "Ended",
      },
      cancelled: {
        className: "bg-error-red/20 text-error-red border-error-red/30",
        label: "Cancelled",
      },
      pending: {
        className: "bg-muted text-muted-foreground",
        label: "Pending",
      },
      active: {
        className: "bg-volt-green/20 text-volt-green border-volt-green/30",
        label: "Active",
      },
      sold: {
        className: "bg-electric-blue/20 text-electric-blue border-electric-blue/30",
        label: "Sold",
      },
      no_sale: {
        className: "bg-muted text-muted-foreground",
        label: "No Sale",
      },
      passed: {
        className: "bg-muted text-muted-foreground",
        label: "Passed",
      },
    };

    const config = variants[status] || {
      className: "bg-muted text-muted-foreground",
      label: status,
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleAuctionAction = async (
    action: "start" | "pause" | "advance"
  ) => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in again to manage this auction.",
        variant: "destructive",
      });
      return;
    }

    setPendingAction(action);

    try {
      const result =
        action === "start"
          ? await startAuction({ token, auctionId })
          : action === "pause"
            ? await pauseAuction({ token, auctionId })
            : await advanceLot({ token, auctionId });

      toast({
        title: "Auction updated",
        description: result.message,
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update auction.";
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (!auction) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Auction not found.
      </div>
    );
  }

  const isLive = auction.status === "live";
  const isScheduled = auction.status === "scheduled";
  const isPaused = auction.status === "paused";
  const isClosed = auction.status === "ended" || auction.status === "cancelled";
  const isSequential = auction.auctionType === "live";
  const autoAdvanceEnabled = isSequential && auction.autoAdvanceLots !== false;
  const formatLabel =
    auction.auctionType === "live"
      ? "Live · Sequential"
      : auction.auctionType === "timed"
        ? "Timed · Concurrent"
        : auction.auctionType;

  const handleFormatChange = async (nextType: "live" | "timed") => {
    if (!token || nextType === auction.auctionType || !isScheduled) return;
    setPendingFormatChange(true);
    try {
      const result = await updateAuctionType({
        token,
        auctionId,
        auctionType: nextType,
      });
      toast({ title: "Format updated", description: result.message });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not update format",
        description: error instanceof Error ? error.message : "Update failed",
        variant: "destructive",
      });
    } finally {
      setPendingFormatChange(false);
    }
  };

  const handleAutoAdvanceChange = async (enabled: boolean) => {
    if (!token || !isScheduled || !isSequential || enabled === autoAdvanceEnabled) {
      return;
    }
    setPendingAutoAdvanceChange(true);
    try {
      const result = await updateAuctionAutoAdvance({
        token,
        auctionId,
        autoAdvanceLots: enabled,
      });
      toast({ title: "Auto-advance updated", description: result.message });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not update auto-advance",
        description: error instanceof Error ? error.message : "Update failed",
        variant: "destructive",
      });
    } finally {
      setPendingAutoAdvanceChange(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/auctions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to auctions
            </Link>
          </Button>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold">{auction.name}</h1>
              {getStatusBadge(auction.status)}
            </div>
            {auction.description && (
              <p className="max-w-3xl text-muted-foreground">
                {auction.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLive && (
            <Button variant="outline" asChild>
              <Link href={`/auctions/${auction._id}`}>
                <Eye className="mr-2 h-4 w-4 text-electric-blue" />
                View live page
              </Link>
            </Button>
          )}
          <Button
            onClick={() => handleAuctionAction("start")}
            disabled={
              pendingAction !== null ||
              (!isScheduled &&
                !isPaused &&
                !(isLive && lots.some((l) => l.lot.status === "pending") &&
                  !lots.some((l) => l.lot.status === "active")))
            }
          >
            <Play className="mr-2 h-4 w-4" />
            {pendingAction === "start"
              ? "Starting..."
              : isLive &&
                  !lots.some((l) => l.lot.status === "active") &&
                  lots.some((l) => l.lot.status === "pending")
                ? "Recover lot"
                : "Start"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAuctionAction("pause")}
            disabled={pendingAction !== null || !isLive}
          >
            <Pause className="mr-2 h-4 w-4" />
            {pendingAction === "pause" ? "Pausing..." : "Pause"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAuctionAction("advance")}
            disabled={
              pendingAction !== null || !isLive || isClosed || !isSequential
            }
            title={
              isSequential
                ? "Close current lot and open the next"
                : "Advance lot is only for live (sequential) auctions"
            }
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {pendingAction === "advance" ? "Advancing..." : "Advance lot"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            title="Delete auction"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Auction
          </Button>
        </div>
      </div>

      <Tabs defaultValue="control-center" className="w-full">
        <TabsList>
          <TabsTrigger value="control-center" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-electric-blue" />
            Live Control Center
          </TabsTrigger>
          <TabsTrigger value="lots-list">
            <Gavel className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Auction Lots List ({lots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control-center" className="mt-6">
          <LiveControlCenter initialAuctionId={auctionId} />
        </TabsContent>

        <TabsContent value="lots-list" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Bidding Format</p>
              <p className="mt-1 text-lg font-semibold">{formatLabel}</p>
              {isScheduled ? (
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant={auction.auctionType === "live" ? "default" : "outline"}
                    disabled={pendingFormatChange}
                    onClick={() => handleFormatChange("live")}
                  >
                    Live · Sequential
                  </Button>
                  <Button
                    size="sm"
                    variant={auction.auctionType === "timed" ? "default" : "outline"}
                    disabled={pendingFormatChange}
                    onClick={() => handleFormatChange("timed")}
                  >
                    Timed · Concurrent
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Format can only be changed while scheduled.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Locked after bidding starts.
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Auto-advance</p>
              <p className="mt-1 text-lg font-semibold">
                {isSequential
                  ? autoAdvanceEnabled
                    ? "On"
                    : "Off"
                  : "N/A"}
              </p>
              {isSequential ? (
                isScheduled ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={autoAdvanceEnabled ? "default" : "outline"}
                      disabled={pendingAutoAdvanceChange}
                      onClick={() => handleAutoAdvanceChange(true)}
                    >
                      Auto-open next lot
                    </Button>
                    <Button
                      size="sm"
                      variant={!autoAdvanceEnabled ? "default" : "outline"}
                      disabled={pendingAutoAdvanceChange}
                      onClick={() => handleAutoAdvanceChange(false)}
                    >
                      Manual advance only
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Applies on sold and no-sale closes. Editable while scheduled.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {autoAdvanceEnabled
                      ? "Next lot opens automatically after each close."
                      : "Admin must advance after each lot closes."}
                  </p>
                )
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Timed lots close independently.
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Lots</p>
              <p className="mt-1 text-2xl font-semibold">{lots.length}</p>
              <p className="text-sm text-muted-foreground">
                {lotStats.activeLots} active / {lotStats.soldLots} sold
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Bids</p>
              <p className="mt-1 text-2xl font-semibold">{lotStats.totalBids}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Scheduled Start</p>
              <p className="mt-1 text-base font-semibold">
                {auction.scheduledStart
                  ? formatDate(auction.scheduledStart, "PPp")
                  : "Not set"}
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold">Lots in Auction</h2>
            {lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lots assigned to this auction yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Bid</TableHead>
                    <TableHead>Bids Count</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map(({ lot, vehicle }) => (
                    <TableRow key={lot._id}>
                      <TableCell className="font-semibold">#{lot.lotOrder}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            VIN: {vehicle.vin || "N/A"} | Lot: {vehicle.lotNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(lot.status)}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(lot.currentBid, { currency: "NGN" })}
                      </TableCell>
                      <TableCell>{lot.bidCount || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/vehicles/${vehicle._id}`}>
                            View Vehicle
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteAuctionDialog
        auctionId={auction._id}
        auctionName={auction.name}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={() => {
          setIsDeleteDialogOpen(false);
          router.push("/admin/auctions");
        }}
      />
    </div>
  );
}
