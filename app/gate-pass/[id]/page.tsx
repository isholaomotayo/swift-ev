"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, QrCode, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVIN } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default function GatePassPage() {
    const params = useParams();
    const passId = params.id as Id<"gatePasses">;

    const pass = useQuery(api.logistics.getGatePass, { passId });

    if (pass === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-electric-blue" />
            </div>
        );
    }

    if (pass === null) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <XCircle className="h-16 w-16 text-error-red mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Gate Pass Not Found</h1>
                    <p className="text-muted-foreground mb-6">
                        The requested gate pass does not exist or has been removed.
                    </p>
                    <Link href="/">
                        <Button className="w-full">Return Home</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isExpired = pass.expiresAt < Date.now();
    const isActive = pass.status === "active" && !isExpired;

    return (
        <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4 print:bg-white print:p-0">
            <Card className="w-full max-w-md shadow-2xl border-t-8 border-t-electric-blue print:shadow-none print:border">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-electric-blue/10 rounded-full flex items-center justify-center mb-4">
                        <QrCode className="h-6 w-6 text-electric-blue" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-electric-blue">
                        autoexports.live Gate Pass
                    </CardTitle>
                    <CardDescription className="font-mono text-xs uppercase tracking-widest mt-1">
                        {pass.code}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Status Indicator */}
                    <div className={`flex items-center justify-center p-3 rounded-xl border ${isActive ? "bg-volt-green/10 border-volt-green/30 text-volt-green" :
                            isExpired ? "bg-red-500/10 border-red-500/30 text-red-600" :
                                "bg-gray-100 border-gray-200 text-gray-500"
                        }`}>
                        {isActive ? (
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle className="h-5 w-5" />
                                <span>AUTHORIZED FOR RELEASE</span>
                            </div>
                        ) : isExpired ? (
                            <div className="flex items-center gap-2 font-bold">
                                <XCircle className="h-5 w-5" />
                                <span>EXPIRED</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle className="h-5 w-5" />
                                <span>{pass.status.toUpperCase()}</span>
                            </div>
                        )}
                    </div>

                    {/* Simulated QR Code */}
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center aspect-square mx-auto w-48">
                        {/* In a real app, use a QR code library here */}
                        <div className="text-center space-y-2">
                            <QrCode className="h-32 w-32 text-black mx-auto" />
                            <p className="text-[10px] text-muted-foreground">Scan at Gate</p>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Vehicle</p>
                            <div className="flex gap-3 items-start">
                                <div className="flex-1">
                                    <p className="font-bold text-lg leading-tight">
                                        {pass.vehicle?.year} {pass.vehicle?.make} {pass.vehicle?.model}
                                    </p>
                                    <p className="font-mono text-sm text-muted-foreground mt-0.5">VIN: {pass.vehicle ? formatVIN(pass.vehicle.vin) : "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Owner</p>
                                <p className="font-medium">{pass.user?.firstName} {pass.user?.lastName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Expires</p>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="font-medium text-sm">
                                        {new Date(pass.expiresAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Location</p>
                            <p className="font-medium text-sm bg-muted p-2 rounded-md">
                                {pass.vehicle?.currentLocation?.facility || "Main Lot"}, {pass.vehicle?.currentLocation?.city}, {pass.vehicle?.currentLocation?.country}
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-2 pb-6 print:hidden">
                    <div className="text-center text-xs text-muted-foreground w-full mb-4">
                        Show this pass to security at the exit gate.
                    </div>
                    <Button className="w-full" onClick={() => window.print()}>
                        Print / Save as PDF
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="outline" className="w-full">Back to Dashboard</Button>
                    </Link>
                </CardFooter>
            </Card>
            <div className="mt-8 text-center text-xs text-muted-foreground print:hidden">
                autoexports.live Secure Gate System &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}
