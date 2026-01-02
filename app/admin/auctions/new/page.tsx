"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";

interface LotConfig {
  vehicleId: Id<"vehicles">;
  startingBid: number;
  reservePrice: number;
  buyItNowPrice?: number;
  bidIncrement: number;
}

export default function CreateAuctionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Auction Details
  const [auctionName, setAuctionName] = useState("");
  const [description, setDescription] = useState("");
  const [auctionType, setAuctionType] = useState<"live" | "timed">("live");
  const [scheduledStart, setScheduledStart] = useState("");
  const [defaultLotDuration, setDefaultLotDuration] = useState("300000"); // 5 min

  // Step 2: Vehicle Selection
  const [selectedVehicles, setSelectedVehicles] = useState<Set<Id<"vehicles">>>(new Set());

  // Step 3: Lot Configuration
  const [lotConfigs, setLotConfigs] = useState<Map<Id<"vehicles">, LotConfig>>(new Map());

  // Fetch available vehicles
  const vehicles = useQuery(
    api.vehicles.listVehicles,
    {
      status: "approved",
      limit: 100,
    }
  );

  // Mutations
  const createAuction = useMutation(api.auctions.createAuction);
  const addLotToAuction = useMutation(api.auctions.addLotToAuction);

  const handleVehicleToggle = (vehicleId: Id<"vehicles">) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
      // Remove lot config
      const newConfigs = new Map(lotConfigs);
      newConfigs.delete(vehicleId);
      setLotConfigs(newConfigs);
    } else {
      newSelected.add(vehicleId);
      // Initialize lot config
      const vehicle = vehicles?.vehicles.find((v) => v._id === vehicleId);
      if (vehicle) {
        const newConfigs = new Map(lotConfigs);
        newConfigs.set(vehicleId, {
          vehicleId,
          startingBid: vehicle.startingBid || 10000,
          reservePrice: vehicle.reservePrice || 15000,
          buyItNowPrice: vehicle.buyItNowPrice,
          bidIncrement: 1000,
        });
        setLotConfigs(newConfigs);
      }
    }
    setSelectedVehicles(newSelected);
  };

  const updateLotConfig = (vehicleId: Id<"vehicles">, field: keyof LotConfig, value: any) => {
    const newConfigs = new Map(lotConfigs);
    const config = newConfigs.get(vehicleId);
    if (config) {
      newConfigs.set(vehicleId, { ...config, [field]: value });
      setLotConfigs(newConfigs);
    }
  };

  const handleCreateAuction = async () => {
    if (!token) return;

    // Validate
    if (!auctionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter auction name",
        variant: "destructive",
      });
      return;
    }

    if (selectedVehicles.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one vehicle",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledStart) {
      toast({
        title: "Error",
        description: "Please set scheduled start time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create auction
      const auction = await createAuction({
        token,
        name: auctionName,
        description: description || undefined,
        auctionType,
        scheduledStart: new Date(scheduledStart).getTime(),
        bidIncrement: 100, // Default bid increment
      });

      // Add lots
      let lotOrder = 1;
      for (const vehicleId of selectedVehicles) {
        const config = lotConfigs.get(vehicleId);
        if (config) {
          await addLotToAuction({
            token,
            auctionId: auction.auctionId,
            vehicleId,
            lotOrder: lotOrder++,
            lotDuration: parseInt(defaultLotDuration) * 60 * 1000, // Convert minutes to milliseconds
            estimatedStartTime: undefined,
          });
        }
      }

      toast({
        title: "Success!",
        description: "Auction created successfully!",
      });
      router.push("/admin/auctions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return auctionName.trim() && scheduledStart;
    }
    if (step === 2) {
      return selectedVehicles.size > 0;
    }
    return true;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Auction</h1>
        <p className="text-gray-500 mt-1">Set up a new auction with vehicles</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                s < step
                  ? "bg-primary text-white"
                  : s === step
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-24 h-1 ${s < step ? "bg-primary" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {/* Step 1: Auction Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Auction Details</h2>

            <div>
              <Label htmlFor="auctionName">Auction Name *</Label>
              <Input
                id="auctionName"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                placeholder="Monthly EV Auction - January 2024"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Premium selection of electric vehicles..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auctionType">Auction Type</Label>
                <Select value={auctionType} onValueChange={(v: any) => setAuctionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Auction</SelectItem>
                    <SelectItem value="timed">Timed Auction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduledStart">Scheduled Start *</Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="defaultLotDuration">Default Lot Duration (ms)</Label>
              <Input
                id="defaultLotDuration"
                type="number"
                value={defaultLotDuration}
                onChange={(e) => setDefaultLotDuration(e.target.value)}
                placeholder="300000"
              />
              <p className="text-xs text-gray-500 mt-1">300000 = 5 minutes</p>
            </div>
          </div>
        )}

        {/* Step 2: Select Vehicles */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select Vehicles</h2>
            <p className="text-sm text-gray-500">
              Choose approved vehicles to include in this auction
            </p>

            {!vehicles ? (
              <p className="text-center py-8 text-gray-500">Loading vehicles...</p>
            ) : vehicles.vehicles.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No approved vehicles available
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {vehicles.vehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedVehicles.has(vehicle._id)}
                      onCheckedChange={() => handleVehicleToggle(vehicle._id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-sm text-gray-500">
                        VIN: {vehicle.vin} | Lot: {vehicle.lotNumber}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Starting: {formatCurrency(vehicle.startingBid || 0)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-600">
              Selected: {selectedVehicles.size} vehicle(s)
            </p>
          </div>
        )}

        {/* Step 3: Configure Lots */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Configure Lots</h2>
            <p className="text-sm text-gray-500">
              Set pricing and bid increments for each vehicle
            </p>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Array.from(selectedVehicles).map((vehicleId) => {
                const vehicle = vehicles?.vehicles.find((v) => v._id === vehicleId);
                const config = lotConfigs.get(vehicleId);

                if (!vehicle || !config) return null;

                return (
                  <Card key={vehicleId} className="p-4">
                    <h3 className="font-semibold mb-3">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Starting Bid</Label>
                        <Input
                          type="number"
                          value={config.startingBid}
                          onChange={(e) =>
                            updateLotConfig(vehicleId, "startingBid", parseInt(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <Label>Reserve Price</Label>
                        <Input
                          type="number"
                          value={config.reservePrice}
                          onChange={(e) =>
                            updateLotConfig(vehicleId, "reservePrice", parseInt(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <Label>Buy It Now (Optional)</Label>
                        <Input
                          type="number"
                          value={config.buyItNowPrice || ""}
                          onChange={(e) =>
                            updateLotConfig(
                              vehicleId,
                              "buyItNowPrice",
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Bid Increment</Label>
                        <Input
                          type="number"
                          value={config.bidIncrement}
                          onChange={(e) =>
                            updateLotConfig(vehicleId, "bidIncrement", parseInt(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Review & Create</h2>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Auction Details</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-600">Name:</span> {auctionName}
                </p>
                <p>
                  <span className="text-gray-600">Type:</span> {auctionType}
                </p>
                <p>
                  <span className="text-gray-600">Start:</span>{" "}
                  {new Date(scheduledStart).toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-600">Vehicles:</span> {selectedVehicles.size}
                </p>
              </div>
            </Card>

            <div className="space-y-2">
              <h3 className="font-semibold">Lots Summary</h3>
              {Array.from(selectedVehicles).map((vehicleId) => {
                const vehicle = vehicles?.vehicles.find((v) => v._id === vehicleId);
                const config = lotConfigs.get(vehicleId);

                if (!vehicle || !config) return null;

                return (
                  <div key={vehicleId} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-sm text-gray-500">Lot #{vehicle.lotNumber}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Start: {formatCurrency(config.startingBid)}</p>
                      <p className="text-gray-500">
                        Reserve: {formatCurrency(config.reservePrice)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreateAuction} disabled={loading}>
              {loading ? "Creating..." : "Create Auction"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
