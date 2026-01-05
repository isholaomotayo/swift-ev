"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Loader2, Info, ChevronRight, Truck, ShieldCheck, Settings, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

interface ServiceSelectorProps {
    orderId: Id<"orders">;
    token: string;
}

export function ServiceSelector({ orderId, token }: ServiceSelectorProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);

    // Queries
    const availableServices = useQuery(api.services.getAvailableServices);
    const selectedServices = useQuery(api.services.getOrderServices, { token, orderId });

    // Mutations
    const selectServiceMutation = useMutation(api.services.selectService);

    const handleSelectService = async (service: any) => {
        setSubmitting(service.id);
        try {
            await selectServiceMutation({
                token,
                orderId,
                serviceType: service.id,
                cost: service.estimatedCost,
                currency: service.currency,
            });
            toast({
                title: "Service Added",
                description: `${service.name} has been added to your order.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add service",
                variant: "destructive",
            });
        } finally {
            setSubmitting(null);
        }
    };

    const isServiceSelected = (serviceId: string) => {
        return selectedServices?.some((s) => s.serviceType === serviceId && s.status !== "cancelled");
    };

    const getServiceIcon = (id: string) => {
        switch (id) {
            case "shipping_container":
            case "shipping_roro":
                return <Truck className="h-5 w-5" />;
            case "insurance":
            case "inspection":
                return <ShieldCheck className="h-5 w-5" />;
            case "registration":
                return <Settings className="h-5 w-5" />;
            case "spare_parts":
                return <Wrench className="h-5 w-5" />;
            default:
                return <Info className="h-5 w-5" />;
        }
    };

    return (
        <Card className="p-6 border-volt-green/20 bg-volt-green/5 shadow-inner">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-volt-green" />
                    <h2 className="text-xl font-bold text-deep-navy dark:text-white">Additional Services</h2>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-volt-green text-volt-green hover:bg-volt-green hover:text-white">
                            Browse Services
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Enhance Your Purchase</DialogTitle>
                            <DialogDescription>
                                Select additional services to protect and personalize your vehicle.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            {availableServices?.map((service) => (
                                <Card
                                    key={service.id}
                                    className={`p-4 transition-all border-2 ${isServiceSelected(service.id)
                                            ? "border-volt-green bg-volt-green/5"
                                            : "border-transparent hover:border-muted-foreground/20"
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="h-10 w-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                                            {getServiceIcon(service.id)}
                                        </div>
                                        {isServiceSelected(service.id) && (
                                            <Badge className="bg-volt-green text-white">Selected</Badge>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{service.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                                        {service.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="font-mono font-bold">
                                            {service.estimatedCost > 0 ? formatCurrency(service.estimatedCost) : "Contact for Pricing"}
                                        </span>
                                        <Button
                                            size="sm"
                                            disabled={isServiceSelected(service.id) || submitting === service.id}
                                            onClick={() => handleSelectService(service)}
                                            variant={isServiceSelected(service.id) ? "ghost" : "default"}
                                        >
                                            {submitting === service.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : isServiceSelected(service.id) ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                "Add"
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsDialogOpen(false)} className="w-full">Done</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-3">
                {selectedServices && selectedServices.length > 0 ? (
                    selectedServices.map((service) => (
                        <div
                            key={service._id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 group hover:border-volt-green/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-volt-green/10 group-hover:text-volt-green">
                                    {getServiceIcon(service.serviceType)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold capitalize">
                                        {service.serviceType.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                                        Status: <span className="text-volt-green">{service.status}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-bold text-sm">{formatCurrency(service.cost)}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground">No additional services selected yet.</p>
                        <p className="text-xs text-muted-foreground mb-4">Protect your investment with shipping and insurance.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-volt-green/10">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <ShieldCheck className="h-3 w-3 text-volt-green" />
                    Escrow Protected Payments
                </div>
            </div>
        </Card>
    );
}
