"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, CreditCard, Truck, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function OrderDetailsPage() {
  const params = useParams();
  const { token } = useAuth();
  const orderId = params.id as Id<"orders">;

  // Fetch order details
  const orderDetails = useQuery(
    api.orders.getOrderDetails,
    token && orderId ? { token, orderId } : "skip"
  );

  if (!orderDetails) {
    return (
      <div className="container mx-auto p-8 max-w-5xl">
        <Card className="p-8 text-center text-gray-500">Loading order details...</Card>
      </div>
    );
  }

  const { order, buyer, vehicle, payments, shipments } = orderDetails;

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
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/orders">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-500 mt-1">Placed on {formatDate(order._creationTime)}</p>
          </div>
          <Badge variant={getStatusColor(order.status)} className="text-base px-4 py-2">
            {order.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Information */}
          {vehicle && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Vehicle Details</h2>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                <p className="text-sm text-gray-500">VIN: {vehicle.vin}</p>
                <p className="text-sm text-gray-500">Lot Number: {vehicle.lotNumber}</p>
              </div>
            </Card>
          )}

          {/* Payment Information */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Payment Details</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Winning Bid</span>
                <span className="font-medium">{formatCurrency(order.winningBid || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-medium">{formatCurrency(order.serviceFee || 0)}</span>
              </div>
              {order.documentationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Documentation Fee</span>
                  <span className="font-medium">{formatCurrency(order.documentationFee)}</span>
                </div>
              )}
              {order.shippingCost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Cost</span>
                  <span className="font-medium">{formatCurrency(order.shippingCost)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {payments && payments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Payment Records</h3>
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{payment.provider}</p>
                        <p className="text-gray-500">{formatDate(payment._creationTime)}</p>
                      </div>
                      <Badge
                        variant={
                          payment.status === "successful"
                            ? "default"
                            : payment.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Shipping Information */}
          {shipments && shipments.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Shipping Details</h2>
              </div>

              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div key={shipment._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{shipment.shippingLine || 'N/A'}</p>
                      <Badge variant="secondary">{shipment.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Tracking: {shipment.trackingNumber || 'N/A'}
                    </p>
                    {shipment.estimatedArrival && (
                      <p className="text-sm text-gray-500">
                        Estimated Arrival: {formatDate(shipment.estimatedArrival)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Buyer Information */}
          {buyer && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Buyer Information</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-600">Name:</span>{" "}
                  {buyer.firstName} {buyer.lastName}
                </p>
                <p>
                  <span className="text-gray-600">Email:</span> {buyer.email}
                </p>
                {buyer.phone && (
                  <p>
                    <span className="text-gray-600">Phone:</span> {buyer.phone}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Shipping Address */}
          {order.deliveryAddress && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Shipping Address</h3>
              <div className="text-sm space-y-1">
                <p>{order.deliveryAddress.street}</p>
                <p>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </p>
                <p>{order.deliveryAddress.country}</p>
                {order.deliveryAddress.postalCode && <p>{order.deliveryAddress.postalCode}</p>}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
