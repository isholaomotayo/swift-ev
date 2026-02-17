"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, calculateServiceFee } from "@/lib/utils";
import * as m from "@/src/paraglide/messages.js";

export function ServiceFeeCalculator() {
  const [bidAmount, setBidAmount] = useState<string>("1000000");
  const calculatedFee = calculateServiceFee(Number(bidAmount) || 0);

  return (
    <Card className="p-8">
      <h2 className="text-3xl font-bold mb-4 text-center">
        {m.common_service_fee_calculator()}
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        {m.common_calculate_service_fee_desc()}
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bidAmount">{m.common_winning_bid_amount()}</Label>
          <Input
            id="bidAmount"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={m.common_enter_bid_amount()}
            className="mt-2"
          />
        </div>

        <div className="bg-muted p-6 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {m.common_winning_bid()}
            </span>
            <span className="font-semibold">
              {formatCurrency(Number(bidAmount) || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {m.common_service_fee()}
            </span>
            <span className="font-semibold text-electric-blue">
              {formatCurrency(calculatedFee)}
            </span>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">{m.common_total_amount()}</span>
            <span className="text-2xl font-bold">
              {formatCurrency(
                (Number(bidAmount) || 0) + calculatedFee
              )}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>{m.common_service_fee_structure()}</strong>
            <br />
            {m.common_up_to_1m_fixed_75000()}
            <br />
            {m.common_1m_5m_7_of_bid_amount()}
            <br />
            {m.common_5m_15m_6_of_bid_amount()}
            <br />
            {m.common_above_15m_5_of_bid_amount()}
          </p>
        </div>
      </div>
    </Card>
  );
}

