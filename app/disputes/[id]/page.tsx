"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    AlertTriangle,
    Clock,
    CheckCircle,
    XCircle,
    FileText,
    User,
    Calendar,
    Car,
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface DisputeDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function DisputeDetailPage({ params }: DisputeDetailPageProps) {
    const resolvedParams = use(params);
    const { token, isAuthenticated } = useAuth();

    const dispute = useQuery(
        api.disputes.getDisputeById,
        token ? { token, disputeId: resolvedParams.id as Id<"disputes"> } : "skip"
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "open":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case "under_review":
                return <Clock className="h-5 w-5 text-blue-500" />;
            case "resolved":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "rejected":
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "open":
                return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Open</Badge>;
            case "under_review":
                return <Badge variant="outline" className="border-blue-500 text-blue-600">Under Review</Badge>;
            case "resolved":
                return <Badge className="bg-green-500 hover:bg-green-600">Resolved</Badge>;
            case "rejected":
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
                <p>Please log in to view this dispute.</p>
                <Button asChild className="mt-4">
                    <Link href="/login">Log In</Link>
                </Button>
            </div>
        );
    }

    if (!dispute) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Card className="p-8 text-center text-muted-foreground">Loading dispute details...</Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/disputes">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Disputes
                </Link>
            </Button>

            <Card className="p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                            {getStatusIcon(dispute.status)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold capitalize">
                                {dispute.disputeType.replace(/_/g, " ")}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Filed on {new Date(dispute.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    {getStatusBadge(dispute.status)}
                </div>

                <Separator className="my-6" />

                {/* Order & Vehicle Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm text-muted-foreground">Order</p>
                            <p className="font-medium">#{dispute.order?.orderNumber || "N/A"}</p>
                        </div>
                    </div>
                    {dispute.vehicle && (
                        <div className="flex items-start gap-3">
                            <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Vehicle</p>
                                <p className="font-medium">
                                    {dispute.vehicle.year} {dispute.vehicle.make} {dispute.vehicle.model}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="my-6" />

                {/* Description */}
                <div className="mb-6">
                    <h2 className="font-semibold mb-2">Description</h2>
                    <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                        {dispute.description}
                    </p>
                </div>

                {/* Evidence */}
                {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                    <div className="mb-6">
                        <h2 className="font-semibold mb-2">Evidence ({dispute.evidenceUrls.length})</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {dispute.evidenceUrls.map((url: string, i: number) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 border rounded-lg text-center text-sm text-electric-blue hover:bg-muted/50"
                                >
                                    View File {i + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resolution (if resolved) */}
                {dispute.resolution && (
                    <>
                        <Separator className="my-6" />
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-900/30">
                            <h2 className="font-semibold text-green-800 dark:text-green-400 mb-2">Resolution</h2>
                            <p className="text-green-700 dark:text-green-300 capitalize mb-2">
                                {dispute.resolution.replace(/_/g, " ")}
                            </p>
                            {dispute.resolutionNotes && (
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    {dispute.resolutionNotes}
                                </p>
                            )}
                            {dispute.refundAmount && dispute.refundAmount > 0 && (
                                <p className="text-sm font-medium text-green-800 dark:text-green-400 mt-2">
                                    Refund Amount: ₦{dispute.refundAmount.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Contact Support */}
                {(dispute.status === "open" || dispute.status === "under_review") && (
                    <>
                        <Separator className="my-6" />
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Need to add more information or have questions?
                            </p>
                            <Button variant="outline">Contact Support</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
