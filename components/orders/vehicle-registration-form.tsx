"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface VehicleRegistrationFormProps {
  orderId: Id<"orders">;
  token: string;
}

export function VehicleRegistrationForm({
  orderId,
  token,
}: VehicleRegistrationFormProps) {
  const form = useQuery(api.registration.getVehicleRegistrationForm, {
    token,
    orderId,
  });

  const submitForm = useMutation(api.registration.submitVehicleRegistrationForm);

  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [registrationState, setRegistrationState] = useState("");
  const [identityDocType, setIdentityDocType] = useState("NIN");
  const [identityNumber, setIdentityNumber] = useState("");
  const [preferredPlateText, setPreferredPlateText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await submitForm({
        token,
        orderId,
        ownerFullName,
        ownerAddress,
        registrationState,
        identityDocType,
        identityNumber,
        preferredPlateText,
      });

      setSuccessMsg("Vehicle registration information submitted successfully!");
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit vehicle registration form");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (form && !isEditing) {
    return (
      <Card className="p-6 border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold">Vehicle Registration Information</h3>
          </div>
          <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {form.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Owner Full Name</p>
            <p className="font-semibold">{form.ownerFullName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">State of Registration</p>
            <p className="font-semibold">{form.registrationState}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Owner Address</p>
            <p className="font-semibold">{form.ownerAddress}</p>
          </div>
          {form.identityNumber && (
            <div>
              <p className="text-muted-foreground">Identity ID ({form.identityDocType})</p>
              <p className="font-semibold">{form.identityNumber}</p>
            </div>
          )}
          {form.preferredPlateText && (
            <div>
              <p className="text-muted-foreground">Preferred License Plate</p>
              <p className="font-semibold">{form.preferredPlateText}</p>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOwnerFullName(form.ownerFullName);
            setOwnerAddress(form.ownerAddress);
            setRegistrationState(form.registrationState);
            setIdentityDocType(form.identityDocType || "NIN");
            setIdentityNumber(form.identityNumber || "");
            setPreferredPlateText(form.preferredPlateText || "");
            setIsEditing(true);
          }}
        >
          Update Registration Details
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-l-4 border-l-brand-gold">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-brand-gold" />
        <h3 className="text-lg font-bold">Step 10: Vehicle Registration Form</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Please supply the required registration information so local vehicle documentation and license plates can be processed prior to delivery.
      </p>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ownerFullName">Owner Full Name (on Title/Registration) *</Label>
            <Input
              id="ownerFullName"
              required
              placeholder="e.g. Chukwuma Adebayo"
              value={ownerFullName}
              onChange={(e) => setOwnerFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationState">State of Vehicle Registration *</Label>
            <Input
              id="registrationState"
              required
              placeholder="e.g. Lagos State"
              value={registrationState}
              onChange={(e) => setRegistrationState(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerAddress">Owner Residential / Business Address *</Label>
          <Input
            id="ownerAddress"
            required
            placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="identityDocType">Identity Document Type</Label>
            <select
              id="identityDocType"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={identityDocType}
              onChange={(e) => setIdentityDocType(e.target.value)}
            >
              <option value="NIN">National Identity Number (NIN)</option>
              <option value="BVN">Bank Verification Number (BVN)</option>
              <option value="DriversLicense">Driver's License Number</option>
              <option value="Passport">International Passport Number</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identityNumber">Document ID Number</Label>
            <Input
              id="identityNumber"
              placeholder="e.g. 12345678901"
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredPlateText">Preferred Plate Text (Optional)</Label>
          <Input
            id="preferredPlateText"
            placeholder="e.g. KJA-888AA or Customized text"
            value={preferredPlateText}
            onChange={(e) => setPreferredPlateText(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="bg-brand-primary text-white">
            {isSubmitting ? "Submitting..." : form ? "Save Registration Updates" : "Submit Registration Details"}
          </Button>
          {isEditing && (
            <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
