"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminUserDetailClientProps {
  token: string;
  initialData: any;
  errorMessage?: string;
}

export function AdminUserDetailClient({ token, initialData, errorMessage }: AdminUserDetailClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState<string>(data?.user?.status ?? "");
  const [kycStatus, setKycStatus] = useState<string>(data?.user?.kycStatus ?? "");
  const [membershipTier, setMembershipTier] = useState<string>(data?.user?.membershipTier ?? "");
  const [statusReason, setStatusReason] = useState("");
  const [kycNotes, setKycNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateStatus = useMutation(api.users.updateUserStatus);
  const updateKYC = useMutation(api.users.updateKYCStatus);
  const updateTier = useMutation(api.users.updateMembershipTier);

  if (!data && !error) {
    return (
      <div className="p-8">
        <Button variant="ghost" className="mb-4" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
        </Button>
        <Card className="p-6">
          <p className="text-gray-500">Loading user details...</p>
        </Card>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
        </Button>
        <Card className="p-6">
          <p className="text-red-600 font-medium">{error}</p>
        </Card>
      </div>
    );
  }

  const user = data.user;

  const handleStatusUpdate = async () => {
    if (!status || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStatus({
        token,
        userId: user._id as Id<"users">,
        status: status as any,
        reason: statusReason || undefined,
      });
      setData((prev: any) => prev ? { ...prev, user: { ...prev.user, status } } : prev);
      setSuccess("Account status updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  const handleKYCUpdate = async () => {
    if (!kycStatus || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateKYC({
        token,
        userId: user._id as Id<"users">,
        kycStatus: kycStatus as any,
        notes: kycNotes || undefined,
      });
      setData((prev: any) => prev ? { ...prev, user: { ...prev.user, kycStatus } } : prev);
      setSuccess("KYC status updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update KYC status.");
    } finally {
      setSaving(false);
    }
  };

  const handleTierUpdate = async () => {
    if (!membershipTier || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateTier({
        token,
        userId: user._id as Id<"users">,
        tier: membershipTier as any,
      });
      setData((prev: any) => prev ? { ...prev, user: { ...prev.user, membershipTier } } : prev);
      setSuccess("Membership tier updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update membership tier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={user.role === "superadmin" ? "default" : "secondary"}>{user.role}</Badge>
          <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
          <Badge variant={user.kycStatus === "approved" ? "default" : user.kycStatus === "rejected" ? "destructive" : "secondary"}>
            KYC: {user.kycStatus}
          </Badge>
          <Badge variant="outline">Tier: {user.membershipTier}</Badge>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-sm text-green-700 font-medium">{success}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overview & Controls */}
        <div className="space-y-4">
          <Card className="p-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-700">Account Overview</h2>
            <p className="text-xs text-gray-500">Created {formatDate(user.createdAt)}</p>
            {user.lastLoginAt && (
              <p className="text-xs text-gray-500">Last login {formatDate(user.lastLoginAt)}</p>
            )}
            {user.vendorCompany && (
              <p className="text-xs text-gray-500">
                Vendor: {user.vendorCompany} ({user.vendorLicense})
              </p>
            )}
            <p className="text-xs text-gray-500">
              Email verified: {user.emailVerified ? "Yes" : "No"} · Phone verified: {user.phoneVerified ? "Yes" : "No"}
            </p>
            <p className="text-xs text-gray-500">
              Buying power: ₦{(user.buyingPower ?? 0).toLocaleString()} · Deposit: ₦{(user.depositAmount ?? 0).toLocaleString()}
            </p>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700">Account Status</h2>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Optional reason (visible in audit log)"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={handleStatusUpdate} disabled={saving}>
              Update Status
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700">KYC Status</h2>
            <Select value={kycStatus} onValueChange={setKycStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select KYC status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Optional notes / rejection reason"
              value={kycNotes}
              onChange={(e) => setKycNotes(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={handleKYCUpdate} disabled={saving}>
              Update KYC
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700">Membership Tier</h2>
            <Select value={membershipTier} onValueChange={setMembershipTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select membership tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleTierUpdate} disabled={saving}>
              Update Membership
            </Button>
          </Card>
        </div>

        {/* Right: Tabs for activity and documents */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="documents">KYC Documents</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4 space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-2">Recent Orders</h3>
                {data.recentOrders?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((order: any) => (
                        <TableRow key={order._id}>
                          <TableCell className="text-xs">{order._id}</TableCell>
                          <TableCell className="text-xs">{order.status}</TableCell>
                          <TableCell className="text-xs">
                            ₦{(order.totalAmount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-gray-500">No recent orders.</p>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-2">Recent Bids</h3>
                {data.recentBids?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bid ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Placed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentBids.map((bid: any) => (
                        <TableRow key={bid._id}>
                          <TableCell className="text-xs">{bid._id}</TableCell>
                          <TableCell className="text-xs">
                            ₦{(bid.bidAmount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{bid.bidType}</TableCell>
                          <TableCell className="text-xs">{formatDate(bid.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-gray-500">No recent bids.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-2">KYC Documents</h3>
                {data.documents?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Reviewed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.documents.map((doc: any) => (
                        <TableRow key={doc._id}>
                          <TableCell className="text-xs">{doc.documentType}</TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant={
                                doc.status === "approved"
                                  ? "default"
                                  : doc.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(doc.uploadedAt)}</TableCell>
                          <TableCell className="text-xs">
                            {doc.reviewedAt ? formatDate(doc.reviewedAt) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-gray-500">No KYC documents uploaded.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-2">Recent Audit Events</h3>
                {data.auditLogs?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.auditLogs.map((log: any) => (
                        <TableRow key={log._id}>
                          <TableCell className="text-xs">{formatDate(log.timestamp)}</TableCell>
                          <TableCell className="text-xs">{log.action}</TableCell>
                          <TableCell className="text-xs">
                            {log.entityType} {log.entityId}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-gray-500">No audit events recorded yet.</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

