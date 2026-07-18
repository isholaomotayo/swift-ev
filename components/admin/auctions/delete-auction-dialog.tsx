"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface DeleteAuctionDialogProps {
  auctionId: Id<"auctions">;
  auctionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteAuctionDialog({
  auctionId,
  auctionName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAuctionDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [confirmInput, setConfirmInput] = useState("");
  const [resetVehicleStatus, setResetVehicleStatus] = useState<
    "approved" | "ready_for_auction" | "draft"
  >("approved");
  const [isDeleting, setIsDeleting] = useState(false);

  const preview = useQuery(
    api.auctions.getAuctionDeletePreview,
    token && open ? { token, auctionId } : "skip"
  );

  const deleteAuctionMutation = useMutation(api.auctions.deleteAuction);

  const handleDelete = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    if (confirmInput.trim() !== auctionName.trim()) {
      toast({
        title: "Confirmation mismatch",
        description: "Please type the exact auction name to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteAuctionMutation({
        token,
        auctionId,
        resetVehicleStatusTo: resetVehicleStatus,
      });

      toast({
        title: "Auction deleted",
        description: res.message,
      });

      onOpenChange(false);
      if (onDeleted) {
        onDeleted();
      }
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error?.message || "Failed to delete auction",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmed = confirmInput.trim() === auctionName.trim();
  const canDelete = preview ? preview.canDelete : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error-red">
            <Trash2 className="h-5 w-5" />
            Safely Delete Auction
          </DialogTitle>
          <DialogDescription>
            This action will safely remove the auction and all associated test data (lots, bids, max bids).
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Analyzing auction data...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {!preview.canDelete ? (
              <Alert variant="destructive" className="bg-error-red/10 border-error-red/30 text-error-red">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Cannot Delete Auction</AlertTitle>
                <AlertDescription className="text-xs space-y-1 mt-1">
                  <p>
                    This auction cannot be deleted because <strong>{preview.blockingOrders.length}</strong> lot(s) resulted in active or processed financial orders:
                  </p>
                  <ul className="list-disc list-inside font-mono text-[11px] max-h-24 overflow-y-auto">
                    {preview.blockingOrders.map((o) => (
                      <li key={o.orderId}>
                        Order #{o.orderNumber} ({o.status})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    Cancel or process these orders before attempting to delete this auction.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-muted/50 border-border">
                <AlertTriangle className="h-4 w-4 text-warning-amber" />
                <AlertTitle className="text-sm font-semibold">Impact Summary</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-foreground">{preview.lotCount}</span> Lots to be deleted
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{preview.bidsCount}</span> Active/historical bids to be deleted
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{preview.maxBidsCount}</span> Max bids to be deleted
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{preview.vehicleCount}</span> Vehicles to be reset
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {preview.canDelete && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-status-select" className="text-xs font-medium">
                    Reset Linked Vehicles Status To
                  </Label>
                  <Select
                    value={resetVehicleStatus}
                    onValueChange={(val) =>
                      setResetVehicleStatus(
                        val as "approved" | "ready_for_auction" | "draft"
                      )
                    }
                  >
                    <SelectTrigger id="vehicle-status-select">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved (Available for re-listing or Buy-It-Now)</SelectItem>
                      <SelectItem value="ready_for_auction">Ready for Auction</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-input" className="text-xs font-medium">
                    To confirm, type <span className="font-semibold text-foreground">{auctionName}</span> below:
                  </Label>
                  <Input
                    id="confirm-input"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={auctionName}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || !isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Confirm Safe Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
