"use client";

import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
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
import { formatCurrency, formatLotNumber } from "@/lib/utils";

export default function AdminVehiclesPage() {
  const convex = useConvex();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehiclesData, setVehiclesData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch once on mount and when filters change (no real-time subscription)
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    convex.query(api.vehicles.listVehicles, {
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      page: 0,
      limit: 50,
    })
      .then((data) => {
        if (mounted) {
          setVehiclesData(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch vehicles:", error);
        if (mounted) {
          setVehiclesData(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [convex, statusFilter]);

  const filteredVehicles = vehiclesData?.vehicles?.filter((v: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      v.make.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.vin.toLowerCase().includes(search) ||
      v.lotNumber.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending_inspection: { variant: "secondary", label: "Pending Inspection" },
      ready_for_auction: { variant: "default", label: "Ready for Auction" },
      in_auction: { variant: "default", label: "In Auction" },
      sold: { variant: "default", label: "Sold" },
      payment_pending: { variant: "secondary", label: "Payment Pending" },
      in_transit: { variant: "default", label: "In Transit" },
      delivered: { variant: "default", label: "Delivered" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const config = variants[status] || { variant: "secondary", label: status };

    return (
      <Badge variant={config.variant as any} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage all vehicles in the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/vehicles/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-background border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by make, model, VIN, or lot number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
              <SelectItem value="ready_for_auction">Ready for Auction</SelectItem>
              <SelectItem value="in_auction">In Auction</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      {vehiclesData && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredVehicles?.length || 0} of {vehiclesData.pagination.total} vehicles
        </div>
      )}

      {/* Table */}
      <div className="bg-background border rounded-lg overflow-hidden">
        {loading || vehiclesData === null ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading vehicles...</p>
          </div>
        ) : filteredVehicles && filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No vehicles found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Battery Health</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles?.map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell className="font-mono">
                    {formatLotNumber(vehicle.lotNumber)}
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
                  <TableCell className="font-mono text-sm">
                    {vehicle.vin.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  <TableCell className="font-mono">
                    {vehicle.auctionLot
                      ? formatCurrency(vehicle.auctionLot.currentBid)
                      : vehicle.startingBid
                      ? formatCurrency(vehicle.startingBid)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {vehicle.batteryHealthPercent || "N/A"}
                      {vehicle.batteryHealthPercent && "%"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/vehicles/${vehicle._id}`}>View</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/vehicles/${vehicle._id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
