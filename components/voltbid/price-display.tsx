import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  amount: number;
  label?: string;
  variant?: "default" | "large" | "compact";
  className?: string;
  currency?: string;
  locale?: string;
}

export function PriceDisplay({
  amount,
  label,
  variant = "default",
  className,
  currency = "NGN",
  locale = "en-NG",
}: PriceDisplayProps) {
  const formattedPrice = formatCurrency(amount, { currency, locale });

  if (variant === "compact") {
    return (
      <span className={cn("font-mono text-sm", className)}>
        {formattedPrice}
      </span>
    );
  }

  if (variant === "large") {
    return (
      <div className={cn("flex flex-col", className)}>
        {label && (
          <span className="text-sm text-muted-foreground mb-1">{label}</span>
        )}
        <span className="text-4xl font-bold font-mono text-electric-blue">
          {formattedPrice}
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <span className="text-xs text-muted-foreground mb-0.5">{label}</span>
      )}
      <span className="text-xl font-semibold font-mono text-foreground">
        {formattedPrice}
      </span>
    </div>
  );
}
