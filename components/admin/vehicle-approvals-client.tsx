"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  token: string;
}

export function VehicleApprovalsClient({
  initialVehicles,
  totalCount,
  token,
}: VehicleApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<"pending_approval" | "rejected">("pending_approval");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<ApprovalVehicle | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Dynamic real-time queries for both pending and rejected vehicles
  const pendingData = useQuery(api.vehicles.listVehiclesForAdmin, {
    token,
    status: "pending_approval",
    limit: 50,
  });

  const rejectedData = useQuery(api.vehicles.listVehiclesForAdmin, {
    token,
    status: "rejected",
    limit: 50,
  });

  const pendingVehicles = pendingData?.vehicles ?? initialVehicles;
  const pendingTotal = pendingData?.pagination?.total ?? totalCount;

  const rejectedVehicles = rejectedData?.vehicles ?? [];
  const rejectedTotal = rejectedData?.pagination?.total ?? 0;

  const currentVehicles = activeTab === "pending_approval" ? pendingVehicles : rejectedVehicles;
  const currentTotal = activeTab === "pending_approval" ? pendingTotal : rejectedTotal;

  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return currentVehicles;

    const search = searchTerm.toLowerCase();
    return currentVehicles.filter((vehicle) => {
      const vin = vehicle.vin?.toLowerCase() ?? "";
      const lotNumber = vehicle.lotNumber?.toLowerCase() ?? "";

      return (
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search) ||
        vin.includes(search) ||
        lotNumber.includes(search)
      );
    });
  }, [currentVehicles, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Vehicle Approvals</h1>
        <p className="text-muted-foreground">
          Review vendor submissions before they can be assigned to auctions.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "pending_approval" | "rejected");
            setSearchTerm("");
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="pending_approval" className="rounded-md">
              Pending Approvals
              {pendingTotal > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {pendingTotal}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-md">
              Rejected
              {rejectedTotal > 0 && (
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {rejectedTotal}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={
              activeTab === "pending_approval"
                ? "Search pending approvals by make, model, VIN, or lot number..."
                : "Search rejected vehicles by make, model, VIN, or lot number..."
            }
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredVehicles.length} of {currentTotal} {activeTab === "pending_approval" ? "pending approvals" : "rejected vehicles"}
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {activeTab === "pending_approval"
              ? "No vehicles are pending approval."
              : "No rejected vehicles found."}
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
                    {vehicle.status === "rejected" ? (
                      <Badge variant="destructive">Rejected</Badge>
                    ) : (
                      <Badge variant="secondary">Pending Approval</Badge>
                    )}
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
                      variant={vehicle.status === "rejected" ? "outline" : "default"}
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setIsApprovalModalOpen(true);
                      }}
                    >
                      {vehicle.status === "rejected" ? "Review" : "Review"}
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
        onApproved={() => setSelectedVehicle(null)}
        onRejected={() => setSelectedVehicle(null)}
      />
    </div>
  );
}
