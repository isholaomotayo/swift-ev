"use client";

import { Badge } from "@/components/ui/badge";
import { Gavel, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

export type BidStatus =
  | "active"
  | "winning"
  | "outbid"
  | "won"
  | "cancelled"
  | string;

interface BidStatusBadgeProps {
  status: BidStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { className: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: {
    className: "bg-volt-green/20 text-volt-green border-volt-green/30",
    label: "Active",
    icon: Clock,
  },
  winning: {
    className: "bg-electric-blue/20 text-electric-blue border-electric-blue/30",
    label: "Winning",
    icon: TrendingUp,
  },
  outbid: {
    className: "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
    label: "Outbid",
    icon: XCircle,
  },
  won: {
    className: "bg-volt-green/20 text-volt-green border-volt-green/30",
    label: "Won",
    icon: CheckCircle,
  },
  cancelled: {
    className: "bg-muted text-muted-foreground",
    label: "Cancelled",
    icon: XCircle,
  },
};

export function BidStatusBadge({ status, className }: BidStatusBadgeProps) {
  const config =
    STATUS_CONFIG[status] ||
    ({
      className: "bg-muted text-muted-foreground",
      label: status,
      icon: Gavel,
    } as const);

  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className || ""}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

