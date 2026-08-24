"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { getMutationErrorMessage } from "@/lib/auth-errors";

export function KycOnboardingFlow({ token }: { token: string }) {
  const { toast } = useToast();
  const kycData = useQuery(api.kyc.getKycStatus, { token });
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const submitDocument = useMutation(api.kyc.submitDocument);

  const [documentType, setDocumentType] = useState<string>("government_id");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [bvn, setBvn] = useState("");

  if (kycData === undefined || kycData === null) {
    return <div className="p-8 text-center text-gray-500">Loading verification status...</div>;
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl({ token });
      
      // 2. Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) throw new Error("Failed to upload file");

      const { storageId } = await result.json();

      // 3. Submit document to Convex
      await submitDocument({
        token,
        documentType: documentType as any,
        storageId,
      });

      toast({ title: "Success", description: "Document submitted for review." });
      setSelectedFile(null);
    } catch (error: any) {
      toast({ title: "Upload Failed", description: getMutationErrorMessage(error, "Failed to upload document"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const statusColors = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
    not_started: "bg-gray-100 text-gray-800",
  };

  const getStatusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "pending") return <Clock className="w-5 h-5 text-yellow-500" />;
    if (status === "rejected") return <AlertTriangle className="w-5 h-5 text-red-500" />;
    return <AlertTriangle className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Identity Verification (KYC)</h2>
            <p className="text-sm text-gray-500 mt-1">Required by SCUML for all vehicle transactions.</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(kycData.status)}
            <Badge className={statusColors[kycData.status as keyof typeof statusColors] || statusColors.not_started}>
              {kycData.status.toUpperCase().replace("_", " ")}
            </Badge>
          </div>
        </div>

        {kycData.rejectionReason && kycData.status === "rejected" && (
          <div className="bg-red-50 p-4 rounded-md mb-6 border border-red-200">
            <p className="text-red-700 text-sm font-medium">Rejection Reason:</p>
            <p className="text-red-600 text-sm">{kycData.rejectionReason}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 border-t pt-6">
          {/* Left Column: BVN / Instant Verification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">1. Instant Verification</h3>
            <p className="text-sm text-gray-500">Provide your Bank Verification Number (BVN) to match your bank details.</p>
            
            <div className="space-y-2">
              <Label>BVN (11 Digits)</Label>
              <div className="flex gap-2">
                <Input 
                  value={bvn} 
                  onChange={e => setBvn(e.target.value)} 
                  placeholder="Enter BVN" 
                  maxLength={11}
                  disabled={kycData.bvnVerificationStatus === "verified"}
                />
                <Button 
                  variant="secondary"
                  disabled={kycData.bvnVerificationStatus === "verified" || bvn.length !== 11}
                  onClick={() => toast({ title: "Notice", description: "BVN verification via third-party provider is coming soon." })}
                >
                  Verify
                </Button>
              </div>
              {kycData.bvnVerificationStatus === "verified" && (
                <p className="text-sm text-green-600 flex items-center mt-2"><CheckCircle className="w-4 h-4 mr-1" /> Verified</p>
              )}
            </div>
          </div>

          {/* Right Column: Document Upload */}
          <div className="space-y-4 border-l pl-8">
            <h3 className="text-lg font-medium">2. Document Upload</h3>
            <p className="text-sm text-gray-500">Upload your government ID and Proof of Address.</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="government_id">Government ID (Passport, NIN, Driver's License)</SelectItem>
                    <SelectItem value="proof_of_address">Proof of Address (Utility Bill)</SelectItem>
                    <SelectItem value="business_registration">Business Registration (CAC Certificate)</SelectItem>
                    <SelectItem value="cac_form_1_1">CAC Form 1.1 / Form 7</SelectItem>
                    <SelectItem value="amdon_certificate">AMDON Certificate (Dealers only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>File Upload</Label>
                <Input 
                  type="file" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading || kycData.status === "approved"}
              >
                {isUploading ? "Uploading..." : "Submit Document"}
                <FileUp className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Documents List */}
      {kycData.documents && kycData.documents.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
          <div className="space-y-3">
            {kycData.documents.map((doc: any) => (
              <div key={doc._id} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <p className="font-medium capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={doc.status === "approved" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"}>
                  {doc.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
