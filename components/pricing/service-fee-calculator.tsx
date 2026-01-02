"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, calculateServiceFee } from "@/lib/utils";

export function ServiceFeeCalculator() {
  const [bidAmount, setBidAmount] = useState<string>("1000000");
  const calculatedFee = calculateServiceFee(Number(bidAmount) || 0);

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold mb-4 text-center">
        Service Fee Calculator
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Calculate the service fee for your winning bid amount
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bidAmount">Winning Bid Amount (₦)</Label>
          <Input
            id="bidAmount"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Enter bid amount"
            className="mt-2"
          />
        </div>

        <div className="bg-muted p-6 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Winning Bid:
            </span>
            <span className="font-semibold">
              {formatCurrency(Number(bidAmount) || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Service Fee:
            </span>
            <span className="font-semibold text-electric-blue">
              {formatCurrency(calculatedFee)}
            </span>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold">
              {formatCurrency(
                (Number(bidAmount) || 0) + calculatedFee
              )}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Service Fee Structure:</strong>
            <br />
            • Up to ₦1M: Fixed ₦75,000
            <br />
            • ₦1M - ₦5M: 7% of bid amount
            <br />
            • ₦5M - ₦15M: 6% of bid amount
            <br />• Above ₦15M: 5% of bid amount
          </p>
        </div>
      </div>
    </Card>
  );
}

