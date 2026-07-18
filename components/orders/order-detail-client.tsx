"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, CreditCard, Truck, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ServiceSelector } from "@/components/services/service-selector";
import { OrderPaymentPanel } from "@/components/orders/order-payment-panel";

interface OrderDetailClientProps {
  initialOrderDetails: any;
  token: string;
  orderId: Id<"orders">;
}

export function OrderDetailClient({
  initialOrderDetails,
  token,
  orderId,
}: OrderDetailClientProps) {
  // Use useQuery for real-time updates
  const orderDetails = useQuery(
    api.orders.getOrderDetails,
    token && orderId ? { token, orderId } : "skip"
  ) ?? initialOrderDetails;

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

  const additionalServicesCost = orderDetails.additionalServices?.reduce((acc: number, s: any) => acc + s.cost, 0) || 0;
  const totalWithServices = order.totalAmount + additionalServicesCost;

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
              {(order.status === "pending_payment" ||
                order.status === "payment_partial") && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 mb-2">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Payment required
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Complete payment to secure this vehicle. Ownership is only
                    granted after payment is complete.
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle price</span>
                <span className="font-medium">{formatCurrency(order.winningBid || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service fee</span>
                <span className="font-medium">{formatCurrency(order.serviceFee || 0)}</span>
              </div>
              {!!order.documentationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Documentation</span>
                  <span className="font-medium">{formatCurrency(order.documentationFee)}</span>
                </div>
              )}
              {!!order.inspectionFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Inspection</span>
                  <span className="font-medium">{formatCurrency(order.inspectionFee)}</span>
                </div>
              )}
              {!!order.shippingCost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatCurrency(order.shippingCost)}</span>
                </div>
              )}
              {!!(order.estimatedDuties || order.clearanceFee) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Customs &amp; clearing</span>
                  <span className="font-medium">
                    {formatCurrency(order.estimatedDuties || order.clearanceFee || 0)}
                  </span>
                </div>
              )}
              {!!order.registrationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration</span>
                  <span className="font-medium">{formatCurrency(order.registrationFee)}</span>
                </div>
              )}
              {order.destinationPort && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Destination</span>
                  <span className="font-medium capitalize">
                    {String(order.destinationPort).replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {/* Additional Services Costs */}
              {orderDetails.additionalServices && orderDetails.additionalServices.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-dashed">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Additional Services</p>
                  {orderDetails.additionalServices.map((service: any) => (
                    <div key={service._id} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{service.serviceType.replace(/_/g, " ")}</span>
                      <span className="font-medium">{formatCurrency(service.cost)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatCurrency(totalWithServices)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium">{formatCurrency(order.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Balance due</span>
                <span className="font-bold">{formatCurrency(order.balanceDue || 0)}</span>
              </div>
              {order.paymentDeadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment deadline</span>
                  <span className="font-medium">{formatDate(order.paymentDeadline)}</span>
                </div>
              )}
            </div>

            {payments && payments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Payment Records</h3>
                <div className="space-y-2">
                  {payments.map((payment: any) => (
                    <div key={payment._id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{payment.provider}</p>
                        <p className="text-gray-500">{formatDate(payment.createdAt || payment._creationTime)}</p>
                      </div>
                      <Badge
                        variant={
                          payment.status === "successful"
                            ? "default"
                            : payment.status === "failed" || payment.status === "rejected"
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

          {/* Checkout */}
          <OrderPaymentPanel token={token} orderId={orderId} />

          {/* Shipping Information */}
          {shipments && shipments.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Shipping Details</h2>
              </div>

              <div className="space-y-4">
                {shipments.map((shipment: any) => (
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

          {/* Additional Services Selection */}
          <ServiceSelector orderId={orderId} token={token} />
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
