"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Clock, PackageSearch, ExternalLink, ShieldCheck, FileText, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

interface VendorPendingOrdersClientProps {
  token: string;
}

export function VendorPendingOrdersClient({
  token,
}: VendorPendingOrdersClientProps) {
  const [tab, setTab] = useState<"all" | "pending">("all");
  const data = useQuery(api.orders.getVendorOrders, { token });

  const orders = data?.orders || [];
  const filteredOrders = tab === "pending"
    ? orders.filter(o => o.status === "pending_payment" || o.status === "payment_partial")
    : orders;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Orders &amp; Fulfillment</h1>
          <p className="text-muted-foreground mt-1">
            Track sales across all 11 user journey steps — payment, escrow guarantee, shipment, and vehicle registration.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Sales ({orders.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Payment ({orders.filter(o => o.status === "pending_payment" || o.status === "payment_partial").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        {!data ? (
          <div className="p-8 text-center text-muted-foreground">Loading seller orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <PackageSearch className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">No orders found</p>
            <p className="text-sm mt-1">
              When buyers purchase your listed vehicles via Buy Now or auction win, sales will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Guarantee</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((row) => {
                const overdue = (row.status === "pending_payment" || row.status === "payment_partial") && row.paymentDeadline < Date.now();
                return (
                  <TableRow key={row.orderId}>
                    <TableCell className="font-mono font-medium">
                      #{row.orderNumber}
                    </TableCell>
                    <TableCell>
                      {row.vehicle ? (
                        <div>
                          <div className="font-medium">
                            {row.vehicle.year} {row.vehicle.make}{" "}
                            {row.vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            LOT #{row.vehicle.lotNumber}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.buyer ? (
                        <div>
                          <div className="font-medium">{row.buyer.firstName} {row.buyer.lastName}</div>
                          <div className="text-xs text-muted-foreground">{row.buyer.email}</div>
                        </div>
                      ) : (
                        "Buyer"
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-xs font-semibold">
                      <Badge variant="outline">{row.orderType.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCurrency(row.totalAmount)}
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatCurrency(row.paidAmount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.registrationStatus === "submitted" || row.registrationStatus === "approved" ? "default" : "secondary"} className="text-[10px]">
                        <FileText className="w-3 h-3 mr-1" />
                        {row.registrationStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={overdue ? "destructive" : row.status === "delivered" ? "default" : "secondary"}>
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/orders/${row.orderId}`}>
                          View
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

