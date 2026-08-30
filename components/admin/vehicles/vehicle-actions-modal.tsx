"use client";

import { useState, useEffect } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { getMutationErrorMessage } from "@/lib/auth-errors";
import { isPersistableImageRef, revokeBlobPreviewUrl } from "@/lib/vehicle-image-refs";
import { RemoteImage } from "@/components/ui/remote-image";
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
import { BATTERY_TYPES, CHARGING_TYPES, CONDITION_OPTIONS, FUEL_TYPES, normalizeFuelType } from "@/lib/constants";
import { MakeModelSelect } from "@/components/vehicles/make-model-select";
import { resolveMakeModelForForm } from "@/lib/vehicle-catalog";
import { useMergedVehicleCatalog } from "@/hooks/use-merged-vehicle-catalog";
import { ImageGallery } from "@/components/autoexports/image-gallery";

interface VehicleImageRef {
    displayUrl: string;
    storageRef: string;
}

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
    const { token } = useAuth();
    const convex = useConvex();
    const updateVehicle = useMutation(api.vehicles.updateVehicle);
    const overrideVehicleStatus = useMutation(api.vehicles.overrideVehicleStatus);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("details");
    const [overrideStatus, setOverrideStatus] = useState("");
    const [overrideReason, setOverrideReason] = useState("");

    const vehicleDetail = useQuery(
        api.vehicles.getVehicleById,
        mode === "edit" && isOpen && vehicle?._id && token
            ? { vehicleId: vehicle._id as Id<"vehicles">, token }
            : "skip"
    );
    const {
        catalogReady,
        registerCatalogEntry,
        validateResolvedMakeModel,
        validationCatalogEntries,
    } = useMergedVehicleCatalog();

    // Form State
    const [formData, setFormData] = useState<any>({});

    // Image state: display URL for preview, storageRef for persistence
    const [imageRefs, setImageRefs] = useState<VehicleImageRef[]>([]);
    const [imagesDirty, setImagesDirty] = useState(false);
    const [newImageInput, setNewImageInput] = useState("");

    // Document state
    const [docRefs, setDocRefs] = useState<{ type: string; displayUrl: string; storageRef: string }[]>([]);
    const [docsDirty, setDocsDirty] = useState(false);
    const [isDocUploading, setIsDocUploading] = useState(false);

    const sourceVehicle = vehicleDetail ?? vehicle;

    // Initialize form data when vehicle changes
    useEffect(() => {
        if (!sourceVehicle || !catalogReady) return;

        const { make, model, isOtherMake } = resolveMakeModelForForm(
            sourceVehicle.make,
            sourceVehicle.model,
            validationCatalogEntries
        );

        setFormData({
            make: isOtherMake ? "Other" : make,
            makeCustom: isOtherMake ? sourceVehicle.make : "",
            model,
            year: sourceVehicle.year,
            vin: sourceVehicle.vin,
            lotNumber: sourceVehicle.lotNumber,
            odometer: sourceVehicle.odometer,
            exteriorColor: sourceVehicle.exteriorColor,
            interiorColor: sourceVehicle.interiorColor,
            batteryCapacity: sourceVehicle.batteryCapacity,
            batteryHealthPercent: sourceVehicle.batteryHealthPercent,
            estimatedRange: sourceVehicle.estimatedRange,
            batteryType: sourceVehicle.batteryType,
            chargingType: sourceVehicle.chargingType || [],
            motorPower: sourceVehicle.motorPower,
            condition: sourceVehicle.condition,
            damageDescription: sourceVehicle.damageDescription,
            startingBid: sourceVehicle.startingBid,
            reservePrice: sourceVehicle.reservePrice,
            buyItNowPrice: sourceVehicle.buyItNowPrice,
            locationCity: sourceVehicle.currentLocation?.city,
            locationCountry: sourceVehicle.currentLocation?.country,
            status: sourceVehicle.status,
        });
        setOverrideStatus(sourceVehicle.status || "");
        setOverrideReason("");

        if (sourceVehicle.images?.length) {
            setImageRefs(
                sourceVehicle.images
                    .map((img: { url: string; storageRef?: string }) => {
                        const storageRef = img.storageRef ?? img.url;
                        if (!isPersistableImageRef(storageRef)) return null;
                        return {
                            displayUrl: img.url,
                            storageRef,
                        };
                    })
                    .filter((ref: VehicleImageRef | null): ref is VehicleImageRef => ref !== null)
            );
        } else {
            setImageRefs([]);
        }
        setImagesDirty(false);

        if (sourceVehicle.documents?.length) {
            setDocRefs(
                sourceVehicle.documents.map((doc: any) => ({
                    type: doc.type,
                    displayUrl: doc.url,
                    storageRef: doc.storageRef ?? doc.url,
                }))
            );
        } else {
            setDocRefs([]);
        }
        setDocsDirty(false);
    }, [sourceVehicle, catalogReady, validationCatalogEntries]);

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleAddImage = () => {
        if (!newImageInput.trim()) return;
        const url = newImageInput.trim();
        setImageRefs((prev) => [...prev, { displayUrl: url, storageRef: url }]);
        setImagesDirty(true);
        setNewImageInput("");
    };

    const handleRemoveImage = (index: number) => {
        setImageRefs((prev) => {
            revokeBlobPreviewUrl(prev[index]?.displayUrl);
            return prev.filter((_, i) => i !== index);
        });
        setImagesDirty(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        if (!token) {
            toast({
                title: "Error",
                description: "You must be logged in to upload images",
                variant: "destructive",
            });
            return;
        }

        const files = Array.from(e.target.files);
        setIsUploading(true);
        try {
            const uploaded: VehicleImageRef[] = [];
            for (const file of files) {
                const uploadUrl = await generateUploadUrl({ token });
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type || "application/octet-stream" },
                    body: file,
                });

                if (!result.ok) {
                    throw new Error(`Upload failed for ${file.name}`);
                }

                const { storageId } = await result.json();
                const storageRef = String(storageId);
                const displayUrl =
                    (await convex.query(api.files.getFileUrl, {
                        storageId: storageRef as Id<"_storage">,
                    })) ?? "";

                uploaded.push({
                    displayUrl,
                    storageRef,
                });
            }
            setImageRefs((prev) => [...prev, ...uploaded]);
            setImagesDirty(true);
            toast({
                title: "Images Uploaded",
                description: "Successfully uploaded new images.",
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "There was an error uploading the images.";
            console.error("Failed to upload images:", err);
            toast({
                title: "Upload Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDocumentUpload = async (type: string, file: File) => {
        if (!token) {
            toast({
                title: "Error",
                description: "You must be logged in to upload documents",
                variant: "destructive",
            });
            return;
        }

        setIsDocUploading(true);
        try {
            const uploadUrl = await generateUploadUrl({ token });
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });

            if (!result.ok) {
                throw new Error("Upload failed");
            }

            const { storageId } = await result.json();
            const storageRef = String(storageId);
            const displayUrl =
                (await convex.query(api.files.getFileUrl, {
                    storageId: storageRef as Id<"_storage">,
                })) ?? "";

            setDocRefs((prev) => {
                const filtered = prev.filter((d) => d.type !== type);
                return [...filtered, { type, displayUrl, storageRef }];
            });
            setDocsDirty(true);
            toast({
                title: "Document Uploaded",
                description: `${type.replace(/_/g, " ")} successfully uploaded.`,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error uploading document.";
            toast({
                title: "Upload Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsDocUploading(false);
        }
    };

    const handleRemoveDocument = (type: string) => {
        setDocRefs((prev) => prev.filter((d) => d.type !== type));
        setDocsDirty(true);
    };

    const handleSave = async () => {
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

            const toNumber = (value: unknown): number | undefined => {
                if (value === "" || value === null || value === undefined) return undefined;
                const parsed = Number(value);
                return Number.isNaN(parsed) ? undefined : parsed;
            };

            const resolvedMake =
                formData.make === "Other"
                    ? String(formData.makeCustom || "").trim()
                    : String(formData.make || "").trim();
            const resolvedModel = String(formData.model || "").trim();

            if (!validateResolvedMakeModel(resolvedMake, resolvedModel)) {
                toast({
                    title: "Invalid make or model",
                    description:
                        "Please select a make and model from the catalog, or enter a custom make and model.",
                    variant: "destructive",
                });
                return;
            }

            const updates: Record<string, unknown> = {
                make: resolvedMake,
                model: resolvedModel,
                year: toNumber(formData.year),
                vin: formData.vin?.trim() || undefined,
                odometer: toNumber(formData.odometer),
                exteriorColor: formData.exteriorColor,
                interiorColor: formData.interiorColor,
                trim: formData.trim,
                fuelType: formData.fuelType,
                drivetrain: formData.drivetrain,
                batteryCapacity: toNumber(formData.batteryCapacity),
                batteryHealthPercent: toNumber(formData.batteryHealthPercent),
                estimatedRange: toNumber(formData.estimatedRange),
                batteryType: formData.batteryType,
                chargingType: formData.chargingType,
                motorPower: toNumber(formData.motorPower),
                condition: formData.condition,
                damageDescription: formData.damageDescription,
                titleType: formData.titleType,
                titleCountry: formData.titleCountry,
                hasKeys: formData.hasKeys,
                sourceType: formData.sourceType,
                startingBid: toNumber(formData.startingBid),
                reservePrice: toNumber(formData.reservePrice),
                buyItNowPrice: toNumber(formData.buyItNowPrice),
                currentLocation: {
                    facility: sourceVehicle.currentLocation?.facility || "Default Facility",
                    city: formData.locationCity,
                    country: formData.locationCountry,
                },
            };

            if (imagesDirty) {
                const persistableRefs = imageRefs
                    .map((ref) => ref.storageRef.trim())
                    .filter(isPersistableImageRef);

                if (persistableRefs.length !== imageRefs.length) {
                    throw new Error(
                        "Some images were not uploaded to storage. Remove them and upload again."
                    );
                }

                updates.imageUrls = persistableRefs;
            }

            if (docsDirty) {
                updates.documents = docRefs.map((ref) => ({
                    type: ref.type as any,
                    storageId: ref.storageRef,
                }));
            }

            await updateVehicle({
                token,
                vehicleId: vehicle._id as Id<"vehicles">,
                updates: updates as Parameters<typeof updateVehicle>[0]["updates"],
            });

            toast({
                title: "Vehicle Updated",
                description: "The vehicle details have been successfully updated.",
            });
            onClose();
        } catch (error: unknown) {
            const message = getMutationErrorMessage(
                error,
                "There was an error updating the vehicle. Please try again."
            );
            console.error("Failed to update vehicle:", error);
            toast({
                title: "Update Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOverrideStatus = async () => {
        if (!token || !vehicle?._id) {
            toast({
                title: "Error",
                description: "You must be logged in to override vehicle status",
                variant: "destructive",
            });
            return;
        }

        if (!overrideStatus || overrideReason.trim().length < 5) {
            toast({
                title: "Override reason required",
                description: "Enter a clear reason before overriding vehicle status.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            await overrideVehicleStatus({
                token,
                vehicleId: vehicle._id as Id<"vehicles">,
                status: overrideStatus as Parameters<typeof overrideVehicleStatus>[0]["status"],
                reason: overrideReason.trim(),
            });
            toast({
                title: "Status Overridden",
                description: "Vehicle status was updated and audit logged.",
            });
            onClose();
        } catch (error: unknown) {
            const message = getMutationErrorMessage(
                error,
                "There was an error overriding the vehicle status."
            );
            toast({
                title: "Override Failed",
                description: message,
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
            case "delivered":
                return "bg-green-600 text-white border-green-600";
            case "cancelled":
            case "withdrawn":
            case "rejected":
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
                                {vehicle.year} {vehicle.make} {vehicle.model}{vehicle.vin ? ` • VIN: ${vehicle.vin}` : ""}
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
                    <div className="w-full md:w-48 border-r bg-muted/30 p-2 overflow-y-auto">
                        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full flex-col">
                            <TabsList className="flex flex-col h-auto md:h-auto items-stretch bg-transparent gap-1">
                                <TabsTrigger value="details" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Car className="w-4 h-4 mr-2" /> Details
                                </TabsTrigger>
                                <TabsTrigger value="specs" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Battery className="w-4 h-4 mr-2" /> Car Specs
                                </TabsTrigger>
                                <TabsTrigger value="condition" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <FileText className="w-4 h-4 mr-2" /> Condition
                                </TabsTrigger>
                                <TabsTrigger value="documents" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <FileText className="w-4 h-4 mr-2" /> Documents
                                </TabsTrigger>
                                <TabsTrigger value="auction" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                    <Gavel className="w-4 h-4 mr-2" /> Auction
                                </TabsTrigger>
                                {mode === "edit" && (
                                    <TabsTrigger value="images" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                        <ImageIcon className="w-4 h-4 mr-2" /> Images
                                    </TabsTrigger>
                                )}
                                {mode === "edit" && (
                                    <TabsTrigger value="lifecycle" className="w-full justify-start px-3 py-2 h-auto data-[state=active]:bg-background">
                                        <Gavel className="w-4 h-4 mr-2" /> Lifecycle
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
                                onCatalogEntryAdded={registerCatalogEntry}
                                imageRefs={imageRefs}
                                handleRemoveImage={handleRemoveImage}
                                handleAddImage={handleAddImage}
                                newImageInput={newImageInput}
                                setNewImageInput={setNewImageInput}
                                handleImageUpload={handleImageUpload}
                                isUploading={isUploading}
                                overrideStatus={overrideStatus}
                                setOverrideStatus={setOverrideStatus}
                                overrideReason={overrideReason}
                                setOverrideReason={setOverrideReason}
                                handleOverrideStatus={handleOverrideStatus}
                                isLoading={isLoading}
                                getStatusBadgeColor={getStatusBadgeColor}
                                docRefs={docRefs}
                                handleRemoveDocument={handleRemoveDocument}
                                handleDocumentUpload={handleDocumentUpload}
                                isDocUploading={isDocUploading}
                            />
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={onClose} disabled={isLoading || isUploading}>
                        Cancel
                    </Button>
                    {mode === "edit" && (
                        <Button onClick={handleSave} disabled={isLoading || isUploading} className="bg-volt-green hover:bg-volt-green/90 text-slate-950">
                            {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <div>
                        <Label className="text-muted-foreground">Trim</Label>
                        <p className="font-medium">{vehicle.trim || "N/A"}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Title Type</Label>
                        <p className="font-medium capitalize">{vehicle.titleType ? vehicle.titleType.replace("_", " ") : "N/A"}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Title Country</Label>
                        <p className="font-medium">{vehicle.titleCountry || "N/A"}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Keys</Label>
                        <p className="font-medium">{vehicle.hasKeys ? "Yes" : "No"}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Source</Label>
                        <p className="font-medium capitalize">{vehicle.sourceType || "N/A"}</p>
                    </div>
                    <div className="col-span-2 border-t pt-4 mt-2">
                        <Label className="text-muted-foreground">Location</Label>
                        <div className="flex items-center gap-1 mt-1">
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
                    <Label className="text-muted-foreground">Fuel Type</Label>
                    <p className="font-medium">{vehicle.fuelType || "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Battery Type</Label>
                    <p className="font-medium">{vehicle.batteryType || "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Battery Capacity</Label>
                    <p className="font-medium">{vehicle.batteryCapacity ? `${vehicle.batteryCapacity} kWh` : "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Health</Label>
                    <p className="font-medium">{vehicle.batteryHealthPercent ? `${vehicle.batteryHealthPercent}%` : "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Range</Label>
                    <p className="font-medium">{vehicle.estimatedRange ? `${vehicle.estimatedRange} km` : "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Motor Power</Label>
                    <p className="font-medium">{vehicle.motorPower ? `${vehicle.motorPower} kW` : "N/A"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Drivetrain</Label>
                    <p className="font-medium">{vehicle.drivetrain || "N/A"}</p>
                </div>
                <div className="col-span-2">
                    <Label className="text-muted-foreground">Charging Type</Label>
                    <p className="font-medium">{vehicle.chargingType?.length ? vehicle.chargingType.join(", ") : "N/A"}</p>
                </div>
            </div>
        )
    }
    if (activeTab === "condition") {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Condition</Label>
                        <p className="font-medium capitalize">{vehicle.condition || "N/A"}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Odometer</Label>
                        <p className="font-medium">{vehicle.odometer ? `${vehicle.odometer.toLocaleString()} ${vehicle.odometerUnit || "km"}` : "0 km"}</p>
                    </div>
                </div>
                <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Damage Description</Label>
                    <p className="font-medium mt-1 whitespace-pre-wrap">{vehicle.damageDescription || "No damage description provided."}</p>
                </div>
            </div>
        )
    }
    if (activeTab === "documents") {
        const inspectionReport = vehicle.documents?.find((d: any) => d.type === "inspection_report");
        const videoWalkthrough = vehicle.documents?.find((d: any) => d.type === "bill_of_sale");
        const otherDocs = vehicle.documents?.filter((d: any) => d.type !== "inspection_report" && d.type !== "bill_of_sale");

        return (
            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold text-base mb-2">Inspection Report</h3>
                    {inspectionReport ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <span className="text-sm font-medium">Inspection Report (PDF/Image)</span>
                            <Button asChild size="sm" variant="outline">
                                <a href={inspectionReport.url} target="_blank" rel="noopener noreferrer">
                                    View Report
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No inspection report uploaded.</p>
                    )}
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-semibold text-base mb-2">Video Walkthrough</h3>
                    {videoWalkthrough ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                <span className="text-sm font-medium">Walkthrough Video</span>
                                <Button asChild size="sm" variant="outline">
                                    <a href={videoWalkthrough.url} target="_blank" rel="noopener noreferrer">
                                        View Video
                                    </a>
                                </Button>
                            </div>
                            {videoWalkthrough.url && (
                                <div className="aspect-[16/9] w-full border rounded-lg overflow-hidden bg-black">
                                    <video src={videoWalkthrough.url} controls className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No video walkthrough uploaded.</p>
                    )}
                </div>

                {otherDocs && otherDocs.length > 0 && (
                    <div className="border-t pt-4">
                        <h3 className="font-semibold text-base mb-2">Other Documents</h3>
                        <div className="space-y-2">
                            {otherDocs.map((doc: any) => (
                                <div key={doc._id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                    <span className="text-sm font-medium capitalize">{doc.type.replace(/_/g, " ")}</span>
                                    <Button asChild size="sm" variant="outline">
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                            Download
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }
    if (activeTab === "auction") {
        return (
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Starting Bid</Label>
                    <p className="font-medium">{formatCurrency(vehicle.startingBid || 0)} NGN</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Reserve Price</Label>
                    <p className="font-medium">{vehicle.reservePrice ? `${formatCurrency(vehicle.reservePrice)} NGN` : "No Reserve"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Buy Now Price</Label>
                    <p className="font-medium">{vehicle.buyItNowPrice ? `${formatCurrency(vehicle.buyItNowPrice)} NGN` : "Auction Only"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Buy Now Enabled</Label>
                    <p className="font-medium">{vehicle.buyItNowEnabled ? "Yes" : "No"}</p>
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
    onCatalogEntryAdded,
    imageRefs,
    handleRemoveImage,
    handleAddImage,
    newImageInput,
    setNewImageInput,
    handleImageUpload,
    isUploading,
    overrideStatus,
    setOverrideStatus,
    overrideReason,
    setOverrideReason,
    handleOverrideStatus,
    isLoading,
    getStatusBadgeColor,
    docRefs,
    handleRemoveDocument,
    handleDocumentUpload,
    isDocUploading,
}: {
    formData: any;
    handleInputChange: any;
    activeTab: string;
    onCatalogEntryAdded: (entry: { make: string; model: string }) => void;
    imageRefs: VehicleImageRef[];
    handleRemoveImage: (index: number) => void;
    handleAddImage: () => void;
    newImageInput: string;
    setNewImageInput: (val: string) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading?: boolean;
    overrideStatus: string;
    setOverrideStatus: (val: string) => void;
    overrideReason: string;
    setOverrideReason: (val: string) => void;
    handleOverrideStatus: () => void;
    isLoading?: boolean;
    getStatusBadgeColor: (status: string) => string;
    docRefs: any[];
    handleRemoveDocument: (type: string) => void;
    handleDocumentUpload: (type: string, file: File) => void;
    isDocUploading: boolean;
}) {
    if (activeTab === "details") {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <MakeModelSelect
                        className="col-span-2"
                        make={formData.make || ""}
                        model={formData.model || ""}
                        makeCustom={formData.makeCustom || ""}
                        allowOtherMake
                        onMakeChange={(v) => handleInputChange("make", v)}
                        onModelChange={(v) => handleInputChange("model", v)}
                        onMakeCustomChange={(v) => handleInputChange("makeCustom", v)}
                        onCatalogEntryAdded={onCatalogEntryAdded}
                    />
                    <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input id="year" type="number" value={formData.year} onChange={(e) => handleInputChange("year", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vin">VIN (Optional)</Label>
                        <Input id="vin" value={formData.vin || ""} onChange={(e) => handleInputChange("vin", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="exteriorColor">Exterior Color</Label>
                        <Input id="exteriorColor" value={formData.exteriorColor || ""} onChange={(e) => handleInputChange("exteriorColor", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="interiorColor">Interior Color</Label>
                        <Input id="interiorColor" value={formData.interiorColor || ""} onChange={(e) => handleInputChange("interiorColor", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="trim">Trim</Label>
                        <Input id="trim" value={formData.trim || ""} onChange={(e) => handleInputChange("trim", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="titleType">Title Type</Label>
                        <Select value={formData.titleType || ""} onValueChange={(v) => handleInputChange("titleType", v)}>
                            <SelectTrigger><SelectValue placeholder="Select Title" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="clean">Clean Title</SelectItem>
                                <SelectItem value="salvage">Salvage Title</SelectItem>
                                <SelectItem value="rebuilt">Rebuilt Title</SelectItem>
                                <SelectItem value="export_only">Export Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="titleCountry">Title Country</Label>
                        <Input id="titleCountry" value={formData.titleCountry || ""} onChange={(e) => handleInputChange("titleCountry", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hasKeys">Has Keys</Label>
                        <Select value={formData.hasKeys === true ? "yes" : formData.hasKeys === false ? "no" : ""} onValueChange={(v) => handleInputChange("hasKeys", v === "yes")}>
                            <SelectTrigger><SelectValue placeholder="Keys?" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sourceType">Source Type</Label>
                        <Select value={formData.sourceType || ""} onValueChange={(v) => handleInputChange("sourceType", v)}>
                            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                                <SelectItem value="dealer">Dealer</SelectItem>
                                <SelectItem value="consignment">Consignment</SelectItem>
                                <SelectItem value="insurance">Insurance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2 border-t pt-4 mt-2">
                    <Label htmlFor="status">Status</Label>
                    <Badge className={cn("w-fit px-3 py-1 uppercase block mb-1", getStatusBadgeColor(formData.status || ""))}>
                        {(formData.status || "unknown").replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                        Status changes use lifecycle actions or the controlled override on the Lifecycle tab.
                    </p>
                </div>
            </div>
        )
    }
    if (activeTab === "specs") {
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel / Engine Type</Label>
                    <Select
                        value={normalizeFuelType(formData.fuelType)}
                        onValueChange={(val) => handleInputChange("fuelType", val)}
                    >
                        <SelectTrigger id="fuelType">
                            <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                            {FUEL_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="batteryType">Battery Type</Label>
                    <Input id="batteryType" value={formData.batteryType || ""} onChange={(e) => handleInputChange("batteryType", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="batteryCapacity">Capacity (kWh)</Label>
                    <Input id="batteryCapacity" type="number" value={formData.batteryCapacity || ""} onChange={(e) => handleInputChange("batteryCapacity", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="batteryHealthPercent">Health (%)</Label>
                    <Input id="batteryHealthPercent" type="number" value={formData.batteryHealthPercent || ""} onChange={(e) => handleInputChange("batteryHealthPercent", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="estimatedRange">Range (km)</Label>
                    <Input id="estimatedRange" type="number" value={formData.estimatedRange || ""} onChange={(e) => handleInputChange("estimatedRange", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="motorPower">Motor Power (kW)</Label>
                    <Input id="motorPower" type="number" value={formData.motorPower || ""} onChange={(e) => handleInputChange("motorPower", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="drivetrain">Drivetrain</Label>
                    <Input id="drivetrain" value={formData.drivetrain || ""} onChange={(e) => handleInputChange("drivetrain", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-2">
                    <Label htmlFor="chargingType">Charging Type (Comma separated)</Label>
                    <Input id="chargingType" value={Array.isArray(formData.chargingType) ? formData.chargingType.join(", ") : (formData.chargingType || "")} onChange={(e) => handleInputChange("chargingType", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
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
                    <p className="text-sm text-muted-foreground mb-4">Manage the vehicle images. Add by URL or upload files.</p>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                        {imageRefs.map((ref, index) => (
                            <div key={index} className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
                                {ref.displayUrl ? (
                                    <RemoteImage
                                        src={ref.displayUrl}
                                        alt={`Vehicle ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="200px"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                        Preview unavailable
                                    </div>
                                )}
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
                                    disabled={isUploading}
                                />
                                <Label htmlFor="image-upload" className={cn("cursor-pointer", isUploading && "opacity-50 pointer-events-none")}>
                                    <div className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md transition-colors text-sm font-medium">
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {isUploading ? "Uploading..." : "Upload Files"}
                                    </div>
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (activeTab === "documents") {
        const getDoc = (type: string) => docRefs.find((d) => d.type === type);

        return (
            <div className="space-y-6">
                <div>
                    <Label className="text-lg font-semibold block mb-1">Manage Documents</Label>
                    <p className="text-sm text-muted-foreground">Upload and manage vehicle documents.</p>
                </div>

                <div className="grid gap-6">
                    {[
                        { type: "inspection_report", label: "Inspection Report (PDF/Image)", accept: ".pdf,image/*" },
                        { type: "bill_of_sale", label: "Video Walkthrough / Bill of Sale (MP4/Video)", accept: "video/*" },
                        { type: "battery_report", label: "Battery Report (PDF/Image)", accept: ".pdf,image/*" },
                        { type: "title_scan", label: "Title Scan (PDF/Image)", accept: ".pdf,image/*" },
                    ].map((docType) => {
                        const existingDoc = getDoc(docType.type);
                        return (
                            <div key={docType.type} className="flex flex-col gap-2 p-4 border rounded-xl bg-muted/15">
                                <Label className="text-sm font-semibold">{docType.label}</Label>
                                {existingDoc ? (
                                    <div className="flex items-center justify-between mt-1 bg-background p-2 border rounded-lg">
                                        <span className="text-sm truncate max-w-[70%] font-medium text-volt-green">
                                            {docType.type.replace(/_/g, " ").toUpperCase()}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <a href={existingDoc.displayUrl} target="_blank" rel="noopener noreferrer">
                                                    View
                                                </a>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleRemoveDocument(docType.type)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-1">
                                        <Input
                                            type="file"
                                            accept={docType.accept}
                                            disabled={isDocUploading}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleDocumentUpload(docType.type, file);
                                            }}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    if (activeTab === "lifecycle") {
        return (
            <div className="space-y-6">
                <div>
                    <Label>Current Status</Label>
                    <div className="mt-2">
                        <Badge className={cn("px-3 py-1 uppercase", getStatusBadgeColor(formData.status || ""))}>
                            {(formData.status || "unknown").replace(/_/g, " ")}
                        </Badge>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="overrideStatus">Override Status</Label>
                        <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                            <SelectTrigger id="overrideStatus">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
                                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="ready_for_auction">Ready for Auction</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_auction">In Auction</SelectItem>
                                <SelectItem value="payment_pending">Payment Pending</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="unsold">Unsold</SelectItem>
                                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="overrideReason">Override Reason</Label>
                        <Textarea
                            id="overrideReason"
                            value={overrideReason}
                            onChange={(event) => setOverrideReason(event.target.value)}
                            rows={4}
                            placeholder="Required for audit log"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleOverrideStatus}
                        disabled={isLoading || !overrideStatus || overrideReason.trim().length < 5}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Override Status
                    </Button>
                </div>
            </div>
        )
    }
    return null;
}
