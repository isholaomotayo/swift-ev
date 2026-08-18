"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useEffectiveCurrency } from "@/store/currency";
import { useExchangeRates, type ExchangeRates } from "@/hooks/use-exchange-rates";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  CNY: "¥",
  GBP: "£",
};

export function getRateForCurrency(currency: string, rates: ExchangeRates): number {
  switch (currency) {
    case "USD":
      return rates.usdToNgn > 0 ? 1 / rates.usdToNgn : 1 / 1650;
    case "CNY":
      return rates.cnyToNgn > 0 ? 1 / rates.cnyToNgn : 1 / 230;
    case "GBP":
      return rates.gbpToNgn > 0 ? 1 / rates.gbpToNgn : 1 / 2100;
    case "NGN":
    default:
      return 1;
  }
}

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** Amount in base NGN (if isBaseNgn=true) or direct target currency (if isBaseNgn=false) */
  value?: number | string;
  /** Callback emitted with the converted NGN numeric amount when isBaseNgn=true, or direct numeric amount */
  onChangeValue?: (numericNgnValue: number) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currency?: string;
  showSymbol?: boolean;
  /** Whether the parent value is stored in base NGN (default: true). Handles live currency conversion! */
  isBaseNgn?: boolean;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = "",
      onChangeValue,
      onChange,
      currency: overrideCurrency,
      showSymbol = true,
      isBaseNgn = true,
      className,
      id,
      placeholder = "0",
      ...props
    },
    ref
  ) => {
    const storeCurrency = useEffectiveCurrency();
    const exchangeRates = useExchangeRates();
    const activeCurrency = overrideCurrency ?? storeCurrency;
    const symbol = CURRENCY_SYMBOLS[activeCurrency] || "₦";

    const rate = isBaseNgn ? getRateForCurrency(activeCurrency, exchangeRates) : 1;

    // Convert NGN amount to target currency amount
    const formatDisplay = React.useCallback(
      (valNgn: number | string) => {
        if (valNgn === "" || valNgn === undefined || valNgn === null) return "";
        const numNgn = typeof valNgn === "number" ? valNgn : parseFloat(valNgn.toString().replace(/,/g, ""));
        if (isNaN(numNgn)) return "";
        if (numNgn === 0) return "0";

        const converted = isBaseNgn ? numNgn * rate : numNgn;
        const decimals = activeCurrency === "NGN" ? 0 : 2;

        return converted.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        });
      },
      [activeCurrency, isBaseNgn, rate]
    );

    const [displayString, setDisplayString] = React.useState(() => formatDisplay(value));

    // Update display when value, activeCurrency, or rate changes
    React.useEffect(() => {
      setDisplayString(formatDisplay(value));
    }, [value, formatDisplay]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const cleanDigits = rawInput.replace(/[^\d.]/g, "");

      if (cleanDigits === "") {
        setDisplayString("");
        onChangeValue?.(0);
        if (onChange) {
          e.target.value = "0";
          onChange(e);
        }
        return;
      }

      const targetVal = parseFloat(cleanDigits);
      if (!isNaN(targetVal)) {
        // Format display with commas
        const parts = cleanDigits.split(".");
        const intPart = parseInt(parts[0] || "0", 10).toLocaleString("en-US");
        const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
        setDisplayString(formatted);

        // Convert back to NGN for parent form state if isBaseNgn is true
        const ngnVal = isBaseNgn ? (rate > 0 ? Math.round(targetVal / rate) : targetVal) : targetVal;

        onChangeValue?.(ngnVal);
        if (onChange) {
          e.target.value = ngnVal.toString();
          onChange(e);
        }
      }
    };

    return (
      <div className="relative flex items-center w-full">
        {showSymbol && (
          <span className="absolute left-3 font-bold text-muted-foreground text-sm pointer-events-none select-none z-10">
            {symbol}
          </span>
        )}
        <Input
          {...props}
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          value={displayString}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "font-mono text-base font-semibold transition-colors",
            showSymbol ? "pl-8" : "",
            className
          )}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
