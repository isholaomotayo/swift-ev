"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCurrencyStore } from "@/store/currency";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { Calculator, Plane, FileText, ShieldCheck } from "lucide-react";
import {
  calculateBuyNowPricing,
  DESTINATION_LABELS,
  type DestinationPort,
} from "@/lib/buy-now-pricing";

interface LandedCostCalculatorProps {
  currentBid: number;
}

export function LandedCostCalculator({ currentBid }: LandedCostCalculatorProps) {
  const [destination, setDestination] = useState<DestinationPort>("lagos");
  const currency = useCurrencyStore((s) => s.currency);
  const exchangeRates = useExchangeRates();

  const pricing = calculateBuyNowPricing(currentBid, destination);

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
            <span className="font-medium text-deep-navy">
              At {formatCurrency(currentBid, { currency, exchangeRates })}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-border space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Vehicle price</span>
              <span className="font-semibold">
                {formatCurrency(pricing.vehiclePrice, { currency, exchangeRates })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Service fee</span>
              <span>
                {formatCurrency(pricing.serviceFee, { currency, exchangeRates })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Documentation</span>
              <span>
                {formatCurrency(pricing.documentationFee, {
                  currency,
                  exchangeRates,
                })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Inspection</span>
              <span>
                {formatCurrency(pricing.inspectionFee, {
                  currency,
                  exchangeRates,
                })}
              </span>
            </div>
            <div className="border-t border-dashed my-2" />
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Plane className="h-3 w-3" /> Shipping
              </span>
              <span>
                {formatCurrency(pricing.shippingCost, {
                  currency,
                  exchangeRates,
                })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> Customs & clearing
              </span>
              <span>
                {formatCurrency(pricing.customsClearingFee, {
                  currency,
                  exchangeRates,
                })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Registration
              </span>
              <span>
                {formatCurrency(pricing.registrationFee, {
                  currency,
                  exchangeRates,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Label className="text-xs whitespace-nowrap">Destination:</Label>
          <Select
            value={destination}
            onValueChange={(v) => setDestination(v as DestinationPort)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lagos">{DESTINATION_LABELS.lagos}</SelectItem>
              <SelectItem value="port_harcourt">
                {DESTINATION_LABELS.port_harcourt}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-end">
            <span className="font-bold text-deep-navy">Total Landed Cost</span>
            <span className="font-black text-xl text-deep-navy">
              {formatCurrency(pricing.totalAmount, { currency, exchangeRates })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
