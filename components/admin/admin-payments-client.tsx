"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ExternalLink, CreditCard, Download } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface AdminPaymentsClientProps {
  token: string;
}

export function AdminPaymentsClient({ token }: AdminPaymentsClientProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [providerFilter, setProviderFilter] = useState<string>("bank_transfer");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<Id<"payments"> | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const payments = useQuery(api.payments.listPayments, {
    token,
    status: statusFilter
      ? (statusFilter as
          | "pending"
          | "processing"
          | "successful"
          | "failed"
          | "refunded"
          | "rejected")
      : undefined,
    provider: providerFilter
      ? (providerFilter as
          | "paystack"
          | "flutterwave"
          | "bank_transfer"
          | "deposit"
          | "wallet")
      : undefined,
    limit: 100,
  });

  const verifyPayment = useMutation(api.payments.verifyPayment);
  const rejectPayment = useMutation(api.payments.rejectPayment);

  const handleVerify = async (paymentId: Id<"payments">) => {
    setLoading(true);
    try {
      await verifyPayment({ token, paymentId });
      toast({ title: "Payment verified", description: "Order balance updated." });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openReject = (paymentId: Id<"payments">) => {
    setSelectedPaymentId(paymentId);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPaymentId) return;
    setLoading(true);
    try {
      await rejectPayment({
        token,
        paymentId: selectedPaymentId,
        reason: rejectReason,
      });
      toast({ title: "Payment rejected" });
      setRejectOpen(false);
    } catch (error) {
      toast({
        title: "Rejection failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground mt-1">
            Review pending bank transfers and other payment submissions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            exportToCSV(
              `payments-report-${new Date().toISOString().split("T")[0]}.csv`,
              [
                { header: "Payment ID", key: (row: any) => row._id },
                { header: "Order ID", key: (row: any) => row.orderId || "N/A" },
                { header: "Amount (NGN)", key: (row: any) => row.amount || 0 },
                { header: "Method", key: (row: any) => row.paymentMethod || row.provider || "N/A" },
                { header: "Reference", key: (row: any) => row.reference || row.transactionId || "N/A" },
                { header: "Status", key: (row: any) => row.status || "N/A" },
                { header: "Submitted Date", key: (row: any) => formatDate(row._creationTime) },
              ],
              payments || []
            );
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={providerFilter || "all"}
            onValueChange={(v) => setProviderFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              <SelectItem value="flutterwave">Card (Flutterwave)</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!payments ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment: {
                _id: Id<"payments">;
                provider: string;
                status: string;
                amount: number;
                providerReference?: string;
                orderId?: Id<"orders">;
                orderNumber?: string;
                userName?: string;
                userEmail?: string;
                createdAt: number;
                receiptUrl?: string | null;
                buyerNote?: string;
              }) => (
                <TableRow key={payment._id}>
                  <TableCell className="font-mono text-xs">
                    {payment.providerReference || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{payment.userName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{payment.userEmail}</div>
                  </TableCell>
                  <TableCell>
                    {payment.orderId ? (
                      <Link
                        href={`/orders/${payment.orderId}`}
                        className="text-sm text-electric-blue hover:underline inline-flex items-center gap-1"
                      >
                        {payment.orderNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {payment.provider.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payment.status === "successful"
                          ? "default"
                          : payment.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {payment.status === "pending" &&
                        payment.provider === "bank_transfer" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={loading}
                            onClick={() => handleVerify(payment._id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => openReject(payment._id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {payment.receiptUrl && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
                            Receipt
                          </a>
                        </Button>
                      )}
                    </div>
                    {payment.buyerNote && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                        Note: {payment.buyerNote}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payment</DialogTitle>
            <DialogDescription>
              Provide a reason. The buyer will be notified and can submit a new payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading || rejectReason.trim().length < 3}
              onClick={handleReject}
            >
              Reject payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
