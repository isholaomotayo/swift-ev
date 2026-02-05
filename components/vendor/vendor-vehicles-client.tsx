"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface VendorVehiclesClientProps {
  initialVehicles: any[];
}

export function VendorVehiclesClient({ initialVehicles }: VendorVehiclesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      pending_approval: {
        variant: "secondary",
        label: "Pending Approval",
      },
      approved: { variant: "default", label: "Approved" },
      in_auction: { variant: "default", label: "In Auction" },
      sold: { variant: "default", label: "Sold" },
      unsold: { variant: "outline", label: "Unsold" },
      withdrawn: { variant: "destructive", label: "Withdrawn" },
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
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_auction">In Auction</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="unsold">Unsold</SelectItem>
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
              {filteredVehicles.map((vehicle) => (
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
                      ? formatCurrency(vehicle.auctionLot.currentBid)
                      : vehicle.startingBid
                      ? formatCurrency(vehicle.startingBid)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(vehicle.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/vehicles/${vehicle._id}`}>View</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/vendor/vehicles/${vehicle._id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

