"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  Check,
  X,
  ShieldAlert,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  FileCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export function AdminKycClient({ token }: { token: string }) {
  const { toast } = useToast();
  const { users, total } = useQuery(api.users.listUsers, { token, kycStatus: "pending" }) ?? { users: [], total: 0 };
  const autoApprovePending = useMutation(api.users.autoApproveAllPendingUsers);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [showProcessGuide, setShowProcessGuide] = useState(true);

  const openReview = (user: any) => {
    setSelectedUser(user);
    setIsReviewOpen(true);
  };

  const handleBatchAutoApprove = async () => {
    if (!window.confirm("Are you sure you want to auto-approve all currently pending accounts so users can access their accounts?")) {
      return;
    }

    setIsAutoApproving(true);
    try {
      const res = await autoApprovePending({ token });
      toast({
        title: "Auto-Approval Complete",
        description: res.message || `Auto-approved ${res.approvedCount} pending user account(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Auto-Approval Failed",
        description: error.message || "Unable to batch auto-approve users.",
        variant: "destructive",
      });
    } font-bold {
      setIsAutoApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">KYC & Compliance Management</h1>
          <p className="text-muted-foreground font-medium">
            Review identity submissions, manage verification workflows, and resolve account lockouts.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            {total} Pending Review
          </Badge>
          <Button
            onClick={handleBatchAutoApprove}
            disabled={isAutoApproving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 shadow-lg shadow-emerald-600/20"
          >
            {isAutoApproving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Auto-Approve All Pending Accounts
          </Button>
        </div>
      </div>

      {/* Admin KYC Process & Compliance Knowledge Base */}
      <Card className="p-6 rounded-2xl border border-electric-blue/20 bg-electric-blue/5">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowProcessGuide(!showProcessGuide)}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-electric-blue/10 text-electric-blue">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">Admin KYC Verification Process & Guidelines</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Standard operating procedures for managing pending account verifications & user onboarding.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl">
            {showProcessGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>

        {showProcessGuide && (
          <div className="mt-6 pt-6 border-t border-electric-blue/10 grid md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="flex items-center text-electric-blue font-bold">
                <span className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center text-xs mr-2">1</span>
                User Onboarding Flow
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                When users register, their initial status is <span className="font-semibold text-foreground font-mono">pending</span>. They can pay the one-time $3 (₦4,500) verification fee and submit government ID or CAC documents for review.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-electric-blue font-bold">
                <span className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center text-xs mr-2">2</span>
                Document Inspection Checklist
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Check that uploaded IDs (Passport, NIN, Driver's License) match the registered name. Corporate & Dealer tier users must have valid CAC registration certificates uploaded.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-electric-blue font-bold">
                <span className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center text-xs mr-2">3</span>
                Auto-Approval & Recovery Policy
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                To resolve user account lockouts, use the <span className="font-semibold text-foreground">Auto-Approve All Pending Accounts</span> action above. This batch updates pending accounts to <span className="font-semibold text-foreground font-mono">active</span> status & <span className="font-semibold text-foreground font-mono">approved</span> KYC.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Applications Table */}
      <Card className="overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground">Applicant</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Account Type</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Submitted</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user: any) => (
                <tr key={user._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{user.firstName} {user.lastName}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize font-medium">
                    {user.accountType ? user.accountType.replace(/_/g, " ") : "Individual"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => openReview(user)}>
                      <Eye className="w-4 h-4 mr-2" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-bold text-base text-foreground">No pending KYC applications found.</p>
                    <p className="text-xs text-muted-foreground mt-1">All user verification requests have been processed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Dialog */}
      {selectedUser && (
        <ReviewDialog 
          token={token} 
          userId={selectedUser._id}
          isOpen={isReviewOpen} 
          onClose={() => setIsReviewOpen(false)} 
        />
      )}
    </div>
  );
}

function ReviewDialog({ token, userId, isOpen, onClose }: { token: string; userId: string; isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const details = useQuery(api.users.getUserDetails, { token, userId });
  const updateKYC = useMutation(api.users.updateKYCStatus);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  if (!details) return null;

  const { user, documents } = details;

  const handleAction = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a rejection reason.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateKYC({
        token,
        userId: user._id,
        kycStatus: status,
        notes: status === "rejected" ? rejectionReason : undefined,
      });
      toast({ title: "Success", description: `KYC application ${status}.` });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Review KYC Application</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Applicant Name</p>
            <p className="font-bold text-foreground">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Email</p>
            <p className="font-bold text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Account Type</p>
            <p className="font-bold capitalize text-foreground">{user.accountType?.replace(/_/g, " ") || "Individual"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">BVN/NIN Status</p>
            <Badge variant={user.bvnVerificationStatus === "verified" ? "default" : "secondary"}>
              {user.bvnVerificationStatus?.toUpperCase() || "UNVERIFIED"}
            </Badge>
          </div>
        </div>

        <div className="py-4 space-y-4 max-h-[40vh] overflow-y-auto">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Uploaded Documents</h3>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            documents.map((doc: any) => (
              <Card key={doc._id} className="p-4 flex items-center justify-between rounded-xl">
                <div>
                  <p className="font-bold capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => window.open(doc.documentUrl, "_blank")}>
                  <FileCheck className="w-4 h-4 mr-2" /> View Document
                </Button>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Rejection Reason (if applicable)</p>
            <Textarea 
              placeholder="E.g., The provided ID document is illegible or expired..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold"
              onClick={() => handleAction("rejected")} 
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button 
              variant="default" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold" 
              onClick={() => handleAction("approved")} 
              disabled={isSubmitting}
            >
              <Check className="w-4 h-4 mr-2" /> Approve Application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
