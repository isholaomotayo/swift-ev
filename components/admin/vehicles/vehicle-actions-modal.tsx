"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Car, Battery, MapPin, Gavel, FileText, ImageIcon, X, Upload } from "lucide-react";
import { formatCurrency, formatLotNumber } from "@/lib/utils";
import { BATTERY_TYPES, CHARGING_TYPES, CONDITION_OPTIONS, VEHICLE_MAKES } from "@/lib/constants";
import { ImageGallery } from "@/components/autoexports/image-gallery";

interface VehicleActionsModalProps {
    vehicle: any;
    mode: "view" | "edit";
    isOpen: boolean;
    onClose: () => void;
}

export function VehicleActionsModal({
    vehicle,
    mode,
    isOpen,
    onClose,
}: VehicleActionsModalProps) {
    const { toast } = useToast();
    const updateVehicle = useMutation(api.vehicles.updateVehicle);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("details");

    // Form State
    const [formData, setFormData] = useState<any>({});

    // Image State for Edit Mode
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [newImageInput, setNewImageInput] = useState("");

    // Initialize form data when vehicle changes
    useEffect(() => {
        if (vehicle) {
            setFormData({
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                vin: vehicle.vin,
                lotNumber: vehicle.lotNumber,
                odometer: vehicle.odometer,
                exteriorColor: vehicle.exteriorColor,
                interiorColor: vehicle.interiorColor,
                batteryCapacity: vehicle.batteryCapacity,
                batteryHealthPercent: vehicle.batteryHealthPercent,
                estimatedRange: vehicle.estimatedRange,
                batteryType: vehicle.batteryType,
                chargingType: vehicle.chargingType || [],
                motorPower: vehicle.motorPower,
                condition: vehicle.condition,
                damageDescription: vehicle.damageDescription,
                startingBid: vehicle.startingBid,
                reservePrice: vehicle.reservePrice,
                buyItNowPrice: vehicle.buyItNowPrice,
                locationCity: vehicle.currentLocation?.city,
                locationState: vehicle.currentLocation?.state, // Assuming state might be added or just placeholder
                locationCountry: vehicle.currentLocation?.country,
                status: vehicle.status,
            });
            // Extract existing image URLs
            if (vehicle.images) {
                setImageUrls(vehicle.images.map((img: any) => img.url));
            } else {
                setImageUrls([]);
            }
        }
    }, [vehicle]);

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleAddImage = () => {
        if (newImageInput) {
            setImageUrls(prev => [...prev, newImageInput]);
            setNewImageInput("");
        }
    }

    const handleRemoveImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // In a real app we'd upload to storage. For now we use the placeholder logic.
            const urls = files.map(() => `https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop`);
            setImageUrls(prev => [...prev, ...urls]);
        }
    };

    const handleSave = async () => {
        const token = localStorage.getItem("autoexports_token");
        if (!token) {
            toast({
                title: "Error",
                description: "You must be logged in to update vehicles",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            await updateVehicle({
                token,
                vehicleId: vehicle._id as Id<"vehicles">,
                updates: {
                    ...formData,
                    // Map flat location fields back to object if needed, or update mutation to handle flat fields?
                    // The mutation expects a currentLocation object.
                    currentLocation: {
                        facility: vehicle.currentLocation?.facility || "Default Facility",
                        city: formData.locationCity,
                        country: formData.locationCountry,
                    },
                    // Ensure numeric fields are numbers
                    year: Number(formData.year),
                    odometer: Number(formData.odometer),
                    batteryCapacity: Number(formData.batteryCapacity),
                    batteryHealthPercent: Number(formData.batteryHealthPercent),
                    estimatedRange: Number(formData.estimatedRange),
                    motorPower: Number(formData.motorPower),
                    startingBid: Number(formData.startingBid),
                    reservePrice: Number(formData.reservePrice),
                    buyItNowPrice: formData.buyItNowPrice ? Number(formData.buyItNowPrice) : undefined,
                    imageUrls: imageUrls,
                },
            });

            toast({
                title: "Vehicle Updated",
                description: "The vehicle details have been successfully updated.",
            });
            onClose();
        } catch (error) {
            console.error("Failed to update vehicle:", error);
            toast({
                title: "Update Failed",
                description: "There was an error updating the vehicle. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "approved":
            case "active":
            case "live":
            case "in_auction":
                return "bg-volt-green text-black border-volt-green";
            case "pending_approval":
            case "pending_inspection":
                return "bg-amber-500 text-white border-amber-500";
            case "ready_for_auction":
            case "scheduled":
                return "bg-electric-blue text-white border-electric-blue";
            case "sold":
                return "bg-green-600 text-white border-green-600";
            case "cancelled":
            case "withdrawn":
                return "bg-red-500 text-white border-red-500";
            case "payment_pending":
            case "in_transit":
                return "bg-purple-500 text-white border-purple-500";
            default:
                return "bg-secondary text-secondary-foreground";
        }
    };

    if (!vehicle) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    {mode === "edit" ? "Edit Vehicle" : "Vehicle Details"}
                                    <Badge variant="outline" className="ml-2 font-mono font-normal">
                                        {formatLotNumber(vehicle.lotNumber)}
                                    </Badge>
                                </DialogTitle>
                            </div>
                            <DialogDescription>
                                {vehicle.year} {vehicle.make} {vehicle.model} • VIN: {vehicle.vin}
                            </DialogDescription>
                        </div>
                        {mode === "view" && (
                            <Badge className={cn("px-3 py-1 text-sm font-semibold uppercase tracking-wider", getStatusBadgeColor(vehicle.status))}>
                                {vehicle.status.replace(/_/g, " ")}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar / Tabs */}
                    <div className="w-full md:w-48 border-r bg-muted/30 p-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full flex-col">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1">
                                <TabsTrigger value="details" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Car className="w-4 h-4 mr-2" /> Details
                                </TabsTrigger>
                                <TabsTrigger value="specs" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Battery className="w-4 h-4 mr-2" /> Car Specs
                                </TabsTrigger>
                                <TabsTrigger value="condition" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <FileText className="w-4 h-4 mr-2" /> Condition
                                </TabsTrigger>
                                <TabsTrigger value="auction" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Gavel className="w-4 h-4 mr-2" /> Auction
                                </TabsTrigger>
                                {mode === "edit" && (
                                    <TabsTrigger value="images" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                        <ImageIcon className="w-4 h-4 mr-2" /> Images
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Content Area */}
                    <ScrollArea className="flex-1 p-6 h-[60vh]">
                        {mode === "view" ? (
                            <ViewModeContent vehicle={vehicle} activeTab={activeTab} />
                        ) : (
                            <EditModeContent
                                formData={formData}
                                handleInputChange={handleInputChange}
                                activeTab={activeTab}
                                imageUrls={imageUrls}
                                handleRemoveImage={handleRemoveImage}
                                handleAddImage={handleAddImage}
                                newImageInput={newImageInput}
                                setNewImageInput={setNewImageInput}
                                handleImageUpload={handleImageUpload}
                            />
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {mode === "edit" && (
                        <Button onClick={handleSave} disabled={isLoading} className="bg-volt-green hover:bg-volt-green/90 text-slate-950">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ViewModeContent({ vehicle, activeTab }: { vehicle: any; activeTab: string }) {
    if (activeTab === "details") {
        return (
            <div className="space-y-6">
                <div className="aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden border">
                    <ImageGallery
                        images={vehicle.images?.map((img: any) => ({
                            url: img.url,
                            alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                            type: img.imageType
                        })) || []}
                        vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Make</Label>
                        <p className="font-medium">{vehicle.make}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Model</Label>
                        <p className="font-medium">{vehicle.model}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Year</Label>
                        <p className="font-medium">{vehicle.year}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Color</Label>
                        <p className="font-medium">{vehicle.exteriorColor} / {vehicle.interiorColor}</p>
                    </div>
                    <div className="col-span-2">
                        <Label className="text-muted-foreground">Location</Label>
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{vehicle.currentLocation?.city}, {vehicle.currentLocation?.country}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (activeTab === "specs") {
        return (
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Battery Capacity</Label>
                    <p className="font-medium">{vehicle.batteryCapacity} kWh</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Health</Label>
                    <p className="font-medium">{vehicle.batteryHealthPercent}%</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Range</Label>
                    <p className="font-medium">{vehicle.estimatedRange} km</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Motor</Label>
                    <p className="font-medium">{vehicle.motorPower} kW</p>
                </div>
            </div>
        )
    }
    // ... Implement other View tabs similarly or fallback
    return <div className="text-muted-foreground">Viewing '{activeTab}' details...</div>
}


function EditModeContent({
    formData,
    handleInputChange,
    activeTab,
    imageUrls,
    handleRemoveImage,
    handleAddImage,
    newImageInput,
    setNewImageInput,
    handleImageUpload
}: {
    formData: any;
    handleInputChange: any;
    activeTab: string;
    imageUrls: string[];
    handleRemoveImage: (index: number) => void;
    handleAddImage: () => void;
    newImageInput: string;
    setNewImageInput: (val: string) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    if (activeTab === "details") {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="make">Make</Label>
                        <Select value={formData.make} onValueChange={(v) => handleInputChange("make", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {VEHICLE_MAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input id="model" value={formData.model} onChange={(e) => handleInputChange("model", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input id="year" type="number" value={formData.year} onChange={(e) => handleInputChange("year", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vin">VIN</Label>
                        <Input id="vin" value={formData.vin} onChange={(e) => handleInputChange("vin", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="exteriorColor">Exterior Color</Label>
                        <Input id="exteriorColor" value={formData.exteriorColor} onChange={(e) => handleInputChange("exteriorColor", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="interiorColor">Interior Color</Label>
                        <Input id="interiorColor" value={formData.interiorColor} onChange={(e) => handleInputChange("interiorColor", e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
                            <SelectItem value="ready_for_auction">Ready for Auction</SelectItem>
                            <SelectItem value="in_auction">In Auction</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )
    }
    if (activeTab === "specs") {
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="batteryCapacity">Capacity (kWh)</Label>
                    <Input id="batteryCapacity" type="number" value={formData.batteryCapacity} onChange={(e) => handleInputChange("batteryCapacity", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="batteryHealthPercent">Health (%)</Label>
                    <Input id="batteryHealthPercent" type="number" value={formData.batteryHealthPercent} onChange={(e) => handleInputChange("batteryHealthPercent", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="estimatedRange">Range (km)</Label>
                    <Input id="estimatedRange" type="number" value={formData.estimatedRange} onChange={(e) => handleInputChange("estimatedRange", e.target.value)} />
                </div>
            </div>
        )
    }
    if (activeTab === "condition") {
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer (km)</Label>
                    <Input id="odometer" type="number" value={formData.odometer} onChange={(e) => handleInputChange("odometer", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="damageDescription">Damage Description</Label>
                    <Textarea id="damageDescription" value={formData.damageDescription || ""} onChange={(e) => handleInputChange("damageDescription", e.target.value)} rows={5} />
                </div>
            </div>
        )
    }
    if (activeTab === "auction") {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="startingBid">Starting Bid</Label>
                        <Input id="startingBid" type="number" value={formData.startingBid} onChange={(e) => handleInputChange("startingBid", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reservePrice">Reserve Price</Label>
                        <Input id="reservePrice" type="number" value={formData.reservePrice} onChange={(e) => handleInputChange("reservePrice", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="buyItNowPrice">Buy Now Price</Label>
                        <Input id="buyItNowPrice" type="number" value={formData.buyItNowPrice || ""} onChange={(e) => handleInputChange("buyItNowPrice", e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave empty to force Auction-Only (no Buy Now option).</p>
                    </div>
                </div>
            </div>
        )
    }
    if (activeTab === "images") {
        return (
            <div className="space-y-6">
                <div>
                    <Label>Current Images</Label>
                    <p className="text-sm text-muted-foreground mb-4">Manage the vehicle images. Add by URL or upload (simulated).</p>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
                                <img src={url} alt={`Vehicle ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 rounded">
                                    {index === 0 ? "Hero" : `#${index + 1}`}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Add Image by URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newImageInput}
                                    onChange={(e) => setNewImageInput(e.target.value)}
                                    placeholder="https://"
                                />
                                <Button variant="secondary" onClick={handleAddImage} disabled={!newImageInput}>Add</Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">OR</span>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    id="image-upload"
                                    onChange={handleImageUpload}
                                />
                                <Label htmlFor="image-upload" className="cursor-pointer">
                                    <div className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md transition-colors text-sm font-medium">
                                        <Upload className="w-4 h-4" />
                                        Upload Files
                                    </div>
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    return null;
}
