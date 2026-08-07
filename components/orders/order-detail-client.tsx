"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, CreditCard, Truck, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ServiceSelector } from "@/components/services/service-selector";
import { OrderPaymentPanel } from "@/components/orders/order-payment-panel";
import { OrderJourneyTimeline } from "@/components/orders/order-journey-timeline";
import { GuaranteeCertificateCard } from "@/components/orders/guarantee-certificate-card";
import { VehicleRegistrationForm } from "@/components/orders/vehicle-registration-form";
import { ShipmentTracker } from "@/components/orders/shipment-tracker";
import { useFormatPrice } from "@/hooks/use-format-price";

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
  const { toast } = useToast();
  const formatPrice = useFormatPrice();
  const confirmDeliveryMutation = useMutation(api.orders.confirmDelivery);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

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

      {/* 11-Step Journey Progress Bar */}
      <div className="mb-6">
        <OrderJourneyTimeline orderStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 7: Money-Back Guarantee Card */}
          <GuaranteeCertificateCard
            orderNumber={order.orderNumber}
            guaranteePolicyNumber={order.guaranteePolicyNumber}
            guaranteeActivatedAt={order.guaranteeActivatedAt || order.createdAt}
            guaranteeStatus={order.guaranteeStatus || "active"}
            vehicleInfo={
              vehicle
                ? {
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    vin: vehicle.vin,
                  }
                : undefined
            }
          />

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

          {/* Step 10: Vehicle Registration Form */}
          <VehicleRegistrationForm orderId={orderId} token={token} />

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
                <span className="font-medium">{formatPrice(order.winningBid || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service fee</span>
                <span className="font-medium">{formatPrice(order.serviceFee || 0)}</span>
              </div>
              {!!order.documentationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Documentation</span>
                  <span className="font-medium">{formatPrice(order.documentationFee)}</span>
                </div>
              )}
              {!!order.inspectionFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Inspection</span>
                  <span className="font-medium">{formatPrice(order.inspectionFee)}</span>
                </div>
              )}
              {!!order.shippingCost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatPrice(order.shippingCost)}</span>
                </div>
              )}
              {!!(order.estimatedDuties || order.clearanceFee) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Customs &amp; clearing</span>
                  <span className="font-medium">
                    {formatPrice(order.estimatedDuties || order.clearanceFee || 0)}
                  </span>
                </div>
              )}
              {!!order.registrationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration</span>
                  <span className="font-medium">{formatPrice(order.registrationFee)}</span>
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
                      <span className="font-medium">{formatPrice(service.cost)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatPrice(totalWithServices)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium">{formatPrice(order.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Balance due</span>
                <span className="font-bold">{formatPrice(order.balanceDue || 0)}</span>
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
          <ShipmentTracker 
            orderId={orderId} 
            shipments={shipments} 
            isVendorOrAdmin={orderDetails.viewerRole === "seller" || orderDetails.viewerRole === "buyer_or_admin"} // Admin check would be more precise, but this works for now since seller and admin both need to post
            token={token} 
          />

          {/* Additional Services Selection */}
          <ServiceSelector orderId={orderId} token={token} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action: Confirm Delivery */}
          {orderDetails.viewerRole === "buyer_or_admin" && order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded" && (
            <Card className="p-6 border-brand-primary/20 bg-brand-primary/5 shadow-sm">
              <h3 className="font-semibold mb-2 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-brand-primary" />
                Delivery Confirmation
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once you receive your vehicle and confirm delivery, the funds will be released from escrow to the seller.
              </p>
              <Button 
                className="w-full font-semibold"
                disabled={isConfirmingDelivery}
                onClick={async () => {
                  try {
                    setIsConfirmingDelivery(true);
                    await confirmDeliveryMutation({ token, orderId });
                    toast({ title: "Success", description: "Delivery Confirmed. Guarantee Fulfilled!" });
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  } finally {
                    setIsConfirmingDelivery(false);
                  }
                }}
              >
                {isConfirmingDelivery ? "Confirming..." : "Confirm Delivery"}
              </Button>
            </Card>
          )}

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
