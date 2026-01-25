"use strict";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Calculator, Plane, FileText, ShieldCheck } from "lucide-react";

interface LandedCostCalculatorProps {
    currentBid: number;
}

export function LandedCostCalculator({ currentBid }: LandedCostCalculatorProps) {
    const [destination, setDestination] = useState("Lagos");

    // Fee Constants
    const BUYER_PREMIUM_RATE = 0.05;
    const DOCUMENTATION_FEE = 50000;

    // Estimates based on location (simplified for MVP)
    const SHIPPING_EST = destination === "Lagos" ? 1800000 : 2000000;
    const CLEARING_EST = 2500000; // Base estimate
    const REGISTRATION_EST = 150000;

    const buyerPremium = currentBid * BUYER_PREMIUM_RATE;
    const totalLandedCost = currentBid + buyerPremium + DOCUMENTATION_FEE + SHIPPING_EST + CLEARING_EST + REGISTRATION_EST;
    const estimatedMarketValue = currentBid * 1.4; // Rough estimate of market value
    const potentialSavings = estimatedMarketValue - totalLandedCost;

    return (
        <Card className="border-auction-gold/20 shadow-lg bg-gray-50/50">
            <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-deep-navy">
                    <Calculator className="h-5 w-5 text-auction-gold" />
                    <span>Estimated Landed Cost</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Detailed Breakdown</span>
                        <span className="font-medium text-deep-navy">If you win at {formatCurrency(currentBid)}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-border space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Winning Bid</span>
                            <span className="font-semibold">{formatCurrency(currentBid)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Buyer Premium (5%)</span>
                            <span>{formatCurrency(buyerPremium)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Doc Fee</span>
                            <span>{formatCurrency(DOCUMENTATION_FEE)}</span>
                        </div>
                        <div className="border-t border-dashed my-2" />
                        <div className="flex justify-between text-muted-foreground">
                            <span className="flex items-center gap-1"><Plane className="h-3 w-3" /> Shipping (Est.)</span>
                            <span>{formatCurrency(SHIPPING_EST)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Customs & Clearing</span>
                            <span>{formatCurrency(CLEARING_EST)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Registration</span>
                            <span>{formatCurrency(REGISTRATION_EST)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Label className="text-xs whitespace-nowrap">Destination:</Label>
                    <Select value={destination} onValueChange={setDestination}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Lagos">Lagos (Tincan/Apapa)</SelectItem>
                            <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-end mb-1">
                        <span className="font-bold text-deep-navy">Total Landed Cost</span>
                        <span className="font-black text-xl text-deep-navy">{formatCurrency(totalLandedCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-success-green font-medium">
                        <span>Est. Market Value: {formatCurrency(estimatedMarketValue)}</span>
                        <span>Save {formatCurrency(potentialSavings)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
