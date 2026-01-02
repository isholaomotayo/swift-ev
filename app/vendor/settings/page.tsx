"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [vendorCompany, setVendorCompany] = useState(user?.vendorCompany || "");
  const [vendorLicense, setVendorLicense] = useState(user?.vendorLicense || "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your vendor account</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
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
                  placeholder="john@example.com"
                />
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold mb-4">Vendor Information</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vendorCompany">Company Name</Label>
                    <Input
                      id="vendorCompany"
                      value={vendorCompany}
                      onChange={(e) => setVendorCompany(e.target.value)}
                      placeholder="BYD Auto Nigeria Ltd"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vendorLicense">Dealer License</Label>
                    <Input
                      id="vendorLicense"
                      value={vendorLicense}
                      onChange={(e) => setVendorLicense(e.target.value)}
                      placeholder="DL-XXX-2024-001"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleProfileUpdate} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">
                    Receive updates about bids and auctions
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bid Notifications</p>
                  <p className="text-sm text-gray-500">
                    Get notified when someone bids on your vehicles
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auction Start Reminders</p>
                  <p className="text-sm text-gray-500">
                    Reminders before your vehicles go live
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button>Save Preferences</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
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

              <div className="flex justify-end pt-4">
                <Button onClick={handlePasswordChange} disabled={loading}>
                  {loading ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
