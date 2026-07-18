"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { validateOrderStatus } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  PackageSearch,
  Gavel,
  ShoppingCart,
  Tag,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  Package,
  Anchor,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderType = "auction_win" | "buy_it_now" | "make_offer";
type OrderStatusKey =
  | "pending_payment"
  | "payment_partial"
  | "payment_complete"
  | "processing"
  | "shipped"
  | "in_transit"
  | "customs_clearance"
  | "cleared"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

interface EnrichedOrder {
  _id: Id<"orders">;
  _creationTime: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatusKey;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentDeadline: number;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
  deliveredAt?: number;
  auctionLotId?: string;
  buyer: { _id: string; firstName: string; lastName: string; email: string } | null;
  vehicle: { _id: string; year: number; make: string; model: string; vin?: string } | null;
  auctionInfo: { lotNumber: number; auctionName: string; auctionId: string } | null;
  winningBid: number;
  serviceFee: number;
}

interface OrdersListClientProps {
  initialOrdersData: any;
  initialStats: any;
  token: string;
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatusKey, { label: string; color: string; icon: React.ElementType }> = {
  pending_payment:   { label: "Pending Payment",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",      icon: Clock },
  payment_partial:   { label: "Payment Partial",   color: "bg-orange-500/10 text-orange-400 border-orange-500/20",   icon: CreditCard },
  payment_complete:  { label: "Payment Complete",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",icon: CheckCircle2 },
  processing:        { label: "Processing",        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",         icon: Package },
  shipped:           { label: "Shipped",           color: "bg-violet-500/10 text-violet-400 border-violet-500/20",   icon: Truck },
  in_transit:        { label: "In Transit",        color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",   icon: ArrowRightLeft },
  customs_clearance: { label: "Customs",           color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",  icon: Anchor },
  cleared:           { label: "Cleared",           color: "bg-teal-500/10 text-teal-400 border-teal-500/20",        icon: CheckCircle2 },
  out_for_delivery:  { label: "Out for Delivery",  color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",        icon: Truck },
  delivered:         { label: "Delivered",         color: "bg-green-500/10 text-green-400 border-green-500/20",     icon: CheckCircle2 },
  cancelled:         { label: "Cancelled",         color: "bg-red-500/10 text-red-400 border-red-500/20",           icon: XCircle },
  refunded:          { label: "Refunded",          color: "bg-rose-500/10 text-rose-400 border-rose-500/20",        icon: RotateCcw },
};

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; color: string; icon: React.ElementType }> = {
  auction_win: { label: "Auction Win",  color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Gavel },
  buy_it_now:  { label: "Buy It Now",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20",       icon: ShoppingCart },
  make_offer:  { label: "Make Offer",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",    icon: Tag },
};

// Valid status progressions
const NEXT_STATUSES: Partial<Record<OrderStatusKey, OrderStatusKey[]>> = {
  pending_payment:   ["payment_partial", "payment_complete", "cancelled"],
  payment_partial:   ["payment_complete", "cancelled"],
  payment_complete:  ["processing"],
  processing:        ["shipped", "cancelled"],
  shipped:           ["in_transit", "cancelled"],
  in_transit:        ["customs_clearance", "delivered", "cancelled"],
  customs_clearance: ["cleared"],
  cleared:           ["out_for_delivery"],
  out_for_delivery:  ["delivered"],
  delivered:         [],
  cancelled:         [],
  refunded:          [],
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as OrderStatusKey];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function OrderTypeBadge({ type }: { type: string }) {
  const cfg = ORDER_TYPE_CONFIG[type as OrderType];
  if (!cfg) return <Badge variant="outline">{type}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PaymentDeadlineWarning({ deadline, status }: { deadline: number; status: string }) {
  if (status !== "pending_payment" && status !== "payment_partial") return null;
  const now = Date.now();
  const isOverdue = deadline < now;
  const hoursLeft = Math.round((deadline - now) / (1000 * 60 * 60));
  if (!isOverdue && hoursLeft > 24) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium mt-0.5", isOverdue ? "text-red-400" : "text-amber-400")}>
      <AlertTriangle className="w-3 h-3" />
      {isOverdue ? "Overdue" : `${hoursLeft}h left`}
    </span>
  );
}

// ─── Revenue Breakdown ───────────────────────────────────────────────────────

function RevenueBreakdown({ stats }: { stats: any }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Revenue",    value: stats.totalRevenue,                                                                                        sub: `${stats.total} total orders`,                                               color: "text-foreground",  bg: "bg-card border-border",             icon: undefined },
    { label: "Auction Revenue",  value: stats.revenueByType?.auction_win ?? 0,                                                                      sub: `${stats.byType?.auction_win ?? 0} auction wins`,                             color: "text-purple-400",  bg: "bg-purple-500/5 border-purple-500/20", icon: Gavel },
    { label: "Direct Purchase",  value: (stats.revenueByType?.buy_it_now ?? 0) + (stats.revenueByType?.make_offer ?? 0),                            sub: `${(stats.byType?.buy_it_now ?? 0) + (stats.byType?.make_offer ?? 0)} orders`, color: "text-blue-400",    bg: "bg-blue-500/5 border-blue-500/20",     icon: ShoppingCart },
    { label: "Collected",        value: stats.totalPaidAmount ?? 0,                                                                                  sub: `${formatCurrency(stats.totalBalanceDue ?? 0)} outstanding`,                  color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20", icon: CheckCircle2 },
    { label: "Awaiting Payment", count: (stats.byStatus?.pending_payment ?? 0) + (stats.byStatus?.payment_partial ?? 0), sub: "need action",          color: "text-amber-400",  bg: "bg-amber-500/5 border-amber-500/20",    icon: Clock },
    { label: "In Transit",       count: stats.inTransit ?? 0,                                                             sub: "en route",             color: "text-indigo-400",  bg: "bg-indigo-500/5 border-indigo-500/20",  icon: Truck },
    { label: "Delivered",        count: stats.delivered ?? 0,                                                             sub: "completed",            color: "text-green-400",   bg: "bg-green-500/5 border-green-500/20",    icon: CheckCircle2 },
  ] as Array<{ label: string; value?: number; count?: number; sub: string; color: string; bg: string; icon?: React.ElementType }>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={cn("p-4 border", card.bg)}>
            <div className="flex items-center gap-1.5 mb-2">
              {Icon && <Icon className={cn("w-3.5 h-3.5", card.color)} />}
              <div className="text-xs text-muted-foreground font-medium truncate">{card.label}</div>
            </div>
            {card.value !== undefined ? (
              <div className={cn("text-lg font-bold tabular-nums", card.color)}>{formatCurrency(card.value)}</div>
            ) : (
              <div className={cn("text-2xl font-bold tabular-nums", card.color)}>{card.count}</div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{card.sub}</div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Order Detail Drawer ─────────────────────────────────────────────────────

function OrderDetailDrawer({ order, token, onClose }: { order: EnrichedOrder | null; token: string; onClose: () => void }) {
  const { toast } = useToast();
  const [statusValue, setStatusValue] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const revokePurchase = useMutation(api.orders.revokePurchase);

  const orderId = order?._id ?? null;
  const details = useQuery(
    api.orders.getOrderDetails,
    orderId ? { token, orderId: orderId as string } : "skip"
  );

  if (!order) return null;

  const currentStatus = order.status as OrderStatusKey;
  const availableTransitions = NEXT_STATUSES[currentStatus] ?? [];
  const canRevoke = currentStatus === "pending_payment" || currentStatus === "payment_partial";

  const handleStatusUpdate = async () => {
    if (!statusValue || !orderId) return;
    setUpdatingStatus(true);
    try {
      await updateOrderStatus({ token, orderId: orderId as string, status: statusValue as any, notes: notes || undefined });
      toast({ title: "Status updated", description: `Order moved to ${STATUS_CONFIG[statusValue as OrderStatusKey]?.label ?? statusValue}` });
      setStatusValue("");
      setNotes("");
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRevoke = async () => {
    if (!orderId) return;
    if (!window.confirm(`Revoke purchase for order #${order.orderNumber}? The vehicle will return to inventory.`)) return;
    setRevoking(true);
    try {
      const result = await revokePurchase({ token, orderId: orderId as string });
      toast({
        title: "Purchase revoked",
        description: `Order #${order.orderNumber} cancelled.` +
          (typeof result?.refundedDepositNaira === "number" && result.refundedDepositNaira > 0
            ? ` Deposit ₦${result.refundedDepositNaira.toLocaleString()} refunded.` : ""),
      });
      onClose();
    } catch (err) {
      toast({ title: "Revoke failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-mono text-lg">#{order.orderNumber}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <OrderTypeBadge type={order.orderType} />
            <StatusBadge status={order.status} />
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Vehicle + Buyer */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Vehicle</div>
                <div className="font-semibold text-sm">{order.vehicle ? `${order.vehicle.year} ${order.vehicle.make} ${order.vehicle.model}` : "—"}</div>
                {order.vehicle?.vin && <div className="text-xs text-muted-foreground font-mono mt-0.5">{order.vehicle.vin}</div>}
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Buyer</div>
                <div className="font-semibold text-sm">{order.buyer ? `${order.buyer.firstName} ${order.buyer.lastName}` : "—"}</div>
                {order.buyer?.email && <div className="text-xs text-muted-foreground mt-0.5 truncate">{order.buyer.email}</div>}
              </div>
              {order.auctionInfo && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 col-span-2">
                  <div className="text-xs text-purple-400 font-medium flex items-center gap-1.5 mb-1"><Gavel className="w-3 h-3" /> Auction Source</div>
                  <div className="font-semibold text-sm">{order.auctionInfo.auctionName}</div>
                  <div className="text-xs text-muted-foreground">Lot #{order.auctionInfo.lotNumber}</div>
                </div>
              )}
            </div>
          </section>

          {/* Financials */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financials</h3>
            <div className="space-y-0 text-sm divide-y divide-border/50">
              {[
                { label: "Purchase Price", value: order.winningBid },
                { label: "Service Fee", value: order.serviceFee },
                { label: "Total Amount", value: order.totalAmount, bold: true },
                { label: "Paid", value: order.paidAmount, highlight: "emerald" },
                { label: "Balance Due", value: order.balanceDue, highlight: order.balanceDue > 0 ? "amber" : "" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2">
                  <span className={cn("text-muted-foreground", row.bold && "text-foreground font-semibold")}>{row.label}</span>
                  <span className={cn("font-medium tabular-nums", row.bold && "font-bold text-base",
                    row.highlight === "emerald" && "text-emerald-400",
                    row.highlight === "amber" && "text-amber-400",
                  )}>
                    {formatCurrency(row.value ?? 0)}
                  </span>
                </div>
              ))}
            </div>
            {(currentStatus === "pending_payment" || currentStatus === "payment_partial") && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                <Clock className="w-3 h-3" />
                Deadline: {formatDate(order.paymentDeadline)}
                {order.paymentDeadline < Date.now() && <span className="text-red-400 font-medium ml-1">(OVERDUE)</span>}
              </div>
            )}
          </section>

          {/* Payments */}
          {details?.payments && details.payments.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Payment Records ({details.payments.length})
              </h3>
              <div className="space-y-2">
                {details.payments.map((p: any) => (
                  <div key={p._id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5 text-sm">
                    <div>
                      <span className="font-medium capitalize">{p.provider.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground text-xs ml-2 capitalize">{p.paymentType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize",
                        p.status === "successful" ? "bg-emerald-500/10 text-emerald-400" :
                        p.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      )}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Shipments */}
          {details?.shipments && details.shipments.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shipment Tracking</h3>
              {details.shipments.map((s: any) => (
                <div key={s._id} className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{s.shippingLine || "Unknown carrier"}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.trackingNumber && <div className="font-mono text-xs text-muted-foreground">Tracking: {s.trackingNumber}</div>}
                  <div className="text-xs text-muted-foreground">{s.originPort} → {s.destinationPort}</div>
                  {s.estimatedArrival && <div className="text-xs text-muted-foreground">ETA: {formatDate(s.estimatedArrival)}</div>}
                </div>
              ))}
            </section>
          )}

          {/* Status Update */}
          {availableTransitions.length > 0 && (
            <section className="bg-muted/30 rounded-xl p-4 border border-border/60">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Update Order Status
              </h3>
              <div className="space-y-3">
                <Select value={statusValue} onValueChange={setStatusValue}>
                  <SelectTrigger><SelectValue placeholder="Select new status…" /></SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button className="w-full" disabled={!statusValue || updatingStatus} onClick={handleStatusUpdate}>
                  {updatingStatus ? "Updating…" : "Apply Status Update"}
                </Button>
              </div>
            </section>
          )}

          {/* Revoke */}
          {canRevoke && (
            <section className="border border-red-500/20 rounded-xl p-4 bg-red-500/5">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Revoking returns the vehicle to inventory and refunds any deposit. Only for unpaid orders.
              </p>
              <Button variant="destructive" className="w-full" disabled={revoking} onClick={handleRevoke}>
                {revoking ? "Revoking…" : "Revoke Purchase"}
              </Button>
            </section>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
            <div className="flex justify-between"><span>Created</span><span>{formatDate(order._creationTime)}</span></div>
            {order.paidAt && <div className="flex justify-between"><span>Paid</span><span className="text-emerald-400">{formatDate(order.paidAt)}</span></div>}
            {order.deliveredAt && <div className="flex justify-between"><span>Delivered</span><span className="text-emerald-400">{formatDate(order.deliveredAt)}</span></div>}
          </div>
        </div>
        </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OrdersListClient({ initialOrdersData, initialStats, token }: OrdersListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null);
  const pageSize = 25;

  const ordersData = useQuery(
    api.orders.listOrders,
    token ? {
      token,
      status: validateOrderStatus(statusFilter || undefined),
      orderType: (typeFilter || undefined) as any,
      limit: pageSize,
      offset: page * pageSize,
    } : "skip"
  ) ?? initialOrdersData;

  const stats = useQuery(api.orders.getOrderStats, token ? { token } : "skip") ?? initialStats;

  const displayedOrders: EnrichedOrder[] = (ordersData?.orders ?? []).filter((order: EnrichedOrder) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(q) ||
      order.buyer?.firstName?.toLowerCase().includes(q) ||
      order.buyer?.lastName?.toLowerCase().includes(q) ||
      order.buyer?.email?.toLowerCase().includes(q) ||
      order.vehicle?.vin?.toLowerCase().includes(q) ||
      `${order.vehicle?.year} ${order.vehicle?.make} ${order.vehicle?.model}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All orders — auction wins, direct purchases, and offers</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </div>

      {/* Revenue Breakdown */}
      <RevenueBreakdown stats={stats} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <Input
            placeholder="Search order #, buyer, VIN, vehicle…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter || "all_types"} onValueChange={(v) => { setTypeFilter(v === "all_types" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All Types</SelectItem>
            <SelectItem value="auction_win">🔨 Auction Win</SelectItem>
            <SelectItem value="buy_it_now">🛒 Buy It Now</SelectItem>
            <SelectItem value="make_offer">🏷️ Make Offer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all_statuses"} onValueChange={(v) => { setStatusFilter(v === "all_statuses" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}{stats?.byStatus?.[key] ? <span className="ml-2 text-muted-foreground text-xs">({stats.byStatus[key]})</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter chips */}
      {(statusFilter || typeFilter) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {typeFilter && (
            <button onClick={() => setTypeFilter("")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              {ORDER_TYPE_CONFIG[typeFilter as OrderType]?.label ?? typeFilter}<X className="w-3 h-3" />
            </button>
          )}
          {statusFilter && (
            <button onClick={() => setStatusFilter("")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              {STATUS_CONFIG[statusFilter as OrderStatusKey]?.label ?? statusFilter}<X className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => { setStatusFilter(""); setTypeFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear all</button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-40">Order #</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!ordersData ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-border border-t-blue-400 rounded-full animate-spin" />
                      Loading orders…
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                    <PackageSearch className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No orders found</p>
                    <p className="text-xs mt-1">{search || statusFilter || typeFilter ? "Try adjusting your filters" : "No orders have been created yet"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                displayedOrders.map((order) => (
                  <TableRow key={order._id} className="cursor-pointer hover:bg-muted/20 transition-colors group" onClick={() => setSelectedOrder(order)}>
                    <TableCell>
                      <div className="font-mono text-sm font-semibold">#{order.orderNumber}</div>
                      {order.auctionInfo && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-36">
                          {order.auctionInfo.auctionName} · Lot {order.auctionInfo.lotNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><OrderTypeBadge type={order.orderType} /></TableCell>
                    <TableCell>
                      {order.buyer ? (
                        <div>
                          <div className="font-medium text-sm">{order.buyer.firstName} {order.buyer.lastName}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-40">{order.buyer.email}</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {order.vehicle ? (
                        <div>
                          <div className="font-medium text-sm">{order.vehicle.year} {order.vehicle.make} {order.vehicle.model}</div>
                          {order.vehicle.vin && <div className="text-xs text-muted-foreground font-mono">{order.vehicle.vin}</div>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold tabular-nums text-sm">{formatCurrency(order.totalAmount)}</div>
                      {order.balanceDue > 0 && <div className="text-xs text-amber-400 tabular-nums">{formatCurrency(order.balanceDue)} due</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={order.status} />
                        <PaymentDeadlineWarning deadline={order.paymentDeadline} status={order.status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(order._creationTime)}</TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {ordersData && ordersData.total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, ordersData.total)} of{" "}
              <span className="font-medium text-foreground">{ordersData.total}</span> orders
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= ordersData.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Drawer */}
      <OrderDetailDrawer order={selectedOrder} token={token} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

