import { Badge } from "@/components/ui/badge";
import { getBatteryHealthBadge } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BatteryHealthBadgeProps {
  healthPercent: number;
  className?: string;
  showLabel?: boolean;
}

export function BatteryHealthBadge({
  healthPercent,
  className,
  showLabel = true,
}: BatteryHealthBadgeProps) {
  const { label, color } = getBatteryHealthBadge(healthPercent);

  return (
    <Badge className={cn(color, className)} variant="secondary">
      {showLabel ? `${label} (${healthPercent}%)` : `${healthPercent}%`}
    </Badge>
  );
}
