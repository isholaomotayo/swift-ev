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
import { Eye, Check, X, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function AdminKycClient({ token }: { token: string }) {
  const { toast } = useToast();
  const { users, total } = useQuery(api.users.listUsers, { token, kycStatus: "pending" }) ?? { users: [], total: 0 };
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const openReview = (user: any) => {
    setSelectedUser(user);
    setIsReviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KYC & AML Compliance</h1>
          <p className="text-gray-500">Review pending identity verification applications</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
          {total} Pending Review
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Applicant</th>
                <th className="px-6 py-4 font-medium text-gray-500">Account Type</th>
                <th className="px-6 py-4 font-medium text-gray-500">Submitted</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user: any) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {user.accountType ? user.accountType.replace(/_/g, " ") : "Individual"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => openReview(user)}>
                      <Eye className="w-4 h-4 mr-2" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <ShieldAlert className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    No pending KYC applications found.
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

function ReviewDialog({ token, userId, isOpen, onClose }: { token: string, userId: string, isOpen: boolean, onClose: () => void }) {
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review KYC Application</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 border-b">
          <div>
            <p className="text-sm text-gray-500">Applicant Name</p>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Account Type</p>
            <p className="font-medium capitalize">{user.accountType?.replace(/_/g, " ") || "Individual"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">BVN/NIN Verification</p>
            <Badge variant={user.bvnVerificationStatus === "verified" ? "default" : "secondary"}>
              {user.bvnVerificationStatus?.toUpperCase() || "UNVERIFIED"}
            </Badge>
          </div>
        </div>

        <div className="py-4 space-y-4 max-h-[40vh] overflow-y-auto">
          <h3 className="font-medium">Uploaded Documents</h3>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded.</p>
          ) : (
            documents.map((doc: any) => (
              <Card key={doc._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
                {/* Normally we'd display the image or a link to view it using getUrl */}
                <Button variant="outline" size="sm" onClick={() => window.open(doc.documentUrl, "_blank")}>
                  View Document
                </Button>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div>
            <p className="text-sm font-medium mb-2">Rejection Reason (if applicable)</p>
            <Textarea 
              placeholder="E.g., The provided ID is blurry and unreadable..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="destructive" 
              onClick={() => handleAction("rejected")} 
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => handleAction("approved")} 
              disabled={isSubmitting}
            >
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
