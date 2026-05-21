"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VehicleApprovalModal } from "@/components/admin/vehicles/vehicle-approval-modal";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatCurrency, formatLotNumber } from "@/lib/utils";

type ApprovalVehicle = Doc<"vehicles">;

interface VehicleApprovalsClientProps {
  initialVehicles: ApprovalVehicle[];
  totalCount: number;
}

export function VehicleApprovalsClient({
  initialVehicles,
  totalCount,
}: VehicleApprovalsClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<ApprovalVehicle | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return vehicles;

    const search = searchTerm.toLowerCase();
    return vehicles.filter((vehicle) => {
      const vin = vehicle.vin?.toLowerCase() ?? "";
      const lotNumber = vehicle.lotNumber?.toLowerCase() ?? "";

      return (
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search) ||
        vin.includes(search) ||
        lotNumber.includes(search)
      );
    });
  }, [vehicles, searchTerm]);

  const handleApproved = (vehicleId: string) => {
    setVehicles((currentVehicles) =>
      currentVehicles.filter((vehicle) => vehicle._id !== vehicleId)
    );
  };

  const handleRejected = (vehicleId: string) => {
    setVehicles((currentVehicles) =>
      currentVehicles.filter((vehicle) => vehicle._id !== vehicleId)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Vehicle Approvals</h1>
        <p className="text-muted-foreground">
          Review vendor submissions before they can be assigned to auctions.
        </p>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search pending approvals by make, model, VIN, or lot number..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredVehicles.length} of {totalCount} pending approvals
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No vehicles are pending approval.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starting Bid</TableHead>
                <TableHead>Battery Health</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
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
                        {vehicle.currentLocation?.city}, {vehicle.currentLocation?.country}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {vehicle.vin ? `${vehicle.vin.slice(0, 8)}...` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pending Approval</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {vehicle.startingBid ? formatCurrency(vehicle.startingBid) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {vehicle.batteryHealthPercent || "N/A"}
                      {vehicle.batteryHealthPercent && "%"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setIsApprovalModalOpen(true);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <VehicleApprovalModal
        vehicle={selectedVehicle}
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApproved={handleApproved}
        onRejected={handleRejected}
      />
    </div>
  );
}
