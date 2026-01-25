"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { calculateTimeRemaining, getTimeRemainingColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AuctionTimerProps {
  endsAt: number;
  onExpire?: () => void;
  variant?: "default" | "compact" | "large";
  className?: string;
}

export function AuctionTimer({
  endsAt,
  onExpire,
  variant = "default",
  className,
}: AuctionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining(endsAt)
  );
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(endsAt);
      setTimeRemaining(remaining);

      // Check if expired
      if (remaining === "Ended" && !hasExpired) {
        setHasExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, hasExpired, onExpire]);

  const colorClass = getTimeRemainingColor(endsAt);

  if (variant === "compact") {
    return (
      <span className={cn("flex items-center gap-1 text-sm", colorClass, className)}>
        <Clock className="h-3 w-3" />
        {timeRemaining}
      </span>
    );
  }

  if (variant === "large") {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time Remaining</span>
        </div>
        <span className={cn("text-3xl font-bold font-mono", colorClass)}>
          {timeRemaining}
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Ends in:</span>
      <span className={cn("font-semibold font-mono", colorClass)}>
        {timeRemaining}
      </span>
    </div>
  );
}
