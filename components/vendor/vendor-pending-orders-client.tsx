"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { Clock, PackageSearch, ExternalLink } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const data = useQuery(api.orders.getVendorPendingOrders, { token });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending payments</h1>
        <p className="text-muted-foreground mt-1">
          Buyers who reserved your vehicles and still need to complete payment.
          You can view status; only the buyer can pay.
        </p>
      </div>

      <Card>
        {!data ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : data.orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <PackageSearch className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">No pending payments</p>
            <p className="text-sm mt-1">
              When a buyer uses Buy Now or wins an auction on your listing, it will
              show here until they pay.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance due</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.map((row) => {
                const overdue = row.paymentDeadline < Date.now();
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
                    <TableCell className="capitalize text-sm">
                      {row.orderType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(row.balanceDue)}
                      <div className="text-xs text-muted-foreground">
                        of {formatCurrency(row.totalAmount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock
                          className={`h-3.5 w-3.5 ${
                            overdue ? "text-destructive" : "text-muted-foreground"
                          }`}
                        />
                        <span className={overdue ? "text-destructive font-medium" : ""}>
                          {formatDate(row.paymentDeadline)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={overdue ? "destructive" : "secondary"}>
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
