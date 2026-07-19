"use client";

import { useCurrencyStore, type SupportedCurrency } from "@/store/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const currencyNames: Record<SupportedCurrency, { name: string; flag: string; symbol: string }> = {
  NGN: { name: "Naira", flag: "🇳🇬", symbol: "₦" },
  USD: { name: "US Dollar", flag: "🇺🇸", symbol: "$" },
  CNY: { name: "Yuan", flag: "🇨🇳", symbol: "¥" },
  GBP: { name: "Pound", flag: "🇬🇧", symbol: "£" },
};

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore();

  const activeCurrencyInfo = currencyNames[currency] || { name: currency, flag: "", symbol: "" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-slate-700 hover:text-brand-primary dark:text-slate-200 dark:hover:text-white"
        >
          <span className="font-semibold text-sm">{activeCurrencyInfo.symbol} {currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-slate-200 dark:border-white/10 dark:bg-slate-900">
        {(Object.keys(currencyNames) as SupportedCurrency[]).map((cur) => (
          <DropdownMenuItem
            key={cur}
            onClick={() => setCurrency(cur)}
            className={`flex items-center gap-2 cursor-pointer ${
              currency === cur ? "bg-accent font-semibold" : ""
            }`}
          >
            <span className="font-bold w-4 text-center">{currencyNames[cur].symbol}</span>
            <span className="font-bold">{cur}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
