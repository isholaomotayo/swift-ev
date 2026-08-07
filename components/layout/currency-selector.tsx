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
          className="gap-1.5 px-2.5 h-9 text-slate-700 hover:text-brand-primary dark:text-slate-200 dark:hover:text-white font-medium"
          aria-label="Select Currency"
        >
          <span className="text-sm font-bold text-brand-primary dark:text-brand-gold">{activeCurrencyInfo.symbol}</span>
          <span className="font-semibold text-xs sm:text-sm">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 border-slate-200 dark:border-white/10 dark:bg-slate-900 shadow-lg z-50">
        {(Object.keys(currencyNames) as SupportedCurrency[]).map((cur) => {
          const item = currencyNames[cur];
          return (
            <DropdownMenuItem
              key={cur}
              onClick={() => setCurrency(cur)}
              className={`cursor-pointer flex items-center justify-between gap-2 text-xs px-3 py-2 ${
                currency === cur
                  ? "bg-accent font-bold text-accent-foreground"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.flag}</span>
                <span className="font-bold w-4 text-center">{item.symbol}</span>
                <span className="font-bold">{cur}</span>
              </div>
              <span className="text-muted-foreground text-[11px] font-normal">{item.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
