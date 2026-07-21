"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Truck, MapPin, CheckCircle, Package, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShipmentTrackerProps {
  orderId: Id<"orders">;
  shipments: any[];
  isVendorOrAdmin: boolean;
  token: string;
}

export function ShipmentTracker({ orderId, shipments, isVendorOrAdmin, token }: ShipmentTrackerProps) {
  const { toast } = useToast();
  const activeShipment = shipments?.[0]; // Usually one active shipment per order
  
  const updates = useQuery(
    api.logistics.getShipmentUpdates,
    activeShipment && token ? { token, shipmentId: activeShipment._id } : "skip"
  );

  const addUpdate = useMutation(api.logistics.addShipmentUpdate);
  const addTracking = useMutation(api.orders.addShippingTracking);

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("in_transit");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isInitOpen, setIsInitOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  
  if (!activeShipment) {
    if (!isVendorOrAdmin) return null;
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Truck className="w-12 h-12 text-slate-300" />
          <div>
            <h3 className="font-semibold text-lg">No Shipping Data</h3>
            <p className="text-muted-foreground text-sm">Create a shipment to start tracking.</p>
          </div>
          <Dialog open={isInitOpen} onOpenChange={setIsInitOpen}>
            <DialogTrigger asChild>
              <Button>Add Tracking Details</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Shipping Details</DialogTitle>
                <DialogDescription>Input the carrier and tracking number.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Carrier / Shipping Line</Label>
                  <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Maersk, Grimaldi" />
                </div>
                <div className="space-y-2">
                  <Label>Tracking / Container Number</Label>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="123456789" />
                </div>
                <Button 
                  className="w-full" 
                  disabled={isSubmitting || !carrier || !trackingNumber}
                  onClick={async () => {
                    try {
                      setIsSubmitting(true);
                      await addTracking({ token, orderId, carrier, trackingNumber });
                      toast({ title: "Success", description: "Tracking added" });
                      setIsInitOpen(false);
                    } catch(e:any) {
                      toast({ title: "Error", description: e.message, variant: "destructive" });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  Create Shipment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-primary" />
            Shipment Tracking
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Carrier: <span className="font-medium text-foreground">{activeShipment.shippingLine}</span> | Tracking: <span className="font-mono text-foreground">{activeShipment.trackingNumber}</span>
          </p>
        </div>
        <Badge variant={activeShipment.status === "delivered" ? "default" : "secondary"}>
          {activeShipment.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>

      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-8 pb-4">
        {updates?.map((update: any, idx: number) => (
          <div key={update._id} className="relative">
            <span className="absolute -left-[35px] bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 ring-4 ring-white dark:ring-slate-950">
              {update.status === "delivered" ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : update.status === "cleared" ? (
                <Package className="w-4 h-4 text-brand-gold" />
              ) : (
                <MapPin className="w-4 h-4 text-brand-primary" />
              )}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm capitalize">{update.status.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">{format(update.timestamp, "PPP 'at' p")}</span>
              <p className="text-sm mt-2">{update.description}</p>
              {update.location && (
                <span className="text-xs text-slate-500 mt-1 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> {update.location}
                </span>
              )}
            </div>
          </div>
        ))}
        {updates?.length === 0 && (
          <p className="text-muted-foreground text-sm">No updates posted yet.</p>
        )}
      </div>

      {isVendorOrAdmin && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-4">
              <Clock className="w-4 h-4 mr-2" />
              Post New Update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Shipment Milestone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Milestone Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="at_customs">At Customs</SelectItem>
                    <SelectItem value="cleared">Cleared Customs</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Location (Optional)</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos Port" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vehicle has arrived at the destination port and is awaiting clearance." />
              </div>
              <Button 
                className="w-full" 
                disabled={isSubmitting || !description}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await addUpdate({
                      token,
                      shipmentId: activeShipment._id,
                      status,
                      location,
                      description
                    });
                    toast({ title: "Success", description: "Update posted successfully" });
                    setIsOpen(false);
                    setDescription("");
                    setLocation("");
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Post Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
