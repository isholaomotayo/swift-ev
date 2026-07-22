"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

interface VendorVehiclesClientProps {
  initialVehicles: any[];
}

export function VendorVehiclesClient({ initialVehicles }: VendorVehiclesClientProps) {
  const { user, token } = useAuth();
  const preferredCurrency = user?.preferredCurrency ?? "NGN";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [withdrawingVehicle, setWithdrawingVehicle] = useState<any | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  const submitVehicle = useMutation(api.vehicles.submitVehicleForApproval);
  const withdrawVehicleMutation = useMutation(api.vehicles.withdrawVehicle);

  const handleSubmit = async (vehicleId: any) => {
    if (!token) return;
    try {
      await submitVehicle({ token, vehicleId });
      toast({
        title: "Success",
        description: "Vehicle submitted for approval",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit vehicle",
        variant: "destructive",
      });
    }
  };

  const handleWithdraw = async () => {
    if (!token || !withdrawingVehicle) return;
    try {
      setIsWithdrawing(true);
      await withdrawVehicleMutation({ token, vehicleId: withdrawingVehicle._id });
      toast({
        title: "Vehicle Withdrawn",
        description: `${withdrawingVehicle.year} ${withdrawingVehicle.make} ${withdrawingVehicle.model} has been withdrawn.`,
      });
      setWithdrawingVehicle(null);
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw vehicle",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const editableStatuses = [
    "draft",
    "pending_inspection",
    "pending_approval",
    "approved",
    "ready_for_auction",
    "scheduled",
    "unsold",
    "rejected",
  ];

  const withdrawableStatuses = [
    "draft",
    "pending_inspection",
    "pending_approval",
    "approved",
    "ready_for_auction",
    "scheduled",
    "unsold",
    "rejected",
  ];

  const reapprovalStatuses = ["approved", "ready_for_auction", "scheduled", "unsold"];

  // Apply filters
  const filteredVehicles = useMemo(() => {
    return initialVehicles.filter((vehicle) => {
      const matchesSearch = searchQuery
        ? `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.lotNumber}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;

      const matchesStatus =
        statusFilter === "all" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialVehicles, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      pending_approval: {
        variant: "secondary",
        label: "Pending Approval",
      },
      approved: { variant: "default", label: "Approved" },
      scheduled: { variant: "default", label: "Scheduled" },
      in_auction: { variant: "default", label: "In Auction" },
      payment_pending: { variant: "secondary", label: "Payment Pending" },
      sold: { variant: "default", label: "Sold" },
      in_transit: { variant: "default", label: "In Transit" },
      delivered: { variant: "default", label: "Delivered" },
      unsold: { variant: "outline", label: "Unsold" },
      rejected: { variant: "destructive", label: "Rejected" },
      withdrawn: { variant: "destructive", label: "Withdrawn" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const config =
      variants[status] || { variant: "secondary", label: status };

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your vehicle listings
          </p>
        </div>
        <Button asChild>
          <Link href="/vendor/vehicles/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Vehicle
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by make, model, year, or lot number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_auction">In Auction</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="unsold">Unsold</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredVehicles.length} of {initialVehicles.length} vehicles
      </div>

      {/* Table */}
      <Card>
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No vehicles found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const canEdit = editableStatuses.includes(vehicle.status);
                const canWithdraw = withdrawableStatuses.includes(vehicle.status);
                const requiresReapproval = reapprovalStatuses.includes(vehicle.status);
                const isLiveAuction = vehicle.status === "in_auction";
                const isSoldOrPostAvailable = [
                  "payment_pending",
                  "sold",
                  "in_transit",
                  "delivered",
                  "cancelled",
                ].includes(vehicle.status);

                return (
                  <TableRow key={vehicle._id}>
                    <TableCell className="font-mono">
                      {vehicle.lotNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.batteryCapacity} kWh • {vehicle.estimatedRange} km
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell className="font-mono">
                      {vehicle.auctionLot
                        ? formatCurrency(vehicle.auctionLot.currentBid, { currency: preferredCurrency })
                        : vehicle.startingBid
                        ? formatCurrency(vehicle.startingBid, { currency: preferredCurrency })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(vehicle.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vehicle.status === "draft" && (
                          <Button variant="default" size="sm" onClick={() => handleSubmit(vehicle._id)}>
                            Submit
                          </Button>
                        )}

                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/vehicles/${vehicle._id}`}>View</Link>
                        </Button>

                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title={requiresReapproval ? "Editing this vehicle will require admin re-approval" : undefined}
                          >
                            <Link href={`/vendor/vehicles/${vehicle._id}/edit`}>Edit</Link>
                          </Button>
                        )}

                        {canWithdraw && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setWithdrawingVehicle(vehicle)}
                          >
                            Withdraw
                          </Button>
                        )}

                        {isLiveAuction && (
                          <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded dark:bg-amber-950/30 dark:text-amber-400">
                            Locked (Live Auction)
                          </span>
                        )}

                        {isSoldOrPostAvailable && (
                          <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-secondary/50 rounded">
                            Locked (Final/Sold)
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Withdraw Confirmation Modal */}
      <Dialog open={!!withdrawingVehicle} onOpenChange={(open) => !open && setWithdrawingVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Vehicle Withdrawal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw{" "}
              <span className="font-semibold text-foreground">
                {withdrawingVehicle?.year} {withdrawingVehicle?.make} {withdrawingVehicle?.model}
              </span>{" "}
              (Lot #{withdrawingVehicle?.lotNumber})?
              <br />
              Withdrawing will remove this vehicle from all active listings and scheduled auctions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawingVehicle(null)}
              disabled={isWithdrawing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? "Withdrawing..." : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
