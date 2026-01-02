"use client";

import { useQuery } from "convex/react";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
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
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function VendorVehiclesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get all vehicles and filter to vendor's own
  const vehiclesData = useQuery(
    api.vehicles.listVehicles,
    user ? { page: 0, limit: 100 } : "skip"
  );

  const myVehicles = vehiclesData?.vehicles.filter(
    (v) => v.sellerId === user?.id
  ) || [];

  // Apply filters
  const filteredVehicles = myVehicles.filter((vehicle) => {
    const matchesSearch = searchQuery
      ? `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.lotNumber}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    const matchesStatus =
      statusFilter === "all" ? true : vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending_approval: {
        className: "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
        label: "Pending Approval",
      },
      approved: {
        className: "bg-electric-blue/20 text-electric-blue border-electric-blue/30",
        label: "Approved",
      },
      in_auction: {
        className: "bg-volt-green/20 text-volt-green border-volt-green/30",
        label: "In Auction",
      },
      sold: {
        className: "bg-volt-green/20 text-volt-green border-volt-green/30",
        label: "Sold",
      },
      no_sale: {
        className: "bg-muted text-muted-foreground",
        label: "No Sale",
      },
      rejected: {
        className: "bg-error-red/20 text-error-red border-error-red/30",
        label: "Rejected",
      },
    };

    const config = variants[status] || {
      className: "bg-muted text-muted-foreground",
      label: status,
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Calculate stats
  const stats = {
    total: myVehicles.length,
    pending: myVehicles.filter((v) => v.status === "pending_approval").length,
    approved: myVehicles.filter((v) => v.status === "approved").length,
    inAuction: myVehicles.filter((v) => v.status === "in_auction").length,
    sold: myVehicles.filter((v) => v.status === "sold").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your vehicle listings and track their status
          </p>
        </div>
        <Button asChild className="bg-volt-green hover:bg-volt-green/90">
          <Link href="/vendor/vehicles/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Vehicle
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-warning-amber">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Approved</p>
          <p className="text-2xl font-bold text-electric-blue">{stats.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">In Auction</p>
          <p className="text-2xl font-bold text-volt-green">{stats.inAuction}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Sold</p>
          <p className="text-2xl font-bold text-volt-green">{stats.sold}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles (make, model, lot number...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_auction">In Auction</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="no_sale">No Sale</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Vehicles Table */}
      <Card>
        {vehiclesData === undefined ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {myVehicles.length === 0 ? (
              <div>
                <p className="mb-4">No vehicles uploaded yet</p>
                <Button asChild>
                  <Link href="/vendor/vehicles/upload">Upload Your First Vehicle</Link>
                </Button>
              </div>
            ) : (
              <p>No vehicles match your search criteria</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Battery Health</TableHead>
                <TableHead>Starting Bid</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        VIN: {vehicle.vin}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{vehicle.lotNumber}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        (vehicle.batteryHealthPercent ?? 0) >= 95
                          ? "text-volt-green"
                          : (vehicle.batteryHealthPercent ?? 0) >= 85
                          ? "text-electric-blue"
                          : "text-warning-amber"
                      }`}
                    >
                      {vehicle.batteryHealthPercent}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {vehicle.startingBid ? formatCurrency(vehicle.startingBid) : "—"}
                  </TableCell>
                  <TableCell>
                    {vehicle.auctionLot?.currentBid ? (
                      <div>
                        <p className="font-medium">
                          {formatCurrency(vehicle.auctionLot.currentBid)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.auctionLot.bidCount}{" "}
                          {vehicle.auctionLot.bidCount === 1 ? "bid" : "bids"}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(vehicle._creationTime, "PP")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/vehicles/${vehicle._id}`}>View</Link>
                      </Button>
                      {vehicle.status === "pending_approval" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/vendor/vehicles/${vehicle._id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Status Guide */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">Status Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-warning-amber mb-1">Pending Approval</p>
            <p className="text-muted-foreground">
              Your vehicle is being reviewed by our admin team
            </p>
          </div>
          <div>
            <p className="font-medium text-electric-blue mb-1">Approved</p>
            <p className="text-muted-foreground">
              Vehicle approved and ready to be added to an auction
            </p>
          </div>
          <div>
            <p className="font-medium text-volt-green mb-1">In Auction</p>
            <p className="text-muted-foreground">
              Currently listed in a live auction and accepting bids
            </p>
          </div>
          <div>
            <p className="font-medium text-volt-green mb-1">Sold</p>
            <p className="text-muted-foreground">
              Vehicle sold at auction - payment processing
            </p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground mb-1">No Sale</p>
            <p className="text-muted-foreground">
              Reserve price not met - you can relist
            </p>
          </div>
          <div>
            <p className="font-medium text-error-red mb-1">Rejected</p>
            <p className="text-muted-foreground">
              Vehicle did not meet listing requirements - contact support
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
