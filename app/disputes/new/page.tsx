"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

const disputeTypes = [
    { value: "not_as_described", label: "Vehicle Not As Described" },
    { value: "documents_missing", label: "Missing Documents" },
    { value: "seller_failed_release", label: "Seller Failed to Release Vehicle" },
    { value: "shipping_delay", label: "Shipping Delay" },
    { value: "damage_in_transit", label: "Damage During Transit" },
    { value: "other", label: "Other Issue" },
];

export default function NewDisputePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { token, isAuthenticated } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        orderId: "",
        disputeType: "",
        description: "",
    });

    // Fetch user's orders for selection
    const orders = useQuery(
        api.orders.getUserOrders,
        token ? { token } : "skip"
    );

    const createDisputeMutation = useMutation(api.disputes.createDispute);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !formData.orderId || !formData.disputeType || !formData.description) {
            toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await createDisputeMutation({
                token,
                orderId: formData.orderId as Id<"orders">,
                disputeType: formData.disputeType as any,
                description: formData.description,
            });
            toast({ title: "Dispute Filed", description: "Your dispute has been submitted for review." });
            router.push("/disputes");
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to file dispute",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
                <p>Please log in to file a dispute.</p>
                <Button asChild className="mt-4">
                    <Link href="/login">Log In</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/disputes">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Disputes
                </Link>
            </Button>

            <Card className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">File a Dispute</h1>
                        <p className="text-muted-foreground text-sm">
                            Report an issue with your order
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="order">Select Order *</Label>
                        <Select
                            value={formData.orderId}
                            onValueChange={(value) => setFormData({ ...formData, orderId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose an order" />
                            </SelectTrigger>
                            <SelectContent>
                                {orders?.map((order: any) => (
                                    <SelectItem key={order._id} value={order._id}>
                                        #{order.orderNumber} - {order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Issue Type *</Label>
                        <Select
                            value={formData.disputeType}
                            onValueChange={(value) => setFormData({ ...formData, disputeType: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select issue type" />
                            </SelectTrigger>
                            <SelectContent>
                                {disputeTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Please describe the issue in detail..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide as much detail as possible to help us resolve your issue quickly.
                        </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg text-sm">
                        <p className="font-medium mb-2">What happens next?</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>Our team will review your dispute within 24-48 hours</li>
                            <li>We may contact you for additional information</li>
                            <li>You'll receive updates via email and in your dashboard</li>
                        </ol>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit Dispute"
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
