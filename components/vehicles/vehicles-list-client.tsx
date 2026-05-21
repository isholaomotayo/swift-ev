"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { VehicleCard } from "@/components/autoexports/vehicle-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { MakeModelSelect } from "@/components/vehicles/make-model-select";

const CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "salvage", label: "Salvage" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "ending_soon", label: "Ending Soon" },
] as const;

interface VehiclesListClientProps {
  initialFilterOptions: any;
  initialVehicleData: any;
}

export function VehiclesListClient({
  initialVehicleData,
}: VehiclesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [yearRange, setYearRange] = useState<[number, number]>([2018, 2025]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50_000_000]);
  const [batteryHealthMin, setBatteryHealthMin] = useState<number>(70);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") ?? "");
  }, [searchParams]);

  const queryParams = useMemo(
    () => ({
      make: selectedMake || undefined,
      model: selectedModel || undefined,
      yearMin: yearRange[0],
      yearMax: yearRange[1],
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      batteryHealthMin,
      condition: selectedConditions.length === 1 ? (selectedConditions[0] as any) : undefined,
      page: currentPage,
      limit: 20,
      sortBy: sortBy as any,
    }),
    [
      selectedMake,
      selectedModel,
      yearRange,
      priceRange,
      batteryHealthMin,
      selectedConditions,
      currentPage,
      sortBy,
    ]
  );

  const vehicleData = useQuery(api.vehicles.listVehicles, queryParams) ?? initialVehicleData;
  useQuery(api.vehicles.getFilterOptions, {});

  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedModel("");
    setCurrentPage(0);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setCurrentPage(0);
  };

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
    setCurrentPage(0);
  };

  const resetFilters = () => {
    setSelectedMake("");
    setSelectedModel("");
    setYearRange([2018, 2025]);
    setPriceRange([0, 50_000_000]);
    setBatteryHealthMin(70);
    setSelectedConditions([]);
    setSearchTerm("");
    setSortBy("newest");
    setCurrentPage(0);
  };

  const activeFilterCount =
    (selectedMake ? 1 : 0) +
    (selectedModel ? 1 : 0) +
    selectedConditions.length +
    (yearRange[0] !== 2018 || yearRange[1] !== 2025 ? 1 : 0) +
    (priceRange[0] !== 0 || priceRange[1] !== 50_000_000 ? 1 : 0) +
    (batteryHealthMin !== 70 ? 1 : 0);

  const filteredVehicles = useMemo(() => {
    if (!vehicleData?.vehicles) return [];
    if (!searchTerm.trim()) return vehicleData.vehicles;

    const searchLower = searchTerm.toLowerCase();
    return vehicleData.vehicles.filter((vehicle: any) => {
      const make = vehicle.make?.toLowerCase() || "";
      const model = vehicle.model?.toLowerCase() || "";
      const vin = vehicle.vin?.toLowerCase() || "";
      const lotNumber = vehicle.lotNumber?.toLowerCase() || "";
      return (
        make.includes(searchLower) ||
        model.includes(searchLower) ||
        vin.includes(searchLower) ||
        lotNumber.includes(searchLower)
      );
    });
  }, [vehicleData?.vehicles, searchTerm]);

  const loading = vehicleData === undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1 space-y-6">
        <div className="bg-background rounded-lg border p-6 space-y-6 sticky top-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-electric-blue"
              >
                Reset ({activeFilterCount})
              </Button>
            )}
          </div>

          <Separator />

          <MakeModelSelect
            className="grid-cols-1 sm:grid-cols-1"
            make={selectedMake}
            model={selectedModel}
            onMakeChange={handleMakeChange}
            onModelChange={handleModelChange}
          />

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Year</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {yearRange[0]} - {yearRange[1]}
              </span>
            </div>
            <Slider
              min={2018}
              max={2025}
              step={1}
              value={yearRange}
              onValueChange={(value) => {
                setYearRange(value as [number, number]);
                setCurrentPage(0);
              }}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Price (NGN)</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {(priceRange[0] / 1_000_000).toFixed(1)}M - {(priceRange[1] / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <Slider
              min={0}
              max={50_000_000}
              step={1_000_000}
              value={priceRange}
              onValueChange={(value) => {
                setPriceRange(value as [number, number]);
                setCurrentPage(0);
              }}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Min Battery Health</Label>
              <span className="text-xs text-muted-foreground font-mono">
                {batteryHealthMin}%+
              </span>
            </div>
            <Slider
              min={50}
              max={100}
              step={5}
              value={[batteryHealthMin]}
              onValueChange={(value) => {
                setBatteryHealthMin(value[0]);
                setCurrentPage(0);
              }}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Condition</Label>
            <div className="space-y-2">
              {CONDITIONS.map((condition) => (
                <div key={condition.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`condition-${condition.value}`}
                    checked={selectedConditions.includes(condition.value)}
                    onCheckedChange={() => handleConditionToggle(condition.value)}
                  />
                  <label
                    htmlFor={`condition-${condition.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {condition.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-background rounded-lg border p-4">
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {vehicleData && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredVehicles.length} of {vehicleData.pagination.total} vehicles
            </p>
          </div>
        )}

        {loading || vehicleData === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-96 bg-background rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-12 bg-background rounded-lg border">
            <p className="text-muted-foreground mb-4">
              No vehicles found matching your criteria
            </p>
            <Button onClick={resetFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle: any) => (
                <VehicleCard
                  key={vehicle._id}
                  vehicle={vehicle}
                  auctionLot={vehicle.auctionLot}
                  onBidClick={() => {
                    router.push(`/vehicles/${vehicle._id}`);
                  }}
                  onWatchlistToggle={() => {
                    console.log("Toggle watchlist for", vehicle._id);
                  }}
                  isWatchlisted={false}
                />
              ))}
            </div>

            {vehicleData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {[...Array(vehicleData.pagination.totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                      className="w-10"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(vehicleData.pagination.totalPages - 1, p + 1)
                    )
                  }
                  disabled={!vehicleData.pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
