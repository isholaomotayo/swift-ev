"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface VendorSettingsClientProps {
  initialUser: any;
}

export function VendorSettingsClient({
  initialUser,
}: VendorSettingsClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const [loading, setLoading] = useState(false);
  const [showLicense, setShowLicense] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState(initialUser?.firstName || "");
  const [lastName, setLastName] = useState(initialUser?.lastName || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [vendorCompany, setVendorCompany] = useState(initialUser?.vendorCompany || "");
  const [vendorLicense, setVendorLicense] = useState(initialUser?.vendorLicense || "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Payout / Bank Details state
  const existingBank = initialUser?.bankDetails;
  const [bankName, setBankName] = useState(existingBank?.bankName || "");
  const [accountName, setAccountName] = useState(existingBank?.accountName || "");
  const [accountNumber, setAccountNumber] = useState(existingBank?.accountNumber || "");
  const [bankCountry, setBankCountry] = useState(existingBank?.bankCountry || "Nigeria");
  const [swiftCode, setSwiftCode] = useState(existingBank?.swiftCode || "");
  const [bankCurrency, setBankCurrency] = useState(existingBank?.currency || "NGN");
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Currency preference state
  const [preferredCurrency, setPreferredCurrency] = useState(initialUser?.preferredCurrency || "NGN");
  const [currencyLoading, setCurrencyLoading] = useState(false);

  const updateBankDetails = useMutation(api.users.updateBankDetails);
  const updatePreferredCurrency = useMutation(api.users.updatePreferredCurrency);

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      // TODO: Implement profile update mutation
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement password change mutation
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutUpdate = async () => {
    if (!bankName || !accountName || !accountNumber || !bankCountry || !bankCurrency) {
      toast({ title: "Error", description: "Please fill in all required payout fields", variant: "destructive" });
      return;
    }
    setPayoutLoading(true);
    try {
      const token = localStorage.getItem("autoexports_token");
      if (!token) throw new Error("Not authenticated");
      await updateBankDetails({
        token,
        bankDetails: { bankName, accountName, accountNumber, bankCountry, swiftCode: swiftCode || undefined, currency: bankCurrency },
      });
      toast({ title: "Success", description: "Payout details saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleCurrencyUpdate = async () => {
    setCurrencyLoading(true);
    try {
      const token = localStorage.getItem("autoexports_token");
      if (!token) throw new Error("Not authenticated");
      await updatePreferredCurrency({ token, preferredCurrency });
      toast({ title: "Success", description: "Currency preference saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCurrencyLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your vendor account settings</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="payout">Payout Details</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="vendorCompany">Company Name</Label>
                <Input
                  id="vendorCompany"
                  value={vendorCompany}
                  onChange={(e) => setVendorCompany(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="vendorLicense">License Number</Label>
                <div className="relative">
                  <Input
                    id="vendorLicense"
                    type={showLicense ? "text" : "password"}
                    value={vendorLicense}
                    onChange={(e) => setVendorLicense(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLicense(!showLicense)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLicense ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Click the eye icon to reveal your license number</p>
              </div>

              <div>
                <Label htmlFor="preferredCurrency">Preferred Currency</Label>
                <p className="text-xs text-muted-foreground mb-2">Prices in your dashboard will be displayed in this currency.</p>
                <div className="flex items-center gap-3">
                  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                    <SelectTrigger id="preferredCurrency" className="max-w-xs">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN — Nigerian Naira (₦)</SelectItem>
                      <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                      <SelectItem value="CNY">CNY — Chinese Yuan (¥)</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleCurrencyUpdate} disabled={currencyLoading} size="sm">
                    {currencyLoading ? "Saving..." : "Save Currency"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleProfileUpdate} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handlePasswordChange} disabled={loading}>
                  {loading ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Payout Details Tab */}
        <TabsContent value="payout">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-1">Payout / Bank Details</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Provide your bank account details to receive payouts after successful auction sales.
            </p>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="bankName">Bank Name <span className="text-error-red">*</span></Label>
                <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Zenith Bank, ICBC" />
              </div>

              <div>
                <Label htmlFor="accountName">Account Holder Name <span className="text-error-red">*</span></Label>
                <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Name as it appears on the account" />
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number <span className="text-error-red">*</span></Label>
                <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Bank account number" className="font-mono" />
              </div>

              <div>
                <Label htmlFor="bankCountry">Bank Country <span className="text-error-red">*</span></Label>
                <Input id="bankCountry" value={bankCountry} onChange={(e) => setBankCountry(e.target.value)} placeholder="e.g., Nigeria, China" />
              </div>

              <div>
                <Label htmlFor="swiftCode">SWIFT / BIC Code <span className="text-muted-foreground text-xs">(optional, required for international transfers)</span></Label>
                <Input id="swiftCode" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} placeholder="e.g., ZEIBNGLA" className="font-mono uppercase" />
              </div>

              <div>
                <Label htmlFor="bankCurrency">Preferred Payout Currency <span className="text-error-red">*</span></Label>
                <Select value={bankCurrency} onValueChange={setBankCurrency}>
                  <SelectTrigger id="bankCurrency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN — Nigerian Naira (₦)</SelectItem>
                    <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                    <SelectItem value="CNY">CNY — Chinese Yuan (¥)</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handlePayoutUpdate} disabled={payoutLoading} className="bg-electric-blue hover:bg-electric-blue-dark text-white">
                  {payoutLoading ? "Saving..." : "Save Payout Details"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

