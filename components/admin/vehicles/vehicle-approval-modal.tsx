"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getMutationErrorMessage } from "@/lib/auth-errors";
import { formatCurrency, formatLotNumber } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ApprovalVehicle = Doc<"vehicles">;

interface VehicleApprovalModalProps {
  vehicle: ApprovalVehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved: (vehicleId: string) => void;
  onRejected?: (vehicleId: string) => void;
}

export function VehicleApprovalModal({
  vehicle,
  isOpen,
  onClose,
  onApproved,
  onRejected,
}: VehicleApprovalModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const approveVehicle = useMutation(api.vehicles.approveVehicle);
  const rejectVehicle = useMutation(api.vehicles.rejectVehicle);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    if (!token || !vehicle?._id) {
      toast({
        title: "Approval Failed",
        description: "You must be logged in as an admin to approve vehicles.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsApproving(true);
      await approveVehicle({
        token,
        vehicleId: vehicle._id as Id<"vehicles">,
      });

      toast({
        title: "Vehicle Approved",
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} is now approved.`,
      });
      onApproved(vehicle._id);
      onClose();
    } catch (error) {
      const message = getMutationErrorMessage(
        error,
        "There was an error approving this vehicle. Please try again."
      );
      toast({
        title: "Approval Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!token || !vehicle?._id) {
      toast({
        title: "Rejection Failed",
        description: "You must be logged in as an admin to reject vehicles.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRejecting(true);
      await rejectVehicle({
        token,
        vehicleId: vehicle._id as Id<"vehicles">,
        reason: rejectionReason || undefined,
      });

      toast({
        title: "Vehicle Rejected",
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} was moved to rejected.`,
      });
      onRejected?.(vehicle._id);
      onClose();
    } catch (error) {
      const message = getMutationErrorMessage(
        error,
        "There was an error rejecting this vehicle. Please try again."
      );
      toast({
        title: "Rejection Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Vehicle</DialogTitle>
          <DialogDescription>
            Review this pending submission before making it available for auction assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-lg font-semibold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-muted-foreground">
              Lot {formatLotNumber(vehicle.lotNumber)}
              {vehicle.vin ? ` • VIN ${vehicle.vin}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Location</Label>
              <p className="font-medium">
                {vehicle.currentLocation?.city}, {vehicle.currentLocation?.country}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Condition</Label>
              <p className="font-medium capitalize">{vehicle.condition?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Starting Bid</Label>
              <p className="font-medium">
                {vehicle.startingBid ? formatCurrency(vehicle.startingBid) : "—"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Reserve Price</Label>
              <p className="font-medium">
                {vehicle.reservePrice ? formatCurrency(vehicle.reservePrice) : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Approving this vehicle changes its status from Pending Approval to Approved. It will
            become Ready for Auction only after it is added to an auction.
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={3}
              placeholder="Optional internal reason for rejection"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApproving || isRejecting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isApproving || isRejecting}>
            {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
