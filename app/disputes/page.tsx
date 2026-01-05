import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "My Disputes | Auto Auctions Africa",
    description: "View and manage your dispute cases",
};

export default async function DisputesPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("voltbid_token")?.value;

    if (!token) {
        redirect("/login");
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    let disputes: any[] = [];

    try {
        disputes = await convex.query(api.disputes.getUserDisputes, { token });
    } catch (error) {
        console.error("Failed to fetch disputes:", error);
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "open":
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "under_review":
                return <Clock className="h-4 w-4 text-blue-500" />;
            case "resolved":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "rejected":
                return <XCircle className="h-4 w-4 text-red-500" />;
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">My Disputes</h1>
                    <p className="text-muted-foreground mt-1">Track and manage your dispute cases</p>
                </div>
                <Button asChild>
                    <Link href="/disputes/new">
                        <Plus className="h-4 w-4 mr-2" />
                        File New Dispute
                    </Link>
                </Button>
            </div>

            {disputes.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">No Disputes</h2>
                    <p className="text-muted-foreground mb-6">
                        You haven't filed any disputes yet. We hope you never need to!
                    </p>
                    <Button variant="outline" asChild>
                        <Link href="/orders">View My Orders</Link>
                    </Button>
                </Card>
            ) : (
                <div className="space-y-4">
                    {disputes.map((dispute) => (
                        <Link key={dispute._id} href={`/disputes/${dispute._id}`}>
                            <Card className="p-6 hover:border-volt-green/50 transition-colors cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            {getStatusIcon(dispute.status)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">
                                                {dispute.vehicle
                                                    ? `${dispute.vehicle.year} ${dispute.vehicle.make} ${dispute.vehicle.model}`
                                                    : `Order #${dispute.order?.orderNumber || "N/A"}`}
                                            </h3>
                                            <p className="text-sm text-muted-foreground capitalize">
                                                {dispute.disputeType.replace(/_/g, " ")}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Filed {new Date(dispute.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(dispute.status)}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
