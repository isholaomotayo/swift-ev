"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Calendar, Play, Zap, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveControlCenter } from "@/components/admin/auctions/live-control-center";
import { DeleteAuctionDialog } from "@/components/admin/auctions/delete-auction-dialog";
import type { Id } from "@/convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

interface AdminAuctionsClientProps {
  initialAuctions: any[];
  initialSettings?: any;
  token?: string;
}

export function AdminAuctionsClient({
  initialAuctions,
  initialSettings,
  token,
}: AdminAuctionsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("control-center");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"auctions">;
    name: string;
  } | null>(null);

  const settings =
    useQuery(api.settings.getSettings, token ? { token } : "skip") ??
    initialSettings;

  const updateSetting = useMutation(api.settings.updateSetting);

  const serverEnforceMinimumDeposit = settings
    ? settings["auction.enforceMinimumDeposit"] === "true"
    : false;

  // Optimistic UI state
  const [optimisticDeposit, setOptimisticDeposit] = useState<boolean | null>(
    null,
  );

  // Sync optimistic state when server state changes
  useEffect(() => {
    setOptimisticDeposit(null);
  }, [serverEnforceMinimumDeposit]);

  const enforceMinimumDeposit =
    optimisticDeposit !== null
      ? optimisticDeposit
      : serverEnforceMinimumDeposit;

  const handleDepositSettingChange = async (checked: boolean | string) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token missing.",
        variant: "destructive",
      });
      return;
    }
    const isChecked = checked === true;

    // Set optimistic state
    setOptimisticDeposit(isChecked);

    try {
      await updateSetting({
        token,
        key: "auction.enforceMinimumDeposit",
        value: isChecked ? "true" : "false",
        description: "Enforce minimum 10% deposit before bidding",
      });
      toast({
        title: "Setting Updated",
        description: `Minimum deposit requirement is now ${isChecked ? "enforced" : "disabled"}.`,
      });
    } catch (error: any) {
      // Revert optimistic state on error
      setOptimisticDeposit(null);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update setting.",
      });
    }
  };

  // Client-side filtering (no additional subscriptions)
  const liveAuctions = useMemo(
    () => initialAuctions.filter((a) => a.status === "live"),
    [initialAuctions],
  );

  const scheduledAuctions = useMemo(
    () => initialAuctions.filter((a) => a.status === "scheduled"),
    [initialAuctions],
  );

  const completedAuctions = useMemo(
    () => initialAuctions.filter((a) => a.status === "ended"),
    [initialAuctions],
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
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
      ended: { className: "bg-muted text-muted-foreground", label: "Ended" },
      completed: {
        className: "bg-muted text-muted-foreground",
        label: "Completed",
      },
      cancelled: {
        className: "bg-error-red/20 text-error-red border-error-red/30",
        label: "Cancelled",
      },
    };

    const config = variants[status] || {
      className: "bg-muted text-muted-foreground",
      label: status,
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const renderAuctionTable = (auctions: any[]) => {
    if (auctions.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No auctions found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auction Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lots</TableHead>
            <TableHead>Scheduled Start</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auctions.map((auction) => (
            <TableRow key={auction._id}>
              <TableCell>
                <div>
                  <p className="font-medium">{auction.name}</p>
                  {auction.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {auction.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">
                {auction.auctionType}
              </TableCell>
              <TableCell>{getStatusBadge(auction.status)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">
                    {auction.lotCount ?? auction.totalLots ?? 0} total
                  </p>
                  <p className="text-muted-foreground">
                    {auction.activeLotCount ?? 0} active
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {auction.scheduledStart ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDate(auction.scheduledStart, "PPp")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Not scheduled
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/auctions/${auction._id}`}>Manage</Link>
                  </Button>
                  {auction.status === "live" && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/auctions/${auction._id}`}>
                        <Play className="h-4 w-4 mr-1" />
                        View Live
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-error-red hover:text-error-red hover:bg-error-red/10"
                    title="Delete auction"
                    onClick={() =>
                      setDeleteTarget({
                        id: auction._id,
                        name: auction.name,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Auctions Dashboard</h1>
          <p className="text-muted-foreground">
            Live auction control center and event management
          </p>
          <div className="flex items-center space-x-2 mt-4 bg-muted/30 p-3 rounded-lg border inline-flex">
            <Checkbox
              id="enforce-deposit"
              checked={enforceMinimumDeposit}
              onCheckedChange={handleDepositSettingChange}
            />
            <Label
              htmlFor="enforce-deposit"
              className="text-sm font-medium cursor-pointer"
            >
              Enforce 10% Minimum Deposit for Bidders
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "control-center" ? "default" : "outline"}
            onClick={() => setActiveTab("control-center")}
            className="bg-electric-blue hover:bg-electric-blue/90 text-white"
          >
            <Zap className="h-4 w-4 mr-2" />
            Control Center
          </Button>
          <Button asChild>
            <Link href="/admin/auctions/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Auction
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger
            value="control-center"
            className="flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-electric-blue" />
            Live Control Center
          </TabsTrigger>
          <TabsTrigger value="all">
            All Auctions
            <Badge variant="secondary" className="ml-2">
              {initialAuctions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="live">
            Live
            {liveAuctions.length > 0 && (
              <Badge className="ml-2 bg-volt-green/20 text-volt-green border-volt-green/30">
                {liveAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled
            {scheduledAuctions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {scheduledAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedAuctions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {completedAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control-center" className="mt-6">
          <LiveControlCenter />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(initialAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(liveAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(scheduledAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(completedAuctions)}
          </div>
        </TabsContent>
      </Tabs>

      {deleteTarget && (
        <DeleteAuctionDialog
          auctionId={deleteTarget.id}
          auctionName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
