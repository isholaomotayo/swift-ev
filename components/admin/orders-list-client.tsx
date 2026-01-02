"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
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
import { Search, Download, PackageSearch } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface OrdersListClientProps {
  initialOrdersData: any;
  initialStats: any;
  token: string;
}

export function OrdersListClient({
  initialOrdersData,
  initialStats,
  token,
}: OrdersListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Use useQuery for real-time updates
  const ordersData = useQuery(
    api.orders.listOrders,
    token
      ? {
          token,
          status: validateOrderStatus(statusFilter || undefined),
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip",
    initialOrdersData
  );

  const stats = useQuery(
    api.orders.getOrderStats,
    token ? { token } : "skip",
    initialStats
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "default";
      case "in_transit":
      case "shipped":
        return "secondary";
      case "pending_payment":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-500 mt-1">Track and manage all orders</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Pending Payment</div>
            <div className="text-2xl font-bold mt-1 text-yellow-600">
              {stats.pendingPayment}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">In Transit</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">
              {stats.inTransit}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Delivered</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {stats.delivered}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order #, buyer name, or VIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="payment_complete">Payment Complete</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="customs_clearance">Customs Clearance</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!ordersData ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : ordersData.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <PackageSearch className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              ordersData.orders.map((order: any) => (
                <TableRow key={order._id}>
                  <TableCell className="font-medium font-mono">
                    #{order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {order.buyer ? (
                      <div>
                        <div className="font-medium">
                          {order.buyer.firstName} {order.buyer.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{order.buyer.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.vehicle ? (
                      <div>
                        <div className="font-medium">
                          {order.vehicle.year} {order.vehicle.make} {order.vehicle.model}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          VIN: {order.vehicle.vin}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(order._creationTime)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {ordersData && ordersData.total > pageSize && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {page * pageSize + 1} to{" "}
              {Math.min((page + 1) * pageSize, ordersData.total)} of {ordersData.total} orders
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= ordersData.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

