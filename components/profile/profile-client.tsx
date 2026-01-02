"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, ShoppingBag, Gavel, Settings as SettingsIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProfileClientProps {
  initialUser: any;
  initialOrders: any;
  token: string;
}

export function ProfileClient({
  initialUser,
  initialOrders,
  token,
}: ProfileClientProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Use useQuery for real-time updates
  const orders = useQuery(
    api.orders.getUserOrders,
    token ? { token } : "skip"
  ) ?? initialOrders;

  // Profile state
  const [firstName, setFirstName] = useState(initialUser?.firstName || "");
  const [lastName, setLastName] = useState(initialUser?.lastName || "");
  const [email, setEmail] = useState(initialUser?.email || "");

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
    <div className="container mx-auto p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and view your activity</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            My Orders
          </TabsTrigger>
          <TabsTrigger value="bids">
            <Gavel className="w-4 h-4 mr-2" />
            My Bids
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Info */}
            <Card className="lg:col-span-2 p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
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

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleProfileUpdate} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Account Stats */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Membership</p>
                    <Badge className="mt-1">{initialUser?.membershipTier}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Status</p>
                    <Badge variant={initialUser?.emailVerified ? "default" : "secondary"} className="mt-1">
                      {initialUser?.emailVerified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">KYC Status</p>
                    <Badge
                      variant={
                        initialUser?.kycStatus === "approved"
                          ? "default"
                          : initialUser?.kycStatus === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="mt-1"
                    >
                      {initialUser?.kycStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Buying Power</p>
                    <p className="font-semibold mt-1">
                      {formatCurrency(initialUser?.buyingPower || 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">My Orders</h2>
            {!orders ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between p-4 border rounded hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      {order.vehicle && (
                        <p className="text-sm text-gray-500">
                          {order.vehicle.year} {order.vehicle.make} {order.vehicle.model}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(order._creationTime)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                      <Badge
                        variant={
                          order.status === "delivered"
                            ? "default"
                            : order.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Bids Tab */}
        <TabsContent value="bids">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">My Bids</h2>
            <p className="text-center py-8 text-gray-500">
              Bid history will be displayed here
            </p>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
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
      </Tabs>
    </div>
  );
}

