"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackageSearch, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";

export default function OrdersPage() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Fetch user's orders
  const orders = useQuery(api.orders.getUserOrders, token ? { token } : "skip");

  // Filter orders
  const filteredOrders = orders
    ? statusFilter
      ? orders.filter((o) => o.status === statusFilter)
      : orders
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "default";
      case "in_transit":
      case "shipped":
        return "secondary";
      case "pending_payment":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-gray-500 mt-1">Track your vehicle purchases</p>
        </div>

        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="payment_complete">Payment Complete</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {!orders ? (
        <Card className="p-8 text-center text-gray-500">Loading orders...</Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <PackageSearch className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-gray-500 mb-4">
            {statusFilter
              ? "No orders with this status"
              : "You haven't placed any orders yet"}
          </p>
          {!statusFilter && (
            <Button asChild>
              <Link href="/vehicles">Browse Vehicles</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">{formatDate(order._creationTime)}</p>
                </div>
                <Badge variant={getStatusColor(order.status)}>
                  {order.status.replace("_", " ")}
                </Badge>
              </div>

              {order.vehicle && (
                <div className="mb-4">
                  <p className="font-medium">
                    {order.vehicle.year} {order.vehicle.make} {order.vehicle.model}
                  </p>
                  <p className="text-sm text-gray-500">Type: {order.orderType.replace("_", " ")}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/orders/${order._id}`}>
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
